(()=>{'use strict';
 const badge=document.getElementById('itop-pending-badge'),tab=document.getElementById('itop-gestao-tab');
 if(!badge||!tab)return;
 let allowed=false,timer=null,generation=0,inflight=false,controller=null;
 function display(count){badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;badge.setAttribute('aria-label',count+' cadastro(s) aguardando aprovação');tab.setAttribute('aria-label','12 Gestão de Usuários'+(count?' · '+count+' cadastro(s) pendente(s)':''));}
 async function update(){
  const client=window.itopAuthClient,version=generation;if(!allowed||inflight||document.hidden||!client)return;inflight=true;
  const abort=new AbortController();controller=abort;
  try{const{data,error}=await client.rpc('listar_cadastros_pendentes').abortSignal(abort.signal);if(version!==generation)return;if(error)throw error;display(Array.isArray(data)?data.length:0);}
  catch(error){if(version===generation&&['42501','PGRST301','PGRST302'].includes(error.code))stop();}
  finally{if(version===generation){inflight=false;controller=null;}}
 }
 function stop(){++generation;allowed=false;inflight=false;controller?.abort();controller=null;clearInterval(timer);timer=null;display(0);}
 function start(role){if(!['administrador','coordenador','supervisor'].includes(role)){stop();return;}allowed=true;if(!timer)timer=setInterval(update,30000);update();}
 window.addEventListener('itop:authorized',e=>start(e.detail?.papel));
 window.addEventListener('itop:logged-out',stop);document.getElementById('itop-logout')?.addEventListener('click',()=>{setTimeout(async()=>{const{data}=await window.itopAuthClient.auth.getUser();if(!data.user)stop();},0);});
 window.addEventListener('focus',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});window.addEventListener('itop:teams-changed',update);
 // Aprovação/rejeição atualizam a contagem assim que a lista de solicitações muda.
 const list=document.getElementById('itop-pending-list');if(list)new MutationObserver(()=>{clearTimeout(list._itopBadgeRefresh);list._itopBadgeRefresh=setTimeout(update,250);}).observe(list,{childList:true});
 tab.addEventListener('click',update);
 async function resume(){const client=window.itopAuthClient;if(!client)return;const version=generation;try{const{data:{user}}=await client.auth.getUser();if(!user||version!==generation)return;const{data:p}=await client.from('perfis').select('papel,ativo,status_aprovacao').eq('id',user.id).maybeSingle();if(version===generation&&p?.ativo&&p.status_aprovacao==='aprovado')start(p.papel);}catch{}}
 resume();
})();
