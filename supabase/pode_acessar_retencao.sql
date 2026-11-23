CREATE OR REPLACE FUNCTION itop_private.pode_acessar_retencao()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis AS perfil
    WHERE perfil.id = (SELECT auth.uid())
      AND perfil.ativo
      AND perfil.status_aprovacao = 'aprovado'
      AND (
        perfil.papel = 'administrador'
        OR EXISTS (
          SELECT 1
          FROM public.perfis AS itallo
          WHERE itallo.id = '3a3f0123-7bc3-4237-92db-f599627f5b00'::uuid
            AND itallo.papel = 'supervisor'
            AND itallo.ativo
            AND itallo.status_aprovacao = 'aprovado'
            AND itallo.id IN (perfil.id, perfil.supervisor_id, perfil.responsavel_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.itop_pode_acessar_retencao()
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT itop_private.pode_acessar_retencao();
$$;

REVOKE ALL ON FUNCTION itop_private.pode_acessar_retencao() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.itop_pode_acessar_retencao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION itop_private.pode_acessar_retencao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.itop_pode_acessar_retencao() TO authenticated;
