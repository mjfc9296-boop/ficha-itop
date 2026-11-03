-- Hierarquia comercial: administradores > coordenador > supervisores > vendedores.
ALTER TABLE public.perfis DROP CONSTRAINT perfis_papel_check;
ALTER TABLE public.perfis ADD CONSTRAINT perfis_papel_check CHECK (papel IN ('administrador','coordenador','supervisor','vendedor'));
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES public.perfis(id);
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS equipe_solicitada_id uuid REFERENCES public.itop_equipes(id);
ALTER TABLE public.itop_equipes ADD COLUMN IF NOT EXISTS coordenador_id uuid REFERENCES public.perfis(id);
ALTER TABLE public.itop_equipes ADD COLUMN IF NOT EXISTS codigo_carteira text UNIQUE;
CREATE INDEX IF NOT EXISTS perfis_coordenador_idx ON public.perfis(coordenador_id);
CREATE INDEX IF NOT EXISTS perfis_equipe_solicitada_idx ON public.perfis(equipe_solicitada_id);
CREATE INDEX IF NOT EXISTS equipes_coordenador_idx ON public.itop_equipes(coordenador_id);

CREATE OR REPLACE FUNCTION itop_private.papel() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.papel FROM public.perfis p WHERE p.id=auth.uid() AND p.ativo AND p.status_aprovacao='aprovado' AND p.papel IN ('administrador','coordenador','supervisor','vendedor')
$$;
CREATE OR REPLACE FUNCTION itop_private.pode_equipe(e uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT itop_private.eh_admin() OR EXISTS(SELECT 1 FROM public.itop_equipes q WHERE q.id=e AND q.ativo AND
 ((itop_private.papel()='coordenador' AND q.coordenador_id=auth.uid()) OR
 (itop_private.papel()='supervisor' AND EXISTS(SELECT 1 FROM public.itop_equipe_supervisores x WHERE x.equipe_id=q.id AND x.supervisor_id=auth.uid()))))
$$;

DO $$ DECLARE g uuid; p uuid; BEGIN
 SELECT id INTO STRICT g FROM public.perfis WHERE nome='GABRIEL NOGUEIRA MARTINES' AND papel='supervisor' AND status_aprovacao='aprovado';
 UPDATE public.perfis SET papel='coordenador',nome='Gabriel Martinez' WHERE id=g;
 SELECT id INTO STRICT p FROM public.perfis WHERE nome='Paula Pio' AND papel='supervisor' AND status_aprovacao='aprovado';
 UPDATE public.perfis SET coordenador_id=g WHERE id=p;
 UPDATE public.itop_equipes SET coordenador_id=g;
 UPDATE public.itop_equipes SET nome='Equipe Paula',codigo_carteira='paula' WHERE supervisor_origem=p;
 INSERT INTO public.itop_equipes(nome,coordenador_id,codigo_carteira) VALUES('Equipe Novo usuário',g,'novo-usuario');
 -- Retira da seleção apenas os cartões vazios criados pelas tentativas anteriores; mantém histórico.
 UPDATE public.itop_equipes e SET ativo=false WHERE (e.nome='GABRIEL' OR e.supervisor_origem=g)
 AND NOT EXISTS(SELECT 1 FROM public.itop_equipe_membros m WHERE m.equipe_id=e.id)
 AND NOT EXISTS(SELECT 1 FROM public.itop_sondagens s WHERE s.equipe_id=e.id);
 UPDATE public.perfis v SET equipe_solicitada_id=e.id FROM public.itop_equipes e WHERE v.papel='vendedor' AND v.supervisor_id=e.supervisor_origem AND e.codigo_carteira IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION itop_private.sincronizar_equipe_perfil() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE equipe uuid;
BEGIN
 IF NEW.papel='vendedor' THEN
  SELECT e.id INTO equipe FROM public.itop_equipes e WHERE e.ativo AND
   ((NEW.equipe_solicitada_id IS NOT NULL AND e.id=NEW.equipe_solicitada_id) OR
    (NEW.equipe_solicitada_id IS NULL AND e.supervisor_origem=NEW.supervisor_id)) LIMIT 1;
  IF NEW.ativo AND NEW.status_aprovacao='aprovado' AND equipe IS NOT NULL THEN
   INSERT INTO public.itop_equipe_membros(usuario_id,equipe_id) VALUES(NEW.id,equipe)
    ON CONFLICT(usuario_id) DO UPDATE SET equipe_id=excluded.equipe_id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER itop_vincular_equipe_apos_aprovacao ON public.perfis;
CREATE TRIGGER itop_vincular_equipe_apos_aprovacao AFTER INSERT OR UPDATE OF papel,supervisor_id,ativo,status_aprovacao,equipe_solicitada_id ON public.perfis FOR EACH ROW EXECUTE FUNCTION itop_private.sincronizar_equipe_perfil();

CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.itop_equipes; tipo text:=CASE WHEN NEW.raw_user_meta_data->>'solicitado_papel'='supervisor' THEN 'supervisor' ELSE 'vendedor' END;
BEGIN
 IF NEW.raw_user_meta_data->>'equipe_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE id=(NEW.raw_user_meta_data->>'equipe_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 ELSIF NEW.raw_user_meta_data->>'supervisor_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE supervisor_origem=(NEW.raw_user_meta_data->>'supervisor_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 END IF;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Selecione uma equipe comercial válida'; END IF;
 IF tipo='supervisor' AND e.supervisor_origem IS NOT NULL THEN RAISE EXCEPTION 'Esta equipe já possui supervisor'; END IF;
 -- Metadados escolhem somente o destino da solicitação. Nunca concedem acesso ou papel privilegiado.
 INSERT INTO public.perfis(id,nome,papel,ativo,status_aprovacao,solicitado_papel,supervisor_id,coordenador_id,equipe_solicitada_id)
 VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'nome',''),'vendedor',false,'pendente',tipo,
 CASE WHEN tipo='vendedor' THEN e.supervisor_origem END,CASE WHEN tipo='supervisor' THEN e.coordenador_id END,e.id);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION itop_private.pode_gerir_usuario(alvo uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND alvo<>auth.uid() AND EXISTS(SELECT 1 FROM public.perfis p WHERE p.id=alvo AND (
 itop_private.eh_admin() OR
 (itop_private.papel()='coordenador' AND p.papel<>'administrador' AND p.papel<>'coordenador' AND
 (p.coordenador_id=auth.uid() OR EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=p.supervisor_id AND s.coordenador_id=auth.uid()) OR
 EXISTS(SELECT 1 FROM public.itop_equipes e WHERE e.id=p.equipe_solicitada_id AND e.coordenador_id=auth.uid()))) OR
 (itop_private.papel()='supervisor' AND coalesce(p.solicitado_papel,p.papel)='vendedor' AND p.papel='vendedor' AND p.supervisor_id=auth.uid())
 ))
