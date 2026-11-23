-- Retornos comerciais e Web Push. Sem provedor de SMS ou e-mail.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS telefone text CHECK(telefone IS NULL OR telefone ~ '^55[1-9][0-9]9[0-9]{8}$');
CREATE UNIQUE INDEX IF NOT EXISTS itop_perfil_telefone_unico ON public.perfis(telefone) WHERE telefone IS NOT NULL;
CREATE OR REPLACE FUNCTION itop_private.normalizar_celular(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN length(v)=11 THEN '55'||v WHEN length(v)=13 AND left(v,2)='55' THEN v ELSE NULL END FROM (SELECT regexp_replace(coalesce(t,''),'[^0-9]','','g') v) x $$;
CREATE OR REPLACE FUNCTION itop_private.telefone_perfil_novo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t text;
BEGIN
 IF coalesce(new.raw_user_meta_data->>'telefone','')<>'' THEN
 t:=itop_private.normalizar_celular(new.raw_user_meta_data->>'telefone');
 IF t IS NULL OR t !~ '^55[1-9][0-9]9[0-9]{8}$' THEN RAISE EXCEPTION 'CELULAR_COM_DDD_INVALIDO';END IF;
 UPDATE public.perfis SET telefone=t WHERE id=new.id;
 END IF;RETURN new;
END $$;
CREATE TRIGGER zz_itop_telefone_novo AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION itop_private.telefone_perfil_novo();
REVOKE ALL ON FUNCTION itop_private.telefone_perfil_novo() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION itop_private.salvar_meu_telefone(p_telefone text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t text:=itop_private.normalizar_celular(p_telefone);
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF t IS NULL OR t !~ '^55[1-9][0-9]9[0-9]{8}$' THEN RAISE EXCEPTION 'Informe um celular válido com DDD e 11 dígitos.';END IF;
 UPDATE public.perfis SET telefone=t WHERE id=auth.uid();RETURN t;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Este celular já está vinculado a outro cadastro.';
END $$;
CREATE OR REPLACE FUNCTION public.itop_salvar_meu_telefone(p_telefone text) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.salvar_meu_telefone(p_telefone); $$;
REVOKE ALL ON FUNCTION itop_private.salvar_meu_telefone(text),public.itop_salvar_meu_telefone(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.salvar_meu_telefone(text),public.itop_salvar_meu_telefone(text) TO authenticated;

CREATE TABLE public.itop_retornos(
 sondagem_id uuid PRIMARY KEY REFERENCES public.itop_sondagens(id) ON DELETE CASCADE,
 vendedor_id uuid NOT NULL REFERENCES public.perfis(id),
 agendado_em timestamptz NOT NULL,
 observacao text NOT NULL DEFAULT '' CHECK(length(observacao)<=500),
 status text NOT NULL CHECK(status IN ('rascunho','agendado','concluido','cancelado')),
 revisao integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),concluido_em timestamptz
);
ALTER TABLE public.itop_retornos ENABLE ROW LEVEL SECURITY;
CREATE POLICY retornos_leitura ON public.itop_retornos FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.itop_sondagens s WHERE s.id=sondagem_id AND s.excluida_at IS NULL AND itop_private.pode_ler(s.vendedor_id,s.equipe_id)));
GRANT SELECT ON public.itop_retornos TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.itop_retornos FROM anon,authenticated;
CREATE INDEX itop_retornos_agendados ON public.itop_retornos(agendado_em) WHERE status='agendado';
CREATE OR REPLACE FUNCTION itop_private.agendar_retorno(p_id uuid,p_quando timestamptz,p_observacao text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.itop_sondagens;r public.itop_retornos;
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND excluida_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT itop_private.pode_ler(s.vendedor_id,s.equipe_id) OR (s.vendedor_id<>auth.uid() AND NOT itop_private.pode_equipe(s.equipe_id)) THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF s.status IN ('venda_confirmada','perdida') OR coalesce(s.diagnostico_final,'')='venda_fechada' THEN RAISE EXCEPTION 'Esta proposta já foi encerrada.';END IF;
 IF p_quando IS NULL OR p_quando<=now() OR p_quando>now()+interval '1 year' THEN RAISE EXCEPTION 'Escolha uma data futura dentro de um ano.';END IF;
 IF length(coalesce(p_observacao,''))>500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.';END IF;
 INSERT INTO public.itop_retornos(sondagem_id,vendedor_id,agendado_em,observacao,status) VALUES(s.id,s.vendedor_id,p_quando,coalesce(p_observacao,''),CASE WHEN s.diagnostico_final='cliente_ficou_de_pensar' THEN 'agendado' ELSE 'rascunho' END)
 ON CONFLICT(sondagem_id) DO UPDATE SET agendado_em=excluded.agendado_em,observacao=excluded.observacao,status=excluded.status,revisao=itop_retornos.revisao+1,updated_at=now(),concluido_em=NULL RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
CREATE OR REPLACE FUNCTION public.itop_agendar_retorno(p_id uuid,p_quando timestamptz,p_observacao text DEFAULT '') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.agendar_retorno(p_id,p_quando,p_observacao); $$;
CREATE OR REPLACE FUNCTION itop_private.concluir_retorno(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.itop_sondagens s WHERE s.id=p_id AND s.excluida_at IS NULL AND itop_private.pode_ler(s.vendedor_id,s.equipe_id)) THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 UPDATE public.itop_retornos SET status='concluido',concluido_em=now(),revisao=revisao+1,updated_at=now() WHERE sondagem_id=p_id;
END $$;
CREATE OR REPLACE FUNCTION public.itop_concluir_retorno(p_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.concluir_retorno(p_id); $$;
CREATE OR REPLACE FUNCTION public.itop_listar_retornos() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.agendado_em),'[]'::jsonb) FROM (
 SELECT r.*,s.dados#>>'{campos,nome}' cliente,s.dados#>>'{campos,telefone}' telefone,s.teste,s.dados#>>'{campos,vendedor}' vendedor FROM public.itop_retornos r JOIN public.itop_sondagens s ON s.id=r.sondagem_id WHERE auth.uid() IS NOT NULL AND itop_private.papel() IS NOT NULL AND itop_private.pode_ler(s.vendedor_id,s.equipe_id) AND s.excluida_at IS NULL AND r.status='agendado' ORDER BY r.agendado_em LIMIT 200) q;
$$;
CREATE OR REPLACE FUNCTION itop_private.sincronizar_retorno() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF new.excluida_at IS NOT NULL OR new.status IN ('venda_confirmada','perdida') OR (old.diagnostico_final IS NOT NULL AND new.diagnostico_final IS DISTINCT FROM old.diagnostico_final) THEN
 UPDATE public.itop_retornos SET status='cancelado',revisao=revisao+1,updated_at=now() WHERE sondagem_id=new.id AND status IN ('rascunho','agendado');
 ELSIF new.diagnostico_final='cliente_ficou_de_pensar' AND old.diagnostico_final IS DISTINCT FROM new.diagnostico_final THEN
 UPDATE public.itop_retornos SET status='agendado',revisao=revisao+1,updated_at=now() WHERE sondagem_id=new.id AND status='rascunho';
 END IF;RETURN new;
END $$;
CREATE TRIGGER itop_retorno_status AFTER UPDATE ON public.itop_sondagens FOR EACH ROW EXECUTE FUNCTION itop_private.sincronizar_retorno();
REVOKE ALL ON FUNCTION itop_private.sincronizar_retorno() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION itop_private.agendar_retorno(uuid,timestamptz,text),public.itop_agendar_retorno(uuid,timestamptz,text),itop_private.concluir_retorno(uuid),public.itop_concluir_retorno(uuid),public.itop_listar_retornos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.agendar_retorno(uuid,timestamptz,text),public.itop_agendar_retorno(uuid,timestamptz,text),itop_private.concluir_retorno(uuid),public.itop_concluir_retorno(uuid),public.itop_listar_retornos() TO authenticated;

CREATE TABLE itop_private.push_config(id boolean PRIMARY KEY DEFAULT true CHECK(id),public_key text,private_key text,tick_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'));
INSERT INTO itop_private.push_config(id) VALUES(true);
CREATE TABLE itop_private.push_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,endpoint text NOT NULL UNIQUE,subscription jsonb NOT NULL,ativo boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX itop_push_usuario ON itop_private.push_subscriptions(usuario_id) WHERE ativo;
CREATE TABLE itop_private.push_deliveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sondagem_id uuid NOT NULL REFERENCES public.itop_retornos(sondagem_id) ON DELETE CASCADE,subscription_id uuid NOT NULL REFERENCES itop_private.push_subscriptions(id) ON DELETE CASCADE,revisao integer NOT NULL,tentativas integer NOT NULL DEFAULT 0,proxima_em timestamptz NOT NULL DEFAULT now(),lease uuid,lease_ate timestamptz,enviado_em timestamptz,encerrado boolean NOT NULL DEFAULT false,UNIQUE(sondagem_id,subscription_id,revisao));
CREATE TABLE itop_private.login_limits(chave text PRIMARY KEY,janela timestamptz NOT NULL DEFAULT now(),tentativas integer NOT NULL DEFAULT 1);
ALTER TABLE itop_private.push_config ENABLE ROW LEVEL SECURITY;ALTER TABLE itop_private.push_subscriptions ENABLE ROW LEVEL SECURITY;ALTER TABLE itop_private.push_deliveries ENABLE ROW LEVEL SECURITY;ALTER TABLE itop_private.login_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON itop_private.push_config,itop_private.push_subscriptions,itop_private.push_deliveries,itop_private.login_limits FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION itop_private.inscrever_push(p_subscription jsonb,p_ativo boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ep text:=p_subscription->>'endpoint';
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 IF ep IS NULL OR length(ep)>2500 OR ep !~ '^https://(fcm[.]googleapis[.]com|[a-z0-9.-]+[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9.-]+[.]notify[.]windows[.]com)/' OR octet_length(p_subscription::text)>6000 THEN RAISE EXCEPTION 'ASSINATURA_PUSH_INVALIDA';END IF;
 IF p_ativo AND (coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^[A-Za-z0-9_-]{80,120}={0,2}$' OR coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{20,30}={0,2}$') THEN RAISE EXCEPTION 'CHAVES_PUSH_INVALIDAS';END IF;
 -- A assinatura pertence ao usuário que ativou este navegador; logout a desativa.
 IF p_ativo THEN
 INSERT INTO itop_private.push_subscriptions(usuario_id,endpoint,subscription) VALUES(auth.uid(),ep,p_subscription) ON CONFLICT(endpoint) DO UPDATE SET usuario_id=auth.uid(),subscription=excluded.subscription,ativo=true,updated_at=now();
 ELSE UPDATE itop_private.push_subscriptions SET ativo=false,updated_at=now() WHERE endpoint=ep AND usuario_id=auth.uid();END IF;
END $$;
CREATE OR REPLACE FUNCTION public.itop_inscrever_push(p_subscription jsonb,p_ativo boolean DEFAULT true) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.inscrever_push(p_subscription,p_ativo); $$;
REVOKE ALL ON FUNCTION itop_private.inscrever_push(jsonb,boolean),public.itop_inscrever_push(jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.inscrever_push(jsonb,boolean),public.itop_inscrever_push(jsonb,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION itop_private.push_servico(p_acao text,p_dados jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 SELECT r.sondagem_id,s.id,r.revisao FROM public.itop_retornos r JOIN public.itop_sondagens q ON q.id=r.sondagem_id JOIN itop_private.push_subscriptions s ON s.usuario_id=r.vendedor_id AND s.ativo JOIN public.perfis p ON p.id=r.vendedor_id AND p.ativo AND p.status_aprovacao='aprovado' WHERE r.status='agendado' AND r.agendado_em<=now() AND q.excluida_at IS NULL AND q.diagnostico_final='cliente_ficou_de_pensar' AND q.status NOT IN ('venda_confirmada','perdida') ORDER BY r.agendado_em LIMIT 500 ON CONFLICT DO NOTHING;
 WITH chosen AS(SELECT d.id FROM itop_private.push_deliveries d JOIN public.itop_retornos r ON r.sondagem_id=d.sondagem_id AND r.revisao=d.revisao JOIN itop_private.push_subscriptions s ON s.id=d.subscription_id AND s.ativo WHERE r.status='agendado' AND NOT d.encerrado AND d.enviado_em IS NULL AND d.tentativas<5 AND d.proxima_em<=now() AND (d.lease_ate IS NULL OR d.lease_ate<now()) ORDER BY r.agendado_em LIMIT 20 FOR UPDATE OF d SKIP LOCKED),claimed AS(UPDATE itop_private.push_deliveries d SET lease=gen_random_uuid(),lease_ate=now()+interval '2 minutes',tentativas=tentativas+1 FROM chosen x WHERE d.id=x.id RETURNING d.*)
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'lease',d.lease,'sondagem_id',d.sondagem_id,'revision',d.revisao,'subscription',s.subscription)),'[]'::jsonb) INTO retval FROM claimed d JOIN itop_private.push_subscriptions s ON s.id=d.subscription_id;
 RETURN retval;
 ELSIF p_acao='ack' THEN
 IF (p_dados->>'status')::integer IN (404,410) THEN UPDATE itop_private.push_subscriptions SET ativo=false WHERE id=(SELECT subscription_id FROM itop_private.push_deliveries WHERE id=(p_dados->>'id')::uuid AND lease=(p_dados->>'lease')::uuid);END IF;
 UPDATE itop_private.push_deliveries SET enviado_em=CASE WHEN (p_dados->>'status')::integer BETWEEN 200 AND 299 THEN now() ELSE enviado_em END,encerrado=(p_dados->>'status')::integer IN (404,410),proxima_em=now()+make_interval(secs=>least(3600,60*power(2,tentativas)::integer)),lease_ate=NULL WHERE id=(p_dados->>'id')::uuid AND lease=(p_dados->>'lease')::uuid;RETURN '{"ok":true}'::jsonb;
 END IF;RAISE EXCEPTION 'OPERACAO_INVALIDA';
END $$;
CREATE OR REPLACE FUNCTION public.itop_push_servico(p_acao text,p_dados jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.push_servico(p_acao,p_dados); $$;
REVOKE ALL ON FUNCTION itop_private.push_servico(text,jsonb),public.itop_push_servico(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA itop_private TO service_role;
GRANT EXECUTE ON FUNCTION itop_private.push_servico(text,jsonb),public.itop_push_servico(text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION itop_private.disparar_push() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.itop_retornos r JOIN public.itop_sondagens q ON q.id=r.sondagem_id AND q.excluida_at IS NULL AND q.diagnostico_final='cliente_ficou_de_pensar' AND q.status NOT IN ('venda_confirmada','perdida') JOIN public.perfis p ON p.id=r.vendedor_id AND p.ativo AND p.status_aprovacao='aprovado' JOIN itop_private.push_subscriptions s ON s.usuario_id=r.vendedor_id AND s.ativo LEFT JOIN itop_private.push_deliveries d ON d.sondagem_id=r.sondagem_id AND d.subscription_id=s.id AND d.revisao=r.revisao WHERE r.status='agendado' AND r.agendado_em<=now() AND (d.id IS NULL OR (d.enviado_em IS NULL AND NOT d.encerrado AND d.tentativas<5 AND d.proxima_em<=now() AND (d.lease_ate IS NULL OR d.lease_ate<now())))) THEN RETURN;END IF;
 PERFORM net.http_post(url:='https://tzvwrcxcubiacvlisvhf.supabase.co/functions/v1/itop-retornos',headers:=jsonb_build_object('Content-Type','application/json','x-itop-tick',(SELECT tick_token FROM itop_private.push_config WHERE id)),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
END $$;
REVOKE ALL ON FUNCTION itop_private.disparar_push() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('itop-retornos-push','* * * * *','SELECT itop_private.disparar_push();');
NOTIFY pgrst,'reload schema';
