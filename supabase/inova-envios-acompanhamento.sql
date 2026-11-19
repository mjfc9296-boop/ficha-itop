alter table public.inova_blocos_envios
  add column logradouro text check (char_length(btrim(logradouro)) between 1 and 150),
  add column numero text check (char_length(btrim(numero)) between 1 and 20),
  add column email text check (char_length(email) <= 254 and email = lower(email)),
  add column pesquisa_confirmada boolean not null default false;

grant insert (logradouro, numero, email, pesquisa_confirmada),
      update (pesquisa_confirmada)
  on public.inova_blocos_envios to authenticated;
