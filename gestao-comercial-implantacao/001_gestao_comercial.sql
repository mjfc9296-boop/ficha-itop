-- HOMOLOGAÇÃO PRIMEIRO. Não executar em produção sem revisão e autorização.
-- Reutiliza public.perfis(id,papel,ativo,status_aprovacao,nome) e auth.users.
begin;
create schema if not exists itop_private;
revoke all on schema itop_private from public;
create table public.itop_equipes (
 id uuid primary key default gen_random_uuid(), nome text not null check(length(nome) between 2 and 80),
 ativo boolean not null default true, created_at timestamptz not null default now()
);
create table public.itop_equipe_membros (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 equipe_id uuid not null references public.itop_equipes(id), created_at timestamptz not null default now()
);
create index on public.itop_equipe_membros(equipe_id,usuario_id);
create table public.itop_equipe_supervisores (
 equipe_id uuid not null references public.itop_equipes(id),
 supervisor_id uuid not null references auth.users(id) on delete cascade,
 primary key(equipe_id,supervisor_id)
);
create index on public.itop_equipe_supervisores(supervisor_id,equipe_id);
create table public.itop_sondagens (
 id uuid primary key, vendedor_id uuid not null references auth.users(id),
 equipe_id uuid references public.itop_equipes(id),
 teste boolean not null default false,
 status text not null default 'rascunho' check(status in ('rascunho','proposta','finalizada','venda_confirmada','perdida')),
 dados jsonb not null default '{}' check(jsonb_typeof(dados)='object' and octet_length(dados::text)<=32768),
 oferecidos jsonb not null default '[]' check(jsonb_typeof(oferecidos)='array' and jsonb_array_length(oferecidos)<=100),
 escolhidos jsonb not null default '[]' check(jsonb_typeof(escolhidos)='array' and jsonb_array_length(escolhidos)<=100),
 bruto numeric(12,2) not null default 0 check(bruto>=0),
 desconto numeric(12,2) not null default 0 check(desconto>=0 and desconto<=bruto),
 total numeric(12,2) generated always as (bruto-desconto) stored,
 resultado text not null default '' check(length(resultado)<=500),
 confirmacao_ref text check(length(confirmacao_ref)<=120), confirmado_por uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 apresentada_at timestamptz, finalizada_at timestamptz, confirmada_at timestamptz,
 versao integer not null default 1, excluida_at timestamptz,
 check(status<>'venda_confirmada' or (confirmada_at is not null and confirmado_por is not null and length(trim(confirmacao_ref))>0))
);
create index on public.itop_sondagens(vendedor_id,created_at desc,id desc) where excluida_at is null;
create index on public.itop_sondagens(equipe_id,created_at desc,id desc) where excluida_at is null;
create index on public.itop_sondagens(status,created_at desc) where excluida_at is null;
create index on public.itop_sondagens(created_at desc,id desc) where excluida_at is null;
create index on public.itop_sondagens(created_at desc,vendedor_id) where excluida_at is null and teste=false;
create table public.itop_sondagem_auditoria (
 id bigint generated always as identity primary key, sondagem_id uuid,
 ator uuid, acao text not null, detalhes jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on public.itop_sondagem_auditoria(sondagem_id,created_at desc);
create table itop_private.operacoes (
 id uuid primary key, ator uuid not null, sondagem_id uuid not null, resposta jsonb not null, created_at timestamptz not null default now()
);
create function itop_private.papel() returns text language sql stable security definer set search_path='' as $$
 select p.papel from public.perfis p where p.id=(select auth.uid()) and p.ativo and p.status_aprovacao='aprovado' and p.papel in('administrador','supervisor','vendedor')
$$;
create function itop_private.eh_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(itop_private.papel()='administrador',false)
$$;
create function itop_private.pode_equipe(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select itop_private.eh_admin() or (itop_private.papel()='supervisor' and exists(
 select 1 from public.itop_equipe_supervisores x join public.itop_equipes q on q.id=x.equipe_id and q.ativo
 where x.equipe_id=e and x.supervisor_id=(select auth.uid())))
$$;
create function itop_private.pode_ler(v uuid,e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select itop_private.papel() is not null and (v=(select auth.uid()) or itop_private.pode_equipe(e))
$$;
-- RLS protege consultas diretas; gravações só pelas funções verificadas abaixo.
alter table public.itop_equipes enable row level security;
alter table public.itop_equipe_membros enable row level security;
alter table public.itop_equipe_supervisores enable row level security;
alter table public.itop_sondagens enable row level security;
alter table public.itop_sondagem_auditoria enable row level security;
create policy equipes_leitura on public.itop_equipes for select to authenticated using(
 itop_private.pode_equipe(id) or (itop_private.papel() is not null and id in(select m.equipe_id from public.itop_equipe_membros m where m.usuario_id=(select auth.uid()))));
create policy membros_leitura on public.itop_equipe_membros for select to authenticated using(
 itop_private.papel() is not null and (usuario_id=(select auth.uid()) or itop_private.pode_equipe(equipe_id)));
create policy supervisores_leitura on public.itop_equipe_supervisores for select to authenticated using(itop_private.pode_equipe(equipe_id));
create policy sondagens_leitura on public.itop_sondagens for select to authenticated using(
 excluida_at is null and itop_private.pode_ler(vendedor_id,equipe_id));
create policy auditoria_leitura on public.itop_sondagem_auditoria for select to authenticated using(itop_private.eh_admin());
revoke all on public.itop_equipes,public.itop_equipe_membros,public.itop_equipe_supervisores,public.itop_sondagens,public.itop_sondagem_auditoria from anon,authenticated;
grant select on public.itop_equipes,public.itop_equipe_membros,public.itop_equipe_supervisores,public.itop_sondagens,public.itop_sondagem_auditoria to authenticated;
grant usage on schema itop_private to authenticated;
revoke all on all functions in schema itop_private from public;
grant execute on function itop_private.papel(),itop_private.eh_admin(),itop_private.pode_equipe(uuid),itop_private.pode_ler(uuid,uuid) to authenticated;

create function public.itop_comercial_contexto() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); papel text:=itop_private.papel();
begin
 if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 return jsonb_build_object('usuario_id',u,'papel',papel,'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'nome',e.nome)) from public.itop_equipes e where e.ativo and (itop_private.pode_equipe(e.id) or exists(select 1 from public.itop_equipe_membros m where m.equipe_id=e.id and m.usuario_id=u))),'[]'::jsonb),
 'pessoas',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'papel',p.papel)) from public.perfis p where p.ativo and p.status_aprovacao='aprovado' and (itop_private.eh_admin() or p.id=u or exists(select 1 from public.itop_equipe_membros m where m.usuario_id=p.id and itop_private.pode_equipe(m.equipe_id)) or exists(select 1 from public.itop_equipe_supervisores es where es.supervisor_id=p.id and itop_private.pode_equipe(es.equipe_id)))),'[]'::jsonb));
