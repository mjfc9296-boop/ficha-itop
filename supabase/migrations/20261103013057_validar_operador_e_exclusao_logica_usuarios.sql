
CREATE OR REPLACE FUNCTION itop_private.excluir_usuario(usuario_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE alvo public.perfis;
BEGIN
 IF coalesce(itop_private.papel(),'')<>'administrador' THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF usuario_id=auth.uid() THEN RAISE EXCEPTION 'NAO_EXCLUIR_PROPRIO_ACESSO'; END IF;
 SELECT * INTO alvo FROM public.perfis WHERE id=usuario_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO'; END IF;
 -- Exclusão lógica: encerra acesso e retira da lista sem apagar vendas e auditoria.
 UPDATE public.perfis SET ativo=false,status_aprovacao='rejeitado' WHERE id=usuario_id;
END $f$;
REVOKE ALL ON FUNCTION itop_private.excluir_usuario(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION itop_private.excluir_usuario(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.excluir_usuario(usuario_id uuid)
RETURNS void LANGUAGE sql SET search_path=''
AS $f$ SELECT itop_private.excluir_usuario(usuario_id); $f$;
REVOKE ALL ON FUNCTION public.excluir_usuario(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.excluir_usuario(uuid) TO authenticated;
DO $migration$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='itop_private' AND p.proname='itop_salvar_sondagem';
 IF d IS NULL OR position('if papel is null then' in d)=0 THEN RAISE EXCEPTION 'RPC_SCHEMA_CHANGED'; END IF;
 d:=replace(d,'if papel is null then raise exception ''ACESSO_NEGADO''; end if;',
 $guard$if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 if nullif(lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1)),'') is null
 or lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1))
 is distinct from (select lower(split_part(regexp_replace(trim(p.nome),'\s+',' ','g'),' ',1)) from public.perfis p where p.id=coalesce((select vendedor_id from public.itop_sondagens where id=p_id),u))
 then raise exception 'OPERADOR_CADASTRADO_OBRIGATORIO'; end if;$guard$);
 EXECUTE d;
END $migration$;
UPDATE public.perfis SET nome='Mario Caputo'
WHERE id='87cb0194-1ffb-417d-b8ea-a681376b4146' AND nome='Administrador ITOP' AND papel='administrador';

