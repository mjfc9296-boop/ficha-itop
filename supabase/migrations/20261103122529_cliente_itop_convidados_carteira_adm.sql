ALTER TABLE public.perfis DROP CONSTRAINT perfis_papel_check; ALTER TABLE public.perfis ADD CONSTRAINT perfis_papel_check CHECK (papel IN ('administrador','coordenador','supervisor','vendedor','convidado')); ALTER TABLE public.perfis DROP CONSTRAINT perfis_solicitado_papel_check; ALTER TABLE public.perfis ADD CONSTRAINT perfis_solicitado_papel_check CHECK (solicitado_papel IS NULL OR solicitado_papel IN ('vendedor','supervisor','convidado'));
CREATE OR REPLACE FUNCTION itop_private.papel()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT p.papel FROM public.perfis p WHERE p.id=auth.uid() AND p.ativo AND p.status_aprovacao='aprovado' AND p.papel IN ('administrador','coordenador','supervisor','vendedor','convidado')
$function$;
CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE e public.itop_equipes; tipo text:=CASE WHEN NEW.raw_user_meta_data->>'solicitado_papel'='supervisor' THEN 'supervisor' WHEN NEW.raw_user_meta_data->>'solicitado_papel'='convidado' THEN 'convidado' ELSE 'vendedor' END;
BEGIN
 IF NEW.raw_user_meta_data->>'equipe_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE id=(NEW.raw_user_meta_data->>'equipe_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 ELSIF NEW.raw_user_meta_data->>'supervisor_id' ~* '^[0-9a-f-]{36}$' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE supervisor_origem=(NEW.raw_user_meta_data->>'supervisor_id')::uuid AND ativo AND codigo_carteira IS NOT NULL;
 END IF;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Selecione uma equipe comercial válida'; END IF;
 IF tipo='convidado' AND e.codigo_carteira<>'adm-mario' THEN RAISE EXCEPTION 'CONVIDADO_SOMENTE_CARTEIRA_ADM'; END IF;
 IF tipo='supervisor' AND e.supervisor_origem IS NOT NULL THEN RAISE EXCEPTION 'Esta equipe já possui supervisor'; END IF;
 -- Metadados escolhem somente o destino da solicitação. Nunca concedem acesso ou papel privilegiado.
 INSERT INTO public.perfis(id,nome,papel,ativo,status_aprovacao,solicitado_papel,supervisor_id,coordenador_id,equipe_solicitada_id)
 VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'nome',''),'vendedor',false,'pendente',tipo,
 CASE WHEN tipo='vendedor' THEN e.supervisor_origem END,CASE WHEN tipo='supervisor' THEN e.coordenador_id END,e.id);
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION itop_private.aprovar_usuario(usuario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.perfis; e public.itop_equipes;
BEGIN
 IF NOT coalesce(itop_private.pode_gerir_usuario(usuario_id),false) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO p FROM public.perfis WHERE id=usuario_id FOR UPDATE;
 IF p.status_aprovacao<>'pendente' OR p.solicitado_papel NOT IN ('supervisor','vendedor','convidado') THEN RAISE EXCEPTION 'CADASTRO_NAO_PENDENTE'; END IF;
 IF p.solicitado_papel='convidado' AND NOT itop_private.eh_admin() THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
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
END $function$;
CREATE OR REPLACE FUNCTION itop_private.carteiras_cadastro()
 RETURNS TABLE(id uuid, nome text, supervisor_id uuid, supervisor_nome text, disponivel_supervisor boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT e.id,e.nome,e.supervisor_origem,p.nome,e.supervisor_origem IS NULL FROM public.itop_equipes e LEFT JOIN public.perfis p ON p.id=e.supervisor_origem WHERE e.codigo_carteira IS DISTINCT FROM 'adm-mario' AND e.ativo AND e.codigo_carteira IS NOT NULL AND (e.supervisor_origem IS NULL OR (p.ativo AND p.status_aprovacao='aprovado' AND p.papel='supervisor')) ORDER BY CASE WHEN e.codigo_carteira='paula' THEN 0 ELSE 1 END,e.nome
$function$;
CREATE OR REPLACE FUNCTION itop_private.avancar_etapa(p_id uuid, p_versao integer, p_etapa smallint)
 RETURNS itop_sondagens
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s public.itop_sondagens; c jsonb;
BEGIN
 IF coalesce(itop_private.papel(),'')<>'vendedor' THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 SELECT * INTO s FROM public.itop_sondagens WHERE id=p_id AND vendedor_id=auth.uid() AND excluida_at IS NULL AND fluxo_obrigatorio FOR UPDATE;
 IF NOT FOUND OR s.diagnostico_final IS NOT NULL THEN RAISE EXCEPTION 'PROPOSTA_NAO_ABERTA'; END IF;
 IF p_versao IS NULL OR s.versao<>p_versao THEN RAISE EXCEPTION 'CONFLITO_VERSAO' USING errcode='40001'; END IF;
 IF p_etapa IS NULL OR p_etapa<>s.fluxo_etapa+1 OR p_etapa NOT IN (2,3) THEN RAISE EXCEPTION 'SIGA_AS_ETAPAS_1_2_3'; END IF;
 c:=s.dados->'campos';
 IF p_etapa=2 AND coalesce(c->>'clienteItop','') NOT IN ('sim','nao') THEN RAISE EXCEPTION 'INFORME_SE_JA_E_CLIENTE_ITOP'; END IF;
 IF p_etapa=2 AND (length(trim(coalesce(c->>'nome','')))<2 OR length(trim(coalesce(c->>'cidade','')))<2 OR regexp_replace(coalesce(c->>'telefone',''),'[^0-9]','','g') !~ '^[0-9]{10,11}$') THEN RAISE EXCEPTION 'PREENCHA_CLIENTE_WHATSAPP_CIDADE_NA_ETAPA_1'; END IF;
 IF p_etapa=3 AND jsonb_array_length(s.escolhidos)=0 THEN RAISE EXCEPTION 'SELECIONE_PRODUTOS_NA_ETAPA_2'; END IF;
 UPDATE public.itop_sondagens SET fluxo_etapa=p_etapa,versao=versao+1,updated_at=now() WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) VALUES(s.id,auth.uid(),'fluxo:avancar',jsonb_build_object('etapa',p_etapa));
 RETURN s;
END $function$;

INSERT INTO public.itop_equipes(nome,codigo_carteira) VALUES ('Carteira ADM Mario Caputo','adm-mario') ON CONFLICT (codigo_carteira) DO NOTHING;