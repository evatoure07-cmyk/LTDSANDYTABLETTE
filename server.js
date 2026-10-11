import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const dbFile = process.env.DB_FILE || path.join(ROOT, 'data', 'recrutement.sqlite');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY(admin_id) REFERENCES admins(id));
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, schedule TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY, reference TEXT UNIQUE NOT NULL, job_id INTEGER, name TEXT NOT NULL, discord TEXT NOT NULL, phone TEXT NOT NULL, age TEXT NOT NULL, availability TEXT NOT NULL, experience TEXT NOT NULL, motivation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received', admin_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(job_id) REFERENCES jobs(id));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE);`);
const hashPassword = (password, salt=crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(password,salt,64).toString('hex')}`;
const verifyPassword = (password, stored) => { const [salt, digest]=stored.split(':'); if (!salt || !digest) return false; const a=Buffer.from(digest,'hex'); const b=crypto.scryptSync(password,salt,a.length); return crypto.timingSafeEqual(a,b); };
const adminUsername = process.env.ADMIN_USER || 'direction';
const adminPassword = process.env.ADMIN_PASSWORD;
if (!db.prepare('SELECT id FROM admins LIMIT 1').get()) {
  if (!adminPassword || adminPassword.length < 12) { console.error('Configure ADMIN_PASSWORD (12 caractères minimum) avant le premier démarrage.'); process.exit(1); }
  db.prepare('INSERT INTO admins(username,password_hash) VALUES(?,?)').run(adminUsername,hashPassword(adminPassword));
}
if (!db.prepare('SELECT id FROM jobs LIMIT 1').get()) {
  const ins=db.prepare('INSERT INTO jobs(title,description,schedule,active,created_at) VALUES(?,?,?,?,?)');
  const now=new Date().toISOString();
  ins.run('Vendeur / Vendeuse','Accueil des clients, vente, conseil et tenue de la boutique.','Service régulier · formation interne',1,now);
  ins.run('Pompiste','Ravitaillement, service à la station et relation clientèle.','Disponibilités flexibles',1,now);
  ins.run('Livreur / Livreuse','Préparation et livraison des commandes du LTD Sandy Shores.','Conduite soignée · ponctualité',1,now);
}
const statuses = ['received','review','interview','accepted','refused'];
const limits = new Map();
function rate(ip, key, max, windowMs) { const k=`${ip}:${key}`; const now=Date.now(); const val=limits.get(k); if(!val || val.until<now){limits.set(k,{count:1,until:now+windowMs}); return true;} val.count++; return val.count<=max; }
setInterval(()=>{for(const [k,v] of limits) if(v.until<Date.now()) limits.delete(k); db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());},600_000).unref();
function parseCookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(a=>a.length===2));}
function admin(req){const token=parseCookies(req).session; if(!token)return null; return db.prepare('SELECT admins.id,admins.username FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE token_hash=? AND expires_at>?').get(crypto.createHash('sha256').update(token).digest('hex'),Date.now());}
function send(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj));}
function clean(v,max=500){return typeof v==='string'?v.trim().slice(0,max):'';}
async function json(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>30_000)throw Error('Corps trop volumineux');}return JSON.parse(body||'{}');}
const publicJob = j=>({id:j.id,title:j.title,description:j.description,schedule:j.schedule});
const fullApp = a => ({...a,job_title:a.job_title||'Poste archivé',events:db.prepare('SELECT status,note,created_at FROM events WHERE application_id=? ORDER BY id').all(a.id)});
const getApp=id=>db.prepare('SELECT applications.*,jobs.title AS job_title FROM applications LEFT JOIN jobs ON jobs.id=applications.job_id WHERE applications.id=?').get(id);
const webRoot=path.join(ROOT,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const p=url.pathname;
  const ip=(req.socket.remoteAddress||'unknown');
  if(p.startsWith('/api/')){
   if(!rate(ip,'all',180,60_000))return send(res,429,{error:'Trop de requêtes. Réessaie dans une minute.'});
   if(!['GET','POST','PATCH','DELETE'].includes(req.method))return send(res,405,{error:'Méthode non autorisée'});
   if(req.method!=='GET'){const origin=req.headers.origin;const host=req.headers.host;if(origin && new URL(origin).host!==host)return send(res,403,{error:'Origine refusée'});}
   if(p==='/api/config'&&req.method==='GET')return send(res,200,{site:'LTD Sandy Shores',jobs:db.prepare('SELECT * FROM jobs WHERE active=1 ORDER BY id').all().map(publicJob)});
   if(p==='/api/applications'&&req.method==='POST'){
    if(!rate(ip,'apply',5,60*60_000))return send(res,429,{error:'Trop de candidatures, réessaie plus tard.'});
    const b=await json(req); const jobId=Number(b.job_id); const job=db.prepare('SELECT * FROM jobs WHERE id=? AND active=1').get(jobId);
    if(!job)return send(res,400,{error:'Sélectionne un poste disponible.'});
    const name=clean(b.name,90),discord=clean(b.discord,90),phone=clean(b.phone,60),age=clean(b.age,10),availability=clean(b.availability,500),experience=clean(b.experience,1200),motivation=clean(b.motivation,1800);
    if(name.length<3||discord.length<2||phone.length<2||age.length<1||availability.length<5||experience.length<5||motivation.length<20) return send(res,400,{error:'Complète tous les champs. La motivation doit faire au moins 20 caractères.'});
    const ref=crypto.randomBytes(9).toString('hex').toUpperCase();const now=new Date().toISOString();
    const r=db.prepare('INSERT INTO applications(reference,job_id,name,discord,phone,age,availability,experience,motivation,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(ref,jobId,name,discord,phone,age,availability,experience,motivation,now,now);
    db.prepare('INSERT INTO events(application_id,status,created_at) VALUES(?,?,?)').run(r.lastInsertRowid,'received',now);
    return send(res,201,{reference:ref,status:'received'});
   }
   if(p==='/api/track'&&req.method==='POST'){
    if(!rate(ip,'track',15,60*60_000))return send(res,429,{error:'Trop de tentatives.'});
    const b=await json(req);const ref=clean(b.reference,40).toUpperCase();const a=db.prepare('SELECT a.id,a.reference,a.status,a.created_at,a.updated_at,j.title AS job_title FROM applications a LEFT JOIN jobs j ON a.job_id=j.id WHERE a.reference=?').get(ref);
    if(!a)return send(res,404,{error:'Aucune candidature trouvée avec cette référence.'});
    return send(res,200,{...a,events:db.prepare('SELECT status,created_at FROM events WHERE application_id=? ORDER BY id').all(a.id)});
   }
   if(p==='/api/login'&&req.method==='POST'){
    if(!rate(ip,'login',8,15*60_000))return send(res,429,{error:'Trop de tentatives de connexion.'});
    const b=await json(req),u=db.prepare('SELECT * FROM admins WHERE username=?').get(clean(b.username,60));
    if(!u||!verifyPassword(String(b.password||''),u.password_hash))return send(res,401,{error:'Identifiants incorrects.'});
    const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),u.id,Date.now()+12*60*60_000);
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    return send(res,200,{username:u.username},{'Set-Cookie':`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`});
   }
   if(p==='/api/logout'&&req.method==='POST'){
    const token=parseCookies(req).session;if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(crypto.createHash('sha256').update(token).digest('hex'));
    return send(res,200,{ok:true},{'Set-Cookie':'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
   }
   const user=admin(req);if(!user)return send(res,401,{error:'Connexion direction requise.'});
   if(p==='/api/me'&&req.method==='GET')return send(res,200,{username:user.username});
   if(p==='/api/admin/stats'&&req.method==='GET')return send(res,200,{total:db.prepare('SELECT count(*) n FROM applications').get().n,counts:db.prepare('SELECT status,count(*) count FROM applications GROUP BY status').all(),active_jobs:db.prepare('SELECT count(*) n FROM jobs WHERE active=1').get().n});
   if(p==='/api/admin/applications'&&req.method==='GET'){
    const status=clean(url.searchParams.get('status'),30);const search=clean(url.searchParams.get('q'),100);
    const all=db.prepare(`SELECT a.id,a.reference,a.name,a.discord,a.phone,a.age,a.status,a.created_at,a.updated_at,j.title AS job_title FROM applications a LEFT JOIN jobs j ON j.id=a.job_id WHERE (?='' OR a.status=?) AND (?='' OR a.name LIKE ? OR a.discord LIKE ? OR a.reference LIKE ?) ORDER BY a.created_at DESC LIMIT 300`).all(status,status,search,`%${search}%`,`%${search}%`,`%${search}%`);
    return send(res,200,{applications:all});
   }
   const appMatch=p.match(/^\/api\/admin\/applications\/(\d+)$/);
   if(appMatch){const id=Number(appMatch[1]),a=getApp(id);if(!a)return send(res,404,{error:'Candidature introuvable.'});
    if(req.method==='GET')return send(res,200,fullApp(a));
    if(req.method==='PATCH'){
     const b=await json(req);const status=clean(b.status,20);if(!statuses.includes(status))return send(res,400,{error:'Statut invalide.'});
     const note=clean(b.admin_note,3000);const now=new Date().toISOString();
     db.prepare('UPDATE applications SET status=?,admin_note=?,updated_at=? WHERE id=?').run(status,note,now,id);
     if(a.status!==status)db.prepare('INSERT INTO events(application_id,status,created_at) VALUES(?,?,?)').run(id,status,now);
     return send(res,200,fullApp(getApp(id)));
    }
    if(req.method==='DELETE'){db.prepare('DELETE FROM events WHERE application_id=?').run(id);db.prepare('DELETE FROM applications WHERE id=?').run(id);return send(res,200,{ok:true});}
   }
   if(p==='/api/admin/jobs'){
    if(req.method==='GET')return send(res,200,{jobs:db.prepare('SELECT * FROM jobs ORDER BY id DESC').all()});
    if(req.method==='POST'){const b=await json(req),title=clean(b.title,90),description=clean(b.description,600),schedule=clean(b.schedule,140);if(title.length<3||description.length<5)return send(res,400,{error:'Renseigne un titre et une description.'});const r=db.prepare('INSERT INTO jobs(title,description,schedule,active,created_at) VALUES(?,?,?,?,?)').run(title,description,schedule,1,new Date().toISOString());return send(res,201,{id:Number(r.lastInsertRowid)});}
   }
   const jobMatch=p.match(/^\/api\/admin\/jobs\/(\d+)$/);
   if(jobMatch&&req.method==='PATCH'){const b=await json(req),job=db.prepare('SELECT * FROM jobs WHERE id=?').get(Number(jobMatch[1]));if(!job)return send(res,404,{error:'Poste introuvable.'});const title=clean(b.title??job.title,90),description=clean(b.description??job.description,600),schedule=clean(b.schedule??job.schedule,140),active=b.active===undefined?job.active:Number(Boolean(b.active));if(title.length<3||description.length<5)return send(res,400,{error:'Titre ou description trop courte.'});db.prepare('UPDATE jobs SET title=?,description=?,schedule=?,active=? WHERE id=?').run(title,description,schedule,active,job.id);return send(res,200,{ok:true});}
   if(p==='/api/admin/password'&&req.method==='POST') {const b=await json(req),u=db.prepare('SELECT * FROM admins WHERE id=?').get(user.id);if(!verifyPassword(String(b.current||''),u.password_hash))return send(res,400,{error:'Mot de passe actuel incorrect.'});if(String(b.next||'').length<12)return send(res,400,{error:'Le nouveau mot de passe doit contenir au moins 12 caractères.'});db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hashPassword(String(b.next)),user.id);db.prepare('DELETE FROM sessions WHERE admin_id=?').run(user.id);return send(res,200,{ok:true},{'Set-Cookie':'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
   return send(res,404,{error:'Route inconnue.'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  let file=p==='/'?'index.html':decodeURIComponent(p).slice(1); const absolute=path.resolve(webRoot,file);if(!absolute.startsWith(webRoot+path.sep)&&absolute!==path.join(webRoot,'index.html')){res.writeHead(403);return res.end();}
  fs.readFile(absolute,(err,data)=>{if(err){res.writeHead(404);res.end('Introuvable');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",'Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);});
 } catch(e){console.error(e);send(res,400,{error:e instanceof SyntaxError?'JSON invalide.':e.message||'Erreur serveur'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`LTD recrutement accessible : http://localhost:${PORT}`));
