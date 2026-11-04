-- Extensão aditiva; sem exclusões e sem alterações de RLS.
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
  if exists(select 1 from public.itop_sondagens x where x.vendedor_id=u and x.fluxo_obrigatorio and x.diagnostico_final is null and x.excluida_at is null and x.id<>p_id) and not exists(select 1 from public.itop_sondagens x where x.id=p_id and x.vendedor_id=u and x.diagnostico_final is not null and x.status=p_status) then raise exception 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA'; end if;
  if p_status in ('finalizada','perdida','venda_confirmada') and not exists(select 1 from public.itop_sondagens x where x.id=p_id and x.vendedor_id=u and x.diagnostico_final is not null and x.status=p_status and x.status<>'venda_confirmada') then raise exception 'UTILIZE_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
  if exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.fluxo_etapa>1 and coalesce(x.dados#>>'{campos,clienteItop}','')<>'sim' and (x.dados#>>'{campos,nome}' is distinct from p_dados#>>'{campos,nome}' or x.dados#>>'{campos,telefone}' is distinct from p_dados#>>'{campos,telefone}')) then raise exception 'CLIENTE_DA_PROPOSTA_NAO_PODE_SER_TROCADO'; end if;
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
 if exists(select 1 from jsonb_object_keys(p_dados->'campos') k where k !~ '^(clienteItop|nome|telefone|cidade|vendedor|operadora|fibraMega|internetValor|fixoOperadora|fixoNumero|fixoValor|m(op|numero|gb|valor)[0-9]+|energia(Nome|Telefone|Cidade|Vendedor)|conta|categoria|tarifa|consumo|servicosAtuais|origemAtendimento)$') then raise exception 'CAMPO_NAO_PERMITIDO'; end if;
 if p_dados#>'{campos,servicosAtuais}' is not null then
  if jsonb_typeof(p_dados#>'{campos,servicosAtuais}')<>'array' or jsonb_array_length(p_dados#>'{campos,servicosAtuais}')>30 then raise exception 'SERVICOS_ATUAIS_INVALIDOS';end if;
  for item in select value from jsonb_array_elements(p_dados#>'{campos,servicosAtuais}') loop
   if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'name')),0) not between 1 and 200 or coalesce(length(trim(item->>'category')),0) not between 1 and 100 or coalesce(item->>'price','') !~ '^[0-9]+([.][0-9]+)?$' or (item->>'price')::numeric not between 0 and 100000 then raise exception 'SERVICO_ATUAL_INVALIDO';end if;
  end loop;
 end if;
 if coalesce(p_dados#>>'{campos,origemAtendimento}','Sondagem') not in ('Sondagem','Orçamento U.V.I.') then raise exception 'ORIGEM_INVALIDA';end if;
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
  if s.dados#>>'{campos,origemAtendimento}'='Orçamento U.V.I.' then p_dados:=jsonb_set(p_dados,'{campos,origemAtendimento}','"Orçamento U.V.I."');end if;
  if s.excluida_at is not null or not itop_private.pode_ler(s.vendedor_id,s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.diagnostico_final is not null and p_status is distinct from s.status and p_status<>'venda_confirmada' then raise exception 'STATUS_FINAL_DEVE_SER_PRESERVADO'; end if;
  if p_versao<>s.versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  if s.vendedor_id<>u and not itop_private.pode_equipe(s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.status in ('venda_confirmada','perdida','finalizada') and not itop_private.pode_equipe(s.equipe_id) and not (s.vendedor_id=u and s.diagnostico_final is not null and p_status=s.status and s.status<>'venda_confirmada') then raise exception 'REGISTRO_FINALIZADO'; end if;
  if s.teste is distinct from p_teste and s.status<>'rascunho' and not itop_private.pode_equipe(s.equipe_id) then raise exception 'CLASSIFICACAO_GERENCIAL_OBRIGATORIA'; end if;
  if s.status<>'rascunho' and p_status='rascunho' then raise exception 'TRANSICAO_INVALIDA'; end if;
 else
  p_teste:=coalesce(p_teste,false);
  if p_versao<>0 then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  select m.equipe_id into e from public.itop_equipe_membros m join public.itop_equipes q on q.id=m.equipe_id and q.ativo where m.usuario_id=u;
  insert into public.itop_sondagens(id,vendedor_id,equipe_id,fluxo_obrigatorio) values(p_id,u,e,papel IN ('vendedor','administrador','coordenador','supervisor')) returning * into s;
 end if;
 if p_status='venda_confirmada' and s.status='venda_confirmada' then p_confirmacao:=s.confirmacao_ref; end if;
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

;
CREATE OR REPLACE FUNCTION itop_private.salvar_orcamento(p_id uuid,p_versao integer,p_operacao uuid,p_dados jsonb,p_escolhidos jsonb,p_desconto numeric DEFAULT 0,p_resultado text DEFAULT '',p_teste boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; r jsonb; op itop_private.operacoes; papel text:=itop_private.papel();
BEGIN
 IF auth.uid() IS NULL OR papel NOT IN ('administrador','coordenador','supervisor','vendedor','convidado') THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF p_id IS NULL OR p_operacao IS NULL THEN RAISE EXCEPTION 'IDENTIFICACAO_INVALIDA';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('fluxo:'||auth.uid()::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO op FROM itop_private.operacoes WHERE id=p_operacao;
 IF FOUND THEN
  IF op.ator<>auth.uid() OR op.sondagem_id<>p_id THEN RAISE EXCEPTION 'OPERACAO_INVALIDA';END IF;
  RETURN op.resposta;
 END IF;
 IF p_dados#>>'{campos,clienteItop}' NOT IN ('sim','nao') OR coalesce(p_dados#>>'{campos,clienteItop}','')='' OR length(trim(coalesce(p_dados#>>'{campos,nome}','')))<2 OR regexp_replace(coalesce(p_dados#>>'{campos,telefone}',''),'[^0-9]','','g') !~ '^[0-9]{10,11}$' THEN RAISE EXCEPTION 'PREENCHA_CLIENTE_WHATSAPP_TIPO';END IF;
 IF p_escolhidos IS NULL OR jsonb_typeof(p_escolhidos)<>'array' OR jsonb_array_length(p_escolhidos)=0 THEN RAISE EXCEPTION 'SELECIONE_PRODUTOS';END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF s.excluida_at IS NOT NULL OR NOT itop_private.pode_ler(s.vendedor_id,s.equipe_id) OR (s.vendedor_id<>auth.uid() AND NOT itop_private.pode_equipe(s.equipe_id)) THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
  IF s.dados#>>'{campos,origemAtendimento}' IS DISTINCT FROM 'Orçamento U.V.I.' OR s.diagnostico_final IS DISTINCT FROM 'cliente_ficou_de_pensar' OR s.status<>'finalizada' THEN RAISE EXCEPTION 'ORCAMENTO_NAO_ESTA_EM_ESPERA';END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.itop_sondagens x WHERE x.vendedor_id IN (auth.uid(),s.vendedor_id) AND x.fluxo_obrigatorio AND x.diagnostico_final IS NULL AND x.excluida_at IS NULL AND x.id<>p_id) THEN RAISE EXCEPTION 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA';END IF;
 p_dados:=jsonb_set(p_dados,'{campos,origemAtendimento}','"Orçamento U.V.I."');
 r:=itop_private.itop_salvar_sondagem(p_id,p_versao,p_operacao,CASE WHEN s.id IS NULL THEN 'proposta' ELSE 'finalizada' END,p_dados,'[]'::jsonb,p_escolhidos,p_desconto,p_resultado,NULL,p_teste);
 UPDATE public.itop_sondagens SET status='finalizada',diagnostico_final='cliente_ficou_de_pensar',fluxo_etapa=2,checklist_final='{}',finalizada_at=coalesce(finalizada_at,now()) WHERE id=p_id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'orcamento:salvar',jsonb_build_object('origem','Orçamento U.V.I.','versao',s.versao));
 UPDATE itop_private.operacoes SET resposta=to_jsonb(s) WHERE id=p_operacao;
 RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION itop_private.salvar_orcamento(uuid,integer,uuid,jsonb,jsonb,numeric,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.salvar_orcamento(uuid,integer,uuid,jsonb,jsonb,numeric,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.itop_salvar_orcamento(p_id uuid,p_versao integer,p_operacao uuid,p_dados jsonb,p_escolhidos jsonb,p_desconto numeric DEFAULT 0,p_resultado text DEFAULT '',p_teste boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.salvar_orcamento(p_id,p_versao,p_operacao,p_dados,p_escolhidos,p_desconto,p_resultado,p_teste); $$;
REVOKE ALL ON FUNCTION public.itop_salvar_orcamento(uuid,integer,uuid,jsonb,jsonb,numeric,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_salvar_orcamento(uuid,integer,uuid,jsonb,jsonb,numeric,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.itop_relatorio_orcamentos(p_filtros jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE filtros jsonb:=jsonb_set(p_filtros,'{modo}',to_jsonb(CASE WHEN p_filtros->>'modo'='testes' THEN 'testes'::text ELSE 'producao'::text END));
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 RETURN (
 WITH base AS MATERIALIZED(SELECT q.* FROM public.itop_sondagens_filtradas(filtros) q WHERE (coalesce(filtros->>'diagnostico','')='' OR (CASE WHEN q.status='venda_confirmada' OR q.diagnostico_final='venda_fechada' THEN 'venda_fechada' WHEN q.status='perdida' THEN 'desistencia' ELSE coalesce(q.diagnostico_final,'sem_diagnostico') END)=filtros->>'diagnostico')),
 d AS (SELECT b.*,b.dados#>>'{campos,origemAtendimento}'='Orçamento U.V.I.' orcamento,b.dados#>>'{campos,clienteItop}'='sim' existente,(b.status='venda_confirmada' OR b.diagnostico_final='venda_fechada') vendido,
 coalesce((SELECT sum(CASE WHEN replace(k.value,',','.') ~ '^[0-9]+([.][0-9]+)?$' THEN replace(k.value,',','.')::numeric ELSE 0 END) FROM jsonb_each_text(b.dados->'campos') k WHERE k.key IN ('internetValor','fixoValor') OR k.key ~ '^mvalor[0-9]+$'),0)+
 coalesce((SELECT sum((x->>'price')::numeric) FROM jsonb_array_elements(coalesce(b.dados#>'{campos,servicosAtuais}','[]')) x),0) atual,
 EXISTS(SELECT 1 FROM jsonb_array_elements(b.escolhidos) p WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(b.dados#>'{campos,servicosAtuais}','[]')) a WHERE lower(a->>'category')=lower(p->>'category')) AND CASE WHEN p->>'category'='Fibra / combos' THEN coalesce(b.dados#>>'{campos,internetValor}','') IN ('','0') WHEN p->>'category'='Telefone fixo' THEN coalesce(b.dados#>>'{campos,fixoValor}','') IN ('','0') WHEN p->>'category' ILIKE '%móvel%' THEN NOT EXISTS(SELECT 1 FROM jsonb_each_text(b.dados->'campos') k WHERE k.key ~ '^mvalor[0-9]+$' AND k.value NOT IN ('','0')) ELSE true END) inclusao,
 (EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(b.dados#>'{campos,servicosAtuais}','[]')) a WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b.escolhidos) p WHERE lower(p->>'category')=lower(a->>'category'))) OR
 (coalesce(b.dados#>>'{campos,internetValor}','') NOT IN ('','0') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b.escolhidos) p WHERE p->>'category'='Fibra / combos')) OR
 (coalesce(b.dados#>>'{campos,fixoValor}','') NOT IN ('','0') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b.escolhidos) p WHERE p->>'category'='Telefone fixo')) OR
 (EXISTS(SELECT 1 FROM jsonb_each_text(b.dados->'campos') k WHERE k.key ~ '^mvalor[0-9]+$' AND k.value NOT IN ('','0')) AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b.escolhidos) p WHERE p->>'category' ILIKE '%móvel%' OR p->>'name' ILIKE '%combo%'))) remocao
 FROM base b),
 resumo AS(SELECT count(*) FILTER(WHERE orcamento) total,count(*) FILTER(WHERE orcamento AND diagnostico_final='cliente_ficou_de_pensar' AND NOT vendido AND status<>'perdida') espera,count(*) FILTER(WHERE orcamento AND vendido) convertidos,count(*) FILTER(WHERE orcamento AND status='perdida') desistidos,coalesce(sum(total) FILTER(WHERE orcamento),0) valor,coalesce(100.0*count(*) FILTER(WHERE orcamento AND vendido)/nullif(count(*) FILTER(WHERE orcamento),0),0) conversao,
 count(*) FILTER(WHERE existente AND total>atual) upgrades,count(*) FILTER(WHERE existente AND total<atual) downgrades,coalesce(sum(total-atual) FILTER(WHERE existente AND vendido),0) variacao_receita,count(*) FILTER(WHERE existente AND inclusao) inclusoes,count(*) FILTER(WHERE existente AND remocao) remocoes FROM d),
 vendedores AS(SELECT vendedor_id,count(*) total,sum(total) valor FROM d WHERE orcamento GROUP BY vendedor_id),equipes AS(SELECT equipe_id,count(*) total,sum(total) valor FROM d WHERE orcamento GROUP BY equipe_id),periodos AS(SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') periodo,count(*) total,sum(total) valor FROM d WHERE orcamento GROUP BY 1)
 SELECT jsonb_build_object('resumo',(SELECT to_jsonb(resumo) FROM resumo),'vendedores',coalesce((SELECT jsonb_agg(to_jsonb(v)) FROM vendedores v),'[]'),'equipes',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM equipes e),'[]'),'periodos',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY periodo) FROM periodos p),'[]')));
END $$;
REVOKE ALL ON FUNCTION public.itop_relatorio_orcamentos(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_relatorio_orcamentos(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION itop_private.concluir_proposta(p_id uuid, p_versao integer, p_diagnostico text, p_checklist jsonb)
 RETURNS itop_sondagens
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 IF s.dados#>>'{campos,origemAtendimento}'='Orçamento U.V.I.' AND p_diagnostico='venda_fechada' AND NOT coalesce(p_checklist @> '{"cliente":true,"produtos":true,"condicoes":true}',false) THEN RAISE EXCEPTION 'CHECKLIST_OBRIGATORIO';END IF;
 anterior:=to_jsonb(s);
 UPDATE public.itop_sondagens SET diagnostico_final=p_diagnostico,checklist_final=coalesce(p_checklist,'{}'::jsonb),status=CASE WHEN p_diagnostico='desistencia' THEN 'perdida' ELSE 'finalizada' END,apresentada_at=coalesce(apresentada_at,now()),finalizada_at=now(),versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:concluir',jsonb_build_object('diagnostico',p_diagnostico,'observacao',s.resultado,'anterior',anterior,'atual',to_jsonb(s)));
 RETURN s;
END $function$

;
