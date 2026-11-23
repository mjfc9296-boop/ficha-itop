alter table public.inova_blocos_envios
  add column bairro text check (char_length(bairro) <= 100),
  add column cidade text check (char_length(btrim(cidade)) between 1 and 100),
  add column uf text check (uf ~ '^[A-Z]{2}$'),
  add column complemento text check (char_length(complemento) <= 100);

grant insert (bairro, cidade, uf, complemento)
  on public.inova_blocos_envios to authenticated;
