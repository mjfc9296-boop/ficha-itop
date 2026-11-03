(()=>{'use strict';
 const $=id=>document.getElementById(id),steps={sondagem:1,pacote:2,fechamento:3};
 let api=null,required=true,ready=false,record=null,stage=1,closed=false,busy=false,bypass=false,identity=false,epoch=0;
 const say=t=>{for(const el of document.querySelectorAll('.itop-flow-message'))el.textContent=t;};
 const hasData=()=>window.ITOPCommercialBridge?.hasData();
 function lockIdentity(lock){for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor']){const el=$(id);if(el)el.readOnly=lock||['pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'].includes(id);}identity=lock;}
 function refresh(){for(const el of document.querySelectorAll('.itop-sales-flow'))el.hidden=!required;
  const labels=closed?'Proposta concluída. Você já pode iniciar outra.':'Etapa '+stage+' de 3 · conclua o diagnóstico antes de abrir outra proposta.';
  for(const el of document.querySelectorAll('.itop-flow-progress'))el.textContent=labels;
  for(const id of ['itop-flow-finish','itop-flow-diagnosis'])$(id).disabled=!ready||closed||busy||stage<3;
  $('itop-flow-new').disabled=!ready||busy;
  for(const tab of document.querySelectorAll('.nav-tab[data-module]')){const n=steps[tab.dataset.module];if(required&&n>stage){tab.dataset.flowLocked='true';tab.title='Conclua a etapa '+(n-1)+' antes de continuar';}else{delete tab.dataset.flowLocked;tab.removeAttribute('title');}}
  if(required)lockIdentity(stage>1||closed);
 }
 function restore(s){if(!required)return;record=s?.id||null;stage=Number(s?.fluxo_etapa)||1;closed=!!s?.diagnostico_final;
  const c=s?.checklist_final||{};for(const k of ['cliente','produtos','condicoes'])$('itop-flow-check-'+k).checked=!!c[k];$('itop-flow-diagnosis').value=s?.diagnostico_final||'';refresh();
 }
 function onSaved(r){if(!required)return;record=r.id;stage=Number(r.fluxo_etapa)||stage;closed=!!r.diagnostico_final;refresh();}
 async function configure(options){api=options;const version=++epoch;ready=false;required=options.role==='vendedor';record=null;stage=1;closed=false;refresh();if(!required){for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'])$(id).readOnly=false;ready=true;refresh();return;}
  try{const ctx=await api.rpc('itop_fluxo_contexto');if(version!==epoch)return;if(ctx.proposta)await api.load(ctx.proposta.id);ready=true;refresh();say(ctx.proposta?'Proposta aberta recuperada. Continue a partir da etapa registrada.':'Comece pelos dados do cliente na etapa 1.');}
  catch(e){say('Não foi possível conferir a proposta aberta. O avanço permanece bloqueado: '+e.message);}
 }
 async function run(fn){if(busy)return;busy=true;refresh();try{await fn();}catch(e){say(e.message);}finally{busy=false;refresh();}}
 function move(id){bypass=true;try{window.switchModule(id);}finally{bypass=false;}}
 function validSurvey(){if(!window.ITOPApprovedOperator.valid())throw Error('Informe o primeiro nome do operador conforme o cadastro aprovado.');
  if($('nome').value.trim().length<2||$('cidade').value.trim().length<2||!/^\d{10,11}$/.test($('telefone').value.replace(/\D/g,'')))throw Error('Conclua a etapa 1: nome do cliente, WhatsApp com DDD e cidade.');}
 function allowNavigation(id){if(bypass||!required||!steps[id])return true;if(!ready){say('Aguarde a conferência da proposta aberta.');return false;}const target=steps[id];if(target<=stage)return true;
  if(closed){say('Esta proposta já foi concluída. Use Nova proposta na etapa 1.');return false;}
  if(target!==stage+1){say('Siga a sequência: primeiro a Sondagem, depois Adicionar produtos e por último o Fechamento.');move(stage===1?'sondagem':'pacote');return false;}
  run(async()=>{if(target===2)validSurvey();if(target===3&&window.ITOPCommercialBridge.snapshot().escolhidos.length===0)throw Error('Selecione pelo menos um produto na etapa 2 antes de abrir o fechamento.');
   await api.save();const s=api.sync();const result=await api.rpc('itop_avancar_etapa',{p_id:s.id,p_versao:s.version,p_etapa:target});await api.load(result.id);restore(result);move(id);say('Etapa '+target+' liberada.');});return false;
 }
 function canClear(){if(!required)return true;if(!ready){say('Aguarde a conferência da proposta aberta.');return false;}if(closed){say('Use Nova proposta na etapa 1 para começar outro atendimento.');return false;}if(record||hasData()){say('Conclua esta proposta na etapa 3, preenchendo o checklist e o diagnóstico final, antes de iniciar outra.');move(stage===3?'fechamento':stage===2?'pacote':'sondagem');return false;}return true;}
 async function startNew(){if(!required)return api.reset();await run(async()=>{if(!closed&&!canClear())return;const context=await api.rpc('itop_fluxo_contexto');if(context.proposta){await api.load(context.proposta.id);throw Error('Há uma proposta aberta. Conclua o diagnóstico final antes de iniciar outra.');}
  for(const id of ['nome','telefone','pacoteNome','pacoteTelefone','pacoteCidade','pacoteVendedor'])$(id).readOnly=false;api.reset();record=null;stage=1;closed=false;restore(null);move('sondagem');say('Nova proposta. Comece pela etapa 1.');});}
 function canLoad(id){if(required&&!closed&&record&&record!==id){say('Conclua o diagnóstico da proposta aberta antes de abrir outra.');return false;}return true;}
 async function finish(){if(!required||!ready||closed)return;await run(async()=>{
  if(stage!==3)throw Error('Conclua as etapas 1 e 2 antes do fechamento.');const checklist=Object.fromEntries(['cliente','produtos','condicoes'].map(k=>[k,$('itop-flow-check-'+k).checked]));
  if(Object.values(checklist).some(v=>!v))throw Error('Marque todos os itens do checklist final.');const diagnosis=$('itop-flow-diagnosis').value;if(!diagnosis)throw Error('Selecione Venda fechada, Desistência ou Cliente ficou de pensar.');
  await api.save();const s=api.sync();const result=await api.rpc('itop_concluir_proposta',{p_id:s.id,p_versao:s.version,p_diagnostico:diagnosis,p_checklist:checklist});await api.load(result.id);restore(result);
  say(diagnosis==='venda_fechada'?'Venda fechada registrada. A confirmação comercial será validada pela gestão. Você já pode iniciar outra proposta.':'Diagnóstico registrado. Você já pode iniciar outra proposta.');
 });}
 document.addEventListener('click',e=>{if(e.target.closest('#itop-flow-new'))startNew();if(e.target.closest('#itop-flow-finish'))finish();});
 window.addEventListener('itop:logged-out',()=>{++epoch;ready=false;required=true;record=null;stage=1;closed=false;api=null;refresh();});
 window.ITOPSalesFlow=Object.freeze({configure,restore,onSaved,allowNavigation,canClear,canLoad,startNew});refresh();
})();
