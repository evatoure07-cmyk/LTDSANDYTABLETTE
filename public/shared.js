export const $=(selector)=>document.querySelector(selector);
export const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const date=(value)=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
export const statuses={recu:'Reçue',accepte:'Acceptée',refuse:'Refusée'};
export const training={en_attente:'En attente de formation',planifiee:'Formation planifiée',terminee:'Formation terminée'};
export const advice={favorable:'Favorable',reserve:'Mitigé',defavorable:'Défavorable',a_etudier:'Sans avis'};
export const state={user:null,items:[],page:'received'};
export const questions=[
 {title:'Faisons connaissance',items:[
  ['about','Pouvez-vous vous présenter ?','long',null,true],
  ['current_employment','Travaillez-vous actuellement dans une entreprise ou occupez-vous déjà un poste ?','single',['Oui','Non'],true],
  ['residence','Depuis combien de temps habitez-vous dans l’État ?','single',['Moins d’un mois','1 à 6 mois','6 mois à 12 mois','Plus d’un an'],true],
  ['driver_license','Possédez-vous le permis de conduire ?','single',['Oui','Non'],true]
 ]},
 {title:'Votre expérience et vos motivations',items:[
  ['worked_ltd','Avez-vous déjà travaillé dans un LTD ?','single',['Oui','Non'],true],
  ['knows_ltd','Savez-vous comment fonctionne un LTD ?','single',['Oui','J’ai quelques bases','Non'],true],
  ['invoice','Savez-vous établir une facture ?','single',['Oui','Non'],true],
  ['why_ltd','Pourquoi souhaitez-vous rejoindre le LTD Sandy Shores ?','long',null,true]
 ]},
 {title:'Vos disponibilités',items:[
  ['availability','Quels jours êtes-vous disponible ?','multi',['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'],true],
  ['time_slots','À quels moments de la journée ?','multi',['Matin','Après-midi','Soirée','Nuit']],
  ['weekly_hours','Combien d’heures pouvez-vous travailler à peu près par semaine ?','single',['Moins de 3 heures','3 à 6 heures','7 à 10 heures','Plus de 10 heures'],true]
 ]}
];
export const jobQuestions={
 Vendeur:{title:'Contact client et situations — Vendeur',items:[
  ['sales_contact','Êtes-vous à l’aise avec le contact client ?','single',['Oui','Non'],true],
  ['sales_help','Un client ne trouve pas le produit qu’il cherche. Que faites-vous ?','multi',['Je lui demande ce qu’il recherche','Je vérifie les produits disponibles','Je lui propose une alternative','Je demande de l’aide si nécessaire'],true],
  ['sales_price','Un client conteste le prix d’un article. Comment réagissez-vous ?','long',null,true],
  ['sales_busy','Vous êtes occupé(e) et un client arrive. Comment gérez-vous la situation ?','long']
 ]},
 Pompiste:{title:'Contact client et situations — Pompiste',items:[
  ['pump_contact','Êtes-vous à l’aise pour accueillir et renseigner les clients ?','single',['Oui','Non'],true],
  ['pump_order','Un client demande plusieurs bidons de carburant. Que vérifiez-vous ?','multi',['La quantité souhaitée','La disponibilité des bidons','Le prix total','La bonne préparation de la commande'],true],
  ['pump_problem','Un client pense qu’il y a une erreur de quantité ou de prix. Que faites-vous ?','long',null,true]
 ]}
};
export const questionsFor=(job)=>[...questions,...(jobQuestions[job]?[jobQuestions[job]]:[])].flatMap(group=>group.items);
export async function api(url,method='GET',data){const resp=await fetch(url,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const json=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(json.error||'Erreur serveur');return json;}
export function notice(message,error=false){const box=$('#notice');box.textContent=message;box.className=error?'notice visible danger':'notice visible';setTimeout(()=>box.className='notice',4500);}
export function tag(key){return `<span class="tag ${esc(key)}">${esc(statuses[key]||key)}</span>`;}
const symbolPaths={
 received:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
 newV:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h3M9 16h6"/>',
 newP:'<path d="M5 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h16M7 8h8M7 12h5M17 10h2a2 2 0 0 1 2 2v5a2 2 0 0 1-4 0"/>',
 mine:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',
 accepted:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 refused:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
 deleted:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a2 2 0 0 0 .4 2.2l-1.7 1.7a2 2 0 0 0-2.2-.4l-1 2h-2.9l-1-2a2 2 0 0 0-2.2.4l-1.7-1.7a2 2 0 0 0 .4-2.2l-2-1v-2.9l2-1a2 2 0 0 0-.4-2.2l1.7-1.7a2 2 0 0 0 2.2.4l1-2h2.9l1 2a2 2 0 0 0 2.2-.4l1.7 1.7a2 2 0 0 0-.4 2.2l2 1v2.9z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
 moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/>',
 arrow:'<path d="m9 18 6-6-6-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>'
};
export const iconSvg=(name,size=19)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbolPaths[name]||symbolPaths.received}</svg>`;
const themeKey='ltd-sandy-shores-hr-theme';
export function initTheme(){let selected='dark';try{selected=localStorage.getItem(themeKey)==='light'?'light':'dark';}catch{}document.documentElement.dataset.theme=selected;}
export function bindThemeToggle(){const btn=$('#theme-toggle');if(!btn)return;const render=()=>{const light=document.documentElement.dataset.theme==='light';btn.innerHTML=iconSvg(light?'moon':'sun',18);btn.setAttribute('aria-label',light?'Passer en mode sombre':'Passer en mode clair');btn.title=light?'Mode sombre':'Mode clair';};render();btn.onclick=()=>{const light=document.documentElement.dataset.theme==='light';document.documentElement.dataset.theme=light?'dark':'light';try{localStorage.setItem(themeKey,light?'dark':'light');}catch{}render();};}
export function screen(title,subtitle,content){
 const u=state.user;const counts={recu:state.items.filter(i=>i.status==='recu').length,accepte:state.items.filter(i=>i.status==='accepte').length,refuse:state.items.filter(i=>i.status==='refuse').length};
 const groups=[
  {label:'RECRUTEMENT',items:[['received','Candidatures reçues',counts.recu],['newV','Nouvel entretien vendeur'],['newP','Nouvel entretien pompiste'],['mine','Mes entretiens']]},
  {label:'SUIVI DES DOSSIERS',items:[['accepted','Acceptés',counts.accepte],['refused','Refusés',counts.refuse],...(u.role==='direction'?[['deleted','Supprimés']]:[])]},
  {label:'ADMINISTRATION',items:[['settings','Paramètres']]}
 ];
 const nav=groups.map(g=>`<div class="nav-group"><p class="nav-caption">${g.label}</p><nav>${g.items.map(([key,label,count])=>`<button type="button" class="nav-link ${state.page===key?'current':''}" data-route="${key}">${iconSvg(key,19)}<span class="nav-text">${esc(label)}</span>${count===undefined?'':`<b>${count}</b>`}</button>`).join('')}</nav></div>`).join('');
 const initials=u.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 const buttons=state.page==='received'?`<div class="page-quick"><button class="secondary quick-link" data-route="newV">${iconSvg('plus',17)} Entretien vendeur</button><button class="primary quick-link" data-route="newP">${iconSvg('plus',17)} Entretien pompiste</button></div>`:'';
 $('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="sidebar-brand"><span class="brand-mark">LTD</span><div class="brand-copy"><small>SANDY SHORES</small><strong>Recrutement</strong></div></div><div class="sidebar-divider"></div>${nav}<div class="identity"><div class="user-avatar">${esc(initials)}</div><div class="user-copy"><strong>${esc(u.name)}</strong><small>${u.role==='direction'?'Direction':'Recruteur'}</small></div><button type="button" id="change-user" title="Changer d’utilisateur" aria-label="Changer d’utilisateur">${iconSvg('arrow',17)}</button></div></aside><div class="workspace"><header class="topline"><span class="crumb">LTD SANDY SHORES <i>/</i> ESPACE RECRUTEMENT</span><div class="top-actions"><span class="header-account"><span class="user-dot"></span>${esc(u.name)}</span><button type="button" class="theme-toggle" id="theme-toggle"></button></div></header><main class="page"><div class="page-title"><div><span class="overline">LTD SANDY SHORES  /  ENTRETIENS</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${buttons}</div>${content}</main></div></div>`;
 bindThemeToggle();
 $('#change-user').onclick=async()=>{await api('/api/logout','POST');state.user=null;window.dispatchEvent(new Event('hr-logout'));};
 document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('hr-route',{detail:b.dataset.route}))));
}