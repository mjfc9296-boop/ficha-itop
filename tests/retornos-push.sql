-- Nenhum registro é mantido e nenhum push é enviado neste teste.
BEGIN;
SELECT set_config('itop.test_manager',(SELECT id::text FROM public.perfis WHERE papel='administrador' AND ativo LIMIT 1),true);
SELECT set_config('itop.test_retorno',gen_random_uuid()::text,true);
SELECT set_config('itop.test_other',gen_random_uuid()::text,true);
SELECT set_config('itop.test_seller',(SELECT id::text FROM public.perfis WHERE papel='vendedor' AND ativo AND status_aprovacao='aprovado' LIMIT 1),true);
INSERT INTO public.itop_sondagens(id,vendedor_id,status,fluxo_etapa,escolhidos,dados) VALUES(current_setting('itop.test_retorno')::uuid,current_setting('itop.test_seller')::uuid,'rascunho',3,'[{"name":"TESTE TRANSACIONAL","category":"Fibra","price":99.90,"q":1}]','{"campos":{"nome":"TESTE RETORNO","telefone":"35999999999"}}');
INSERT INTO public.itop_sondagens(id,vendedor_id,status,dados) SELECT current_setting('itop.test_other')::uuid,id,'rascunho','{"campos":{"nome":"TESTE OUTRA CARTEIRA"}}' FROM public.perfis WHERE papel='administrador' AND ativo LIMIT 1;
SELECT set_config('request.jwt.claim.sub',current_setting('itop.test_seller'),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; denied boolean:=false;t text;BEGIN
 t:=public.itop_salvar_meu_telefone('(99) 99999-9999');IF t<>'5599999999999' THEN RAISE EXCEPTION 'TESTE_TELEFONE';END IF;
 BEGIN PERFORM public.itop_agendar_retorno(current_setting('itop.test_retorno')::uuid,now()-interval '1 minute','passado');EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TESTE_DATA_PASSADA';END IF;
 r:=public.itop_agendar_retorno(current_setting('itop.test_retorno')::uuid,now()+interval '1 day','Retornar ao cliente');IF r->>'status'<>'rascunho' THEN RAISE EXCEPTION 'TESTE_AGENDAMENTO_PREMATURO';END IF;
 denied:=false;BEGIN PERFORM public.itop_agendar_retorno(current_setting('itop.test_other')::uuid,now()+interval '1 day','outra carteira');EXCEPTION WHEN OTHERS THEN IF SQLERRM='ACESSO_NEGADO' THEN denied:=true;ELSE RAISE;END IF;END;IF NOT denied THEN RAISE EXCEPTION 'TESTE_ACESSO';END IF;
 PERFORM public.itop_inscrever_push(jsonb_build_object('endpoint','https://fcm.googleapis.com/fcm/send/itop-test-'||current_setting('itop.test_retorno'),'keys',jsonb_build_object('p256dh',repeat('a',87),'auth',repeat('b',22))),true);
 denied:=false;BEGIN PERFORM public.itop_inscrever_push('{"endpoint":"http://127.0.0.1/secret"}',true);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TESTE_ENDPOINT';END IF;
 IF has_function_privilege('authenticated','public.itop_push_servico(text,jsonb)','EXECUTE') OR has_function_privilege('anon','public.itop_agendar_retorno(uuid,timestamptz,text)','EXECUTE') THEN RAISE EXCEPTION 'TESTE_PRIVILEGIOS';END IF;
 END $$;
RESET ROLE;
UPDATE public.itop_sondagens SET diagnostico_final='cliente_ficou_de_pensar',status='finalizada' WHERE id=current_setting('itop.test_retorno')::uuid;
DO $$BEGIN IF (SELECT status FROM public.itop_retornos WHERE sondagem_id=current_setting('itop.test_retorno')::uuid)<>'agendado' THEN RAISE EXCEPTION 'TESTE_CONFIRMACAO_ESPERA';END IF;END$$;
UPDATE public.itop_retornos SET agendado_em=now()-interval '1 minute' WHERE sondagem_id=current_setting('itop.test_retorno')::uuid;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SET LOCAL ROLE service_role;
DO $$ DECLARE jobs jsonb;j jsonb;again jsonb;BEGIN
 jobs:=public.itop_push_servico('claim');SELECT value INTO j FROM jsonb_array_elements(jobs) WHERE value->>'sondagem_id'=current_setting('itop.test_retorno');IF j IS NULL THEN RAISE EXCEPTION 'TESTE_FILA';END IF;
 again:=public.itop_push_servico('claim');IF EXISTS(SELECT 1 FROM jsonb_array_elements(again) WHERE value->>'sondagem_id'=current_setting('itop.test_retorno')) THEN RAISE EXCEPTION 'TESTE_LEASE_DUPLICADO';END IF;
 PERFORM public.itop_push_servico('ack',jsonb_build_object('id',j->>'id','lease',j->>'lease','status',201));
 again:=public.itop_push_servico('claim');IF EXISTS(SELECT 1 FROM jsonb_array_elements(again) WHERE value->>'sondagem_id'=current_setting('itop.test_retorno')) THEN RAISE EXCEPTION 'TESTE_ENVIO_DUPLICADO';END IF;
 END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$DECLARE r jsonb;BEGIN
 PERFORM set_config('request.jwt.claim.sub',current_setting('itop.test_manager'),true);IF NOT public.itop_listar_retornos() @> jsonb_build_array(jsonb_build_object('sondagem_id',current_setting('itop.test_retorno'))) THEN RAISE EXCEPTION 'TESTE_GESTAO_EQUIPE';END IF;PERFORM set_config('request.jwt.claim.sub',current_setting('itop.test_seller'),true);
 IF NOT public.itop_listar_retornos() @> jsonb_build_array(jsonb_build_object('sondagem_id',current_setting('itop.test_retorno'))) THEN RAISE EXCEPTION 'TESTE_LISTAGEM';END IF;
 r:=public.itop_agendar_retorno(current_setting('itop.test_retorno')::uuid,now()+interval '3 days','Novo retorno');IF r->>'status'<>'agendado' OR (r->>'revisao')::integer<3 THEN RAISE EXCEPTION 'TESTE_REAGENDAR';END IF;
 PERFORM public.itop_concluir_retorno(current_setting('itop.test_retorno')::uuid);
 IF EXISTS(SELECT 1 FROM public.itop_retornos WHERE sondagem_id=current_setting('itop.test_retorno')::uuid AND status<>'concluido') THEN RAISE EXCEPTION 'TESTE_CONCLUIR';END IF;
 END $$;
ROLLBACK;
SELECT 'PASSOU: telefone, validações, escopo, agendamento, confirmação, reagendamento, fila com lease, não duplicação e conclusão. Tudo revertido.' resultado;
