# Midnigh7 Club — abrir e editar no VS Code

Esta é a cópia do código-fonte do site criado em 20/09/2026, com o logo,
todas as referências das camisetas e o cenário noturno. O site usa React,
TypeScript, Tailwind, Vinext/Vite e Cloudflare D1.

## 1. Abrir o projeto

1. Extraia todo o ZIP.
2. No VS Code, use **Arquivo > Abrir Pasta** e escolha a pasta `midnigh7-club`
   que contém `package.json` (não a pasta externa do ZIP).
3. Abra **Terminal > Novo Terminal**.

É necessário ter Node.js **22.13.0 ou superior** instalado. O projeto fixa
**pnpm 11.25.0** como gerenciador de pacotes. Confira `node --version` e use:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Abra **http://localhost:5173**. Use o endereço que aparecer no terminal se a
porta for alterada. O servidor acompanha as alterações salvas no editor.
Para encerrar, pressione **Ctrl+C**. Esses comandos podem ser executados no
terminal integrado do Windows, macOS ou Linux; não é necessário usar os
scripts Bash de instalação do ambiente original.

Se o PowerShell do Windows bloquear `pnpm.ps1` por causa da política de
execução de scripts, use os executáveis Windows equivalentes, sem alterar a
política do sistema:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

O ZIP não inclui `node_modules`. As dependências serão baixadas no seu
computador, a partir do `pnpm-lock.yaml` incluído. Evite misturar npm install
e pnpm install dentro do projeto; o comando npm acima apenas instala o pnpm.

## 2. Onde modificar

| Arquivo/pasta | O que você altera |
| --- | --- |
| `app/site.tsx` | Estrutura da página, seções, botões, catálogo e janelas |
| `app/globals.css` | Cores, fontes, animações, espaçamentos e responsividade |
| `lib/club.ts` | Texto inicial, Instagram do clube, sete membros, catálogo e imagens |
| `public/images/` | Logo, camisetas e fundo de Tóquio |
| `app/layout.tsx` | Título, descrição e metadados da página |
| `app/admin/editor.tsx` | Interface do painel de edição |
| `lib/content.ts` | Validação, acesso administrativo e persistência do conteúdo |
| `app/api/instagram/route.ts` | Importação autorizada dos dados do Instagram |
| `db/schema.ts` e `drizzle/` | Estrutura do banco e migrações |

Os dados de `defaultContent` em `lib/club.ts` aparecem quando não há um
registro salvo no banco. Depois de salvar conteúdo pelo painel, o banco tem
prioridade; use o painel para alterar esse conteúdo. O catálogo e o layout
continuam sendo definidos no código.

Para substituir uma imagem mantendo seu nome, preserve também sua extensão
ou atualize a referência em `lib/club.ts`/`app/site.tsx`. As referências de
camisetas originais estão intactas: o enquadramento para esconder as notas de
produção é feito na exibição.

## 3. Usar o painel administrativo localmente

A página principal pode ser visualizada com os dados iniciais sem configurar
o painel. Para testar as edições persistidas, prepare o ambiente local:

1. Pare o servidor, se estiver aberto.
2. Copie `.env.example` para `.env` pelo próprio VS Code. Não renomeie o
   arquivo de exemplo; mantenha os dois.
3. Em `.env`, preencha:

```dotenv
ADMIN_EMAIL=seedy@sites.test
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_API_VERSION=v25.0
```

`seedy@sites.test` é a identidade de desenvolvimento já prevista pelo plugin
local do projeto, não é uma credencial. A simulação funciona somente no
servidor de desenvolvimento em localhost. Na hospedagem, o administrador
continua sendo definido por `ADMIN_EMAIL` e pela autenticação do Sites.

4. Gere a configuração de execução e crie a tabela no banco **local**:

```sh
pnpm build
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_sparkling_lord_hawal.sql
pnpm dev
```

