(()=>{'use strict';
 const $=id=>document.getElementById(id),roles={administrador:'Administrador',coordenador:'Coordenador',supervisor:'Supervisor',vendedor:'Vendedor',convidado:'Convidado'};
 const sectorField=document.createElement('div');sectorField.id='itop-team-sector-field';sectorField.innerHTML='<label for="itop-team-sector">Setor</label><select id="itop-team-sector"><option value="comercial_vendas">Comercial / Vendas</option><option value="financeiro">Financeiro</option><option value="suporte">Suporte</option><option value="back_office">Back Office</option></select>';$('itop-team-create-submit').before(sectorField);
 let client,model,loading=false,epoch=0,creating=false,registration;
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const notify=t=>{$('itop-gestao-message').textContent=t;};
 async function rpc(name,args={}){const{data,error}=await client.rpc(name,args);if(error)throw Error(error.message);return data;}
 const button=(label,fn,cls='')=>{const b=node('button',label,cls);b.type='button';b.onclick=fn;return b;};
 const pending=p=>p.status_aprovacao==='pendente';
 function actions(p){const box=node('div',undefined,'itop-team-actions');if(!p.pode_gerir)return box;
  if(pending(p)){box.append(operation('Aprovar','aprovar_usuario',p),operation('Rejeitar','rejeitar_usuario',p));}
  else{if(p.papel!=='administrador')box.append(operation(p.ativo?'Bloquear':'Reativar','alterar_acesso_usuario',p,{novo_ativo:!p.ativo}));box.append(operation('Excluir','excluir_usuario',p));}
  if(!pending(p)&&p.papel==='vendedor'&&['administrador','coordenador'].includes(model.papel))box.append(button('Mover de equipe',()=>move(p),'itop-team-secondary'));
  return box;
 }
 function operation(label,fn,p,extra={}){return button(label,async e=>{
  const b=e.currentTarget,card=b.closest('.itop-team-person'),status=card.querySelector('.itop-team-person-status');
  if(fn!=='aprovar_usuario'&&!confirm(fn==='excluir_usuario'?'Excluir '+p.nome+' e encerrar seu acesso? O histórico comercial será preservado.':label+' '+p.nome+'?'))return;
  const version=epoch;card.querySelectorAll('button').forEach(x=>x.disabled=true);status.textContent='Salvando…';
  try{await rpc(fn,{usuario_id:p.id,...extra});if(version!==epoch)return;await load();notify(label+': '+p.nome+'.');window.dispatchEvent(new Event('itop:teams-changed'));}
  catch(err){if(version!==epoch)return;status.textContent='Não foi possível concluir: '+err.message;card.querySelectorAll('button').forEach(x=>x.disabled=false);}
 },label==='Excluir'||label==='Rejeitar'?'itop-team-danger':'itop-team-secondary');}
 function person(p){const row=node('div',undefined,'itop-team-person'),info=node('div');info.append(node('strong',p.nome),node('small',pending(p)?'Aguardando aprovação · '+roles[p.solicitado_papel]:(p.ativo?'Ativo':'Bloqueado')+' · '+roles[p.papel]));row.append(info,actions(p),node('p','','itop-team-person-status'));return row;}
 function render(){
  const leadership=$('itop-team-leadership'),teams=$('itop-team-cards'),list=$('itop-pending-list');leadership.replaceChildren();teams.replaceChildren();list.replaceChildren();
  let admin=0;for(const p of model.lideranca){const card=node('div',undefined,'itop-leader');card.append(node('small',p.papel==='administrador'?'ADM '+(++admin):'COORDENADOR'),node('strong',p.nome));leadership.append(card);}
  const all=model.pessoas||[],pend=all.filter(pending),badge=$('itop-pending-badge');badge.hidden=!pend.length;badge.textContent=String(pend.length);
  if(!pend.length)list.append(node('p','Nenhuma solicitação pendente.','itop-team-empty'));
  for(const p of pend){const row=person(p),team=model.equipes.find(e=>e.id===p.equipe_id);row.firstChild.append(node('small',(window.ITOPSectors?.sectors[p.setor]||'Comercial / Vendas')+' · '+(p.responsavel_nome||team?.nome||'Equipe a definir')));list.append(row);}
  for(const team of model.equipes){
   const personal=!!team.administrador_id||team.codigo==='adm-mario';
   const card=node('section',undefined,'itop-team-card'),head=node('div',undefined,'itop-team-card-head'),info=node('div');
   info.append(node('small',personal?'CARTEIRA DO ADMINISTRADOR':'SUPERVISOR'),node('h3',personal?team.nome:team.supervisor_nome||team.nome.replace(/^Equipe\s*/i,'')));
   if(team.responsavel_id)head.append(button('Cadastrar convidado',()=>openCreate(team,'convidado'),'itop-team-secondary'));
   head.append(info,button('+',()=>openCreate(team,'vendedor'),'itop-team-plus'));head.lastChild.setAttribute('aria-label','Cadastrar vendedor na '+team.nome);
   card.append(head,node('p',personal?'Gestão: ADM '+(team.responsavel_nome||'Mario Caputo'):'Setor: '+(window.ITOPSectors?.sectors[team.setor]||'Comercial / Vendas')+' · Coordenação: '+(team.coordenador_nome||'A definir'),'itop-team-meta'));
   const sup=all.find(p=>p.id===team.supervisor_id);if(sup)card.append(person(sup));
   if(!team.supervisor_id&&!personal){const empty=node('div',undefined,'itop-team-notice');empty.append(node('p','Equipe preparada · conta do supervisor ainda não cadastrada.'));
    if(['administrador','coordenador'].includes(model.papel))empty.append(button('Cadastrar supervisor',()=>openCreate(team,'supervisor'),'itop-team-secondary'));card.append(empty);}
   const sellers=all.filter(p=>['vendedor','convidado'].includes(p.papel)&&!pending(p)&&p.equipe_id===team.id);card.append(node('h4',sellers.length+' usuário(s) · vendedores e convidados'));
   if(!sellers.length)card.append(node('p','Use o + para cadastrar. Solicitações feitas na entrada do site também chegam a esta equipe.','itop-team-empty'));
   for(const p of sellers)card.append(person(p));teams.append(card);
  }
  const unassigned=all.filter(p=>p.papel==='vendedor'&&!pending(p)&&!model.equipes.some(e=>e.id===p.equipe_id));
  const extra=$('itop-team-unassigned');extra.replaceChildren();extra.hidden=!unassigned.length;if(unassigned.length){extra.append(node('h3','Vendedores aguardando organização'));unassigned.forEach(p=>extra.append(person(p)));}
  $('itop-gestao-role').textContent=model.papel==='administrador'?'Administração · todas as equipes':model.papel==='coordenador'?'Coordenação · supervisores e vendedores vinculados':'Supervisão · sua equipe de vendedores';
 }
 async function load(){if(loading||!client)return;loading=true;const version=epoch;notify('Carregando equipes…');$('itop-refresh-users').disabled=true;
  try{const data=await rpc('itop_estrutura_equipes');if(version!==epoch)return;model=data;render();notify('Equipes atualizadas.');}
  catch(e){if(version===epoch)notify('Não foi possível carregar as equipes: '+e.message);}
  finally{if(version===epoch){loading=false;$('itop-refresh-users').disabled=false;}}
 }
 function close(){if(creating)return;$('itop-team-dialog').close();$('itop-team-create-form').reset();$('itop-team-create-status').textContent='';registration=null;}
 function openCreate(team,role){registration={team,role,userId:null};const form=$('itop-team-create-form');form.reset();form.hidden=false;$('itop-team-create-submit').hidden=false;
  sectorField.hidden=!['supervisor','convidado'].includes(role);$('itop-team-sector').value=team.setor||'comercial_vendas';$('itop-team-sector').disabled=role==='convidado'&&!!team.supervisor_id;
  $('itop-team-create-title').textContent=role==='supervisor'?'Cadastrar supervisor':role==='convidado'?'Cadastrar convidado':'Cadastrar vendedor';$('itop-team-create-destination').textContent=team.nome+' · Coordenação: '+team.coordenador_nome;
  $('itop-team-create-status').textContent='O cadastro será criado nesta equipe e aprovado com a sua permissão. O e-mail deverá ser confirmado quando solicitado.';
  if(role==='supervisor')$('itop-team-create-name').value='';$('itop-team-dialog').showModal();
 }
 async function create(e){e.preventDefault();if(creating||!registration)return;creating=true;const version=epoch,entry=registration,b=$('itop-team-create-submit'),status=$('itop-team-create-status');b.disabled=true;
  try{
   const name=$('itop-team-create-name').value.trim(),email=$('itop-team-create-email').value.trim(),password=$('itop-team-create-password').value;
   if(!entry.userId){if(name.length<3||password.length<8)throw Error('Confira o nome e a senha de pelo menos 8 caracteres.');
    const free=await rpc('itop_nome_cadastro_disponivel',{p_nome:name});if(!free)throw Error('Já existe um cadastro com este nome. Confira as solicitações antes de cadastrar novamente.');
    status.textContent='Criando cadastro…';
    // Cliente isolado: criar o vendedor nunca troca a sessão do gestor.
    const signup=window.supabase.createClient('https://tzvwrcxcubiacvlisvhf.supabase.co','sb_publishable_MLnii3Sz2W_lBfw-0eRKXg_slUZERBm',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'itop-team-create-'+crypto.randomUUID()}});
    const{data,error}=await signup.auth.signUp({email,password,options:{data:{nome:name,solicitado_papel:entry.role,equipe_id:entry.team.id,...(['supervisor','convidado'].includes(entry.role)?{setor:$('itop-team-sector').value}:{}),...(entry.role==='convidado'?{responsavel_id:entry.team.responsavel_id}:{}),telefone:$('itop-team-create-phone').value},emailRedirectTo:location.origin+location.pathname}});
    $('itop-team-create-password').value='';await signup.auth.signOut({scope:'local'});
    if(error)throw Error(error.message);if(!data.user?.id||data.user.identities?.length===0)throw Error('Confira se este e-mail já possui cadastro.');entry.userId=data.user.id;
   }
   if(version!==epoch)return;status.textContent='Aprovando cadastro…';await rpc('aprovar_usuario',{usuario_id:entry.userId});if(version!==epoch)return;
   $('itop-team-create-form').hidden=true;b.hidden=true;status.textContent='Cadastro aprovado na '+entry.team.nome+'. Caso o e-mail precise de confirmação, o usuário deve confirmá-lo antes de entrar.';
   await load();window.dispatchEvent(new Event('itop:teams-changed'));
  }catch(err){if(version===epoch){status.textContent=(entry.userId?'Cadastro criado e aguardando aprovação. Use Aprovar na lista de solicitações. ':'')+err.message;}}
  finally{creating=false;if(version===epoch)b.disabled=false;}
 }
 function move(p){const choices=model.equipes.filter(e=>e.id!==p.equipe_id);if(!choices.length)return;const dialog=$('itop-team-move-dialog'),select=$('itop-team-move-target');select.replaceChildren();for(const e of choices){const op=node('option',e.nome);op.value=e.id;select.append(op);}
  $('itop-team-move-title').textContent='Mover '+p.nome;const form=$('itop-team-move-form');form.onsubmit=async ev=>{ev.preventDefault();const b=$('itop-team-move-submit');b.disabled=true;try{await rpc('itop_gerir_equipe',{p_acao:'vincular_vendedor',p_equipe:select.value,p_usuario:p.id});dialog.close();await load();window.dispatchEvent(new Event('itop:teams-changed'));}catch(err){$('itop-team-move-status').textContent=err.message;}finally{b.disabled=false;}};$('itop-team-move-status').textContent='Os registros anteriores mantêm a equipe de origem.';dialog.showModal();}
 window.addEventListener('itop:authorized',async e=>{client=window.itopAuthClient;const role=e.detail?.papel;if(!['administrador','coordenador','supervisor'].includes(role))return;$('itop-gestao-tab').hidden=false;await load();});
 window.addEventListener('itop:logged-out',()=>{++epoch;model=null;loading=false;client=null;$('itop-gestao-tab').hidden=true;for(const id of ['itop-team-leadership','itop-team-cards','itop-pending-list','itop-team-unassigned'])$(id).replaceChildren();$('itop-team-dialog').close();$('itop-team-create-form').reset();registration=null;});
 $('itop-refresh-users').onclick=load;$('itop-gestao-tab').addEventListener('click',load);$('itop-team-create-form').onsubmit=create;$('itop-team-create-close').onclick=close;
 $('itop-team-dialog').addEventListener('cancel',e=>{if(creating)e.preventDefault();else close();});$('itop-team-move-close').onclick=()=>$('itop-team-move-dialog').close();
 client=window.itopAuthClient;if(client)client.auth.getUser().then(async({data:{user}})=>{if(!user)return;const{data:p}=await client.from('perfis').select('papel,ativo,status_aprovacao').eq('id',user.id).maybeSingle();if(p?.ativo&&p.status_aprovacao==='aprovado'&&['administrador','coordenador','supervisor'].includes(p.papel)){$('itop-gestao-tab').hidden=false;load();}}).catch(()=>{});
})();


