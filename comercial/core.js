/* No credentials, DOM, client PII persistence or global application mutations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ITOPCommercialCore=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 class DraftSync{
  constructor({send,snapshot,onState=()=>{},clock=()=>Date.now(),minInterval=30000}){Object.assign(this,{send,snapshot,onState,clock,minInterval});this.id=null;this.version=0;this.status='rascunho';this.dirty=0;this.saved=0;this.lastSave=-Infinity;this.pending=null;this.inflight=null;this.locked=false;this.enabled=true;this.timer=null;}
  touch(){if(this.locked||!this.enabled)return;this.dirty++;this.onState('pendente');this.schedule();}
  schedule(){if(this.timer||!this.enabled||this.locked)return;this.timer=setTimeout(()=>{this.timer=null;this.flush().catch(()=>{})},Math.max(5000,this.minInterval-(this.clock()-this.lastSave)));}
  async flush(status=this.status,extra={}){
   clearTimeout(this.timer);this.timer=null;if(!this.enabled)throw Error('Sincronização desativada.');
   if(this.inflight){await this.inflight;if(this.dirty>this.saved||status!==this.status)return this.flush(status,extra);return;}
   if(this.locked)throw Error('Registro encerrado. Abra uma nova sondagem.');
   if(!this.pending&&this.dirty===this.saved&&status===this.status)return;
   if(!this.id)this.id=crypto.randomUUID();
   if(!this.pending)this.pending={revision:this.dirty,args:{p_id:this.id,p_versao:this.version,p_operacao:crypto.randomUUID(),p_status:status,...this.snapshot(),...extra}};
   const pending=this.pending;
   this.onState('salvando');
   this.inflight=(async()=>{
    try{const r=await this.send(pending.args);this.version=r.versao;this.status=r.status;this.saved=pending.revision;this.pending=null;this.lastSave=this.clock();this.locked=['finalizada','perdida','venda_confirmada'].includes(r.status);this.onState('salvo',r);}
    catch(e){const validation=/INVALID|PREENCHA|INFORME|OBRIGATORIA|TRANSICAO|NAO_PERMITIDO/.test(e.message);if(validation)this.pending=null;this.onState(/CONFLITO_VERSAO/.test(e.message)?'conflito':validation?'validacao':'erro',e);if(/CONFLITO_VERSAO|ACESSO_NEGADO|REGISTRO_FINALIZADO/.test(e.message))this.enabled=false;throw e;}
    finally{this.inflight=null;}
   })();
   await this.inflight;
   if(status!==this.status)return this.flush(status,extra);
   if(this.dirty>this.saved&&!this.locked)this.schedule();
  }
  restore(record){this.stop();this.id=record.id;this.version=record.versao;this.status=record.status;this.dirty=this.saved=0;this.pending=null;this.locked=['finalizada','perdida','venda_confirmada'].includes(record.status);this.enabled=true;}
  stop(){clearTimeout(this.timer);this.timer=null;this.enabled=false;}
  get unsaved(){return !!this.pending||this.dirty>this.saved;}
 }
 const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const rowsForExport=(items,names={})=>items.map(s=>({Proposta:s.id,Data:new Date(s.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),Vendedor:names[s.vendedor_id]||s.vendedor_id,Situacao:s.status,Cliente:s.dados?.campos?.nome||'',Produtos:(s.escolhidos||[]).map(p=>`${p.q} × ${p.name}`).join('; '),Bruto:Number(s.bruto),Desconto:Number(s.desconto),Total:Number(s.total),Resultado:s.resultado||'',Confirmacao:s.confirmacao_ref||''}));
 return {DraftSync,money,rowsForExport};
});
