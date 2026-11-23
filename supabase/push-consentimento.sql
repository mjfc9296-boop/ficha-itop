CREATE TABLE itop_private.push_consentimentos(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
 autorizado boolean NOT NULL,
 versao text NOT NULL,
 termo text NOT NULL,
 origem text NOT NULL CHECK(origem IN ('cadastro','painel')),
 registrado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE itop_private.push_consentimentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON itop_private.push_consentimentos FROM PUBLIC,anon,authenticated;
CREATE INDEX itop_push_consentimento_usuario ON itop_private.push_consentimentos(usuario_id,id DESC);
CREATE OR REPLACE FUNCTION public.itop_termo_push() RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('versao','2026-11-03-v1','texto','AUTORIZAÇÃO OPCIONAL PARA NOTIFICAÇÕES PUSH

Autorizo, de forma livre e opcional, o envio de lembretes de retornos comerciais que eu agendar ou que estejam vinculados às minhas propostas na plataforma Suporte a Vendas ITOP, nos aparelhos em que eu ativar as notificações.

O celular cadastrado identifica meu usuário. O push é entregue pelo navegador ou aplicativo web do aparelho, mediante permissão específica, e não por SMS ou WhatsApp. Para viabilizar a entrega são utilizados meu identificador de usuário, a assinatura do navegador, chaves técnicas e o registro desta escolha. O serviço de push do navegador (como Google, Apple ou Mozilla) participa da entrega. O aviso é genérico; dados do cliente ficam disponíveis somente após login no painel.

Posso recusar ou revogar esta autorização a qualquer momento, gratuitamente, em MEU CELULAR > REVOGAR AUTORIZAÇÃO PUSH, sem perder acesso ao painel, às propostas, aos agendamentos ou ao sininho de retornos. A consequência da recusa é somente não receber notificações push. O navegador também permite bloquear as notificações.

Esta opção não impõe disponibilidade fora da jornada ou resposta imediata e não modifica a jornada, os direitos trabalhistas ou as obrigações contratuais. Não constitui renúncia a direitos.

A plataforma registra o usuário, a data, a hora, a versão do texto e a escolha para permitir comprovação e gestão da autorização. Dúvidas e solicitações podem ser encaminhadas à administração da plataforma por meio do seu gestor ou administrador ITOP.');
$$;
CREATE OR REPLACE FUNCTION itop_private.push_autorizado(p_usuario uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT autorizado AND versao='2026-11-03-v1' FROM itop_private.push_consentimentos WHERE usuario_id=p_usuario ORDER BY id DESC LIMIT 1),false);
$$;
REVOKE ALL ON FUNCTION itop_private.push_autorizado(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION itop_private.meu_consentimento_push() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 RETURN jsonb_build_object('autorizado',itop_private.push_autorizado(auth.uid()),'versao',(public.itop_termo_push()->>'versao'));
END $$;
CREATE OR REPLACE FUNCTION public.itop_meu_consentimento_push() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.meu_consentimento_push(); $$;
CREATE OR REPLACE FUNCTION itop_private.registrar_consentimento_push(p_autorizado boolean,p_versao text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE termo jsonb:=public.itop_termo_push();
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF p_autorizado IS NULL OR p_versao IS DISTINCT FROM termo->>'versao' THEN RAISE EXCEPTION 'Leia a versão atual do termo de autorização.';END IF;
 INSERT INTO itop_private.push_consentimentos(usuario_id,autorizado,versao,termo,origem) VALUES(auth.uid(),p_autorizado,p_versao,termo->>'texto','painel');
 IF NOT p_autorizado THEN UPDATE itop_private.push_subscriptions SET ativo=false,updated_at=now() WHERE usuario_id=auth.uid();END IF;
END $$;
CREATE OR REPLACE FUNCTION public.itop_registrar_consentimento_push(p_autorizado boolean,p_versao text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.registrar_consentimento_push(p_autorizado,p_versao); $$;
CREATE OR REPLACE FUNCTION itop_private.registrar_escolha_push_cadastro() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE termo jsonb:=public.itop_termo_push();aceitou boolean;
BEGIN
 aceitou:=coalesce((coalesce(new.raw_user_meta_data->>'push_autorizado','false')='true' AND new.raw_user_meta_data->>'push_termo_versao'=termo->>'versao'),false);
 INSERT INTO itop_private.push_consentimentos(usuario_id,autorizado,versao,termo,origem) VALUES(new.id,aceitou,termo->>'versao',termo->>'texto','cadastro');RETURN new;
END $$;
CREATE TRIGGER zz_itop_push_escolha AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION itop_private.registrar_escolha_push_cadastro();
REVOKE ALL ON FUNCTION itop_private.registrar_escolha_push_cadastro() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION itop_private.meu_consentimento_push(),public.itop_meu_consentimento_push(),itop_private.registrar_consentimento_push(boolean,text),public.itop_registrar_consentimento_push(boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.meu_consentimento_push(),public.itop_meu_consentimento_push(),itop_private.registrar_consentimento_push(boolean,text),public.itop_registrar_consentimento_push(boolean,text) TO authenticated;
-- As assinaturas existentes são preservadas; o envio exige autorização vigente.

CREATE OR REPLACE FUNCTION itop_private.inscrever_push(p_subscription jsonb, p_ativo boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE ep text:=p_subscription->>'endpoint';
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF ep IS NULL OR length(ep)>2500 OR ep !~ '^https://(fcm[.]googleapis[.]com|[a-z0-9.-]+[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9.-]+[.]notify[.]windows[.]com)/' OR octet_length(p_subscription::text)>6000 THEN RAISE EXCEPTION 'ASSINATURA_PUSH_INVALIDA';END IF;
 IF p_ativo AND (coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^[A-Za-z0-9_-]{80,120}={0,2}$' OR coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{20,30}={0,2}$') THEN RAISE EXCEPTION 'CHAVES_PUSH_INVALIDAS';END IF;
 -- A assinatura pertence ao usuário que ativou este navegador; logout a desativa.
 IF p_ativo AND NOT itop_private.push_autorizado(auth.uid()) THEN RAISE EXCEPTION 'Autorize as notificações push antes de ativar este aparelho.';END IF;
 IF p_ativo THEN
 INSERT INTO itop_private.push_subscriptions(usuario_id,endpoint,subscription) VALUES(auth.uid(),ep,p_subscription) ON CONFLICT(endpoint) DO UPDATE SET usuario_id=auth.uid(),subscription=excluded.subscription,ativo=true,updated_at=now();
 ELSE UPDATE itop_private.push_subscriptions SET ativo=false,updated_at=now() WHERE endpoint=ep AND usuario_id=auth.uid();END IF;
END $function$;
CREATE OR REPLACE FUNCTION itop_private.push_servico(p_acao text, p_dados jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c itop_private.push_config;l itop_private.login_limits;retval jsonb;email text;k text;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF p_acao='config' THEN SELECT * INTO c FROM itop_private.push_config WHERE id;RETURN to_jsonb(c);
 ELSIF p_acao='init' THEN
 UPDATE itop_private.push_config SET public_key=p_dados->>'publicKey',private_key=p_dados->>'privateKey' WHERE id AND public_key IS NULL;SELECT * INTO c FROM itop_private.push_config WHERE id;RETURN to_jsonb(c);
 ELSIF p_acao='login' THEN
 DELETE FROM itop_private.login_limits WHERE janela<now()-interval '1 hour';
 FOREACH k IN ARRAY ARRAY['ip:'||left(p_dados->>'ip',128),'tel:'||encode(extensions.digest(coalesce(p_dados->>'telefone',''),'sha256'),'hex')] LOOP
 INSERT INTO itop_private.login_limits(chave) VALUES(k) ON CONFLICT(chave) DO UPDATE SET tentativas=CASE WHEN login_limits.janela<now()-interval '5 minutes' THEN 1 ELSE login_limits.tentativas+1 END,janela=CASE WHEN login_limits.janela<now()-interval '5 minutes' THEN now() ELSE login_limits.janela END RETURNING * INTO l;
 IF l.tentativas>(CASE WHEN k LIKE 'ip:%' THEN 40 ELSE 8 END) THEN RETURN '{"limited":true}'::jsonb;END IF;
 END LOOP;
 SELECT u.email INTO email FROM public.perfis p JOIN auth.users u ON u.id=p.id WHERE p.telefone=itop_private.normalizar_celular(p_dados->>'telefone') AND p.ativo AND p.status_aprovacao='aprovado';
 RETURN jsonb_build_object('email',email);
 ELSIF p_acao='claim' THEN
 INSERT INTO itop_private.push_deliveries(sondagem_id,subscription_id,revisao)
 SELECT r.sondagem_id,s.id,r.revisao FROM public.itop_retornos r JOIN public.itop_sondagens q ON q.id=r.sondagem_id JOIN itop_private.push_subscriptions s ON s.usuario_id=r.vendedor_id AND s.ativo AND itop_private.push_autorizado(s.usuario_id) JOIN public.perfis p ON p.id=r.vendedor_id AND p.ativo AND p.status_aprovacao='aprovado' WHERE r.status='agendado' AND r.agendado_em<=now() AND q.excluida_at IS NULL AND q.diagnostico_final='cliente_ficou_de_pensar' ORDER BY r.agendado_em LIMIT 500 ON CONFLICT DO NOTHING;
 WITH chosen AS(SELECT d.id FROM itop_private.push_deliveries d JOIN public.itop_retornos r ON r.sondagem_id=d.sondagem_id AND r.revisao=d.revisao JOIN itop_private.push_subscriptions s ON s.id=d.subscription_id AND s.ativo AND itop_private.push_autorizado(s.usuario_id) WHERE r.status='agendado' AND NOT d.encerrado AND d.enviado_em IS NULL AND d.tentativas<5 AND d.proxima_em<=now() AND (d.lease_ate IS NULL OR d.lease_ate<now()) ORDER BY r.agendado_em LIMIT 20 FOR UPDATE OF d SKIP LOCKED),claimed AS(UPDATE itop_private.push_deliveries d SET lease=gen_random_uuid(),lease_ate=now()+interval '2 minutes',tentativas=tentativas+1 FROM chosen x WHERE d.id=x.id RETURNING d.*)
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'lease',d.lease,'sondagem_id',d.sondagem_id,'revision',d.revisao,'subscription',s.subscription)),'[]'::jsonb) INTO retval FROM claimed d JOIN itop_private.push_subscriptions s ON s.id=d.subscription_id;
 RETURN retval;
 ELSIF p_acao='ack' THEN
 IF (p_dados->>'status')::integer IN (404,410) THEN UPDATE itop_private.push_subscriptions SET ativo=false WHERE id=(SELECT subscription_id FROM itop_private.push_deliveries WHERE id=(p_dados->>'id')::uuid AND lease=(p_dados->>'lease')::uuid);END IF;
 UPDATE itop_private.push_deliveries SET enviado_em=CASE WHEN (p_dados->>'status')::integer BETWEEN 200 AND 299 THEN now() ELSE enviado_em END,encerrado=(p_dados->>'status')::integer IN (404,410),proxima_em=now()+make_interval(secs=>least(3600,60*power(2,tentativas)::integer)),lease_ate=NULL WHERE id=(p_dados->>'id')::uuid AND lease=(p_dados->>'lease')::uuid;RETURN '{"ok":true}'::jsonb;
 END IF;RAISE EXCEPTION 'OPERACAO_INVALIDA';
END $function$;
CREATE OR REPLACE FUNCTION itop_private.disparar_push()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.itop_retornos r JOIN public.itop_sondagens q ON q.id=r.sondagem_id AND q.excluida_at IS NULL AND q.diagnostico_final='cliente_ficou_de_pensar' JOIN public.perfis p ON p.id=r.vendedor_id AND p.ativo AND p.status_aprovacao='aprovado' JOIN itop_private.push_subscriptions s ON s.usuario_id=r.vendedor_id AND s.ativo AND itop_private.push_autorizado(s.usuario_id) LEFT JOIN itop_private.push_deliveries d ON d.sondagem_id=r.sondagem_id AND d.subscription_id=s.id AND d.revisao=r.revisao WHERE r.status='agendado' AND r.agendado_em<=now() AND (d.id IS NULL OR (d.enviado_em IS NULL AND NOT d.encerrado AND d.tentativas<5 AND d.proxima_em<=now() AND (d.lease_ate IS NULL OR d.lease_ate<now())))) THEN RETURN;END IF;
 PERFORM net.http_post(url:='https://tzvwrcxcubiacvlisvhf.supabase.co/functions/v1/itop-retornos',headers:=jsonb_build_object('Content-Type','application/json','x-itop-tick',(SELECT tick_token FROM itop_private.push_config WHERE id)),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
END $function$;
NOTIFY pgrst,'reload schema';

