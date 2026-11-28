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
 IF p_diagnostico IS NULL OR p_diagnostico NOT IN ('venda_fechada','desistencia','cliente_ficou_de_pensar') THEN RAISE EXCEPTION 'INFORME_DIAGNOSTICO_FINAL'; END IF;
 IF length(regexp_replace(coalesce(s.resultado,''),'[[:space:]​‌‍﻿]','','g'))<2 OR length(s.resultado)>500 THEN RAISE EXCEPTION 'OBSERVACAO_OBRIGATORIA_2_A_500_CARACTERES'; END IF;
 IF p_diagnostico='venda_fechada' AND jsonb_array_length(s.escolhidos)=0 THEN RAISE EXCEPTION 'SELECIONE_PRODUTOS_PARA_FECHAR_VENDA'; END IF;
 IF p_checklist IS NOT NULL AND (jsonb_typeof(p_checklist)<>'object' OR octet_length(p_checklist::text)>1000) THEN RAISE EXCEPTION 'CHECKLIST_INVALIDO'; END IF;
 anterior:=to_jsonb(s);
 UPDATE public.itop_sondagens SET fluxo_etapa=3,diagnostico_final=p_diagnostico,checklist_final=coalesce(p_checklist,'{}'::jsonb),status=CASE WHEN p_diagnostico='desistencia' THEN 'perdida' ELSE 'finalizada' END,apresentada_at=coalesce(apresentada_at,now()),finalizada_at=now(),versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:concluir',jsonb_build_object('diagnostico',p_diagnostico,'observacao',s.resultado,'anterior',anterior,'atual',to_jsonb(s)));
 RETURN s;
END $function$
;
