(()=>{'use strict';
 const choice=document.getElementById('clienteItop');
 let freeGuest=false;const valid=()=>freeGuest||['sim','nao'].includes(choice.value);
 const table=document.querySelector('#sondagem .survey-table');
 function refresh(){table.inert=!valid();table.style.opacity=valid()?'1':'.5';}
 function requireChoice(){if(valid())return true;alert('Selecione primeiro JÁ É CLIENTE ITOP ou NOVO CLIENTE.');choice.focus();return false;}
 const original=window.switchModule;
 window.switchModule=function(id){if(['pacote','fechamento'].includes(id)&&!requireChoice())return;return original(id);};
 document.addEventListener('click',e=>{const b=e.target.closest('#sondagem button');if(b&&!b.closest('#itop-proposal-controlbar')&&!['limparSondagem','itop-flow-new','recover-proposal'].includes(b.id)&&!requireChoice()){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('change',refresh);document.addEventListener('input',refresh);
 const bridge=window.ITOPCommercialBridge;
 window.ITOPCommercialBridge=Object.freeze({...bridge,restore(s){choice.value='';bridge.restore(s);refresh();},clear(){bridge.clear();choice.value='';refresh();}});
 for(const id of ['limparSondagem','itop-flow-new'])document.getElementById(id)?.addEventListener('click',()=>setTimeout(refresh,0));
 function role(p){freeGuest=p==='convidado';refresh();const allowed=['administrador','coordenador','supervisor'].includes(p);document.getElementById('itop-test-control').hidden=!allowed;document.getElementById('survey-is-test').disabled=!allowed;}
 window.addEventListener('itop:authorized',e=>role(e.detail?.papel));
 window.addEventListener('itop:logged-out',()=>{role(null);choice.value='';refresh();});
 const client=window.itopAuthClient;if(client)client.auth.getUser().then(async({data})=>{if(!data.user)return;const{data:p}=await client.from('perfis').select('papel,ativo,status_aprovacao').eq('id',data.user.id).maybeSingle();if(p?.ativo&&p.status_aprovacao==='aprovado')role(p.papel);}).catch(()=>{});
 refresh();
})();

