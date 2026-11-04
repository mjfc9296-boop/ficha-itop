(()=>{'use strict';
 const $=id=>document.getElementById(id),steps={sondagem:1,pacote:2,fechamento:3};
 let api=null,required=true,ready=false,record=null,stage=1,closed=false,busy=false,bypass=false,identity=false,epoch=0;
 const say=t=>{for(const el of document.querySelectorAll('.itop-flow-message'))el.textContent=t;let near=$('itop-next-message');if(!near&&document.createElement){near=document.createElement('p');near.id='itop-next-message';near.setAttribute('role','status');near.setAttribute('aria-live','polite');near.style.cssText='flex-basis:100%;margin:8px 0;font-weight:600;color:#00134C';$('itop-add-servicos-destaque')?.closest?.('.itop-one-line-actions')?.insertAdjacentElement?.('afterend',near);}if(near)near.textContent=t;};
 const hasData=()=>window.ITOPCommercialBridge?.hasData();
 function lockIdentity(lock){for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor']){const el=$(id);if(el)el.readOnly=lock||['pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'].includes(id);}identity=lock;}
 function validObservation(){const v=$('survey-result').value.replace(/[\s\u200B-\u200D\uFEFF]/g,'');return Array.from(v).length>=2&&Array.from($('survey-result').value).length<=500&&!/^[\s\u200B-\u200D\uFEFF]*$/.test(v);}
 function refresh(){for(const el of document.querySelectorAll('.itop-sales-flow'))el.hidden=!required;
  const labels=closed?'Proposta concluída. Você já pode iniciar outra.':'Etapa '+stage+' de 3 · conclua o diagnóstico antes de abrir outra proposta.';
  for(const el of document.querySelectorAll('.itop-flow-progress'))el.textContent=labels;
  for(const id of ['itop-flow-finish','itop-flow-diagnosis'])$(id).disabled=!ready||closed||busy||stage<3;
  $('itop-flow-finish').disabled=!ready||closed||busy||stage<3||!$('itop-flow-diagnosis').value||!validObservation();$('itop-flow-new').disabled=!ready||busy;
  for(const tab of document.querySelectorAll('.nav-tab[data-module]')){const n=steps[tab.dataset.module];if(required&&n>stage){tab.dataset.flowLocked='true';tab.title='Conclua a etapa '+(n-1)+' antes de continuar';}else{delete tab.dataset.flowLocked;tab.removeAttribute('title');}}
  if(required)lockIdentity(stage>1||closed);
 }
 function restore(s){if(!required)return;record=s?.id||null;stage=Number(s?.fluxo_etapa)||1;closed=!!s?.diagnostico_final;
  const c=s?.checklist_final||{};for(const k of ['cliente','produtos','condicoes'])$('itop-flow-check-'+k).checked=!!c[k];$('itop-flow-diagnosis').value=s?.diagnostico_final||'';refresh();
 }
 function onSaved(r){if(!required)return;record=r.id;stage=Number(r.fluxo_etapa)||stage;closed=!!r.diagnostico_final;refresh();}
 async function configure(options){api=options;const version=++epoch;ready=false;required=['vendedor','administrador','supervisor','coordenador'].includes(options.role);record=null;stage=1;closed=false;refresh();if(!required){for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'])$(id).readOnly=false;ready=true;refresh();return;}
  try{const ctx=await api.rpc('itop_fluxo_contexto');if(version!==epoch)return;if(ctx.proposta)await api.load(ctx.proposta.id);else api.reset?.();ready=true;refresh();say(ctx.proposta?'Proposta aberta recuperada. Continue a partir da etapa registrada.':'Comece pelos dados do cliente na etapa 1.');}
  catch(e){say('Não foi possível conferir a proposta aberta. O avanço permanece bloqueado: '+e.message);}
 }
 async function run(fn){if(busy)return;busy=true;refresh();try{await fn();}catch(e){say(e.message);showErrors(e);}finally{busy=false;refresh();}}
 function move(id){bypass=true;try{window.switchModule(id);}finally{bypass=false;}}
 function surveyErrors(){return [
  ['clienteItop',['sim','nao'].includes($('clienteItop').value),'Favor selecionar JÁ É CLIENTE ITOP ou NOVO CLIENTE.'],
  ['vendedor',window.ITOPApprovedOperator.valid(),'Favor preencher o operador com o primeiro nome do cadastro aprovado.'],
  ['nome',$('nome').value.trim().length>=2,'Favor preencher o nome do cliente (mínimo de 2 caracteres).'],
  ['cidade',$('clienteItop').value==='sim'||$('cidade').value.trim().length>=2,'Favor preencher a cidade do cliente (mínimo de 2 caracteres).'],
  ['telefone',/^\d{10,11}$/.test($('telefone').value.replace(/\D/g,'')),'Favor preencher o campo WhatsApp com DDD (10 ou 11 dígitos).']
 ].filter(([id,valid])=>{$(id)?.setAttribute?.('aria-invalid',String(!valid));return !valid;}).map(([id,,message])=>({id,message}));}
 function validSurvey(){const fields=surveyErrors();if(fields.length){const error=Error(fields.map(f=>f.message).join('\n'));error.fields=fields;throw error;}}
 let errorDialog=null,errorTarget=null;
 function focusError(){const el=errorTarget&&$(errorTarget);el?.focus?.();el?.scrollIntoView?.({behavior:'smooth',block:'center'});}
 function showErrors(error){const fields=error.fields||[{message:error.message}];errorTarget=fields.find(f=>f.id)?.id||null;
  if(!document.createElement){window.alert?.(fields.map(f=>f.message).join('\n'));focusError();return;}
  if(!errorDialog){
   errorDialog=document.createElement('dialog');errorDialog.id='itop-flow-error-dialog';errorDialog.setAttribute('aria-labelledby','itop-flow-error-title');errorDialog.setAttribute('aria-describedby','itop-flow-error-description');errorDialog.style.cssText='width:min(520px,92vw);max-height:85vh;overflow:auto;padding:24px;border:2px solid #D27A2F;border-radius:16px;background:#fff;color:#00134C;box-shadow:0 20px 80px #0006';
   errorDialog.innerHTML='<h2 id="itop-flow-error-title" style="margin:0 0 12px">Não foi possível avançar</h2><p id="itop-flow-error-description">Confira as pendências abaixo e corrija para continuar.</p><ul id="itop-flow-error-list" style="padding-left:22px;line-height:1.7"></ul><button type="button" autofocus style="padding:12px 20px;border:0;border-radius:10px;background:#D27A2F;color:#fff;font-weight:700;cursor:pointer">CORRIGIR CAMPOS</button>';
   errorDialog.querySelector('button').addEventListener('click',()=>errorDialog.close());errorDialog.addEventListener('close',focusError);document.body.append(errorDialog);
   const style=document.createElement('style');style.textContent='#itop-flow-error-dialog::backdrop{background:#0009}#sondagem [aria-invalid="true"]{outline:2px solid #b42318;outline-offset:2px}';document.head.append(style);
  }
  const list=errorDialog.querySelector('ul');list.replaceChildren();for(const field of fields){const li=document.createElement('li');li.textContent=field.message;list.append(li);}
  if(!errorDialog.open)errorDialog.showModal();
 }
 function allowNavigation(id){if(window.ITOPBudget?.active&&id==='pacote')return true;if(window.ITOPBudget?.active&&id==='fechamento'){say('Use CONVERTER EM VENDA no orçamento para completar os dados e o checklist.');return false;}if(bypass||!required||!steps[id])return true;if(!ready){say('Aguarde a conferência da proposta aberta.');return false;}if(id==='sondagem'&&closed){startNew();return false;}const target=steps[id];if(target<=stage)return true;
  if(closed){say('Esta proposta já foi concluída. Use Nova proposta na etapa 1.');return false;}
  if(target!==stage+1){say('Siga a sequência: primeiro a Sondagem, depois Adicionar produtos e por último o Fechamento.');move(stage===1?'sondagem':'pacote');return false;}
  run(async()=>{if(target===2)validSurvey();
   await api.save();const s=api.sync();const result=await api.rpc('itop_avancar_etapa',{p_id:s.id,p_versao:s.version,p_etapa:target});await api.load(result.id);restore(result);move(id);say('Etapa '+target+' liberada.');});return false;
 }
 function canClear(){if(!required)return true;if(!ready){say('Aguarde a conferência da proposta aberta.');return false;}if(closed){say('Use Nova proposta na etapa 1 para começar outro atendimento.');return false;}if(record||hasData()){say('Finalize esta proposta na etapa 3, escolhendo o status e preenchendo as observações, antes de iniciar outra.');move(stage===3?'fechamento':stage===2?'pacote':'sondagem');return false;}return true;}
 async function startNew(){if(!required)return api.reset();await run(async()=>{if(!closed&&!canClear())return;const context=await api.rpc('itop_fluxo_contexto');if(context.proposta){await api.load(context.proposta.id);throw Error('Há uma proposta aberta. Finalize a sondagem final antes de iniciar outra.');}
  for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'])$(id).readOnly=false;api.reset();record=null;stage=1;closed=false;restore(null);move('sondagem');say('Nova proposta. Comece pela etapa 1.');});}
 function canLoad(id){if(required&&!closed&&record&&record!==id){say('Finalize a sondagem da proposta aberta antes de abrir outra.');return false;}return true;}
 async function finish(){if(!required||!ready||closed)return;await run(async()=>{
  validSurvey();if($('cidade').value.trim().length<2)throw Error('Preencha a cidade do cliente antes do fechamento.');if(stage!==3)throw Error('Conclua as etapas 1 e 2 antes do fechamento.');const checklist=Object.fromEntries(['cliente','produtos','condicoes'].map(k=>[k,$('itop-flow-check-'+k).checked]));
  if(!validObservation())throw Error('Preencha as observações com 2 a 500 caracteres válidos.');const diagnosis=$('itop-flow-diagnosis').value;if(!diagnosis)throw Error('Selecione Venda fechada, Desistência ou Cliente ficou de pensar.');
  await api.save();const s=api.sync();const result=await api.rpc('itop_concluir_proposta',{p_id:s.id,p_versao:s.version,p_diagnostico:diagnosis,p_checklist:checklist});await api.load(result.id);restore(result);
  say(diagnosis==='venda_fechada'?'Venda fechada registrada. A confirmação comercial será validada pela gestão. Você já pode iniciar outra proposta.':'Diagnóstico registrado. Você já pode iniciar outra proposta.');
 });}
 document.addEventListener('input',e=>{if(e.target.id==='survey-result')refresh();if(e.target.closest?.('#sondagem')&&e.target.getAttribute?.('aria-invalid')==='true'&&['clienteItop','nome','cidade','telefone','vendedor'].includes(e.target.id))surveyErrors();});document.addEventListener('change',e=>{if(e.target.id==='itop-flow-diagnosis')refresh();});
 document.addEventListener('click',e=>{if(e.target.closest('#itop-flow-new'))startNew();if(e.target.closest('#itop-flow-finish'))finish();});
 window.addEventListener('itop:logged-out',()=>{errorTarget=null;errorDialog?.close();++epoch;ready=false;required=true;record=null;stage=1;closed=false;api=null;refresh();});
 window.ITOPSalesFlow=Object.freeze({configure,restore,onSaved,allowNavigation,canClear,canLoad,startNew,canSave(){return ready&&!busy;},canRecover(){return !busy&&ready&&(closed||(!record&&!hasData()));}});refresh();
})();



