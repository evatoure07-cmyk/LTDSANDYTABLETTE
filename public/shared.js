export const $=(selector)=>document.querySelector(selector);
export const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const date=(value)=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
export const statuses={recu:'Reçue',accepte:'Acceptée',refuse:'Refusée'};
export const training={en_attente:'En attente de formation',planifiee:'Formation planifiée',terminee:'Formation terminée'};
export const advice={favorable:'Favorable',reserve:'Mitigé',defavorable:'Défavorable',a_etudier:'Sans avis'};
export const state={user:null,items:[],page:'received'};
export const questions=[
 {title:'Faire connaissance',items:[
  ['age','Quel âge avez-vous ?','short'],
  ['about','Pouvez-vous vous présenter ?','long'],
  ['daily_life','Quelles sont vos occupations au quotidien ?','multi',['Emploi','Études','Activités personnelles','Projets professionnels','Autre']],
  ['residence','Depuis combien de temps habitez-vous dans l’État ?','single',['Moins d’un mois','1 à 6 mois','6 mois à 1 an','Plus d’un an']]
 ]},
 {title:'Votre expérience du LTD',items:[
  ['work_experience','Avez-vous déjà travaillé dans une entreprise ?','single',['Oui','Non']],
  ['work_domains','Dans quels domaines avez-vous de l’expérience ?','multi',['Vente','Station-service','Service client','Livraison','Gestion de stock','Aucun']],
  ['knows_ltd','Savez-vous comment fonctionne un LTD ?','single',['Oui, très bien','J’ai quelques bases','Pas encore'],true],
  ['invoice','Savez-vous établir une facture ?','single',['Oui, en autonomie','Avec de l’aide','Pas encore'],true],
  ['skills','Quelles tâches savez-vous faire ?','multi',['Accueillir un client','Encaisser','Préparer une commande','Gérer le stock','Faire un plein','Faire une facture']],
  ['why_ltd','Pourquoi souhaitez-vous rejoindre le LTD Sandy Shores ?','long',null,true]
 ]},
 {title:'Disponibilités',items:[
  ['availability','Quels jours êtes-vous disponible ?','multi',['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'],true],
  ['time_slots','À quels moments de la journée ?','multi',['Matin','Après-midi','Soirée','Nuit']],
  ['weekly_hours','Combien d’heures pouvez-vous travailler par semaine ?','single',['Moins de 3 heures','3 à 6 heures','7 à 10 heures','Plus de 10 heures'],true],
  ['strengths','Quelles qualités vous correspondent ?','multi',['Ponctuel(le)','Autonome','Organisé(e)','Sociable','Patient(e)','À l’écoute']]
 ]}
];
export const jobQuestions={
 Vendeur:{title:'Le poste de vendeur',items:[
  ['sales_cash','Êtes-vous à l’aise avec une caisse ?','single',['Oui','Un peu','Pas encore']],
  ['sales_tasks','Quelles missions connaissez-vous ?','multi',['Conseiller','Faire des factures','Encaisser','Fabriquer','Gérer les rayons','Vérifier les stocks']]
 ]},
 Pompiste:{title:'Le poste de pompiste',items:[
  ['pump_experience','Avez-vous déjà travaillé dans une station-service ?','single',['Oui','Non']],
  ['pump_tasks','Quelles missions connaissez-vous ?','multi',['Remplir un réservoir','Utiliser une pompe','Gérer les bidons','Vérifier le carburant','Faire une facture','Accueillir les clients']]
 ]}
};
export const questionsFor=(job)=>[...questions,...(jobQuestions[job]?[jobQuestions[job]]:[])].flatMap(group=>group.items);
export async function api(url,method='GET',data){const resp=await fetch(url,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const json=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(json.error||'Erreur serveur');return json;}
export function notice(message,error=false){const box=$('#notice');box.textContent=message;box.className=error?'notice visible danger':'notice visible';setTimeout(()=>box.className='notice',4500);}
export function tag(key){return `<span class="tag ${esc(key)}">${esc(statuses[key]||key)}</span>`;}
export function screen(title,subtitle,content){const u=state.user;const counts={recu:state.items.filter(i=>i.status==='recu').length,accepte:state.items.filter(i=>i.status==='accepte').length,refuse:state.items.filter(i=>i.status==='refuse').length};const nav=[['received','Candidatures reçues',counts.recu],['newV','Nouvel entretien vendeur'],['newP','Nouvel entretien pompiste'],['mine','Mes entretiens'],['accepted','Acceptés',counts.accepte],['refused','Refusés',counts.refuse],...(u.role==='direction'?[['deleted','Supprimés']]:[]),['settings','Paramètres']];$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="logo"><strong>LTD <em>110</em></strong><small>SANDY SHORES</small></div><p class="nav-caption">RECRUTEMENT</p><nav>${nav.map(([key,name,count])=>`<button type="button" class="nav-link ${state.page===key?'current':''}" data-route="${key}"><span>${esc(name)}</span>${count===undefined?'':`<b>${count}</b>`}</button>`).join('')}</nav><div class="identity"><strong>${esc(u.name)}</strong><small>${u.role==='direction'?'Direction':'Recruteur'}</small><button type="button" id="change-user">Changer d’utilisateur</button></div></aside><div class="workspace"><header class="topline"><span>LTD SANDY SHORES <i>/</i> RECRUTEMENT</span><span>${esc(u.name)}</span></header><main class="page"><div class="page-title"><span class="overline">GESTION DES ENTRETIENS</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${content}</main></div></div>`;
 $('#change-user').onclick=async()=>{await api('/api/logout','POST');state.user=null;window.dispatchEvent(new Event('hr-logout'));};
 document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('hr-route',{detail:b.dataset.route}))));
}