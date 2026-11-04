-- Executar após aplicar supabase/orcamento-20261104.sql. Tudo é revertido.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT p.id::text FROM public.perfis p WHERE p.papel='vendedor' AND p.ativo AND p.status_aprovacao='aprovado' AND NOT EXISTS(SELECT 1 FROM public.itop_sondagens s WHERE s.vendedor_id=p.id AND s.fluxo_obrigatorio AND s.diagnostico_final IS NULL AND s.excluida_at IS NULL) LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE id1 uuid:=gen_random_uuid();op uuid:=gen_random_uuid();r jsonb;r2 jsonb;c jsonb;rejected boolean;products jsonb:='[{"category":"Fibra / combos","name":"TESTE TRANSACIONAL","price":99.9,"q":1}]';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teste precisa de vendedor aprovado sem atendimento aberto';END IF;
 SELECT jsonb_build_object('versao_formulario',2,'indicacao','{}'::jsonb,'campos',jsonb_build_object('nome','TESTE ORÇAMENTO TRANSACIONAL','telefone','35999999999','clienteItop','sim','vendedor',nome,'internetValor','150','servicosAtuais','[]'::jsonb)) INTO c FROM public.perfis WHERE id=auth.uid();
 r:=public.itop_salvar_orcamento(id1,0,op,c,products,0,'',false);
 IF r->>'status'<>'finalizada' OR r->>'diagnostico_final'<>'cliente_ficou_de_pensar' OR r#>>'{dados,campos,origemAtendimento}'<>'Orçamento U.V.I.' OR (r->>'fluxo_etapa')::int<>2 THEN RAISE EXCEPTION 'FALHA_ESPERA_ORIGEM';END IF;
 r2:=public.itop_salvar_orcamento(id1,0,op,c,products,0,'',false);IF r2<>r THEN RAISE EXCEPTION 'FALHA_IDEMPOTENCIA';END IF;
 rejected:=false;BEGIN PERFORM public.itop_salvar_orcamento(id1,0,gen_random_uuid(),c,products,0,'',false);EXCEPTION WHEN serialization_failure THEN rejected:=true;END;IF NOT rejected THEN RAISE EXCEPTION 'FALHA_CONCORRENCIA';END IF;
 products:=jsonb_set(products,'{0,q}','2');r:=public.itop_salvar_orcamento(id1,(r->>'versao')::integer,gen_random_uuid(),c,products,0,'Orçamento atualizado',false);
 IF (r->>'total')::numeric<>199.8 THEN RAISE EXCEPTION 'FALHA_TOTAL';END IF;
 IF (SELECT count(*) FROM public.itop_sondagens WHERE id=id1)<>1 THEN RAISE EXCEPTION 'FALHA_DUPLICACAO';END IF;
 PERFORM public.itop_agendar_retorno(id1,now()+interval '1 day','Retorno do orçamento');
 r:=public.itop_recuperar_proposta(id1,(r->>'versao')::integer);
 rejected:=false;BEGIN PERFORM public.itop_avancar_etapa(id1,(r->>'versao')::integer,3::smallint);EXCEPTION WHEN OTHERS THEN IF SQLERRM='PREENCHA_CLIENTE_WHATSAPP_CIDADE_NA_ETAPA_1' THEN rejected:=true;ELSE RAISE;END IF;END;IF NOT rejected THEN RAISE EXCEPTION 'FALHA_COMPLEMENTO_CLIENTE';END IF;
 c:=jsonb_set(r->'dados','{campos,cidade}','"Alfenas"');
 r:=public.itop_salvar_sondagem(id1,(r->>'versao')::integer,gen_random_uuid(),'proposta',c,'[]',products,0,'Cliente aprovou orçamento',null,false);
 r:=public.itop_avancar_etapa(id1,(r->>'versao')::integer,3::smallint);
 rejected:=false;BEGIN PERFORM public.itop_concluir_proposta(id1,(r->>'versao')::integer,'venda_fechada','{}');EXCEPTION WHEN OTHERS THEN IF SQLERRM='CHECKLIST_OBRIGATORIO' THEN rejected:=true;ELSE RAISE;END IF;END;IF NOT rejected THEN RAISE EXCEPTION 'FALHA_CHECKLIST';END IF;
 r:=public.itop_concluir_proposta(id1,(r->>'versao')::integer,'venda_fechada','{"cliente":true,"produtos":true,"condicoes":true}');
 IF r->>'id'<>id1::text OR r#>>'{dados,campos,origemAtendimento}'<>'Orçamento U.V.I.' OR r->>'diagnostico_final'<>'venda_fechada' THEN RAISE EXCEPTION 'FALHA_CONVERSAO';END IF;
 rejected:=false;BEGIN PERFORM public.itop_salvar_orcamento(id1,(r->>'versao')::integer,gen_random_uuid(),c,products,0,'',false);EXCEPTION WHEN OTHERS THEN IF SQLERRM='ORCAMENTO_NAO_ESTA_EM_ESPERA' THEN rejected:=true;ELSE RAISE;END IF;END;IF NOT rejected THEN RAISE EXCEPTION 'FALHA_REABERTURA_INDEVIDA';END IF;
END $$;
ROLLBACK;
SELECT 'PASSOU: orçamento em espera, edição, idempotência, concorrência, agenda, checklist, conversão e origem; dados revertidos.' resultado;
