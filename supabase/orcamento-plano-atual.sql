alter table public.itop_orcamentos_uvi
  add column if not exists plano_atual jsonb
  check (plano_atual is null or jsonb_typeof(plano_atual) = 'array');
