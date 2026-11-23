-- Executar primeiro, com acesso administrativo autorizado. Nenhuma mutação.
select current_database(),current_user,version();
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='perfis' order by ordinal_position;
select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='perfis';
select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='perfis';
select grantee,privilege_type,column_name from information_schema.column_privileges where table_schema='public' and table_name='perfis' order by grantee,column_name;
select proname,prosecdef,proconfig,pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in('listar_equipe','listar_supervisores','aprovar_usuario','alterar_acesso_usuario','listar_cadastros_pendentes');
select tgname,pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.perfis'::regclass and not tgisinternal;
select tablename from pg_tables where schemaname='public' and tablename like 'itop_%';
select pg_database_size(current_database()) as database_bytes;
-- Bloqueio de implantação: reprovar se vendedor puder alterar o próprio papel/ativo/status_aprovacao,
-- se perfis.id não for UUID único, ou se a migração já tiver objetos de mesmo nome.
-- Conferir também provedores Auth, URLs de redirecionamento, limites e uso atual no painel.
