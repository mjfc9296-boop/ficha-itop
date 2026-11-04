-- Convidados: solicitação pendente, carteira ADM Mario e simulações fora dos indicadores.
ALTER TABLE public.itop_sondagens ADD COLUMN IF NOT EXISTS origem_convidado boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.criar_perfil_novo_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE e public.itop_equipes; tipo text:=CASE WHEN NEW.raw_user_meta_data->>'solicitado_papel'='supervisor' THEN 'supervisor' WHEN NEW.raw_user_meta_data->>'solicitado_papel'='convidado' THEN 'convidado' ELSE 'vendedor' END;
BEGIN
 IF tipo='convidado' THEN
  SELECT * INTO e FROM public.itop_equipes WHERE codigo_carteira='adm-mario' AND ativo;
 ELSIF NEW.raw_user_meta_data->>'equipe_id' ~* '^[0-9a-f-]{36}$' THEN
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
END $function$
;
CREATE OR REPLACE FUNCTION itop_private.sincronizar_equipe_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE equipe uuid;
BEGIN
 IF NEW.papel='convidado' THEN
  SELECT id INTO equipe FROM public.itop_equipes WHERE codigo_carteira='adm-mario' AND ativo;
  IF NEW.ativo AND NEW.status_aprovacao='aprovado' AND equipe IS NOT NULL THEN
   INSERT INTO public.itop_equipe_membros(usuario_id,equipe_id) VALUES(NEW.id,equipe) ON CONFLICT(usuario_id) DO UPDATE SET equipe_id=excluded.equipe_id;
  END IF;
 ELSIF NEW.papel='vendedor' THEN
  SELECT e.id INTO equipe FROM public.itop_equipes e WHERE e.ativo AND
   ((NEW.equipe_solicitada_id IS NOT NULL AND e.id=NEW.equipe_solicitada_id) OR
    (NEW.equipe_solicitada_id IS NULL AND e.supervisor_origem=NEW.supervisor_id)) LIMIT 1;
  IF NEW.ativo AND NEW.status_aprovacao='aprovado' AND equipe IS NOT NULL THEN
   INSERT INTO public.itop_equipe_membros(usuario_id,equipe_id) VALUES(NEW.id,equipe)
    ON CONFLICT(usuario_id) DO UPDATE SET equipe_id=excluded.equipe_id;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION itop_private.proteger_proposta_convidado() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE convidado boolean;
BEGIN
 SELECT p.papel='convidado' INTO convidado FROM public.perfis p WHERE p.id=NEW.vendedor_id;
 IF TG_OP='UPDATE' THEN NEW.origem_convidado:=OLD.origem_convidado OR coalesce(convidado,false);
 ELSE NEW.origem_convidado:=coalesce(convidado,false); END IF;
 IF NEW.origem_convidado THEN NEW.fluxo_obrigatorio:=false; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION itop_private.proteger_proposta_convidado() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER itop_proposta_convidado BEFORE INSERT OR UPDATE ON public.itop_sondagens FOR EACH ROW EXECUTE FUNCTION itop_private.proteger_proposta_convidado();
CREATE OR REPLACE FUNCTION public.itop_sondagens_filtradas(p_filtros jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF itop_sondagens
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare inicio timestamptz:=coalesce((p_filtros->>'inicio')::timestamptz,now()-interval '30 days'); fim timestamptz:=coalesce((p_filtros->>'fim')::timestamptz,now()+interval '1 day');
begin
 if itop_private.papel() is null then raise exception 'ACESSO_NEGADO'; end if;
 if coalesce(p_filtros->>'modo','producao') not in ('producao','testes','todos') then raise exception 'MODO_INVALIDO'; end if;
 if fim<=inicio or fim-inicio>interval '367 days' then raise exception 'PERIODO_MAXIMO_366_DIAS'; end if;
 return query select s.* from public.itop_sondagens s where s.created_at>=inicio and s.created_at<fim
 and (coalesce(p_filtros->>'modo','producao')='todos' or not s.origem_convidado)
 and (case coalesce(p_filtros->>'modo','producao') when 'testes' then s.teste=true when 'todos' then true else s.teste=false end)
 and (coalesce(p_filtros->>'vendedor','')='' or s.vendedor_id=(p_filtros->>'vendedor')::uuid)
 and (coalesce(p_filtros->>'equipe','')='' or s.equipe_id=(p_filtros->>'equipe')::uuid)
 and (coalesce(p_filtros->>'supervisor','')='' or exists(select 1 from public.itop_equipe_supervisores es where es.equipe_id=s.equipe_id and es.supervisor_id=(p_filtros->>'supervisor')::uuid))
 and (coalesce(p_filtros->>'status','')='' or s.status=p_filtros->>'status')
 and (coalesce(p_filtros->>'produto','')='' or exists(select 1 from jsonb_array_elements(s.oferecidos||s.escolhidos) x where x->>'category' ilike '%'||left(p_filtros->>'produto',100)||'%' or x->>'name' ilike '%'||left(p_filtros->>'produto',100)||'%'));
end $function$
;