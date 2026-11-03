-- Evolução aditiva; preserva os registros e as permissões existentes.
ALTER TABLE public.itop_sondagens ADD COLUMN IF NOT EXISTS recuperacoes integer NOT NULL DEFAULT 0;
ALTER TABLE public.itop_sondagens ADD COLUMN IF NOT EXISTS recuperada_em timestamptz;
CREATE OR REPLACE FUNCTION itop_private.itop_salvar_sondagem(p_id uuid, p_versao integer, p_operacao uuid, p_status text, p_dados jsonb, p_oferecidos jsonb, p_escolhidos jsonb, p_desconto numeric DEFAULT 0, p_resultado text DEFAULT ''::text, p_confirmacao text DEFAULT NULL::text, p_teste boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); papel text:=itop_private.papel(); s public.itop_sondagens; e uuid; v_bruto numeric:=0; item jsonb; resposta jsonb; op itop_private.operacoes; estado_anterior text; desconto_anterior numeric; teste_anterior boolean;
begin
 
 if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 if papel='vendedor' then
  perform pg_advisory_xact_lock(hashtextextended('fluxo:'||u::text,0));
  if exists(select 1 from public.itop_sondagens x where x.vendedor_id=u and x.fluxo_obrigatorio and x.diagnostico_final is null and x.excluida_at is null and x.id<>p_id) then raise exception 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA'; end if;
  if p_status in ('finalizada','perdida','venda_confirmada') then raise exception 'UTILIZE_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
  if exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.fluxo_etapa>1 and (x.dados#>>'{campos,nome}' is distinct from p_dados#>>'{campos,nome}' or x.dados#>>'{campos,telefone}' is distinct from p_dados#>>'{campos,telefone}')) then raise exception 'CLIENTE_DA_PROPOSTA_NAO_PODE_SER_TROCADO'; end if;
 end if;
 if p_status in ('finalizada','perdida','venda_confirmada') and exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.diagnostico_final is null) then raise exception 'CONCLUA_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
 
 if nullif(lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1)),'') is null
 or lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1))
 is distinct from (select lower(split_part(regexp_replace(trim(p.nome),'\s+',' ','g'),' ',1)) from public.perfis p where p.id=coalesce((select vendedor_id from public.itop_sondagens where id=p_id),u))
 then raise exception 'OPERADOR_CADASTRADO_OBRIGATORIO'; end if;
 if papel = 'vendedor' and coalesce(p_teste,false) then raise exception 'MODO_TESTE_GERENCIAL_OBRIGATORIO'; end if;
 if p_id is null or p_operacao is null or p_versao is null or p_versao<0 then raise exception 'IDENTIFICACAO_INVALIDA'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into op from itop_private.operacoes where id=p_operacao;
 if found then
  if op.ator<>u or op.sondagem_id<>p_id then raise exception 'OPERACAO_INVALIDA'; end if;
  return op.resposta;
 end if;
 if p_status is null or p_status not in ('rascunho','proposta','finalizada','venda_confirmada','perdida') then raise exception 'SITUACAO_INVALIDA'; end if;
 if p_dados is null or jsonb_typeof(p_dados)<>'object' or octet_length(p_dados::text)>32768 then raise exception 'DADOS_INVALIDOS'; end if;
 if exists(select 1 from jsonb_object_keys(p_dados) k where k not in ('campos','versao_formulario','indicacao')) or coalesce(jsonb_typeof(p_dados->'campos'),'')<>'object' then raise exception 'DADOS_INVALIDOS'; end if;
 -- Allowlist: dados de contato e valores comerciais; nunca senha, CPF ou dados de saúde.
 if exists(select 1 from jsonb_object_keys(p_dados->'campos') k where k !~ '^(clienteItop|nome|telefone|cidade|vendedor|operadora|fibraMega|internetValor|fixoOperadora|fixoNumero|fixoValor|m(op|numero|gb|valor)[0-9]+|energia(Nome|Telefone|Cidade|Vendedor)|conta|categoria|tarifa|consumo)$') then raise exception 'CAMPO_NAO_PERMITIDO'; end if;
 if p_oferecidos is null or p_escolhidos is null or jsonb_typeof(p_oferecidos)<>'array' or jsonb_typeof(p_escolhidos)<>'array' or jsonb_array_length(p_oferecidos)>100 or jsonb_array_length(p_escolhidos)>100 or octet_length(p_oferecidos::text)+octet_length(p_escolhidos::text)>32768 then raise exception 'PRODUTOS_INVALIDOS'; end if;
 for item in select value from jsonb_array_elements(p_oferecidos||p_escolhidos) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(item->>'name'),0) not between 1 and 200 or coalesce(length(item->>'category'),0) not between 1 and 100 or (item->>'price') is null or (item->>'q') is null or (item->>'price')::numeric not between 0 and 100000 or (item->>'q')::numeric not between 1 and 100 or (item->>'q')::numeric<>trunc((item->>'q')::numeric) then raise exception 'PRODUTO_INVALIDO'; end if;
 end loop;
 select coalesce(sum(round((x->>'price')::numeric,2)*(x->>'q')::integer),0) into v_bruto from jsonb_array_elements(p_escolhidos) x;
 if p_desconto is null or p_desconto<0 or p_desconto>v_bruto or p_resultado is null or length(p_resultado)>500 then raise exception 'VALORES_INVALIDOS'; end if;
 if p_status<>'rascunho' and coalesce(length(trim(p_dados->'campos'->>'nome')),0)<2 then raise exception 'PREENCHA_CLIENTE_E_PRODUTOS'; end if;
 if p_status='perdida' and length(trim(p_resultado))=0 then raise exception 'INFORME_RESULTADO'; end if;
 select * into s from public.itop_sondagens where id=p_id for update;
 if found then
  if papel = 'vendedor' and s.teste then raise exception 'ACESSO_NEGADO'; end if;
  p_teste:=coalesce(p_teste,s.teste);
  if s.excluida_at is not null or not itop_private.pode_ler(s.vendedor_id,s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.diagnostico_final is not null and p_status<>'venda_confirmada' then raise exception 'RECUPERE_PROPOSTA_EM_ESPERA_ANTES_DE_EDITAR'; end if;
  if p_versao<>s.versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  if s.vendedor_id<>u and not itop_private.pode_equipe(s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.status in ('venda_confirmada','perdida','finalizada') and not itop_private.pode_equipe(s.equipe_id) then raise exception 'REGISTRO_FINALIZADO'; end if;
  if s.teste is distinct from p_teste and s.status<>'rascunho' and not itop_private.pode_equipe(s.equipe_id) then raise exception 'CLASSIFICACAO_GERENCIAL_OBRIGATORIA'; end if;
  if s.status<>'rascunho' and p_status='rascunho' then raise exception 'TRANSICAO_INVALIDA'; end if;
 else
  p_teste:=coalesce(p_teste,false);
  if p_versao<>0 then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  select m.equipe_id into e from public.itop_equipe_membros m join public.itop_equipes q on q.id=m.equipe_id and q.ativo where m.usuario_id=u;
  insert into public.itop_sondagens(id,vendedor_id,equipe_id,fluxo_obrigatorio) values(p_id,u,e,papel IN ('vendedor','administrador','coordenador','supervisor')) returning * into s;
 end if;
 if p_status='venda_confirmada' and (not itop_private.pode_equipe(s.equipe_id) or coalesce(length(trim(p_confirmacao)),0)=0) then raise exception 'CONFIRMACAO_GERENCIAL_OBRIGATORIA'; end if;
 if p_versao>0 and (s.dados is distinct from p_dados or s.escolhidos is distinct from p_escolhidos or s.resultado is distinct from p_resultado) then
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) values(p_id,u,'proposta:editar',jsonb_build_object('anterior',to_jsonb(s),'versao_nova',s.versao+1));
 end if;
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
 resposta:=jsonb_build_object('id',s.id,'versao',s.versao,'updated_at',s.updated_at,'status',s.status,'total',s.total,'teste',s.teste,'fluxo_etapa',s.fluxo_etapa,'diagnostico_final',s.diagnostico_final);
 insert into itop_private.operacoes(id,ator,sondagem_id,resposta) values(p_operacao,u,p_id,resposta);
 return resposta;
end $function$


CREATE OR REPLACE FUNCTION itop_private.concluir_proposta(p_id uuid,p_versao integer,p_diagnostico text,p_checklist jsonb) RETURNS public.itop_sondagens LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; anterior jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(itop_private.papel(),'') NOT IN ('vendedor','administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND excluida_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT itop_private.pode_ler(s.vendedor_id,s.equipe_id) OR (s.vendedor_id<>auth.uid() AND NOT itop_private.pode_equipe(s.equipe_id)) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF s.diagnostico_final IS NOT NULL THEN RAISE EXCEPTION 'PROPOSTA_JA_FINALIZADA'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF s.fluxo_etapa<>3 THEN RAISE EXCEPTION 'CONCLUA_ETAPAS_1_2_3'; END IF;
 IF p_diagnostico IS NULL OR p_diagnostico NOT IN ('venda_fechada','desistencia','cliente_ficou_de_pensar') THEN RAISE EXCEPTION 'INFORME_DIAGNOSTICO_FINAL'; END IF;
 IF length(regexp_replace(coalesce(s.resultado,''),'[[:space:]​‌‍﻿]','','g'))<2 OR length(s.resultado)>500 THEN RAISE EXCEPTION 'OBSERVACAO_OBRIGATORIA_2_A_500_CARACTERES'; END IF;
 IF p_diagnostico='venda_fechada' AND jsonb_array_length(s.escolhidos)=0 THEN RAISE EXCEPTION 'SELECIONE_PRODUTOS_PARA_FECHAR_VENDA'; END IF;
 IF p_checklist IS NOT NULL AND (jsonb_typeof(p_checklist)<>'object' OR octet_length(p_checklist::text)>1000) THEN RAISE EXCEPTION 'CHECKLIST_INVALIDO'; END IF;
 anterior:=to_jsonb(s);
 UPDATE public.itop_sondagens SET diagnostico_final=p_diagnostico,checklist_final=coalesce(p_checklist,'{}'::jsonb),status=CASE WHEN p_diagnostico='desistencia' THEN 'perdida' ELSE 'finalizada' END,apresentada_at=coalesce(apresentada_at,now()),finalizada_at=now(),versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:concluir',jsonb_build_object('diagnostico',p_diagnostico,'observacao',s.resultado,'anterior',anterior,'atual',to_jsonb(s)));
 RETURN s;
END $$;
-- Managers use the same ordered flow for their own proposals; existing scope checks remain.
CREATE OR REPLACE FUNCTION itop_private.avancar_etapa(p_id uuid,p_versao integer,p_etapa smallint) RETURNS public.itop_sondagens LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; c jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(itop_private.papel(),'') NOT IN ('vendedor','administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND excluida_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT itop_private.pode_ler(s.vendedor_id,s.equipe_id) OR (s.vendedor_id<>auth.uid() AND NOT itop_private.pode_equipe(s.equipe_id)) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF s.diagnostico_final IS NOT NULL THEN RAISE EXCEPTION 'PROPOSTA_NAO_ABERTA'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF p_etapa IS NULL OR p_etapa<>s.fluxo_etapa+1 OR p_etapa NOT IN (2,3) THEN RAISE EXCEPTION 'SIGA_AS_ETAPAS_1_2_3'; END IF;
 c:=s.dados->'campos';
 IF p_etapa=2 AND coalesce(c->>'clienteItop','') NOT IN ('sim','nao') THEN RAISE EXCEPTION 'INFORME_SE_JA_E_CLIENTE_ITOP'; END IF;
 IF p_etapa=2 AND (length(trim(coalesce(c->>'nome','')))<2 OR length(trim(coalesce(c->>'cidade','')))<2 OR regexp_replace(coalesce(c->>'telefone',''),'[^0-9]','','g') !~ '^[0-9]{10,11}$') THEN RAISE EXCEPTION 'PREENCHA_CLIENTE_WHATSAPP_CIDADE_NA_ETAPA_1'; END IF;
 UPDATE public.itop_sondagens SET fluxo_etapa=p_etapa,versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:avancar',jsonb_build_object('etapa',p_etapa));
 RETURN s;
END $$;
CREATE OR REPLACE FUNCTION itop_private.recuperar_proposta(p_id uuid,p_versao integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; antes jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(itop_private.papel(),'') NOT IN ('vendedor','administrador','supervisor','coordenador') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('fluxo:'||auth.uid()::text,0));
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND excluida_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT itop_private.pode_ler(s.vendedor_id,s.equipe_id) OR (s.vendedor_id<>auth.uid() AND NOT itop_private.pode_equipe(s.equipe_id)) OR (itop_private.papel()='vendedor' AND s.teste) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF s.diagnostico_final IS DISTINCT FROM 'cliente_ficou_de_pensar' OR s.status IN ('venda_confirmada','perdida') THEN RAISE EXCEPTION 'PROPOSTA_NAO_ESTA_EM_ESPERA'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('fluxo:'||s.vendedor_id::text,0));
 IF EXISTS(SELECT 1 FROM public.itop_sondagens x WHERE x.vendedor_id IN (s.vendedor_id,auth.uid()) AND x.fluxo_obrigatorio AND x.diagnostico_final IS NULL AND x.excluida_at IS NULL AND x.id<>s.id) THEN RAISE EXCEPTION 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA'; END IF;
 antes:=to_jsonb(s);
 UPDATE public.itop_sondagens SET status='proposta',diagnostico_final=NULL,fluxo_obrigatorio=true,fluxo_etapa=2,checklist_final='{}'::jsonb,finalizada_at=NULL,recuperacoes=recuperacoes+1,recuperada_em=now(),versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'proposta:recuperar',jsonb_build_object('anterior',antes,'versao',s.versao));
 RETURN to_jsonb(s);
END $$;
CREATE OR REPLACE FUNCTION public.itop_recuperar_proposta(p_id uuid,p_versao integer) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.recuperar_proposta(p_id,p_versao); $$;
CREATE OR REPLACE FUNCTION public.itop_buscar_espera(p_busca text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(itop_private.papel(),'') NOT IN ('vendedor','administrador','supervisor','coordenador') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) FROM (SELECT id,versao,dados#>>'{campos,nome}' cliente,dados#>>'{campos,telefone}' telefone,created_at,teste FROM public.itop_sondagens WHERE excluida_at IS NULL AND diagnostico_final='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida') AND (itop_private.papel()<>'vendedor' OR (vendedor_id=auth.uid() AND NOT teste)) AND (coalesce(trim(p_busca),'')='' OR position(lower(left(trim(p_busca),100)) in lower(coalesce(dados#>>'{campos,nome}','')||' '||coalesce(dados#>>'{campos,telefone}','')||' '||id::text))>0 OR (length(regexp_replace(p_busca,'[^0-9]','','g'))>=4 AND position(regexp_replace(p_busca,'[^0-9]','','g') in coalesce(dados#>>'{campos,telefone}',''))>0)) ORDER BY updated_at DESC LIMIT 50) q);
END $$;
REVOKE ALL ON FUNCTION itop_private.recuperar_proposta(uuid,integer),public.itop_recuperar_proposta(uuid,integer),public.itop_buscar_espera(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.recuperar_proposta(uuid,integer),public.itop_recuperar_proposta(uuid,integer),public.itop_buscar_espera(text) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Leitura agregada; usa os mesmos filtros e RLS das sondagens existentes.
CREATE OR REPLACE FUNCTION public.itop_relatorio_inteligente(p_filtros jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE inicio timestamptz:=coalesce((p_filtros->>'inicio')::timestamptz,now()-interval '30 days'); fim timestamptz:=coalesce((p_filtros->>'fim')::timestamptz,now()+interval '1 day'); filtros jsonb;
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 filtros:=jsonb_set(p_filtros,'{modo}',to_jsonb(CASE WHEN p_filtros->>'modo'='testes' THEN 'testes'::text ELSE 'producao'::text END));
 RETURN (
 WITH base AS MATERIALIZED(SELECT q.* FROM public.itop_sondagens_filtradas(filtros) q WHERE (coalesce(filtros->>'diagnostico','')='' OR (CASE WHEN (q.status='venda_confirmada' OR q.diagnostico_final='venda_fechada') THEN 'venda_fechada' WHEN q.status='perdida' THEN 'desistencia' ELSE coalesce(q.diagnostico_final,'sem_diagnostico') END)=filtros->>'diagnostico')),
 s AS MATERIALIZED(SELECT b.*,CASE WHEN (b.status='venda_confirmada' OR b.diagnostico_final='venda_fechada') THEN 'venda_fechada' WHEN b.status='perdida' THEN 'desistencia' ELSE b.diagnostico_final END tipo_fechamento FROM base b),
 rawprev AS MATERIALIZED(SELECT * FROM public.itop_sondagens_filtradas(jsonb_set(jsonb_set(filtros,'{inicio}',to_jsonb(inicio-(fim-inicio))),'{fim}',to_jsonb(inicio)))),
 anterior AS MATERIALIZED(SELECT * FROM rawprev q WHERE (coalesce(filtros->>'diagnostico','')='' OR (CASE WHEN (q.status='venda_confirmada' OR q.diagnostico_final='venda_fechada') THEN 'venda_fechada' WHEN q.status='perdida' THEN 'desistencia' ELSE coalesce(q.diagnostico_final,'sem_diagnostico') END)=filtros->>'diagnostico')),
 resumo AS(SELECT count(*) sondagens,count(*) FILTER(WHERE status='rascunho') rascunhos,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE status IN ('finalizada','perdida','venda_confirmada')) finalizadas,
 count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas,coalesce(sum(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) receita,coalesce(avg(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) ticket_medio,
 coalesce(100.0*count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada'))/nullif(count(*) FILTER(WHERE apresentada_at IS NOT NULL),0),0) conversao,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada') venda_fechada,count(*) FILTER(WHERE tipo_fechamento='desistencia') desistencia,count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar') pensar,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada' AND status<>'venda_confirmada') aguardando_validacao,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta')) abertas,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta') AND updated_at<now()-interval '7 days') paradas,
 count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida')) para_retorno,
 count(*) FILTER(WHERE diagnostico_final IS NOT NULL AND checklist_final @> '{"cliente":true,"produtos":true,"condicoes":true}') checklists,
 count(*) FILTER(WHERE equipe_id IS NULL) sem_equipe, count(*) FILTER(WHERE recuperacoes>0) recuperadas, coalesce(sum(recuperacoes),0) recuperacoes, count(*) FILTER(WHERE recuperacoes>0 AND tipo_fechamento='venda_fechada') espera_convertida, count(*) FILTER(WHERE coalesce(nullif(dados#>>'{campos,consumo}',''),'0')::numeric>0 AND coalesce(nullif(replace(dados#>>'{campos,tarifa}',',','.'),''),'0')::numeric>0) com_energia, count(*) FILTER(WHERE coalesce(nullif(dados#>>'{campos,consumo}',''),'0')::numeric<=0 OR coalesce(nullif(replace(dados#>>'{campos,tarifa}',',','.'),''),'0')::numeric<=0) sem_energia FROM s),
 previo AS(SELECT count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas,coalesce(sum(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) receita FROM anterior),
 vendedores AS(SELECT vendedor_id,count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas,
 coalesce(sum(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) receita,coalesce(avg(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) ticket,
 coalesce(100.0*count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada'))/nullif(count(*) FILTER(WHERE apresentada_at IS NOT NULL),0),0) conversao,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada') venda_fechada,count(*) FILTER(WHERE tipo_fechamento='desistencia') desistencia,count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar') pensar,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta')) abertas FROM s GROUP BY vendedor_id),
 equipes AS(SELECT equipe_id,count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas,coalesce(sum(total) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')),0) receita FROM s GROUP BY equipe_id),
 funil AS(SELECT etapa,count(*) quantidade FROM (SELECT CASE WHEN diagnostico_final IS NOT NULL OR status IN ('finalizada','perdida','venda_confirmada') THEN 4 WHEN fluxo_obrigatorio THEN fluxo_etapa WHEN status='proposta' THEN 3 WHEN jsonb_array_length(escolhidos)>0 THEN 2 ELSE 1 END etapa FROM s) x GROUP BY etapa),
 diario AS(SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') dia,count(*) sondagens,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas FROM s GROUP BY 1),
 semanal AS(SELECT to_char(date_trunc('week',created_at AT TIME ZONE 'America/Sao_Paulo'),'YYYY-MM-DD') semana,count(*) sondagens,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas FROM s GROUP BY 1),
 mensal AS(SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') mes,count(*) sondagens,count(*) FILTER(WHERE (status='venda_confirmada' OR diagnostico_final='venda_fechada')) vendas FROM s GROUP BY 1),
 produtos AS(SELECT x->>'category' produto,count(DISTINCT s.id) propostas,coalesce(sum((x->>'q')::numeric),0) quantidade,coalesce(sum((x->>'q')::numeric*(x->>'price')::numeric) FILTER(WHERE (s.status='venda_confirmada' OR s.diagnostico_final='venda_fechada')),0) receita FROM s CROSS JOIN LATERAL jsonb_array_elements(s.escolhidos) x GROUP BY 1),
 planos AS(SELECT x->>'name' plano,coalesce(sum((x->>'q')::numeric),0) quantidade,count(DISTINCT s.id) propostas FROM s CROSS JOIN LATERAL jsonb_array_elements(s.escolhidos) x GROUP BY 1),
 fila AS(SELECT id,vendedor_id,equipe_id,created_at,updated_at,status,diagnostico_final,fluxo_etapa,total,coalesce(dados#>>'{campos,nome}','Sem nome') cliente,
 CASE WHEN tipo_fechamento='venda_fechada' AND status<>'venda_confirmada' THEN 'validacao' WHEN tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida') THEN 'retorno' ELSE 'aberta' END motivo
 FROM s WHERE (diagnostico_final='venda_fechada' AND status<>'venda_confirmada') OR (tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida')) OR (diagnostico_final IS NULL AND status IN ('rascunho','proposta')) ORDER BY updated_at,id LIMIT 100)
 SELECT jsonb_build_object('gerado_em',now(),'modo',filtros->>'modo','resumo',(SELECT to_jsonb(resumo) FROM resumo),'anterior',(SELECT to_jsonb(previo) FROM previo),
 'vendedores',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.vendas DESC,v.receita DESC,v.vendedor_id) FROM vendedores v),'[]'::jsonb),
 'equipes',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.vendas DESC,e.receita DESC) FROM equipes e),'[]'::jsonb),
 'funil',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.etapa) FROM funil f),'[]'::jsonb),
 'diario',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.dia) FROM diario d),'[]'::jsonb),
 'semanal',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.semana) FROM semanal d),'[]'::jsonb),
 'mensal',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.mes) FROM mensal d),'[]'::jsonb),
 'produtos',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.propostas DESC) FROM produtos p),'[]'::jsonb),
 'planos',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM planos ORDER BY quantidade DESC,plano LIMIT 30) p),'[]'::jsonb),
 'fila',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.updated_at,f.id) FROM fila f),'[]'::jsonb))
 );
