# Retornos comerciais, telefone e Web Push

O vendedor agenda em ADD SERVIÇOS; a confirmação ocorre somente quando a sondagem é finalizada como VENDA EM ESPERA. Venda fechada, desistência, exclusão ou recuperação da proposta cancelam o aviso anterior. O sininho mostra retornos permitidos pelo escopo existente; cada vendedor acessa os seus. A gestão mantém acesso às equipes autorizadas.

O botão MEU CELULAR cadastra o número de usuários existentes. Novos cadastros, inclusive pela gestão, pedem celular com DDD. Login aceita telefone + senha ou e-mail + senha. O telefone é um identificador cadastrado, sem validação por SMS; não se deve usá-lo como prova de posse, MFA ou recuperação de senha. O e-mail existente continua disponível para recuperar a senha. O endpoint de telefone usa limites de tentativas por número e IP e valida a senha no Supabase Auth; nunca revela o e-mail ao navegador antes do login.

Para receber push, o vendedor deve entrar no aparelho e tocar RECEBER ALERTAS NESTE CELULAR. Android usa navegador compatível. No iPhone/iPad, iOS/iPadOS 16.4+ e instalação na Tela de Início. Permissão e entrega dependem do navegador, conexão e configurações do sistema. O conteúdo do push é genérico, sem nome, telefone ou identificador de proposta; tocar abre a lista de retornos, protegida pelo login. Logout remove a assinatura do navegador. Desativar push não apaga agendamentos.

## Infraestrutura

- `supabase/retornos-push.sql`: tabelas, políticas, RPCs e cron.
- `supabase/functions/itop-retornos`: Edge Function com autenticação própria para login, sessão validada para ativação e token privado para disparo.
- `comercial/retornos.js`: agenda, sininho, perfil de celular e inscrição do aparelho.
- `itop-retornos-sw.js`: apenas eventos de push; não intercepta nem armazena páginas, sessões ou PDFs.
- `manifest.webmanifest`: instalação na Tela de Início.

A agenda cron executa no banco a cada minuto, mas só chama a Edge Function quando há retorno vencido com aparelho ativo e entrega pendente. Não há envio de SMS/e-mail nem contratação de fornecedor de push pago. As execuções e o tráfego usam as cotas do plano Supabase existente; o código não altera o plano nem ativa compra de recursos.

As chaves VAPID e o token do cron são gerados no servidor e ficam exclusivamente em `itop_private.push_config`, sem acesso por `anon` ou `authenticated`. Inscrições e fila ficam no schema privado com RLS e permissões restritas. Nunca copiar segredos para GitHub, HTML, logs ou documentos. A função usa os segredos padrão SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY, fornecidos pelo ambiente de Edge Functions.

Cada entrega tem lease, revisão e tentativas limitadas. HTTP 404/410 desativa a assinatura. Falhas temporárias usam espera progressiva. Reagendamento invalida a revisão antiga. Recebimentos repetidos usam a mesma tag genérica do navegador. Não há garantia de entrega exatamente uma vez, nem de horário exato, na rede de Web Push.

## Validação

`node --test tests/*.test.cjs` verifica o fluxo comercial existente. `tests/retornos-push.sql` testa agendamento, escopo, confirmação, reagendamento, cancelamento e fila transacional, revertendo todos os registros. Foram conferidos o retorno HTTP 200 do despachante sem destinatários e o HTTP 401 de login inválido. O recebimento real no aparelho só pode ser confirmado após um vendedor permitir as notificações. O login real com telefone deve ser conferido pelo usuário após cadastrar seu próprio número; senhas existentes não são acessadas pelo agente.

## Transferência para a TI

Preservar banco, Auth, políticas, cron, Edge Function, manifesto e service worker ao migrar. Mudanças de domínio exigem atualizar CORS, URLs, escopo e novas inscrições dos aparelhos. Conservar o par VAPID do ambiente para assinaturas existentes ou planejar nova ativação. Fazer a transferência dos segredos por canal seguro, sem registrá-los no repositório. Configurar cron no servidor de destino antes de desligar o atual para evitar entregas concorrentes.

## Autorização opcional (2026-11-03-v1)

A autorização é registrada separadamente da aprovação da conta. Cadastro sem aceite não bloqueia o painel. O envio e a inscrição exigem consentimento vigente. O titular pode revogar em MEU CELULAR > AUTORIZAÇÃO E REVOGAÇÃO DO PUSH; a revogação suspende as inscrições no servidor. A trilha privada registra usuário, escolha, data, versão e o texto apresentado. O gestor não autoriza em nome de outro usuário. O texto registra uma escolha voluntária, não uma renúncia de direitos nem uma garantia de inexistência de reclamações; a ITOP deve validar seu uso e sua política com o jurídico.
