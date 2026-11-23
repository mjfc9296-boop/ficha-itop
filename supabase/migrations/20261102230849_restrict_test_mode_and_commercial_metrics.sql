
-- Preserve the existing RPC implementation and add mandatory authorization.
DO $migration$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='itop_private' AND p.proname='itop_salvar_sondagem';
 IF d IS NULL OR position('if papel is null then' in d)=0 THEN RAISE EXCEPTION 'RPC schema changed'; END IF;
 d:=replace(d,'if papel is null then raise exception ''ACESSO_NEGADO''; end if;',
 'if papel is null then raise exception ''ACESSO_NEGADO''; end if;
 if papel = ''vendedor'' and coalesce(p_teste,false) then raise exception ''MODO_TESTE_GERENCIAL_OBRIGATORIO''; end if;');
 d:=replace(d,'p_teste:=coalesce(p_teste,s.teste);',
 'if papel = ''vendedor'' and s.teste then raise exception ''ACESSO_NEGADO''; end if;
  p_teste:=coalesce(p_teste,s.teste);');
 EXECUTE d;
END $migration$;
CREATE POLICY sondagens_testes_restritos ON public.itop_sondagens
 AS RESTRICTIVE FOR SELECT TO authenticated
 USING (NOT teste OR itop_private.papel() IN ('administrador','supervisor'));
DO $migration$
DECLARE body text;
BEGIN
 SELECT p.prosrc INTO body FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='itop_indicadores';
 IF body IS NULL THEN RAISE EXCEPTION 'Metrics RPC unavailable'; END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION public.itop_indicadores(p_filtros jsonb DEFAULT ''{}''::jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO '''' AS $body$ BEGIN IF coalesce(itop_private.papel(),'''') NOT IN (''administrador'',''supervisor'') THEN RAISE EXCEPTION ''ACESSO_NEGADO''; END IF; RETURN (%s); END $body$',rtrim(trim(body),';'));
END $migration$;