$$;

CREATE OR REPLACE FUNCTION itop_private.aprovar_usuario(usuario_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.perfis; e public.itop_equipes;
BEGIN
 IF NOT coalesce(itop_private.pode_gerir_usuario(usuario_id),false) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO p FROM public.perfis WHERE id=usuario_id FOR UPDATE;
 IF p.status_aprovacao<>'pendente' OR p.solicitado_papel NOT IN ('supervisor','vendedor') THEN RAISE EXCEPTION 'CADASTRO_NAO_PENDENTE'; END IF;
 SELECT * INTO e FROM public.itop_equipes WHERE id=p.equipe_solicitada_id AND ativo FOR UPDATE;
 IF e.id IS NULL THEN RAISE EXCEPTION 'EQUIPE_INVALIDA'; END IF;
 IF p.solicitado_papel='supervisor' THEN
  IF itop_private.papel() NOT IN ('administrador','coordenador') OR e.supervisor_origem IS NOT NULL THEN RAISE EXCEPTION 'SUPERVISOR_NAO_AUTORIZADO'; END IF;
  UPDATE public.itop_equipes SET supervisor_origem=p.id,nome='Equipe '||p.nome WHERE id=e.id;
  INSERT INTO public.itop_equipe_supervisores(equipe_id,supervisor_id) VALUES(e.id,p.id) ON CONFLICT DO NOTHING;
  UPDATE public.perfis SET supervisor_id=p.id WHERE equipe_solicitada_id=e.id AND solicitado_papel='vendedor' AND status_aprovacao<>'rejeitado';
 ELSE
  IF e.supervisor_origem IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=e.supervisor_origem AND s.ativo AND s.status_aprovacao='aprovado' AND s.papel='supervisor') THEN RAISE EXCEPTION 'SUPERVISOR_INATIVO'; END IF;
 END IF;
 UPDATE public.perfis SET papel=p.solicitado_papel,ativo=true,status_aprovacao='aprovado',
 supervisor_id=CASE WHEN p.solicitado_papel='vendedor' THEN e.supervisor_origem END,
 coordenador_id=CASE WHEN p.solicitado_papel='supervisor' THEN e.coordenador_id END WHERE id=p.id;
 INSERT INTO public.itop_sondagem_auditoria(ator,acao,detalhes) VALUES(auth.uid(),'usuario:aprovar',jsonb_build_object('usuario',p.id,'equipe',e.id));
