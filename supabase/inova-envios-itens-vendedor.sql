alter table public.inova_blocos_envios
 add column vendedor text check (char_length(btrim(vendedor)) between 1 and 150),
 add column itens_adicionais jsonb not null default '[]'::jsonb
 check (jsonb_typeof(itens_adicionais) = 'array' and jsonb_array_length(itens_adicionais) <= 99);

grant insert (vendedor, itens_adicionais) on public.inova_blocos_envios to authenticated;