Aplique esse arquivo SQL apenas uma vez por banco local. Se a tabela já
existir, não precisa reaplicar a migração inicial. A opção `--local` mantém
a operação no seu computador; os dados locais ficam em `.wrangler/state`.

5. Abra **http://localhost:5173/admin**. O acesso passa pela simulação de
   login local. Salve uma alteração e confira a página inicial.

Se aparecer “Acesso restrito”, confira `ADMIN_EMAIL`, reinicie `pnpm dev` e
use `localhost` ou `127.0.0.1`. Se o banco estiver indisponível, confirme que
aplicou o SQL na mesma pasta do projeto e com o caminho de persistência acima.
Não use `pnpm start` para o fluxo de login simulado; ele pertence ao preview
do build, enquanto a simulação está no servidor de desenvolvimento.

## 4. Instagram

O endereço inicial do clube é `https://www.instagram.com/midnigh7.club/`.
Confirme o perfil correto antes de divulgar. Alterar o link de um membro
extrai seu nome de usuário. Nome de exibição, biografia e foto podem ser
preenchidos manualmente.

A importação automática de nome, foto e bio depende de uma integração
compatível e autorizada com a Meta. Configure as variáveis de servidor
`INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ACCOUNT_ID` para usá-la.
Nenhum token foi incluído neste download. Não exponha tokens no navegador,
em arquivos de `public/`, nem em variáveis com prefixo `NEXT_PUBLIC_`.
A implementação não faz scraping nem garante importação de contas pessoais
ou privadas. A atualização é sob demanda, não periódica.

## 5. Verificar as mudanças

```sh
pnpm exec tsc --noEmit
pnpm build
```

O build gera a pasta `dist/`. Para uma prévia local do build, execute
`pnpm start` e abra o endereço exibido no terminal. Para editar com atualização
automática e testar o login simulado, use `pnpm dev`.

## 6. Site publicado, dados e credenciais

Editar esta cópia no VS Code não publica alterações automaticamente.
A publicação original é gerenciada pelo Sites. Preserve `.openai/hosting.json`
se for continuar publicando no mesmo projeto do Sites.

Para hospedar em outro lugar, será necessário configurar um ambiente
compatível com Cloudflare Workers/D1 e substituir ou adaptar a autenticação
que hoje é fornecida pelo Sites. Não é um site para abrir diretamente por
`file://` nem uma exportação HTML estática.

Este ZIP contém o código-fonte e os recursos visuais; não contém o banco de
dados da produção, histórico Git, credenciais, tokens, dependências instaladas
ou arquivos gerados de build. Alterações feitas no painel do site publicado
não são copiadas automaticamente para este código-fonte. As variáveis reais
da hospedagem e o DNS de `midnigh7.club` são configurações separadas.

## 7. Publicar no Cloudflare Workers

Para uma publicação fora do Sites, crie um D1 na sua conta Cloudflare e
mantenha o binding com o nome **DB**:

```powershell
pnpm.cmd exec wrangler login
pnpm.cmd exec wrangler d1 create mdn7-site-db
```

Copie o `database_id` retornado para `CLOUDFLARE_D1_DATABASE_ID` no `.env`.
Se o banco tiver outro nome, preencha também
`CLOUDFLARE_D1_DATABASE_NAME`. Inicialize a tabela e publique com:

```powershell
pnpm.cmd db:initialize:remote
pnpm.cmd deploy
```

No Cloudflare Zero Trust, crie uma aplicação Self-hosted para o domínio e
proteja `/admin*` e `/api/content*` com uma política que permita o e-mail
definido em `ADMIN_EMAIL`. O Worker lê o cabeçalho
`Cf-Access-Authenticated-User-Email` emitido pelo Access. Proteja ou
desative o endereço `workers.dev` para impedir um bypass da política.

A cópia mantém os scripts originais. Na ausência de `.sites-runtime`, o
projeto escolhe automaticamente o modo portátil para desenvolvimento local.
