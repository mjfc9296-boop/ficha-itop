alter table public.inova_blocos_envios
 add column numero_pedido text check (char_length(btrim(numero_pedido)) between 1 and 50);

grant insert (numero_pedido) on public.inova_blocos_envios to authenticated;