END $$;
REVOKE ALL ON FUNCTION public.itop_relatorio_inteligente(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_relatorio_inteligente(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE OR REPLACE FUNCTION public.itop_relatorio_propostas(p_filtros jsonb DEFAULT '{}'::jsonb,p_cursor jsonb DEFAULT NULL,p_limite integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE filtros jsonb:=jsonb_set(p_filtros,'{modo}',to_jsonb(CASE WHEN p_filtros->>'modo'='testes' THEN 'testes'::text ELSE 'producao'::text END));
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN (WITH pagina AS(SELECT s.* FROM public.itop_sondagens_filtradas(filtros) s
 WHERE (coalesce(p_filtros->>'diagnostico','')='' OR (CASE WHEN (s.status='venda_confirmada' OR s.diagnostico_final='venda_fechada') THEN 'venda_fechada' WHEN s.status='perdida' THEN 'desistencia' ELSE coalesce(s.diagnostico_final,'sem_diagnostico') END)=p_filtros->>'diagnostico')
 AND (p_cursor IS NULL OR (s.created_at,s.id)<((p_cursor->>'created_at')::timestamptz,(p_cursor->>'id')::uuid)) ORDER BY s.created_at DESC,s.id DESC LIMIT least(greatest(p_limite,1),100))
 SELECT jsonb_build_object('itens',coalesce(jsonb_agg(to_jsonb(pagina) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) FROM pagina);
END $$;
REVOKE ALL ON FUNCTION public.itop_relatorio_propostas(jsonb,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_relatorio_propostas(jsonb,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

