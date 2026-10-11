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
export function screen(title,subtitle,content){const u=state.user;const counts={recu:state.items.filter(i=>i.status==='recu').length,accepte:state.items.filter(i=>i.status==='accepte').length,refuse:state.items.filter(i=>i.status==='refuse').length};const nav=[['received','Candidatures reçues',counts.recu],['newV','Nouvel entretien vendeur'],['newP','Nouvel entretien pompiste'],['mine','Mes entretiens'],['accepted','Acceptés',counts.accepte],['refused','Refusés',counts.refuse],...(u.role==='direction'?[['deleted','Supprimés']]:[]),['settings','Paramètres']];$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="logo"><strong>LTD <em>110</em></strong><small>SANDY SHORES</small></div><p class="nav-caption">RECRUTEMENT</p><nav>${nav.map(([key,name,count])=>`<button type="button" class="nav-link ${state.page===key?'current':''}" data-route="${key}"><span>${esc(name)}</span>${count===undefined?'':`<b>${count}</b>`}</button>`).join('')}</nav><div class="identity"><strong>${esc(u.name)}</strong><small>${u.role==='direction'?'Direction':'Recruteur'}</small><button type="button" id="change-user">Changer d’utilisateur</button></div></aside><div class="workspace"><header class="topline"><span>LTD SANDY SHORES <i>/</i> RECRUTEMENT</span><span>${esc(u.name)}</span></header><main class="page"><div class="page-title"><span class="overline">GESTION DES ENTRETIENS</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${content}</main></div></div>`;
 $('#change-user').onclick=async()=>{await api('/api/logout','POST');state.user=null;window.dispatchEvent(new Event('hr-logout'));};
 document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('hr-route',{detail:b.dataset.route}))));
}