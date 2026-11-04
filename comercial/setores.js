/* Catálogo de setores e responsáveis aprovados; o banco revalida o vínculo. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),sectors={comercial_vendas:'Comercial / Vendas',financeiro:'Financeiro',suporte:'Suporte',back_office:'Back Office'};
 let role='vendedor',epoch=0;
 const field=document.createElement('div');field.id='itop-reg-sector-fields';field.hidden=true;field.innerHTML='<label for="itop-reg-sector">Setor</label><select id="itop-reg-sector"><option value="">Selecione o setor</option></select><div id="itop-reg-responsible-wrap" hidden><label for="itop-reg-responsible">Responsável · supervisor do setor ou ADM</label><select id="itop-reg-responsible"><option value="">Selecione primeiro o setor</option></select><p id="itop-reg-responsible-status" role="status"></p></div>';
 $('itop-guest-registration-info').before(field);
 for(const [value,label] of Object.entries(sectors))$('itop-reg-sector').add(new Option(label,value));
 async function load(){const token=++epoch,select=$('itop-reg-responsible'),setor=$('itop-reg-sector').value;select.replaceChildren(new Option(setor?'Carregando responsáveis…':'Selecione primeiro o setor',''));$('itop-reg-responsible-status').textContent='';if(role!=='convidado'||!setor)return;
  try{const {data,error}=await window.itopAuthClient.rpc('itop_responsaveis_cadastro',{p_setor:setor});if(token!==epoch||role!=='convidado')return;if(error)throw Error('Não foi possível carregar os responsáveis. Selecione o setor novamente para tentar.');select.replaceChildren(new Option('Selecione o responsável',''));for(const p of data||[])select.add(new Option((p.papel==='administrador'?'ADM':'Supervisor')+' · '+p.nome,p.id));$('itop-reg-responsible-status').textContent=select.options.length>1?'O convidado ficará na carteira do responsável escolhido.':'Nenhum responsável aprovado disponível neste setor. Consulte a administração.';
  }catch(e){if(token===epoch){select.replaceChildren(new Option('Responsáveis indisponíveis',''));$('itop-reg-responsible-status').textContent=e.message;}}
 }
 $('itop-reg-sector').onchange=load;
 window.ITOPSectors=Object.freeze({sectors,show(next){role=next;++epoch;field.hidden=!['convidado','supervisor'].includes(role);$('itop-reg-sector').required=!field.hidden;$('itop-reg-responsible-wrap').hidden=role!=='convidado';$('itop-reg-responsible').required=role==='convidado';if(role==='convidado')load();},metadata(next){if(!['convidado','supervisor'].includes(next))return{};const setor=$('itop-reg-sector').value;if(!sectors[setor])throw Error('Selecione o setor.');const data={setor};if(next==='convidado'){if(!$('itop-reg-responsible').value)throw Error('Selecione o supervisor do setor ou um ADM responsável.');data.responsavel_id=$('itop-reg-responsible').value;}return data;}});
 window.ITOPSectors.show($('itop-reg-profile').value);
})();
