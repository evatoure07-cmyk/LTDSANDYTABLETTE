import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DB_FILE=process.env.DB_FILE||path.join(ROOT,'data','recrutement.sqlite');
fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});
const db=new DatabaseSync(DB_FILE);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS hr_people(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,role TEXT NOT NULL DEFAULT 'recruteur',active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hr_sessions(token_hash TEXT PRIMARY KEY,person_id INTEGER NOT NULL,expires_at INTEGER NOT NULL,FOREIGN KEY(person_id) REFERENCES hr_people(id));
CREATE TABLE IF NOT EXISTS hr_interviews(id INTEGER PRIMARY KEY AUTOINCREMENT,reference TEXT NOT NULL UNIQUE,candidate TEXT NOT NULL,job TEXT NOT NULL,answers TEXT NOT NULL,personal_note TEXT NOT NULL DEFAULT '',recommendation TEXT NOT NULL DEFAULT 'a_etudier',status TEXT NOT NULL DEFAULT 'recu',interviewer_id INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(interviewer_id) REFERENCES hr_people(id));
CREATE TABLE IF NOT EXISTS hr_comments(id INTEGER PRIMARY KEY AUTOINCREMENT,interview_id INTEGER NOT NULL,author_id INTEGER NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(interview_id) REFERENCES hr_interviews(id) ON DELETE CASCADE,FOREIGN KEY(author_id) REFERENCES hr_people(id));
CREATE TABLE IF NOT EXISTS hr_history(id INTEGER PRIMARY KEY AUTOINCREMENT,interview_id INTEGER NOT NULL,actor_id INTEGER NOT NULL,kind TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(interview_id) REFERENCES hr_interviews(id) ON DELETE CASCADE,FOREIGN KEY(actor_id) REFERENCES hr_people(id));
CREATE INDEX IF NOT EXISTS idx_hr_interviews_date ON hr_interviews(created_at);
CREATE INDEX IF NOT EXISTS idx_hr_interviews_author ON hr_interviews(interviewer_id);`);
const now=()=>new Date().toISOString();
// Migration non destructive : les dossiers historiques restent consultables.
const fields=new Set(db.prepare('PRAGMA table_info(hr_interviews)').all().map(x=>x.name));
if(!fields.has('deleted_at'))db.exec('ALTER TABLE hr_interviews ADD COLUMN deleted_at TEXT');
if(!fields.has('training_status'))db.exec("ALTER TABLE hr_interviews ADD COLUMN training_status TEXT NOT NULL DEFAULT 'en_attente'");
db.exec('CREATE INDEX IF NOT EXISTS idx_hr_deleted_at ON hr_interviews(deleted_at)');
db.prepare("UPDATE hr_interviews SET status='recu' WHERE status NOT IN ('recu','accepte','refuse')").run();
const DELETE_AFTER_MS=48*60*60*1000;
function purgeExpired(){db.prepare('DELETE FROM hr_interviews WHERE deleted_at IS NOT NULL AND deleted_at<=?').run(new Date(Date.now()-DELETE_AFTER_MS).toISOString());}
purgeExpired();setInterval(purgeExpired,60*60*1000).unref();
const insPerson=db.prepare('INSERT OR IGNORE INTO hr_people(name,role,active,created_at) VALUES(?,?,1,?)');
insPerson.run('Luciana Angel Mars','direction',now());
insPerson.run('Blake Mars','direction',now());
const statuses=['recu','accepte','refuse'];
const trainingStatuses=['en_attente','planifiee','terminee'];
const recommendations=['favorable','reserve','defavorable','a_etudier'];
const jobs=['Vendeur','Pompiste'];
const answerKeys=['age','about','daily_life','residence','why_ltd','work_experience','work_domains','knows_ltd','invoice','skills','availability','time_slots','weekly_hours','strengths','sales_cash','sales_tasks','pump_experience','pump_tasks'];
const clean=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const personPublic=p=>({id:p.id,name:p.name,role:p.role,active:Boolean(p.active)});
const mapInterview=r=>({...r,answers:JSON.parse(r.answers),interviewer:r.interviewer||''});
const findPerson=id=>db.prepare('SELECT * FROM hr_people WHERE id=? AND active=1').get(id);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const tokens=new Map();
function rate(ip,key,limit,ms){const k=ip+':'+key,t=Date.now(),v=tokens.get(k);if(!v||v.end<t){tokens.set(k,{count:1,end:t+ms});return true;}return ++v.count<=limit;}
setInterval(()=>{const n=Date.now();for(const [k,v] of tokens)if(v.end<n)tokens.delete(k);db.prepare('DELETE FROM hr_sessions WHERE expires_at<?').run(n);},600000).unref();
function cookie(req,name){const raw=(req.headers.cookie||'').split(';').find(p=>p.trim().startsWith(name+'='));return raw?raw.trim().slice(name.length+1):'';}
function user(req){const t=cookie(req,'hr_session');if(!/^[a-f0-9]{64}$/.test(t))return null;return db.prepare('SELECT p.id,p.name,p.role,p.active FROM hr_sessions s JOIN hr_people p ON p.id=s.person_id WHERE s.token_hash=? AND s.expires_at>? AND p.active=1').get(hash(t),Date.now());}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function send(res,code,obj,h={}){res.writeHead(code,{...headers,...h});res.end(JSON.stringify(obj));}
function fail(msg,code=400){const e=new Error(msg);e.code=code;throw e;}
async function body(req){let total=0,arr=[];for await(const c of req){total+=c.length;if(total>65000)fail('Contenu trop volumineux.',413);arr.push(c);}try{return JSON.parse(Buffer.concat(arr).toString('utf8')||'{}')}catch{fail('Format de données invalide.');}}
function detail(id,deleted=false){const a=db.prepare('SELECT h.*,p.name interviewer FROM hr_interviews h JOIN hr_people p ON p.id=h.interviewer_id WHERE h.id=? AND '+(deleted?'h.deleted_at IS NOT NULL':'h.deleted_at IS NULL')).get(id);if(!a)return null;return {...mapInterview(a),comments:db.prepare('SELECT c.id,c.note,c.created_at,p.name author FROM hr_comments c JOIN hr_people p ON p.id=c.author_id WHERE c.interview_id=? ORDER BY c.id ASC').all(id),history:db.prepare('SELECT h.kind,h.details,h.created_at,p.name actor FROM hr_history h JOIN hr_people p ON p.id=h.actor_id WHERE h.interview_id=? ORDER BY h.id DESC').all(id)};}
function log(id,uid,kind,details){db.prepare('INSERT INTO hr_history(interview_id,actor_id,kind,details,created_at) VALUES(?,?,?,?,?)').run(id,uid,kind,details,now());}
function requireDirection(p){if(p.role!=='direction')fail('Réservé à la direction.',403);}
const publicRoot=path.join(ROOT,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname,method=req.method,ip=req.socket.remoteAddress||'unknown';
  if(pathname.startsWith('/api/')){
   purgeExpired();
   if(!rate(ip,'all',250,60000))return send(res,429,{error:'Trop de requêtes.'});
   if(!['GET','POST','PATCH','DELETE'].includes(method))return send(res,405,{error:'Méthode interdite.'});
   if(method!=='GET'&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Origine interdite.'});}catch{return send(res,403,{error:'Origine invalide.'});}}
   if(pathname==='/api/people'&&method==='GET')return send(res,200,{people:db.prepare('SELECT id,name,role,active FROM hr_people WHERE active=1 ORDER BY role ASC,id ASC').all().map(personPublic)});
   if(pathname==='/api/session'&&method==='POST'){
    if(!rate(ip,'login',30,15*60000))return send(res,429,{error:'Réessaie plus tard.'});
    const b=await body(req),p=findPerson(Number(b.person_id));if(!p)return send(res,404,{error:'Compte introuvable.'});
    const t=crypto.randomBytes(32).toString('hex'),exp=Date.now()+7*86400000;
    db.prepare('INSERT INTO hr_sessions(token_hash,person_id,expires_at) VALUES(?,?,?)').run(hash(t),p.id,exp);
    return send(res,200,{person:personPublic(p)},{'Set-Cookie':`hr_session=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`});
   }
   if(pathname==='/api/logout'&&method==='POST'){const t=cookie(req,'hr_session');if(t)db.prepare('DELETE FROM hr_sessions WHERE token_hash=?').run(hash(t));return send(res,200,{ok:true},{'Set-Cookie':'hr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});}
   const p=user(req);if(!p)return send(res,401,{error:'Choisis ton profil pour ouvrir la tablette.'});
   if(pathname==='/api/me'&&method==='GET')return send(res,200,{person:personPublic(p)});
   if(pathname==='/api/team'&&method==='GET')return send(res,200,{people:db.prepare('SELECT id,name,role,active,created_at FROM hr_people ORDER BY active DESC,role ASC,id ASC').all().map(personPublic)});
   if(pathname==='/api/team'&&method==='POST'){
    requireDirection(p);const b=await body(req),name=clean(b.name,80),role=clean(b.role,20);
    if(name.length<3||!['direction','recruteur'].includes(role))fail('Renseigne un nom et un rôle valides.');
    try{const result=db.prepare('INSERT INTO hr_people(name,role,active,created_at) VALUES(?,?,1,?)').run(name,role,now());return send(res,201,{id:Number(result.lastInsertRowid)});}catch(e){if(/UNIQUE/.test(e.message))fail('Ce nom existe déjà.');throw e;}
   }
   const teamMatch=pathname.match(/^\/api\/team\/(\d+)$/);
   if(teamMatch&&method==='PATCH'){
    requireDirection(p);const id=Number(teamMatch[1]),b=await body(req),target=db.prepare('SELECT * FROM hr_people WHERE id=?').get(id);if(!target)fail('Compte introuvable.',404);
    if(['Luciana Angel Mars','Blake Mars'].includes(target.name)&&b.active===false)fail('Les profils fondateurs restent actifs.');
    if(id===p.id&&b.active===false)fail('Tu ne peux pas désactiver ton propre compte.');
    const role=b.role===undefined?target.role:clean(b.role,20),active=b.active===undefined?target.active:(b.active?1:0);
    if(!['direction','recruteur'].includes(role))fail('Rôle invalide.');
    db.prepare('UPDATE hr_people SET active=?,role=? WHERE id=?').run(active,role,id);
    if(!active)db.prepare('DELETE FROM hr_sessions WHERE person_id=?').run(id);
    return send(res,200,{ok:true});
   }
   if(pathname==='/api/interviews'&&method==='POST'){
    if(!rate(ip,'new',60,60000))fail('Trop de demandes.',429);
    const b=await body(req),candidate=clean(b.candidate,100),job=clean(b.job,80),a=b.answers;
    if(candidate.length<3||!jobs.includes(job)||!a||typeof a!=='object'||Array.isArray(a))fail('Indique le candidat et le poste.');
    const answers=Object.fromEntries(answerKeys.map(k=>[k,typeof a[k]==='string'?clean(a[k],1500):Array.isArray(a[k])?a[k].filter(x=>typeof x==='string').map(x=>clean(x,100)).slice(0,12):'']));
    if(!answers.why_ltd||!answers.knows_ltd||!answers.invoice||!answers.weekly_hours||!Array.isArray(answers.availability)||!answers.availability.length)fail('Complète les questions obligatoires.');
    const note=clean(b.personal_note,3000),rec=clean(b.recommendation,30);
    if(!recommendations.includes(rec))fail('Avis invalide.');
    const stamp=now(),reference='SS-'+String(Date.now()).slice(-8)+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
    const r=db.prepare('INSERT INTO hr_interviews(reference,candidate,job,answers,personal_note,recommendation,status,interviewer_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(reference,candidate,job,JSON.stringify(answers),note,rec,'recu',p.id,stamp,stamp);
    log(Number(r.lastInsertRowid),p.id,'creation','Entretien enregistré');
    return send(res,201,{id:Number(r.lastInsertRowid),reference});
   }
   if(pathname==='/api/interviews'&&method==='GET'){
    const q=clean(url.searchParams.get('q'),100),status=clean(url.searchParams.get('status'),30),mine=url.searchParams.get('mine')==='1';
    if(status&&!statuses.includes(status))fail('Filtre invalide.');
    const all=db.prepare(`SELECT h.id,h.reference,h.candidate,h.job,h.status,h.recommendation,h.created_at,h.updated_at,h.interviewer_id,h.training_status,p.name interviewer FROM hr_interviews h JOIN hr_people p ON p.id=h.interviewer_id WHERE h.deleted_at IS NULL AND (?='' OR h.status=?) AND (?=0 OR h.interviewer_id=?) AND (?='' OR h.candidate LIKE ? OR h.job LIKE ? OR h.reference LIKE ?) ORDER BY h.id DESC LIMIT 500`).all(status,status,mine?1:0,p.id,q,`%${q}%`,`%${q}%`,`%${q}%`);
    const stats=db.prepare('SELECT status,COUNT(*) count FROM hr_interviews WHERE deleted_at IS NULL GROUP BY status').all();
    return send(res,200,{interviews:all,stats,total:stats.reduce((n,x)=>n+x.count,0)});
   }
   const m=pathname.match(/^\/api\/interviews\/(\d+)$/);
   if(m&&method==='GET'){const a=detail(Number(m[1]));if(!a)fail('Entretien introuvable.',404);return send(res,200,{interview:a});}
   if(m&&method==='PATCH'){
    const id=Number(m[1]),b=await body(req),a=detail(id);if(!a)fail('Entretien introuvable.',404);
    const status=clean(b.status||'',30);if(!statuses.includes(status))fail('Statut invalide.');
    requireDirection(p);
    db.prepare('UPDATE hr_interviews SET status=?,updated_at=? WHERE id=?').run(status,now(),id);
    if(a.status!==status)log(id,p.id,'statut',`${a.status} → ${status}`);
    return send(res,200,{interview:detail(id)});
   }
   if(m&&method==='DELETE'){
    requireDirection(p);const id=Number(m[1]),entry=detail(id);if(!entry)fail('Entretien introuvable.',404);
    if(entry.status!=='refuse')fail('Refuse d’abord cette candidature avant de la supprimer.');
    const stamp=now();log(id,p.id,'suppression','Déplacé dans Supprimés (48 heures)');
    db.prepare('UPDATE hr_interviews SET deleted_at=?,updated_at=? WHERE id=?').run(stamp,stamp,id);
    return send(res,200,{ok:true,deleted_at:stamp});
   }
   if(pathname==='/api/deleted'&&method==='GET'){
    requireDirection(p);
    const all=db.prepare('SELECT h.id,h.reference,h.candidate,h.job,h.status,h.deleted_at,h.created_at,p.name interviewer FROM hr_interviews h JOIN hr_people p ON p.id=h.interviewer_id WHERE h.deleted_at IS NOT NULL ORDER BY h.deleted_at DESC').all();
    return send(res,200,{interviews:all});
   }
   const dm=pathname.match(/^\/api\/deleted\/(\d+)$/);
   if(dm&&method==='GET'){
    requireDirection(p);const a=detail(Number(dm[1]),true);if(!a)fail('Dossier supprimé introuvable.',404);
    return send(res,200,{interview:a});
   }
   const restore=pathname.match(/^\/api\/deleted\/(\d+)\/restore$/);
   if(restore&&method==='POST'){
    requireDirection(p);const id=Number(restore[1]),a=detail(id,true);if(!a)fail('Dossier introuvable ou expiré.',404);
    db.prepare('UPDATE hr_interviews SET deleted_at=NULL,updated_at=? WHERE id=?').run(now(),id);
    log(id,p.id,'restauration','Dossier restauré dans Refusés');
    return send(res,200,{interview:detail(id)});
   }
   const tm=pathname.match(/^\/api\/interviews\/(\d+)\/training$/);
   if(tm&&method==='PATCH'){
    requireDirection(p);const id=Number(tm[1]),a=detail(id);if(!a)fail('Entretien introuvable.',404);
    if(a.status!=='accepte')fail('La formation concerne seulement les candidatures acceptées.');
    const b=await body(req),value=clean(b.training_status,30);
    if(!trainingStatuses.includes(value))fail('Statut de formation inconnu.');
    db.prepare('UPDATE hr_interviews SET training_status=?,updated_at=? WHERE id=?').run(value,now(),id);
    log(id,p.id,'formation','Formation : '+value);
    return send(res,200,{interview:detail(id)});
   }
   const cm=pathname.match(/^\/api\/interviews\/(\d+)\/comments$/);
   if(cm&&method==='POST'){
    const id=Number(cm[1]),a=detail(id);if(!a)fail('Entretien introuvable.',404);
    const b=await body(req),note=clean(b.note,2000);if(note.length<2)fail('Écris un commentaire.');
    db.prepare('INSERT INTO hr_comments(interview_id,author_id,note,created_at) VALUES(?,?,?,?)').run(id,p.id,note,now());
    log(id,p.id,'commentaire','Commentaire ajouté');return send(res,201,{interview:detail(id)});
   }
   return send(res,404,{error:'Page inconnue.'});
  }
  if(!['GET','HEAD'].includes(method)){res.writeHead(405);return res.end();}
  const rel=pathname==='/'?'index.html':decodeURIComponent(pathname).slice(1),file=path.resolve(publicRoot,rel);
  if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Fichier introuvable');}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",'Cache-Control':'no-cache'});res.end(method==='HEAD'?undefined:data);});
 }catch(e){console.error('API',e.message);return send(res,e.code||400,{error:e.message||'Erreur serveur.'});}
}).listen(PORT,'0.0.0.0',()=>console.log('LTD entretien interne disponible sur '+PORT));