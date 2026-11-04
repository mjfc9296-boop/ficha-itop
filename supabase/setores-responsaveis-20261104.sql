-- Setor profissional e responsável do convidado. Nenhum acesso é concedido pelo cadastro.
ALTER TABLE public.perfis ADD COLUMN setor text NOT NULL DEFAULT 'comercial_vendas' CHECK(setor IN ('comercial_vendas','financeiro','suporte','back_office'));
ALTER TABLE public.perfis ADD COLUMN responsavel_id uuid REFERENCES public.perfis(id) ON DELETE SET NULL;
ALTER TABLE public.itop_equipes ADD COLUMN setor text NOT NULL DEFAULT 'comercial_vendas' CHECK(setor IN ('comercial_vendas','financeiro','suporte','back_office'));
ALTER TABLE public.itop_equipes ADD COLUMN administrador_id uuid REFERENCES public.perfis(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX itop_carteira_administrador_unico ON public.itop_equipes(administrador_id) WHERE administrador_id IS NOT NULL;

-- Uso interno: resolve a carteira somente de supervisor/ADM aprovado e ativo.
CREATE FUNCTION itop_private.carteira_responsavel(p_responsavel uuid,p_setor text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.perfis;e uuid;
BEGIN
 IF p_setor IS NULL OR p_setor NOT IN ('comercial_vendas','financeiro','suporte','back_office') THEN RAISE EXCEPTION 'SETOR_INVALIDO';END IF;
 SELECT * INTO p FROM public.perfis WHERE id=p_responsavel AND ativo AND status_aprovacao='aprovado' AND papel IN ('administrador','supervisor');
 IF NOT FOUND THEN RAISE EXCEPTION 'RESPONSAVEL_INATIVO_OU_INVALIDO';END IF;
 IF p.papel='supervisor' AND p.setor<>p_setor THEN RAISE EXCEPTION 'SUPERVISOR_DE_OUTRO_SETOR';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('carteira:'||p.id::text,0));
 IF p.papel='administrador' THEN
  SELECT id INTO e FROM public.itop_equipes WHERE administrador_id=p.id AND ativo;
  IF e IS NULL AND lower(p.nome) IN ('mario caputo','mário caputo') THEN
   UPDATE public.itop_equipes SET administrador_id=p.id WHERE codigo_carteira='adm-mario' AND ativo RETURNING id INTO e;
  END IF;
  IF e IS NULL THEN INSERT INTO public.itop_equipes(nome,codigo_carteira,administrador_id) VALUES('Carteira ADM '||p.nome,'adm-'||p.id::text,p.id) RETURNING id INTO e;END IF;
 ELSE
  SELECT id INTO e FROM public.itop_equipes WHERE supervisor_origem=p.id AND ativo ORDER BY created_at LIMIT 1;
  IF e IS NULL THEN RAISE EXCEPTION 'SUPERVISOR_SEM_CARTEIRA_ATIVA';END IF;
 END IF;
 RETURN e;
END $$;
REVOKE ALL ON FUNCTION itop_private.carteira_responsavel(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION itop_private.responsaveis_cadastro(p_setor text) RETURNS TABLE(id uuid,nome text,papel text,setor text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,p.nome,p.papel,p.setor FROM public.perfis p WHERE p.ativo AND p.status_aprovacao='aprovado'
 AND p_setor IN ('comercial_vendas','financeiro','suporte','back_office')
 AND (p.papel='administrador' OR (p.papel='supervisor' AND p.setor=p_setor AND EXISTS(SELECT 1 FROM public.itop_equipes e WHERE e.supervisor_origem=p.id AND e.ativo))) ORDER BY p.papel,p.nome
$$;
CREATE FUNCTION public.itop_responsaveis_cadastro(p_setor text) RETURNS TABLE(id uuid,nome text,papel text,setor text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT * FROM itop_private.responsaveis_cadastro(p_setor); $$;
REVOKE ALL ON FUNCTION itop_private.responsaveis_cadastro(text),public.itop_responsaveis_cadastro(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION itop_private.responsaveis_cadastro(text),public.itop_responsaveis_cadastro(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.itop_equipes;r public.perfis;tipo text:=CASE WHEN NEW.raw_user_meta_data->>'solicitado_papel' IN ('supervisor','convidado') THEN NEW.raw_user_meta_data->>'solicitado_papel' ELSE 'vendedor' END;setor_escolhido text:=coalesce(nullif(NEW.raw_user_meta_data->>'setor',''),'comercial_vendas');responsavel uuid;
BEGIN
 IF setor_escolhido NOT IN ('comercial_vendas','financeiro','suporte','back_office') THEN RAISE EXCEPTION 'SETOR_INVALIDO';END IF;
 IF tipo='convidado' THEN
  IF coalesce(NEW.raw_user_meta_data->>'responsavel_id','') ~* '^[0-9a-f-]{36}$' THEN responsavel:=(NEW.raw_user_meta_data->>'responsavel_id')::uuid;
  ELSIF NEW.raw_user_meta_data->>'setor' IS NULL THEN SELECT id INTO responsavel FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' AND lower(nome) IN ('mario caputo','mário caputo') LIMIT 1;
  ELSE RAISE EXCEPTION 'SELECIONE_RESPONSAVEL';END IF;
  -- Só resolve o destino da solicitação; continua inativa e pendente.
  SELECT * INTO r FROM public.perfis WHERE id=responsavel AND ativo AND status_aprovacao='aprovado' AND papel IN ('administrador','supervisor');
  IF NOT FOUND THEN RAISE EXCEPTION 'RESPONSAVEL_INATIVO_OU_INVALIDO';END IF;
  IF r.papel='supervisor' AND r.setor<>setor_escolhido THEN RAISE EXCEPTION 'SUPERVISOR_DE_OUTRO_SETOR';END IF;
  IF r.papel='supervisor' THEN SELECT * INTO e FROM public.itop_equipes WHERE supervisor_origem=r.id AND ativo ORDER BY created_at LIMIT 1;
  ELSE SELECT * INTO e FROM public.itop_equipes WHERE ativo AND (administrador_id=r.id OR (codigo_carteira='adm-mario' AND lower(r.nome) IN ('mario caputo','mário caputo'))) LIMIT 1;END IF;
 ELSIF NEW.raw_user_meta_data->>'equipe_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE id=(NEW.raw_user_meta_data->>'equipe_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 ELSIF NEW.raw_user_meta_data->>'supervisor_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE supervisor_origem=(NEW.raw_user_meta_data->>'supervisor_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 END IF;
 IF tipo='vendedor' AND e.id IS NULL THEN RAISE EXCEPTION 'Selecione uma equipe comercial válida';END IF;
 IF tipo='supervisor' AND e.supervisor_origem IS NOT NULL THEN RAISE EXCEPTION 'Esta equipe já possui supervisor';END IF;
 INSERT INTO public.perfis(id,nome,papel,ativo,status_aprovacao,solicitado_papel,supervisor_id,coordenador_id,equipe_solicitada_id,setor,responsavel_id)
 VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'nome',''),'vendedor',false,'pendente',tipo,
 CASE WHEN tipo='vendedor' THEN e.supervisor_origem WHEN tipo='convidado' AND r.papel='supervisor' THEN responsavel END,
 CASE WHEN tipo='supervisor' THEN e.coordenador_id END,e.id,CASE WHEN tipo='vendedor' THEN coalesce(e.setor,'comercial_vendas') ELSE setor_escolhido END,responsavel);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION itop_private.aprovar_usuario(usuario_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.perfis;e public.itop_equipes;responsavel uuid;
BEGIN
 IF NOT coalesce(itop_private.pode_gerir_usuario(usuario_id),false) THEN RAISE EXCEPTION 'ACESSO_NEGADO';END IF;
 SELECT * INTO p FROM public.perfis WHERE id=usuario_id FOR UPDATE;
 IF p.status_aprovacao<>'pendente' OR p.solicitado_papel NOT IN ('supervisor','vendedor','convidado') THEN RAISE EXCEPTION 'CADASTRO_NAO_PENDENTE';END IF;
 IF p.solicitado_papel='convidado' THEN
  responsavel:=p.responsavel_id;
  IF responsavel IS NULL THEN SELECT id INTO responsavel FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' AND lower(nome) IN ('mario caputo','mário caputo') LIMIT 1;END IF;
  SELECT * INTO e FROM public.itop_equipes WHERE id=itop_private.carteira_responsavel(responsavel,p.setor);
 ELSE
  SELECT * INTO e FROM public.itop_equipes WHERE id=p.equipe_solicitada_id AND ativo FOR UPDATE;
  IF p.solicitado_papel='supervisor' AND e.id IS NULL THEN
   INSERT INTO public.itop_equipes(nome,codigo_carteira,setor) VALUES('Equipe '||p.nome,'supervisor-'||p.id::text,p.setor) RETURNING * INTO e;
  END IF;
  IF e.id IS NULL THEN RAISE EXCEPTION 'EQUIPE_INVALIDA';END IF;
 END IF;
 IF p.solicitado_papel='supervisor' THEN
  IF itop_private.papel() NOT IN ('administrador','coordenador') OR e.supervisor_origem IS NOT NULL THEN RAISE EXCEPTION 'SUPERVISOR_NAO_AUTORIZADO';END IF;
  UPDATE public.itop_equipes SET supervisor_origem=p.id,nome='Equipe '||p.nome,setor=p.setor WHERE id=e.id;
  INSERT INTO public.itop_equipe_supervisores(equipe_id,supervisor_id) VALUES(e.id,p.id) ON CONFLICT DO NOTHING;
  UPDATE public.perfis SET supervisor_id=p.id WHERE equipe_solicitada_id=e.id AND solicitado_papel='vendedor' AND status_aprovacao<>'rejeitado';
 ELSIF e.supervisor_origem IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=e.supervisor_origem AND s.ativo AND s.status_aprovacao='aprovado' AND s.papel='supervisor') THEN RAISE EXCEPTION 'SUPERVISOR_INATIVO';END IF;
 UPDATE public.perfis SET papel=p.solicitado_papel,ativo=true,status_aprovacao='aprovado',equipe_solicitada_id=e.id,responsavel_id=responsavel,
 supervisor_id=CASE WHEN p.solicitado_papel IN ('vendedor','convidado') THEN e.supervisor_origem END,
 coordenador_id=CASE WHEN p.solicitado_papel='supervisor' THEN e.coordenador_id END WHERE id=p.id;
 INSERT INTO public.itop_sondagem_auditoria(ator,acao,detalhes) VALUES(auth.uid(),'usuario:aprovar',jsonb_build_object('usuario',p.id,'equipe',e.id,'setor',p.setor,'responsavel',responsavel));
END $$;

CREATE OR REPLACE FUNCTION itop_private.sincronizar_equipe_perfil() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE equipe uuid;
BEGIN
 IF NEW.papel IN ('vendedor','convidado') THEN
  SELECT e.id INTO equipe FROM public.itop_equipes e WHERE e.ativo AND ((NEW.equipe_solicitada_id IS NOT NULL AND e.id=NEW.equipe_solicitada_id) OR (NEW.equipe_solicitada_id IS NULL AND e.supervisor_origem=NEW.supervisor_id)) LIMIT 1;
  IF NEW.ativo AND NEW.status_aprovacao='aprovado' AND equipe IS NOT NULL THEN
   INSERT INTO public.itop_equipe_membros(usuario_id,equipe_id) VALUES(NEW.id,equipe) ON CONFLICT(usuario_id) DO UPDATE SET equipe_id=excluded.equipe_id;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION itop_private.pode_gerir_usuario(alvo uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND alvo<>auth.uid() AND EXISTS(SELECT 1 FROM public.perfis p WHERE p.id=alvo AND (
 itop_private.eh_admin() OR
 (itop_private.papel()='coordenador' AND p.papel<>'administrador' AND p.papel<>'coordenador' AND
 (p.coordenador_id=auth.uid() OR EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=p.supervisor_id AND s.coordenador_id=auth.uid()) OR
 EXISTS(SELECT 1 FROM public.itop_equipes e WHERE e.id=p.equipe_solicitada_id AND e.coordenador_id=auth.uid()))) OR
 (itop_private.papel()='supervisor' AND p.papel IN ('vendedor','convidado') AND ((coalesce(p.solicitado_papel,p.papel)='vendedor' AND p.supervisor_id=auth.uid()) OR (coalesce(p.solicitado_papel,p.papel)='convidado' AND p.responsavel_id=auth.uid())))
 ))
$function$
;
CREATE OR REPLACE FUNCTION itop_private.estrutura_equipes()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE meu_papel text:=itop_private.papel();
BEGIN
 IF meu_papel IS NULL OR meu_papel NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN jsonb_build_object('usuario_id',auth.uid(),'papel',meu_papel,
 'lideranca',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'papel',p.papel) ORDER BY CASE WHEN p.nome='Mario Caputo' THEN 0 WHEN p.nome='Bruno Gomes' THEN 1 ELSE 2 END,p.nome),'[]'::jsonb) FROM public.perfis p WHERE p.ativo AND p.status_aprovacao='aprovado' AND (p.papel='administrador' OR (p.papel='coordenador' AND (meu_papel='administrador' OR p.id=auth.uid() OR EXISTS(SELECT 1 FROM public.perfis s WHERE s.id=auth.uid() AND s.coordenador_id=p.id))))),
 'equipes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'nome',e.nome,'codigo',e.codigo_carteira,'setor',e.setor,'administrador_id',e.administrador_id,'responsavel_id',coalesce(e.supervisor_origem,e.administrador_id,CASE WHEN e.codigo_carteira='adm-mario' THEN (SELECT id FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' AND lower(nome) IN ('mario caputo','mário caputo') LIMIT 1) END),'responsavel_nome',coalesce(s.nome,(SELECT nome FROM public.perfis WHERE id=e.administrador_id),CASE WHEN e.codigo_carteira='adm-mario' THEN 'Mario Caputo' END),'supervisor_id',e.supervisor_origem,'supervisor_nome',s.nome,'supervisor_ativo',s.ativo,'coordenador_id',e.coordenador_id,'coordenador_nome',c.nome) ORDER BY CASE WHEN e.codigo_carteira='paula' THEN 0 ELSE 1 END,e.nome),'[]'::jsonb) FROM public.itop_equipes e LEFT JOIN public.perfis s ON s.id=e.supervisor_origem LEFT JOIN public.perfis c ON c.id=e.coordenador_id WHERE e.ativo AND e.codigo_carteira IS NOT NULL AND itop_private.pode_equipe(e.id)),
 'pessoas',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'papel',p.papel,'ativo',p.ativo,'status_aprovacao',p.status_aprovacao,'solicitado_papel',p.solicitado_papel,'setor',p.setor,'responsavel_id',p.responsavel_id,'responsavel_nome',(SELECT nome FROM public.perfis WHERE id=p.responsavel_id),'supervisor_id',p.supervisor_id,'equipe_id',p.equipe_solicitada_id,'pode_gerir',itop_private.pode_gerir_usuario(p.id)) ORDER BY p.nome),'[]'::jsonb) FROM public.perfis p WHERE p.status_aprovacao<>'rejeitado' AND (itop_private.eh_admin() OR p.id=auth.uid() OR itop_private.pode_gerir_usuario(p.id))));
END $function$
;
CREATE OR REPLACE FUNCTION itop_private.carteiras_cadastro()
 RETURNS TABLE(id uuid, nome text, supervisor_id uuid, supervisor_nome text, disponivel_supervisor boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT e.id,e.nome,e.supervisor_origem,p.nome,e.supervisor_origem IS NULL FROM public.itop_equipes e LEFT JOIN public.perfis p ON p.id=e.supervisor_origem WHERE e.administrador_id IS NULL AND e.setor='comercial_vendas' AND e.codigo_carteira IS DISTINCT FROM 'adm-mario' AND e.ativo AND e.codigo_carteira IS NOT NULL AND (e.supervisor_origem IS NULL OR (p.ativo AND p.status_aprovacao='aprovado' AND p.papel='supervisor')) ORDER BY CASE WHEN e.codigo_carteira='paula' THEN 0 ELSE 1 END,e.nome
$function$
;