END $$;
CREATE OR REPLACE FUNCTION public.aprovar_usuario(usuario_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.aprovar_usuario(usuario_id); $$;

CREATE OR REPLACE FUNCTION itop_private.alterar_acesso_usuario(usuario_id uuid,novo_ativo boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(itop_private.pode_gerir_usuario(usuario_id),false) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.perfis WHERE id=usuario_id AND papel<>'administrador' AND status_aprovacao='aprovado') THEN RAISE EXCEPTION 'PERFIL_INVALIDO'; END IF;
 UPDATE public.perfis SET ativo=novo_ativo WHERE id=usuario_id;
 INSERT INTO public.itop_sondagem_auditoria(ator,acao,detalhes) VALUES(auth.uid(),'usuario:acesso',jsonb_build_object('usuario',usuario_id,'ativo',novo_ativo));
END $$;
CREATE OR REPLACE FUNCTION public.alterar_acesso_usuario(usuario_id uuid,novo_ativo boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT itop_private.alterar_acesso_usuario(usuario_id,novo_ativo); $$;

CREATE OR REPLACE FUNCTION itop_private.excluir_usuario(usuario_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(itop_private.pode_gerir_usuario(usuario_id),false) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 -- Encerra o acesso imediatamente; não apaga a autoria e os resultados comerciais.
 UPDATE public.perfis SET ativo=false,status_aprovacao='rejeitado' WHERE id=usuario_id;
 IF EXISTS(SELECT 1 FROM public.perfis WHERE id=usuario_id AND papel='supervisor') THEN
  UPDATE public.itop_equipes SET supervisor_origem=NULL,nome='Equipe Novo usuário' WHERE supervisor_origem=usuario_id;
  DELETE FROM public.itop_equipe_supervisores WHERE supervisor_id=usuario_id;
  UPDATE public.perfis SET supervisor_id=NULL WHERE supervisor_id=usuario_id AND papel='vendedor';
 END IF;
 INSERT INTO public.itop_sondagem_auditoria(ator,acao,detalhes) VALUES(auth.uid(),'usuario:excluir',jsonb_build_object('usuario',usuario_id));
END $$;
CREATE OR REPLACE FUNCTION itop_private.rejeitar_usuario(usuario_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.perfis WHERE id=usuario_id AND status_aprovacao='pendente') THEN RAISE EXCEPTION 'CADASTRO_NAO_PENDENTE'; END IF;
 PERFORM itop_private.excluir_usuario(usuario_id);
END $$;
CREATE OR REPLACE FUNCTION public.rejeitar_usuario(usuario_id uuid) RETURNS void LANGUAGE sql SET search_path='' AS $$ SELECT itop_private.rejeitar_usuario(usuario_id); $$;

CREATE OR REPLACE FUNCTION itop_private.estrutura_equipes() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE meu_papel text:=itop_private.papel();
BEGIN
 IF meu_papel IS NULL OR meu_papel NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN jsonb_build_object('usuario_id',auth.uid(),'papel',meu_papel,
 'lideranca',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'papel',p.papel) ORDER BY CASE WHEN p.nome='Mario Caputo' THEN 0 WHEN p.nome='Bruno Gomes' THEN 1 ELSE 2 END,p.nome),'[]'::jsonb) FROM public.perfis p WHERE p.ativo AND p.status_aprovacao='aprovado' AND (p.papel='administrador' OR (p.papel='coordenador' AND (meu_papel='administrador' OR p.id=auth.uid() OR EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=auth.uid() AND s.coordenador_id=p.id))))),
 'equipes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'nome',e.nome,'codigo',e.codigo_carteira,'supervisor_id',e.supervisor_origem,'supervisor_nome',s.nome,'supervisor_ativo',s.ativo,'coordenador_id',e.coordenador_id,'coordenador_nome',c.nome) ORDER BY CASE WHEN e.codigo_carteira='paula' THEN 0 ELSE 1 END,e.nome),'[]'::jsonb) FROM public.itop_equipes e LEFT JOIN public.perfis s ON s.id=e.supervisor_origem LEFT JOIN public.perfis c ON c.id=e.coordenador_id WHERE e.ativo AND e.codigo_carteira IS NOT NULL AND itop_private.pode_equipe(e.id)),
 'pessoas',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'papel',p.papel,'ativo',p.ativo,'status_aprovacao',p.status_aprovacao,'solicitado_papel',p.solicitado_papel,'supervisor_id',p.supervisor_id,'equipe_id',p.equipe_solicitada_id,'pode_gerir',itop_private.pode_gerir_usuario(p.id)) ORDER BY p.nome),'[]'::jsonb) FROM public.perfis p WHERE p.status_aprovacao<>'rejeitado' AND (itop_private.eh_admin() OR p.id=auth.uid() OR itop_private.pode_gerir_usuario(p.id))));
