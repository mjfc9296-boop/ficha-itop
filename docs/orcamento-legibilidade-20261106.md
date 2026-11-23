# Orçamento Comercial e legibilidade

O Orçamento Comercial da U.V.I. gera um PDF A4 diretamente no navegador com jsPDF, sem abrir a impressão e sem exigir a gravação do orçamento. A vendedora usa **Baixar PDF**; a pasta de destino depende das configurações de download do navegador. **Salvar no sistema (opcional)**, recuperação de orçamentos e agendamento de retorno continuam disponíveis.

O PDF incorpora a logo com mascote e fundo transparente, identifica a unidade emissora e o cliente, mostra validade, consultor, serviços, total mensal, observações e retorno. Promoções reutilizam as regras existentes da calculadora. A simulação de energia permanece separada da mensalidade. Cabeçalho, tabela e rodapé suportam várias páginas.

Arquivos: `comercial/orcamento-pdf.js` (renderização), `comercial/orcamento-uvi.js` (fluxo existente), `comercial/orcamento-uvi.css` (ações e formulário). O carregamento da U.V.I. continua pelo import existente em `uvi-links-horizontal.js`, com versão atualizada para evitar cache antigo.

## Layout

Em telas de computador (a partir de 901 px), as laterais usam 115% da largura anterior e o centro usa 88%. As imagens acompanham o aumento de aproximadamente 12%, preservando as proporções. Uma borda de 4 px deixa o fundo visível ao redor das laterais; o mesmo recuo no topo separa o cabeçalho das três colunas. A diferença entre as medidas é distribuída entre as colunas. Em telas menores, o menu responsivo existente é preservado.

A fonte central passa a 15 px para textos, campos e rótulos; 14 px para tabelas, botões e textos auxiliares; 12 px para metadados; títulos de 17 a 24 px. Os cartões do módulo Móvel se reorganizam conforme a largura disponível.

## Validação

Execute `node --test tests/orcamento-pdf.test.cjs` (Node.js; nenhuma dependência nova).

Cinco testes geram PDFs com a biblioteca real e verificam A4, valores, transparência da logo, nome do arquivo, paginação de 100 serviços, promoções, energia e erros de configuração.

Também foi validado em Chromium o fluxo completo com autenticação simulada: download sem escrita no banco, saída do orçamento e restauração do modo de venda. Foram medidas as colunas e imagens em 1920, 1440, 1280, 1100, 1000, 900, 768 e 390 px. A autenticação e o banco de produção não foram modificados nem usados nos testes.
