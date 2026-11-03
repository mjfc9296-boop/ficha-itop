-- Aplicação pendente de autorização junto à hierarquia comercial.
ALTER TABLE public.itop_sondagens ADD COLUMN fluxo_obrigatorio boolean NOT NULL DEFAULT false;
ALTER TABLE public.itop_sondagens ADD COLUMN fluxo_etapa smallint NOT NULL DEFAULT 1 CHECK(fluxo_etapa BETWEEN 1 AND 3);
ALTER TABLE public.itop_sondagens ADD COLUMN diagnostico_final text CHECK(diagnostico_final IN ('venda_fechada','desistencia','cliente_ficou_de_pensar'));
ALTER TABLE public.itop_sondagens ADD COLUMN checklist_final jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $$ BEGIN
 IF EXISTS(SELECT s.vendedor_id FROM public.itop_sondagens s JOIN public.perfis p ON p.id=s.vendedor_id WHERE p.papel='vendedor' AND s.status IN ('rascunho','proposta') AND NOT s.teste AND s.excluida_at IS NULL GROUP BY s.vendedor_id HAVING count(*)>1) THEN RAISE EXCEPTION 'REVISE_PROPOSTAS_ANTIGAS_ABERTAS_ANTES_DE_ATIVAR'; END IF;
END $$;
UPDATE public.itop_sondagens s SET fluxo_obrigatorio=true FROM public.perfis p WHERE p.id=s.vendedor_id AND p.papel='vendedor' AND s.status IN ('rascunho','proposta') AND NOT s.teste AND s.excluida_at IS NULL;
CREATE UNIQUE INDEX itop_uma_proposta_aberta_vendedor ON public.itop_sondagens(vendedor_id) WHERE fluxo_obrigatorio AND diagnostico_final IS NULL AND excluida_at IS NULL;

CREATE OR REPLACE FUNCTION itop_private.fluxo_contexto() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN jsonb_build_object('obrigatorio',itop_private.papel()='vendedor','proposta',(SELECT to_jsonb(s) FROM public.itop_sondagens s WHERE s.vendedor_id=auth.uid() AND s.fluxo_obrigatorio AND s.diagnostico_final IS NULL AND s.excluida_at IS NULL LIMIT 1));
END $$;
CREATE OR REPLACE FUNCTION public.itop_fluxo_contexto() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT itop_private.fluxo_contexto(); $$;

CREATE OR REPLACE FUNCTION itop_private.avancar_etapa(p_id uuid,p_versao integer,p_etapa smallint) RETURNS public.itop_sondagens LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; c jsonb;
BEGIN
 IF coalesce(itop_private.papel(),'')<>'vendedor' THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND vendedor_id=auth.uid() AND excluida_at IS NULL AND fluxo_obrigatorio FOR UPDATE;
 IF NOT FOUND OR s.diagnostico_final IS NOT NULL THEN RAISE EXCEPTION 'PROPOSTA_NAO_ABERTA'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF p_etapa IS NULL OR p_etapa<>s.fluxo_etapa+1 OR p_etapa NOT IN (2,3) THEN RAISE EXCEPTION 'SIGA_AS_ETAPAS_1_2_3'; END IF;
 c:=s.dados->'campos';
 IF p_etapa=2 AND (length(trim(coalesce(c->>'nome','')))<2 OR length(trim(coalesce(c->>'cidade','')))<2 OR regexp_replace(coalesce(c->>'telefone',''),'[^0-9]','','g') !~ '^[0-9]{10,11}$') THEN RAISE EXCEPTION 'PREENCHA_CLIENTE_WHATSAPP_CIDADE_NA_ETAPA_1'; END IF;
 IF p_etapa=3 AND jsonb_array_length(s.escolhidos)=0 THEN RAISE EXCEPTION 'SELECIONE_PRODUTOS_NA_ETAPA_2'; END IF;
 UPDATE public.itop_sondagens SET fluxo_etapa=p_etapa,versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:avancar',jsonb_build_object('etapa',p_etapa));
 RETURN s;
END $$;
CREATE OR REPLACE FUNCTION public.itop_avancar_etapa(p_id uuid,p_versao integer,p_etapa smallint) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT to_jsonb(itop_private.avancar_etapa(p_id,p_versao,p_etapa)); $$;

