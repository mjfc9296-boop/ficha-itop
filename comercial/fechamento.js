(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const observation=$('survey-result'),label=document.querySelector('label[for="survey-result"]');
 $('final-observation').append(label,observation);
 const count=document.createElement('small');count.setAttribute('aria-live','polite');observation.after(count);
 const update=()=>{const size=Array.from(observation.value).length;count.textContent=size+'/500 caracteres · mínimo de 2 caracteres válidos';observation.setCustomValidity(observation.value.trim().length<2?'Informe uma observação com pelo menos 2 caracteres.':'');};
 observation.addEventListener('input',update);update();
 const recover=document.createElement('dialog');recover.id='recover-dialog';recover.setAttribute('aria-labelledby','recover-title');recover.innerHTML='<h2 id="recover-title">Recuperar proposta</h2><form id="recover-search"><label for="recover-term">Nome do cliente, telefone ou identificação da sondagem</label><input id="recover-term" maxlength="100" style="width:100%"><label for="recover-filter">Situação</label><select id="recover-filter"><option value="">Todas</option><option value="venda_fechada">Venda fechada</option><option value="cliente_ficou_de_pensar">Cliente ficou de pensar</option><option value="desistencia">Desistência</option></select><button type="submit">Pesquisar</button><button id="recover-close" type="button">Fechar</button></form><p id="recover-status" role="status"></p><div id="recover-results"></div>';document.body.append(recover);
 let queryEpoch=0,recovering=false;
 async function search(){
  const token=++queryEpoch;$('recover-status').textContent='Pesquisando…';$('recover-results').replaceChildren();
  try{const items=await window.ITOPProposalRecovery.search($('recover-term').value.trim(),$('recover-filter').value);if(token!==queryEpoch)return;
   $('recover-status').textContent=items.length?'Até 50 resultados; refine a pesquisa. A consulta e o download preservam o status.':'Nenhuma proposta encontrada para seu acesso.';
   const labels={venda_fechada:'Venda fechada',cliente_ficou_de_pensar:'Cliente ficou de pensar',desistencia:'Desistência'};
   for(const s of items){const card=document.createElement('article'),heading=document.createElement('strong');heading.textContent=(s.cliente||'Sem nome')+' · '+(labels[s.diagnostico_final]||s.status)+' · '+s.id+(s.teste?' · TESTE':'');card.append(heading);const actions=document.createElement('div');actions.className='actions';card.append(actions);
    for(const include of [false,true]){const b=document.createElement('button');b.type='button';b.textContent=include?'BAIXAR PDF COM ENERGIA':'BAIXAR PDF';b.onclick=async()=>{b.disabled=true;try{const row=await window.ITOPProposalRecovery.read(s.id);if(token!==queryEpoch)return;const pdf=window.ITOPProposalPDF.create(row,{includeEnergy:include});pdf.doc.save(pdf.name);$('recover-status').textContent='PDF gerado da proposta '+s.id+'. Status e histórico preservados.';}catch(e){$('recover-status').textContent=e.message;}finally{b.disabled=false;}};actions.append(b);}
    if(s.diagnostico_final==='cliente_ficou_de_pensar'&&s.status!=='venda_confirmada'&&s.status!=='perdida'){const b=document.createElement('button');b.type='button';b.textContent='RETOMAR NEGOCIAÇÃO';b.onclick=async()=>{if(recovering)return;recovering=true;b.disabled=true;try{await window.ITOPProposalRecovery.recover(s.id,s.versao);recover.close();}catch(e){$('recover-status').textContent=e.message;}finally{recovering=false;b.disabled=false;}};actions.append(b);}
    $('recover-results').append(card);
   }
  }catch(e){if(token===queryEpoch)$('recover-status').textContent=e.message;}
 }
 $('recover-proposal').onclick=()=>{recover.showModal();search();};$('recover-search').onsubmit=e=>{e.preventDefault();search();};$('recover-close').onclick=()=>recover.close();$('recover-filter').onchange=search;recover.addEventListener('close',()=>{++queryEpoch;});
 const review=document.createElement('dialog');review.id='pdf-review-dialog';review.setAttribute('aria-labelledby','pdf-review-title');review.innerHTML='<h2 id="pdf-review-title">Revisar proposta</h2><p id="pdf-review-note"></p><iframe id="pdf-review-frame" title="Pré-visualização da proposta PDF"></iframe><div class="actions"><button id="pdf-review-download" type="button">Baixar PDF</button><button id="pdf-review-share" type="button">Compartilhar / WhatsApp</button><button id="pdf-review-close" type="button">Fechar</button></div>';document.body.append(review);
 let url=null,prepared=null;
 function showPDF(include){try{$('includeEnergy').checked=include;prepared=buildClosingPDF();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(prepared.doc.output('blob'));$('pdf-review-frame').src=url;$('pdf-review-title').textContent=include?'PDF COM ENERGIA':'PDF SEM ENERGIA';$('pdf-review-note').textContent=include?'A mensalidade ITOP é integral. A economia NETZ ocorre separadamente na energia.':'Produtos e serviços escolhidos, sem compensação de energia.';review.showModal();}catch(e){$('pdfStatus').textContent=e.message;}}
 $('pdf-with-energy').onclick=()=>showPDF(true);$('pdf-without-energy').onclick=()=>showPDF(false);
 $('pdf-review-download').onclick=()=>prepared?.doc.save(prepared.name);
 $('pdf-review-share').onclick=()=>{review.close();shareClosingPDF();};$('pdf-review-close').onclick=()=>review.close();review.addEventListener('close',()=>{if(url){URL.revokeObjectURL(url);url=null;}$('pdf-review-frame').src='about:blank';prepared=null;});
 window.addEventListener('itop:logged-out',()=>{++queryEpoch;recover.close();review.close();$('recover-results').replaceChildren();$('pdf-review-frame').src='about:blank';prepared=null;});
})();
