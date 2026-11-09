'use strict';
/* Multilingual instructions + English-only staff maintenance records.
   Requires OPENAI_API_KEY in Supabase for automated translation of full content.
   No API key, personal contact data, or property secrets appear in this file. */
(() => {
 if (typeof s==='undefined' || typeof render!=='function' || typeof api!=='function' || typeof root==='undefined') return;
 const languages=[['en','English'],['fil','Filipino / Tagalog'],['ceb','Cebuano / Bisaya'],['ilo','Ilocano'],['hil','Hiligaynon / Ilonggo']];
 const messages={
  en:'Instructions are in English.',
  fil:'Ang mga tagubilin ay mananatili sa Ingles hangga’t hindi nakahanda ang serbisyo ng pagsasalin.',
  ceb:'Ang mga instruksyon magpabilin sa English hangtod maandam ang serbisyo sa paghubad.',
  ilo:'English pay laeng dagiti instruksion agingga a naisagana ti panagipatarus.',
  hil:'Magapabilin sa English ang mga instruksyon tubtob nga ma-configure ang paghubad.'
 };
 let count=0;
 const prevRender=render,prevApi=api;
 api=async function compendiumApi(action,payload=null){
  if(action==='ticket'&&payload){
   const select=root.querySelector('[name="input_language"]');
   return prevApi(action,{...payload,input_language:select?.value||'en'});
  }
  return prevApi(action,payload);
 };
 const addRequestLanguage=()=>{
  if(s.tab!=='ticket')return;
  const form=root.querySelector('form[data-form="ticket"]');
  if(!form||form.querySelector('[name="input_language"]'))return;
  const parent=document.createElement('div');parent.className='cp-ticket-language';parent.setAttribute('data-translate-no','');
  const label=document.createElement('label');label.textContent='Language used to describe the problem';label.htmlFor='request-language';
  const select=document.createElement('select');select.id='request-language';select.name='input_language';
  languages.forEach(([key,name])=>{
   const option=document.createElement('option');option.value=key;option.textContent=name;
   if(key!=='en'&&!s.translation_available)option.disabled=true;
   select.appendChild(option);
  });
  select.value=s.translation_available&&languages.some(([code])=>code===s.language)?s.language:'en';
  const help=document.createElement('small');
  help.textContent=s.translation_available?'Write in any supported language. Your request will be translated and saved in English for maintenance staff. Translation may take a few seconds.':'Maintenance requests are saved in English. Until automatic translation is configured, please write the problem in English or ask the accommodation team for help.';
  parent.append(label,select,help);
  const details=form.querySelector('textarea[name="details"]')?.closest('.field');
  if(details)details.after(parent);else form.prepend(parent);
 };
 function scan(){
  const rootScope=root.querySelector('.wrap');if(!rootScope)return [];
  const walker=document.createTreeWalker(rootScope,NodeFilter.SHOW_TEXT);
  const found=[];let node;
  while(node=walker.nextNode()){
   const text=node.nodeValue.trim();
   if(text.length<3||text.length>650||!/[a-zA-Z]/.test(text))continue;
   const parent=node.parentElement;
   if(!parent||parent.closest('[data-translate-no],.cp-pending,.cp-house-details,.house-maintenance-section,.house-maintenance-item,.media-grid,.receipt,.cp-translation-status,.emergency a,script,style,textarea,select,option,pre,code,.footer,.notice.success'))continue;
   if(/^[0-9\s\W]+$/.test(text)||text.includes('@')||[s.house?.name,s.house?.address,s.house?.emergency_contact_name,s.house?.emergency_contact_number].filter(Boolean).includes(text))continue;
   found.push({node,source:text});
   if(found.length>=75)break;
  }
  return found;
 }
 function status(message,isSuccess=false){
  const scope=root.querySelector('.wrap');if(!scope)return;
  let block=scope.querySelector('.cp-translation-status');
  if(!block){block=document.createElement('div');block.className='cp-translation-status';const hero=scope.querySelector('.hero');if(hero)hero.after(block);else scope.prepend(block);}
  block.classList.toggle('success',isSuccess);block.textContent=message;
 }
 async function translatePage(version){
  if(s.language==='en'){root.querySelector('.cp-translation-status')?.remove();return;}
  const lang=s.language,items=scan();
  if(!items.length)return;
  if(!s.live||!s.translation_available){status(messages[lang]||'Instructions are shown in English. Automatic translations are unavailable.');return;}
  status('Translating instructions… The original English version is available for safety-critical checks.');
  try{
   const response=await api('translate-guidance',{language:lang,items:items.map(x=>x.source)});
   if(version!==count||lang!==s.language||!Array.isArray(response.items)||response.items.length!==items.length)return;
   items.forEach((item,i)=>{if(item.node.isConnected && typeof response.items[i]==='string')item.node.nodeValue=item.node.nodeValue.replace(item.source,response.items[i]);});
   status('Instructions translated automatically. For electrical, gas, septic or other safety risks, refer to the original English instructions and contact maintenance.');
   const area=root.querySelector('.wrap');
   if(area&&!area.querySelector('.cp-original-instructions')){
    const details=document.createElement('details');details.className='card cp-original-instructions';
    const summary=document.createElement('summary');summary.textContent='Read original English instructions';details.appendChild(summary);
    const group=document.createElement('div');group.className='cp-original-text';
    items.filter(x=>x.source.length>15).forEach(x=>{const p=document.createElement('p');p.textContent=x.source;group.appendChild(p);});
    details.appendChild(group);area.appendChild(details);
   }
  }catch(err){if(version===count)status(messages[lang]||'Translation unavailable; English instructions shown.');}
 }
 render=function multilingualRender(){prevRender();addRequestLanguage();const version=++count;void translatePage(version);};
 if(s.house)render();
})();
