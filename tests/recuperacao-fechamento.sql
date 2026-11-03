-- Teste transacional: todos os registros e eventos criados são revertidos.
BEGIN;
SELECT set_config('itop.test_admin',(SELECT id::text FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' LIMIT 1),true);
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.perfis WHERE papel='vendedor' AND ativo AND status_aprovacao='aprovado' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE id1 uuid:=gen_random_uuid(); id2 uuid:=gen_random_uuid(); r jsonb; w jsonb; c jsonb; products jsonb:='[{"name":"PLANO TESTE TRANSACIONAL","category":"Fibra","price":99.90,"q":1}]'; v integer; rejected boolean; note text; n integer; u uuid:=auth.uid(); before_metrics jsonb; after_metrics jsonb; tests_before jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',current_setting('itop.test_admin'),true);before_metrics:=public.itop_relatorio_inteligente('{}')->'resumo';tests_before:=public.itop_relatorio_inteligente('{"modo":"testes"}')->'resumo';PERFORM set_config('request.jwt.claim.sub',u::text,true);
 SELECT jsonb_build_object('versao_formulario',2,'campos',jsonb_build_object('nome','TESTE TRANSACIONAL','telefone','35999999999','cidade','ALFENAS','vendedor',nome,'clienteItop','nao','consumo','600','tarifa','1,12','conta','800'),'indicacao','{}'::jsonb) INTO c FROM public.perfis WHERE id=auth.uid();
 r:=public.itop_salvar_sondagem(id1,0,gen_random_uuid(),'rascunho',c,products,products,0,'',null,false);
 rejected:=false;BEGIN PERFORM public.itop_salvar_sondagem(id2,0,gen_random_uuid(),'rascunho',c,products,products,0,'ok',null,false);EXCEPTION WHEN OTHERS THEN IF SQLERRM='CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_NOVA_SONDAGEM';END IF;
 r:=public.itop_avancar_etapa(id1,(r->>'versao')::integer,2::smallint);r:=public.itop_avancar_etapa(id1,(r->>'versao')::integer,3::smallint);
 FOREACH note IN ARRAY ARRAY['',' ','a','a'||chr(8203)] LOOP
 r:=public.itop_salvar_sondagem(id1,(r->>'versao')::integer,gen_random_uuid(),'rascunho',c,products,products,0,note,null,false);
 rejected:=false;BEGIN PERFORM public.itop_concluir_proposta(id1,(r->>'versao')::integer,'cliente_ficou_de_pensar','{}');EXCEPTION WHEN OTHERS THEN IF SQLERRM='OBSERVACAO_OBRIGATORIA_2_A_500_CARACTERES' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_OBSERVACAO';END IF;
 END LOOP;
 rejected:=false;BEGIN PERFORM public.itop_salvar_sondagem(id1,(r->>'versao')::integer,gen_random_uuid(),'rascunho',c,products,products,0,repeat('a',501),null,false);EXCEPTION WHEN OTHERS THEN IF SQLERRM='VALORES_INVALIDOS' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_MAXIMO';END IF;
 r:=public.itop_salvar_sondagem(id1,(r->>'versao')::integer,gen_random_uuid(),'rascunho',c,products,products,0,'ok',null,false);
 r:=public.itop_concluir_proposta(id1,(r->>'versao')::integer,'cliente_ficou_de_pensar','{}');
 IF r->>'resultado'<>'ok' OR r->>'diagnostico_final'<>'cliente_ficou_de_pensar' THEN RAISE EXCEPTION 'TESTE_FALHOU_ESPERA';END IF;
 IF public.itop_fluxo_contexto()->'proposta'<>'null'::jsonb THEN RAISE EXCEPTION 'TESTE_FALHOU_LIBERAR_ESPERA';END IF;
 IF NOT public.itop_buscar_espera(id1::text) @> jsonb_build_array(jsonb_build_object('id',id1)) THEN RAISE EXCEPTION 'TESTE_FALHOU_BUSCA';END IF;
 v:=(r->>'versao')::integer;
 w:=public.itop_salvar_sondagem(id2,0,gen_random_uuid(),'rascunho',c,products,products,0,repeat('a',500),null,false);
 rejected:=false;BEGIN PERFORM public.itop_recuperar_proposta(id1,v);EXCEPTION WHEN OTHERS THEN IF SQLERRM='CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_RECUPERAR_COM_ATIVA';END IF;
 w:=public.itop_avancar_etapa(id2,(w->>'versao')::integer,2::smallint);w:=public.itop_avancar_etapa(id2,(w->>'versao')::integer,3::smallint);w:=public.itop_concluir_proposta(id2,(w->>'versao')::integer,'desistencia','{}');
 r:=public.itop_recuperar_proposta(id1,v);
 IF r->>'id'<>id1::text OR (r->>'recuperacoes')::integer<>1 OR r->'dados'<>c OR r->'escolhidos'<>products THEN RAISE EXCEPTION 'TESTE_FALHOU_RESTAURAR';END IF;
 rejected:=false;BEGIN PERFORM public.itop_recuperar_proposta(id1,v);EXCEPTION WHEN serialization_failure THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_CONCORRENCIA';END IF;
 products:=jsonb_set(products,'{0,q}','2');r:=public.itop_salvar_sondagem(id1,(r->>'versao')::integer,gen_random_uuid(),'proposta',c,products,products,0,'Cliente retornou para fechar.',null,false);
 r:=public.itop_avancar_etapa(id1,(r->>'versao')::integer,3::smallint);r:=public.itop_concluir_proposta(id1,(r->>'versao')::integer,'venda_fechada','{}');
 IF (r->>'total')::numeric<>199.80 OR r->>'id'<>id1::text THEN RAISE EXCEPTION 'TESTE_FALHOU_VENDA';END IF;
 SELECT count(*) INTO n FROM public.itop_sondagens WHERE id IN (id1,id2);IF n<>2 THEN RAISE EXCEPTION 'TESTE_FALHOU_DUPLICIDADE';END IF;
 rejected:=false;BEGIN PERFORM public.itop_concluir_proposta(id1,(r->>'versao')::integer,'venda_fechada','{}');EXCEPTION WHEN OTHERS THEN IF SQLERRM='PROPOSTA_JA_FINALIZADA' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'TESTE_FALHOU_FINALIZAR_DUPLO';END IF;
 PERFORM set_config('request.jwt.claim.sub',current_setting('itop.test_admin'),true);after_metrics:=public.itop_relatorio_inteligente('{}')->'resumo';
 IF (after_metrics->>'sondagens')::integer<>(before_metrics->>'sondagens')::integer+2 OR (after_metrics->>'vendas')::integer<>(before_metrics->>'vendas')::integer+1 OR (after_metrics->>'receita')::numeric<>(before_metrics->>'receita')::numeric+199.80 OR (after_metrics->>'recuperadas')::integer<>(before_metrics->>'recuperadas')::integer+1 OR (after_metrics->>'espera_convertida')::integer<>(before_metrics->>'espera_convertida')::integer+1 THEN RAISE EXCEPTION 'TESTE_FALHOU_RELATORIOS';END IF;
 IF public.itop_relatorio_inteligente('{"modo":"testes"}')->'resumo'<>tests_before THEN RAISE EXCEPTION 'TESTE_FALHOU_ISOLAMENTO_TESTES';END IF;
END $$;
ROLLBACK;
SELECT 'PASSOU: status, limites, espera, recuperação, dados, edição, concorrência e não duplicação; dados de teste revertidos.' resultado;