CREATE OR REPLACE FUNCTION itop_private.concluir_proposta(p_id uuid,p_versao integer,p_diagnostico text,p_checklist jsonb) RETURNS public.itop_sondagens LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens; v_resultado text;
BEGIN
 IF coalesce(itop_private.papel(),'')<>'vendedor' THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND vendedor_id=auth.uid() AND excluida_at IS NULL AND fluxo_obrigatorio FOR UPDATE;
 IF NOT FOUND OR s.diagnostico_final IS NOT NULL THEN RAISE EXCEPTION 'PROPOSTA_NAO_ABERTA'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF s.fluxo_etapa<>3 OR jsonb_array_length(s.escolhidos)=0 THEN RAISE EXCEPTION 'CONCLUA_ETAPAS_1_2_3'; END IF;
 IF p_diagnostico IS NULL OR p_diagnostico NOT IN ('venda_fechada','desistencia','cliente_ficou_de_pensar') THEN RAISE EXCEPTION 'INFORME_DIAGNOSTICO_FINAL'; END IF;
 IF p_checklist IS NULL OR jsonb_typeof(p_checklist)<>'object' OR p_checklist->'cliente' IS DISTINCT FROM 'true'::jsonb OR p_checklist->'produtos' IS DISTINCT FROM 'true'::jsonb OR p_checklist->'condicoes' IS DISTINCT FROM 'true'::jsonb OR octet_length(p_checklist::text)>1000 THEN RAISE EXCEPTION 'CONCLUA_CHECKLIST_FINAL'; END IF;
 v_resultado:=CASE p_diagnostico WHEN 'venda_fechada' THEN 'VENDA FECHADA — aguardando validação da gestão' WHEN 'desistencia' THEN 'DESISTÊNCIA' ELSE 'CLIENTE FICOU DE PENSAR' END;
 UPDATE public.itop_sondagens SET diagnostico_final=p_diagnostico,checklist_final=jsonb_build_object('cliente',true,'produtos',true,'condicoes',true),status=CASE WHEN p_diagnostico='desistencia' THEN 'perdida' ELSE 'finalizada' END,resultado=v_resultado,apresentada_at=coalesce(apresentada_at,now()),finalizada_at=now(),versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:concluir',jsonb_build_object('diagnostico',p_diagnostico,'checklist',s.checklist_final));
 RETURN s;
END $$;
CREATE OR REPLACE FUNCTION public.itop_concluir_proposta(p_id uuid,p_versao integer,p_diagnostico text,p_checklist jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT to_jsonb(itop_private.concluir_proposta(p_id,p_versao,p_diagnostico,p_checklist)); $$;

-- Protege também chamadas diretas, outras abas e reabertura após F5.
DO $$ DECLARE def text; original text; BEGIN
 SELECT pg_get_functiondef('itop_private.itop_salvar_sondagem(uuid,integer,uuid,text,jsonb,jsonb,jsonb,numeric,text,text,boolean)'::regprocedure) INTO def;
 original:=def;
 def:=replace(def, 'if papel is null then raise exception ''ACESSO_NEGADO''; end if;', $replace$
 if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 if papel='vendedor' then
  perform pg_advisory_xact_lock(hashtextextended('fluxo:'||u::text,0));
  if exists(select 1 from public.itop_sondagens x where x.vendedor_id=u and x.fluxo_obrigatorio and x.diagnostico_final is null and x.excluida_at is null and x.id<>p_id) then raise exception 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA'; end if;
  if p_status in ('finalizada','perdida','venda_confirmada') then raise exception 'UTILIZE_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
  if exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.fluxo_etapa>1 and (x.dados#>>'{campos,nome}' is distinct from p_dados#>>'{campos,nome}' or x.dados#>>'{campos,telefone}' is distinct from p_dados#>>'{campos,telefone}')) then raise exception 'CLIENTE_DA_PROPOSTA_NAO_PODE_SER_TROCADO'; end if;
 end if;
 if p_status in ('finalizada','perdida','venda_confirmada') and exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.diagnostico_final is null) then raise exception 'CONCLUA_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
 $replace$);
 def:=replace(def,'insert into public.itop_sondagens(id,vendedor_id,equipe_id) values(p_id,u,e)', 'insert into public.itop_sondagens(id,vendedor_id,equipe_id,fluxo_obrigatorio) values(p_id,u,e,papel=''vendedor'')');
 def:=replace(def,'''total'',s.total,''teste'',s.teste)', '''total'',s.total,''teste'',s.teste,''fluxo_etapa'',s.fluxo_etapa,''diagnostico_final'',s.diagnostico_final)');
 IF def=original OR position('fluxo_obrigatorio) values' IN def)=0 THEN RAISE EXCEPTION 'REVISE_FUNCAO_DE_SALVAMENTO_ANTES_DE_APLICAR'; END IF;
 EXECUTE def;
END $$;
REVOKE ALL ON FUNCTION itop_private.fluxo_contexto(),itop_private.avancar_etapa(uuid,integer,smallint),itop_private.concluir_proposta(uuid,integer,text,jsonb),public.itop_fluxo_contexto(),public.itop_avancar_etapa(uuid,integer,smallint),public.itop_concluir_proposta(uuid,integer,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.fluxo_contexto(),itop_private.avancar_etapa(uuid,integer,smallint),itop_private.concluir_proposta(uuid,integer,text,jsonb),public.itop_fluxo_contexto(),public.itop_avancar_etapa(uuid,integer,smallint),public.itop_concluir_proposta(uuid,integer,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