end $$;
create function public.itop_salvar_sondagem(p_id uuid,p_versao integer,p_operacao uuid,p_status text,p_dados jsonb,p_oferecidos jsonb,p_escolhidos jsonb,p_desconto numeric default 0,p_resultado text default '',p_confirmacao text default null,p_teste boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); papel text:=itop_private.papel(); s public.itop_sondagens; e uuid; v_bruto numeric:=0; item jsonb; resposta jsonb; op itop_private.operacoes; estado_anterior text; desconto_anterior numeric; teste_anterior boolean;
begin
 if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 if p_id is null or p_operacao is null or p_versao is null or p_versao<0 then raise exception 'IDENTIFICACAO_INVALIDA'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into op from itop_private.operacoes where id=p_operacao;
 if found then
  if op.ator<>u or op.sondagem_id<>p_id then raise exception 'OPERACAO_INVALIDA'; end if;
  return op.resposta;
 end if;
 if p_status is null or p_status not in ('rascunho','proposta','finalizada','venda_confirmada','perdida') then raise exception 'SITUACAO_INVALIDA'; end if;
 if p_dados is null or jsonb_typeof(p_dados)<>'object' or octet_length(p_dados::text)>32768 then raise exception 'DADOS_INVALIDOS'; end if;
 if exists(select 1 from jsonb_object_keys(p_dados) k where k not in ('campos','versao_formulario')) or coalesce(jsonb_typeof(p_dados->'campos'),'')<>'object' then raise exception 'DADOS_INVALIDOS'; end if;
 -- Allowlist: dados de contato e valores comerciais; nunca senha, CPF ou dados de saúde.
 if exists(select 1 from jsonb_object_keys(p_dados->'campos') k where k !~ '^(nome|telefone|cidade|vendedor|operadora|fibraMega|internetValor|fixoOperadora|fixoNumero|fixoValor|m(op|numero|gb|valor)[0-9]+|energia(Nome|Telefone|Cidade|Vendedor)|conta|categoria|tarifa|consumo)$') then raise exception 'CAMPO_NAO_PERMITIDO'; end if;
 if p_oferecidos is null or p_escolhidos is null or jsonb_typeof(p_oferecidos)<>'array' or jsonb_typeof(p_escolhidos)<>'array' or jsonb_array_length(p_oferecidos)>100 or jsonb_array_length(p_escolhidos)>100 or octet_length(p_oferecidos::text)+octet_length(p_escolhidos::text)>32768 then raise exception 'PRODUTOS_INVALIDOS'; end if;
 for item in select value from jsonb_array_elements(p_oferecidos||p_escolhidos) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(item->>'name'),0) not between 1 and 200 or coalesce(length(item->>'category'),0) not between 1 and 100 or (item->>'price') is null or (item->>'q') is null or (item->>'price')::numeric not between 0 and 100000 or (item->>'q')::numeric not between 1 and 100 or (item->>'q')::numeric<>trunc((item->>'q')::numeric) then raise exception 'PRODUTO_INVALIDO'; end if;
 end loop;
 select coalesce(sum(round((x->>'price')::numeric,2)*(x->>'q')::integer),0) into v_bruto from jsonb_array_elements(p_escolhidos) x;
 if p_desconto is null or p_desconto<0 or p_desconto>v_bruto or p_resultado is null or length(p_resultado)>500 then raise exception 'VALORES_INVALIDOS'; end if;
 if p_status<>'rascunho' and (jsonb_array_length(p_escolhidos)=0 or coalesce(length(trim(p_dados->'campos'->>'nome')),0)<2) then raise exception 'PREENCHA_CLIENTE_E_PRODUTOS'; end if;
 if p_status='perdida' and length(trim(p_resultado))=0 then raise exception 'INFORME_RESULTADO'; end if;
 select * into s from public.itop_sondagens where id=p_id for update;
 if found then
  p_teste:=coalesce(p_teste,s.teste);
  if s.excluida_at is not null or not itop_private.pode_ler(s.vendedor_id,s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if p_versao<>s.versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  if s.vendedor_id<>u and not itop_private.pode_equipe(s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.status in ('venda_confirmada','perdida','finalizada') and not itop_private.pode_equipe(s.equipe_id) then raise exception 'REGISTRO_FINALIZADO'; end if;
  if s.teste is distinct from p_teste and s.status<>'rascunho' and not itop_private.pode_equipe(s.equipe_id) then raise exception 'CLASSIFICACAO_GERENCIAL_OBRIGATORIA'; end if;
  if s.status<>'rascunho' and p_status='rascunho' then raise exception 'TRANSICAO_INVALIDA'; end if;
 else
  p_teste:=coalesce(p_teste,false);
  if p_versao<>0 then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  select m.equipe_id into e from public.itop_equipe_membros m join public.itop_equipes q on q.id=m.equipe_id and q.ativo where m.usuario_id=u;
  insert into public.itop_sondagens(id,vendedor_id,equipe_id) values(p_id,u,e) returning * into s;
 end if;
 if p_status='venda_confirmada' and (not itop_private.pode_equipe(s.equipe_id) or coalesce(length(trim(p_confirmacao)),0)=0) then raise exception 'CONFIRMACAO_GERENCIAL_OBRIGATORIA'; end if;
 estado_anterior:=s.status; desconto_anterior:=s.desconto; teste_anterior:=s.teste;
 update public.itop_sondagens set status=p_status,teste=p_teste,dados=p_dados,oferecidos=p_oferecidos,escolhidos=p_escolhidos,bruto=v_bruto,desconto=round(p_desconto,2),resultado=p_resultado,
 confirmacao_ref=case when p_status='venda_confirmada' then p_confirmacao else null end,confirmado_por=case when p_status='venda_confirmada' then u else null end,
 confirmada_at=case when p_status='venda_confirmada' then coalesce(s.confirmada_at,now()) else null end,
 apresentada_at=case when p_status<>'rascunho' then coalesce(s.apresentada_at,now()) else s.apresentada_at end,
 finalizada_at=case when p_status in ('finalizada','venda_confirmada','perdida') then coalesce(s.finalizada_at,now()) else null end,
 versao=case when p_versao=0 then 1 else s.versao+1 end,updated_at=now() where id=p_id returning * into s;
 if p_versao=0 or estado_anterior is distinct from p_status or desconto_anterior is distinct from p_desconto or teste_anterior is distinct from p_teste then
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) values(p_id,u,'salvar',jsonb_build_object('status',s.status,'versao',s.versao,'teste',s.teste));
 end if;
 resposta:=jsonb_build_object('id',s.id,'versao',s.versao,'updated_at',s.updated_at,'status',s.status,'total',s.total,'teste',s.teste);
 insert into itop_private.operacoes(id,ator,sondagem_id,resposta) values(p_operacao,u,p_id,resposta);
 return resposta;
end $$;

-- Função filtrada invoker: a RLS continua valendo também para relatórios e exportações.
create function public.itop_sondagens_filtradas(p_filtros jsonb default '{}') returns setof public.itop_sondagens language plpgsql stable security invoker set search_path='' as $$
declare inicio timestamptz:=coalesce((p_filtros->>'inicio')::timestamptz,now()-interval '30 days'); fim timestamptz:=coalesce((p_filtros->>'fim')::timestamptz,now()+interval '1 day');
begin
 if itop_private.papel() is null then raise exception 'ACESSO_NEGADO'; end if;
 if coalesce(p_filtros->>'modo','producao') not in ('producao','testes','todos') then raise exception 'MODO_INVALIDO'; end if;
 if fim<=inicio or fim-inicio>interval '367 days' then raise exception 'PERIODO_MAXIMO_366_DIAS'; end if;
 return query select s.* from public.itop_sondagens s where s.created_at>=inicio and s.created_at<fim
 and (case coalesce(p_filtros->>'modo','producao') when 'testes' then s.teste=true when 'todos' then true else s.teste=false end)
 and (coalesce(p_filtros->>'vendedor','')='' or s.vendedor_id=(p_filtros->>'vendedor')::uuid)
 and (coalesce(p_filtros->>'equipe','')='' or s.equipe_id=(p_filtros->>'equipe')::uuid)
 and (coalesce(p_filtros->>'supervisor','')='' or exists(select 1 from public.itop_equipe_supervisores es where es.equipe_id=s.equipe_id and es.supervisor_id=(p_filtros->>'supervisor')::uuid))
 and (coalesce(p_filtros->>'status','')='' or s.status=p_filtros->>'status')
 and (coalesce(p_filtros->>'produto','')='' or exists(select 1 from jsonb_array_elements(s.oferecidos||s.escolhidos) x where x->>'category' ilike '%'||left(p_filtros->>'produto',100)||'%' or x->>'name' ilike '%'||left(p_filtros->>'produto',100)||'%'));
end $$;
create function public.itop_listar_sondagens(p_filtros jsonb default '{}',p_cursor jsonb default null,p_limite integer default 50) returns jsonb language sql stable security invoker set search_path='' as $$
 with pagina as (select * from public.itop_sondagens_filtradas(p_filtros) s where p_cursor is null or (s.created_at,s.id)<((p_cursor->>'created_at')::timestamptz,(p_cursor->>'id')::uuid) order by s.created_at desc,s.id desc limit least(greatest(p_limite,1),100))
 select jsonb_build_object('itens',coalesce(jsonb_agg(to_jsonb(pagina) order by created_at desc,id desc),'[]'::jsonb)) from pagina
$$;
create function public.itop_indicadores(p_filtros jsonb default '{}') returns jsonb language sql stable security invoker set search_path='' as $$
 with s as materialized(select * from public.itop_sondagens_filtradas(jsonb_set(p_filtros,'{modo}',to_jsonb(case when p_filtros->>'modo'='testes' then 'testes'::text else 'producao'::text end)))),
 vendedores as(select vendedor_id,count(*) total,count(*) filter(where status='venda_confirmada') vendas,coalesce(sum(total) filter(where status='venda_confirmada'),0) receita from s group by vendedor_id),
 equipes as(select equipe_id,count(*) total,count(*) filter(where status='venda_confirmada') vendas from s group by equipe_id),
 dias as(select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM-DD') dia,count(*) sondagens,count(*) filter(where status='venda_confirmada') vendas from s group by 1),
 semanas as(select to_char(date_trunc('week',created_at at time zone 'America/Sao_Paulo'),'YYYY-MM-DD') semana,count(*) sondagens,count(*) filter(where status='venda_confirmada') vendas from s group by 1),
 meses as(select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM') mes,count(*) sondagens,count(*) filter(where status='venda_confirmada') vendas from s group by 1),
 produtos as(select x->>'category' produto,count(distinct s.id) propostas from s cross join lateral jsonb_array_elements(s.oferecidos) x group by 1),
 planos as(select x->>'name' plano,sum((x->>'q')::integer) quantidade from s cross join lateral jsonb_array_elements(s.escolhidos) x group by 1)
 select jsonb_build_object('resumo',(select jsonb_build_object('sondagens',count(*),'rascunhos',count(*) filter(where status='rascunho'),'apresentadas',count(*) filter(where apresentada_at is not null),'finalizadas',count(*) filter(where status in('finalizada','venda_confirmada','perdida')),'vendas',count(*) filter(where status='venda_confirmada'),'ticket_medio',coalesce(avg(total) filter(where status='venda_confirmada'),0),'receita',coalesce(sum(total) filter(where status='venda_confirmada'),0),'conversao',coalesce(100.0*count(*) filter(where status='venda_confirmada')/nullif(count(*) filter(where apresentada_at is not null),0),0)) from s),
 'vendedores',coalesce((select jsonb_agg(to_jsonb(vendedores)) from vendedores),'[]'::jsonb),'equipes',coalesce((select jsonb_agg(to_jsonb(equipes)) from equipes),'[]'::jsonb),
 'diario',coalesce((select jsonb_agg(to_jsonb(dias) order by dia) from dias),'[]'::jsonb),'semanal',coalesce((select jsonb_agg(to_jsonb(semanas) order by semana) from semanas),'[]'::jsonb),'mensal',coalesce((select jsonb_agg(to_jsonb(meses) order by mes) from meses),'[]'::jsonb),
 'produtos',coalesce((select jsonb_agg(to_jsonb(p)) from(select * from produtos order by propostas desc limit 20)p),'[]'::jsonb),'planos',coalesce((select jsonb_agg(to_jsonb(p)) from(select * from planos order by quantidade desc limit 20)p),'[]'::jsonb))
$$;
create function public.itop_gerir_equipe(p_acao text,p_nome text default null,p_equipe uuid default null,p_usuario uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare e uuid:=p_equipe;
begin
 if not itop_private.eh_admin() then raise exception 'ACESSO_NEGADO'; end if;
 if p_acao='criar' then insert into public.itop_equipes(nome)values(trim(p_nome))returning id into e;
 elsif p_acao in ('vincular_vendedor','vincular_supervisor') then
  if not exists(select 1 from public.itop_equipes where id=e and ativo) then raise exception 'EQUIPE_INVALIDA'; end if;
  if not exists(select 1 from public.perfis where id=p_usuario and ativo and status_aprovacao='aprovado' and papel=case when p_acao='vincular_vendedor' then 'vendedor' else 'supervisor' end)then raise exception 'PERFIL_INVALIDO'; end if;
  if p_acao='vincular_vendedor' then insert into public.itop_equipe_membros(usuario_id,equipe_id) values(p_usuario,e) on conflict(usuario_id) do update set equipe_id=excluded.equipe_id;
  else insert into public.itop_equipe_supervisores values(e,p_usuario) on conflict do nothing; end if;
 elsif p_acao='remover_supervisor' then delete from public.itop_equipe_supervisores where equipe_id=e and supervisor_id=p_usuario;
 elsif p_acao='remover_vendedor' then delete from public.itop_equipe_membros where equipe_id=e and usuario_id=p_usuario;
 else raise exception 'ACAO_INVALIDA'; end if;
 insert into public.itop_sondagem_auditoria(ator,acao,detalhes)values(auth.uid(),'equipe:'||p_acao,jsonb_build_object('equipe',e,'usuario',p_usuario));
 return e;
end $$;
create function public.itop_classificar_sondagem(p_id uuid,p_versao integer,p_teste boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.itop_sondagens; anterior boolean;
begin
 if p_teste is null or p_versao is null then raise exception 'CLASSIFICACAO_INVALIDA'; end if;
 select * into s from public.itop_sondagens where id=p_id and excluida_at is null for update;
 if not found or not itop_private.pode_equipe(s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
 if s.versao<>p_versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
 anterior:=s.teste;
 update public.itop_sondagens set teste=p_teste,versao=versao+1,updated_at=now() where id=p_id returning * into s;
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) values(p_id,auth.uid(),'classificar_teste',jsonb_build_object('antes',anterior,'teste',p_teste,'versao',s.versao));
 return jsonb_build_object('id',s.id,'versao',s.versao,'teste',s.teste);
end $$;
create function public.itop_excluir_sondagem(p_id uuid,p_versao integer) returns void language plpgsql security definer set search_path='' as $$
declare s public.itop_sondagens;
begin
 if not itop_private.eh_admin() then raise exception 'ACESSO_NEGADO'; end if;
 select * into s from public.itop_sondagens where id=p_id for update;
 if not found or s.excluida_at is not null then raise exception 'NAO_ENCONTRADA'; end if;
 if s.versao<>p_versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
 update public.itop_sondagens set excluida_at=now(),versao=versao+1 where id=p_id;
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao)values(p_id,auth.uid(),'excluir');
end $$;
-- Retenção proposta, NÃO agendada. Valores serão aprovados pelo controlador.
-- Rascunhos: 90 dias; registros encerrados: 365 dias; auditoria sem conteúdo: 365 dias.
create function public.itop_aplicar_retencao() returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if not itop_private.eh_admin() then raise exception 'ACESSO_NEGADO'; end if;
 delete from public.itop_sondagens where (excluida_at<now()-interval '30 days') or (status='rascunho' and updated_at<now()-interval '90 days') or (status in('finalizada','perdida','venda_confirmada') and updated_at<now()-interval '365 days');
 get diagnostics n=row_count;
 delete from itop_private.operacoes where created_at<now()-interval '2 days';
 delete from public.itop_sondagem_auditoria where created_at<now()-interval '365 days';
 insert into public.itop_sondagem_auditoria(ator,acao,detalhes)values(auth.uid(),'retencao',jsonb_build_object('registros_removidos',n));
 return jsonb_build_object('removidos',n);
end $$;
-- Revoga execução implícita para TODOS: somente authenticated pode chamar a API nova.
revoke all on function public.itop_comercial_contexto(),public.itop_salvar_sondagem(uuid,integer,uuid,text,jsonb,jsonb,jsonb,numeric,text,text,boolean),public.itop_sondagens_filtradas(jsonb),public.itop_listar_sondagens(jsonb,jsonb,integer),public.itop_indicadores(jsonb),public.itop_gerir_equipe(text,text,uuid,uuid),public.itop_classificar_sondagem(uuid,integer,boolean),public.itop_excluir_sondagem(uuid,integer),public.itop_aplicar_retencao() from public,anon;
grant execute on function public.itop_comercial_contexto(),public.itop_salvar_sondagem(uuid,integer,uuid,text,jsonb,jsonb,jsonb,numeric,text,text,boolean),public.itop_sondagens_filtradas(jsonb),public.itop_listar_sondagens(jsonb,jsonb,integer),public.itop_indicadores(jsonb),public.itop_gerir_equipe(text,text,uuid,uuid),public.itop_classificar_sondagem(uuid,integer,boolean),public.itop_excluir_sondagem(uuid,integer),public.itop_aplicar_retencao() to authenticated;
commit;
