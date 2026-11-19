alter table public.inova_blocos_envios
 add column whatsapp text check (whatsapp ~ '^[+0-9]{1,16}$'),
 alter column cliente drop not null,
 alter column documento drop not null,
 alter column cep drop not null,
 alter column endereco drop not null,
 alter column tipo_entrega drop not null,
 alter column data_entrega drop not null,
 alter column item drop not null,
 alter column quantidade drop not null,
 alter column valor_unitario_centavos drop not null;

grant insert (whatsapp) on public.inova_blocos_envios to authenticated;
