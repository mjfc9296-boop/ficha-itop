BEGIN;
SELECT set_config('itop.test_consent_user',(SELECT id::text FROM public.perfis WHERE papel='vendedor' AND ativo AND status_aprovacao='aprovado' LIMIT 1),true);
SELECT set_config('request.jwt.claim.sub',current_setting('itop.test_consent_user'),true);
SET LOCAL ROLE authenticated;
DO $$DECLARE v text:=public.itop_termo_push()->>'versao';sub jsonb;denied boolean:=false;BEGIN
 sub:=jsonb_build_object('endpoint','https://fcm.googleapis.com/fcm/send/consent-test-'||gen_random_uuid(),'keys',jsonb_build_object('p256dh',repeat('a',87),'auth',repeat('b',22)));
 PERFORM public.itop_registrar_consentimento_push(false,v);
 IF (public.itop_meu_consentimento_push()->>'autorizado')::boolean THEN RAISE EXCEPTION 'TESTE_RECUSA';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.perfis WHERE id=auth.uid() AND ativo AND status_aprovacao='aprovado') THEN RAISE EXCEPTION 'TESTE_ACESSO_SEM_PUSH';END IF;
 BEGIN PERFORM public.itop_inscrever_push(sub,true);EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TESTE_BLOQUEIO_SEM_AUTORIZACAO';END IF;
 PERFORM public.itop_registrar_consentimento_push(true,v);PERFORM public.itop_inscrever_push(sub,true);
 IF NOT (public.itop_meu_consentimento_push()->>'autorizado')::boolean THEN RAISE EXCEPTION 'TESTE_ACEITE';END IF;
 PERFORM public.itop_registrar_consentimento_push(false,v);IF (public.itop_meu_consentimento_push()->>'autorizado')::boolean THEN RAISE EXCEPTION 'TESTE_REVOGACAO';END IF;
 denied:=false;BEGIN PERFORM public.itop_registrar_consentimento_push(true,'versao-antiga');EXCEPTION WHEN OTHERS THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TESTE_VERSAO';END IF;
END $$;
RESET ROLE;
DO $$BEGIN
 IF EXISTS(SELECT 1 FROM itop_private.push_subscriptions WHERE usuario_id=current_setting('itop.test_consent_user')::uuid AND endpoint LIKE '%/consent-test-%' AND ativo) THEN RAISE EXCEPTION 'TESTE_DESATIVAR_APOS_REVOGAR';END IF;
 IF (SELECT count(*) FROM itop_private.push_consentimentos WHERE usuario_id=current_setting('itop.test_consent_user')::uuid AND registrado_em>=transaction_timestamp() AND length(termo)>100 AND versao='2026-11-03-v1')<3 THEN RAISE EXCEPTION 'TESTE_AUDITORIA';END IF;
END $$;
-- O cadastro continua possível sem autorização de push.
INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT gen_random_uuid(),'itop-consent-test-'||gen_random_uuid()::text||'@example.invalid',jsonb_build_object('nome','Teste Consentimento '||gen_random_uuid()::text,'equipe_id',id,'solicitado_papel','vendedor','push_autorizado',false) FROM public.itop_equipes WHERE ativo AND codigo_carteira IS NOT NULL LIMIT 1;
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.perfis p ON p.id=u.id JOIN itop_private.push_consentimentos c ON c.usuario_id=u.id WHERE u.email LIKE 'itop-consent-test-%@example.invalid' AND NOT c.autorizado AND p.status_aprovacao='pendente') THEN RAISE EXCEPTION 'TESTE_CADASTRO_OPCIONAL';END IF;END $$;
ROLLBACK;
SELECT 'PASSOU: recusa preserva acesso, aceite explícito, revogação, versão, auditoria e cadastro sem autorização; testes revertidos.' resultado;
