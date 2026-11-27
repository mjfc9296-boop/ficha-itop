# Inova Blocos · Auditoria da primeira entrega

## Situação

A modernização está no PR [#72](https://github.com/mjfc9296-boop/ficha-itop/pull/72) para validação. O GitHub Pages continua na versão de produção anterior. O Supabase de produção foi consultado para verificar estrutura e permissões. A migração foi aplicada apenas a uma instância PostgreSQL local com tabelas de teste e descartada após a verificação.

O catálogo novo contém somente as três linhas de estoque expressamente autorizadas. O saldo disponível é calculado pelo banco. O saldo negativo do bloco de 10 cm é preservado. Nenhum cliente, proposta, pedido, cotação ou valor financeiro do Fluxo Eficiente foi copiado.

## Implementação e cobertura

| Área | Entregue no PR | Pendente para concluir |
| --- | --- | --- |
| Navegação | Endereço dedicado, abertura em nova guia, menu secundário recolhível, busca por páginas, marca existente e retorno à ITOP | Validação em sessão real e dispositivos físicos |
| Documentos e serviços | Acesso a imagens, vídeos, arquivos, atas, reposição e links por meio dos fluxos existentes | Favoritos, recentes, pastas por setor e lixeira |
| Estoque | Catálogo, SKU editável, cadastro geral e fiscal, foto, categorias e três saldos de abertura | Movimentações, locais relacionais, vínculo com vendas e compras, conciliação com o estoque anterior e histórico |
| Solicitações e cotações | Formulário legado com múltiplos itens, cálculo de embalagem, sugestões do catálogo, Kanban, Sua vez e comparação com destaque do menor custo completo | Solicitação independente do pedido, trilha de status completa, anexos privados de cotações e dispensa formal com justificativa e aprovação |
| Pedidos e recebimentos | Navegação para pedidos, recebimento parcial e integral com entrada idempotente no catálogo e conclusão com comprovante e nota fiscal pelo fluxo anterior | Emissão a partir da cotação aprovada, PDF, filtros completos, anexos no novo fluxo, divergências e devoluções |
| Fornecedores | Acesso ao cadastro e à consulta existentes | Ficha expandida, edição, inativação, validação e unicidade documental, vínculo com produtos, avaliações, histórico, filtros e exportações |
| Vendas e entregas | Acesso aos formulários e registros existentes de pedidos, entregas e satisfação | Clientes e propostas persistentes, conversão, estoque, financeiro, agenda de entregas e transições integradas |
| Financeiro | Nenhum lançamento criado | Contas a pagar e receber, parcelas, baixas, conciliação, fluxo de caixa, alertas e relatórios |
| Dashboard | Indicadores disponíveis de estoque, compras, vendas e entregas. Período para compras e vendas cadastradas e entregas programadas. Acessos aos módulos e notificações de aprovação | Gráficos, filtros transportados para os módulos, indicadores financeiros, faturamento, conversão, produção e central completa |
| Integração e auditoria | Migração aditiva de catálogo e restrições por UUID | Transações entre os setores, log de auditoria, ciclos ponta a ponta e persistência validada em produção |

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `layout-20261102.js` | Entrada dedicada da Inova, reaproveitamento do login e abertura dos fluxos existentes |
| `inova-fachada/erp.js` | Navegação, catálogo, cadastro, Kanban, dashboard e notificações |
| `inova-fachada/erp.css` | Interface clara, verde e responsiva |
| `inova-fachada/compras.js` | Comparação de cotações em rascunho e gravadas, destaque do menor custo cotado e leitura de sugestões do catálogo |
| `inova-fachada/compras.css` | Cartões verticais lado a lado e destaque visual da cotação |
| `supabase/inova-erp-fase-1.sql` | Catálogo, categorias, SKU, saldos iniciais, RLS e proteção dos arquivos |
| `docs/inova-erp-auditoria.md` | Inventário de entrega, testes e recuperação |

## Banco e permissões

A migração cria `inova_erp_produtos`, `inova_erp_categorias`, a sequência de SKU e a função de sugestão de SKU. O UUID titular é identificado durante a instalação por uma conta ativa e aprovada. A migração falha se a conta não puder ser identificada unicamente. Nenhum UUID de produção precisa ser escrito no código público.

As políticas restritivas são adicionadas às tabelas `inova_blocos_arquivos`, `inova_blocos_atas_visita`, `inova_blocos_envios`, `inova_blocos_estoque`, `inova_blocos_fornecedores`, `inova_compras`, `inova_compras_conclusoes`, `inova_compras_decisoes`, `inova_compras_minimos`, `inova_compras_orcamentos`, `inova_entregas` e `inova_vendas`. A política em `storage.objects` cobre os buckets privados `inova-comprovantes` e `inova-compras-documentos`. O acesso aos demais buckets continua sob as políticas próprias. O perfil autorizado continua sendo consultado no banco. A migração não exclui registros nem redefine saldos anteriores.

A produção ainda possui políticas antigas que permitem operações da Inova a outros administradores aprovados. A garantia de exclusividade depende da aplicação da migração e da verificação com usuários e arquivos no ambiente real. Links assinados já emitidos devem ser considerados em uma revisão de acesso.

## Testes realizados

- JavaScript dos arquivos alterados verificado com Node.js.
- 27 testes existentes da Ficha ITOP aprovados.
- Navegador com autenticação simulada usando o HTML da Ficha ITOP. A URL direta bloqueou visitante anônimo e outro administrador. O titular de teste abriu o ERP, com a ITOP na guia original.
- Navegador com dados simulados. Passaram o dashboard, o seletor de período personalizado, o saldo negativo, a edição do SKU antes de salvar, os campos fiscais, a busca de páginas, o Kanban, os três cartões de cotação e o destaque do menor custo. O menu recolhível e as notificações foram exercitados com 390 px de largura.
- PostgreSQL local. A migração manteve as linhas legadas de teste, criou os três saldos e permitiu gravar produtos e categorias ao titular. Outro administrador e o visitante anônimo foram bloqueados conforme a operação. O teste também confirmou a proteção de dois buckets da Inova e o acesso previamente permitido a um bucket compartilhado de teste.

Os ciclos completos de compra e venda com estoque e financeiro, a persistência em outro computador e os fluxos reais de upload e recuperação de documentos ainda aguardam implementação ou verificação. Os testes locais não gravaram dados em produção.

## Backup e recuperação

O backup do código está na branch [backup/inova-erp-2026-11-27](https://github.com/mjfc9296-boop/ficha-itop/tree/backup/inova-erp-2026-11-27), na revisão `8554837685ccebb85d6294d58ae88643f01ecbc5`. Para recuperar o código após uma publicação futura, use essa referência para identificar os commits da modernização e reverta os commits integrados por um PR, preservando as alterações posteriores da ITOP.

Antes de migrar produção, confirme um backup restaurável da estrutura e dos registros do Supabase e conserve separadamente os objetos de Storage. Valide a restauração em uma instância isolada. Se houver falha após uma migração futura, revise primeiro a reversão pontual das políticas ou da aplicação. Uma restauração integral deve considerar as novas gravações e todos os módulos da ITOP que compartilham o banco.

O backup integral de produção e a recuperação em uma instância isolada ainda não foram verificados.

## Incremento de recebimentos

A tela **Compras → Recebimentos** registra entradas parciais ou integrais a partir de uma cotação aprovada. A primeira entrada exige selecionar o SKU do catálogo para cada linha recebida. As entradas seguintes mantêm essa associação. O histórico guarda data, nota fiscal, observações, quantidades e UUID autenticado do responsável.

A migração `supabase/inova-erp-recebimentos.sql` depende de `inova-erp-fase-1.sql`. Cria as tabelas `inova_erp_recebimentos` e `inova_erp_entradas_compra`, com leitura restrita ao administrador titular e confirmação via RPC. A confirmação serializa operações por pedido e grava histórico e saldo físico na mesma transação. Uma repetição com a mesma chave e os mesmos dados devolve o recibo original. Pedidos já encerrados no fluxo anterior permanecem históricos. O encerramento anterior de um pedido com entradas novas exige que o recebimento esteja completo.

No PostgreSQL local, foram verificados recebimentos parcial e integral, repetição da mesma solicitação, rejeição de chave reaproveitada com dados diferentes, rollback do lote quando uma linha ultrapassa o saldo, preservação do SKU, encerramento legado e bloqueio de outro administrador e de anônimos.

No navegador a 390 px, com API simulada, foram confirmados o registro parcial, o saldo restante, a manutenção do SKU, o recebimento integral e o histórico.

Continuam pendentes a emissão do pedido comercial de compra em PDF, anexos de recebimento no fluxo novo, cancelamentos, divergências e devoluções, cadastro completo de fornecedores, integração financeira e publicação. As migrações continuam fora da produção.

### PDF do pedido de compra

A tela **Compras → Recebimentos** gera um PDF a partir da cotação vencedora com fornecedor, número SC, itens, valores unitários, subtotais, frete, valor total, condições de pagamento e entrega. Os dados são reutilizados sem redigitação. O PDF usa o logotipo existente quando o navegador consegue carregá-lo. O botão pede o preenchimento dos preços quando a cotação aprovada ainda tem itens sem valor.

Foram gerados PDFs de uma página e de várias páginas para testar a formatação, a numeração, a retenção do último item, os totais e o bloqueio de cotação com preço ausente. O PDF é gerado a partir do número do registro de compras existente. A emissão de uma nova entidade de pedido, com numeração própria e descontos, continua pendente.

### Filtros de recebimento

A lista permite buscar pelo número SC, fornecedor da cotação aprovada ou produto, filtrar por situação e delimitar a previsão de entrega. Um recebimento parcial também aparece entre os atrasados quando ainda tem saldo e a data prevista passou.
