# Atualização de propostas — 04/11/2026

- Acesso com painel preto, borda laranja iluminada e botão Entrar laranja, conforme referência aprovada.
- Contraste dos campos da sondagem e do cadastro; espaçamento responsivo.
- Telefone fixo indicado primeiro, inclusive quando somente operadora/número foram informados.
- Novo atendimento limpa dados e resultados de energia, serviços e prévias; restauração começa de uma base limpa. Navegação entre etapas não executa a limpeza.
- Energia: Revisar fechamento, Voltar aos serviços, Criar PDF.
- Gerador vetorial de PDFs por snapshot explícito; logo oficial centralizada, proposta com energia em um arquivo, opção sem energia preservada.
- Recuperação consulta os três diagnósticos, com downloads independentes da proposta aberta e RLS existente. Somente Retomar negociação reabre a proposta em espera.
- Salvar depois de Finalizar mantém ID e status e usa controle de versão e idempotência. Confirmação comercial gerencial continua restrita.
- Campo duplicado do retorno removido; agendamento usa a observação comercial. Alerta precede salvamento e exige resultado da inscrição.

## Verificação

`node --test tests/*.test.cjs`: testes anteriores e novos, incluindo PDFs reais, isolamento de snapshots, reset e prioridade do fixo.

`tests/propostas-20261104.sql`: executado no banco dentro de transação revertida. Passou nos três status, edição após finalizar, preservação, repetição idempotente, conflito de versão, ausência de duplicatas e leitura não autorizada bloqueada.

Prévia visual do cadastro e login no navegador; sondagem e energia com dados fictícios em fixture local, incluindo largura de 390px. PDFs renderizados e conferidos. Não foram criadas contas nem emitidas notificações reais; o fluxo completo com uma sessão de usuário e a entrega efetiva de push não foram ensaiados.

Comparação com o gerador anterior usando os mesmos dados fictícios (o PDF de referência não veio anexado):

| Versão | Antes | Depois |
|---|---:|---:|
| Sem energia | 6.300.598 bytes | 28.816 bytes |
| Com energia | 6.302.648 bytes | 30.671 bytes |

Tamanho varia conforme os dados e serviços. As tabelas de energia permanecem em texto, com memória, comparação, economia e impacto no pacote. Não foi integrada gravação no Google Drive.

O SQL aplicado está em `supabase/atualizacao-propostas-20261104.sql`. As políticas RLS existentes foram preservadas; a busca nova usa SECURITY INVOKER. A revisão de segurança não introduziu novos alertas; avisos de configuração anteriores ficaram fora do escopo.