END $$;
CREATE OR REPLACE FUNCTION public.itop_estrutura_equipes() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT itop_private.estrutura_equipes(); $$;

-- Catálogo mínimo público para escolher o destino do cadastro, inclusive carteira aguardando supervisor.
CREATE OR REPLACE FUNCTION itop_private.carteiras_cadastro() RETURNS TABLE(id uuid,nome text,supervisor_id uuid,supervisor_nome text,disponivel_supervisor boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT e.id,e.nome,e.supervisor_origem,p.nome,e.supervisor_origem IS NULL FROM public.itop_equipes e LEFT JOIN public.perfis p ON p.id=e.supervisor_origem WHERE e.ativo AND e.codigo_carteira IS NOT NULL AND (e.supervisor_origem IS NULL OR (p.ativo AND p.status_aprovacao='aprovado' AND p.papel='supervisor')) ORDER BY CASE WHEN e.codigo_carteira='paula' THEN 0 ELSE 1 END,e.nome
$$;
CREATE OR REPLACE FUNCTION public.itop_carteiras_cadastro() RETURNS TABLE(id uuid,nome text,supervisor_id uuid,supervisor_nome text,disponivel_supervisor boolean) LANGUAGE sql STABLE SET search_path='' AS $$ SELECT * FROM itop_private.carteiras_cadastro(); $$;

-- Mantém os RPCs antigos compatíveis, com as novas permissões no banco.
CREATE OR REPLACE FUNCTION itop_private.listar_equipe() RETURNS TABLE(id uuid,nome text,papel text,ativo boolean,supervisor_id uuid,status_aprovacao text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN QUERY SELECT p.id,p.nome,p.papel,p.ativo,p.supervisor_id,p.status_aprovacao FROM public.perfis p WHERE p.status_aprovacao='aprovado' AND (itop_private.eh_admin() OR p.id=auth.uid() OR itop_private.pode_gerir_usuario(p.id)) ORDER BY p.nome;
END $$;
CREATE OR REPLACE FUNCTION public.listar_equipe() RETURNS TABLE(id uuid,nome text,papel text,ativo boolean,supervisor_id uuid,status_aprovacao text) LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT * FROM itop_private.listar_equipe(); $$;
CREATE OR REPLACE FUNCTION itop_private.listar_cadastros_pendentes() RETURNS TABLE(id uuid,nome text,solicitado_papel text,supervisor_id uuid,criado_em timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN QUERY SELECT p.id,p.nome,p.solicitado_papel,p.supervisor_id,p.criado_em FROM public.perfis p WHERE p.status_aprovacao='pendente' AND itop_private.pode_gerir_usuario(p.id) ORDER BY p.criado_em;
END $$;
CREATE OR REPLACE FUNCTION public.listar_cadastros_pendentes() RETURNS TABLE(id uuid,nome text,solicitado_papel text,supervisor_id uuid,criado_em timestamptz) LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT * FROM itop_private.listar_cadastros_pendentes(); $$;

-- Um cadastro passa a ter uma única origem; vínculos avulsos antigos são descontinuados.
CREATE OR REPLACE FUNCTION itop_private.itop_gerir_equipe(p_acao text,p_nome text DEFAULT NULL,p_equipe uuid DEFAULT NULL,p_usuario uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.itop_equipes;
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO e FROM public.itop_equipes WHERE id=p_equipe AND ativo;
 IF e.id IS NULL OR NOT itop_private.pode_equipe(e.id) OR NOT itop_private.pode_gerir_usuario(p_usuario) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF p_acao<>'vincular_vendedor' THEN RAISE EXCEPTION 'Use os cartões de equipes para gerenciar usuários'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.perfis p WHERE p.id=p_usuario AND p.papel='vendedor' AND p.status_aprovacao='aprovado') THEN RAISE EXCEPTION 'PERFIL_INVALIDO'; END IF;
 UPDATE public.perfis SET supervisor_id=e.supervisor_origem,equipe_solicitada_id=e.id WHERE id=p_usuario;
 INSERT INTO public.itop_sondagem_auditoria(ator,acao,detalhes) VALUES(auth.uid(),'usuario:transferir',jsonb_build_object('usuario',p_usuario,'equipe',e.id));
 RETURN e.id;
END $$;

REVOKE ALL ON FUNCTION itop_private.pode_gerir_usuario(uuid),itop_private.aprovar_usuario(uuid),itop_private.alterar_acesso_usuario(uuid,boolean),itop_private.rejeitar_usuario(uuid),itop_private.estrutura_equipes(),itop_private.listar_equipe(),itop_private.listar_cadastros_pendentes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.pode_gerir_usuario(uuid),itop_private.aprovar_usuario(uuid),itop_private.alterar_acesso_usuario(uuid,boolean),itop_private.rejeitar_usuario(uuid),itop_private.estrutura_equipes(),itop_private.listar_equipe(),itop_private.listar_cadastros_pendentes() TO authenticated;
REVOKE ALL ON FUNCTION public.itop_estrutura_equipes(),public.rejeitar_usuario(uuid),public.listar_equipe(),public.listar_cadastros_pendentes(),public.aprovar_usuario(uuid),public.alterar_acesso_usuario(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_estrutura_equipes(),public.rejeitar_usuario(uuid),public.listar_equipe(),public.listar_cadastros_pendentes(),public.aprovar_usuario(uuid),public.alterar_acesso_usuario(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION itop_private.carteiras_cadastro(),public.itop_carteiras_cadastro() FROM PUBLIC;
GRANT USAGE ON SCHEMA itop_private TO anon;
GRANT EXECUTE ON FUNCTION itop_private.carteiras_cadastro(),public.itop_carteiras_cadastro() TO anon,authenticated;

-- Coordenador participa do painel de indicadores e da visão separada de testes.
ALTER POLICY sondagens_testes_restritos ON public.itop_sondagens USING (NOT teste OR itop_private.papel() IN ('administrador','coordenador','supervisor'));
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.itop_indicadores(jsonb)'::regprocedure) INTO def;
 def:=replace(def,'''administrador'',''supervisor''','''administrador'',''coordenador'',''supervisor''');
 EXECUTE def;
 SELECT pg_get_functiondef('itop_private.itop_comercial_contexto()'::regprocedure) INTO def;
 def:=replace(def,'itop_private.eh_admin() or p.id=u','itop_private.eh_admin() or itop_private.pode_gerir_usuario(p.id) or p.id=u');
 EXECUTE def;
END $$;
NOTIFY pgrst,'reload schema';
