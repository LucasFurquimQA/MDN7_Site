# Midnigh7 Club

Site responsivo do clube com catálogo de cinco estampas, duas modelagens e painel em `/admin`.

## Conteúdo

A história, o Instagram oficial e os sete administradores são gravados em D1. O painel só permite alterações pelo proprietário identificado por `ADMIN_EMAIL`, configurado como variável protegida na hospedagem. Visitantes não possuem acesso de escrita.

O Instagram inicial `@midnigh7.club` é uma suposição editável; confirme o endereço oficial antes de divulgar.

## Integração com Instagram

A extração do nome de usuário a partir do link funciona sem conexão externa. A importação de foto, nome de exibição e biografia é feita no servidor pela Meta Business Discovery, quando uma conexão válida está configurada. Ela não está ativa na primeira publicação: faltam `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ACCOUNT_ID`, com permissões compatíveis. `INSTAGRAM_API_VERSION` define a versão. Nunca coloque tokens no código ou no navegador. Não há scraping de páginas nem promessa de suporte a qualquer conta pessoal ou privada. O painel permite o preenchimento manual de nome, descrição e URL HTTPS da foto.

Os dados importados são salvos com o botão Salvar alterações. Uma troca de perfil limpa os dados anteriores. Importar perfil atualiza os dados sob demanda; não há sincronização periódica automática. URLs de fotos externas podem expirar, então use uma URL permanente para a alternativa manual.

## Imagens e catálogo

As imagens originais do usuário estão em `public/images`. A exibição recorta apenas o enquadramento das referências para manter as anotações de produção fora do catálogo. Os arquivos originais não foram editados. O cenário noturno foi gerado para o site.

## Desenvolvimento

Use os fluxos Sites para dependências, preview, build, migrações e publicação. O projeto usa pnpm e Vinext. A declaração de hospedagem em `.openai/hosting.json` preserva a identidade do site. As variáveis locais seguem `.env.example`; os valores da hospedagem são gerenciados no Sites.

## Hospedar no Cloudflare Workers

O projeto está preparado para ser publicado como um Worker com D1. É
necessário ter Node.js 22.13.0 ou superior, pnpm 11.25.0 e uma sessão do
Wrangler autenticada:

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm exec wrangler d1 create mdn7-site-db
```

Copie o `database_id` retornado pelo último comando para
`CLOUDFLARE_D1_DATABASE_ID` em `.env`. O nome usado na configuração é
`mdn7-site-db`; se escolher outro, informe também
`CLOUDFLARE_D1_DATABASE_NAME`. O binding do código é sempre **DB**.

Aplique a tabela inicial no banco remoto uma única vez:

```sh
pnpm db:initialize:remote
```

Depois publique:

```sh
pnpm deploy
```

O comando de publicação gera `dist/server/wrangler.json` e usa o ID do D1
fornecido por `CLOUDFLARE_D1_DATABASE_ID`. Não versione `.env` nem tokens.
Para testar a configuração local, deixe o ID vazio e continue usando
`pnpm.cmd dev`; nesse caso o projeto mantém o banco local do Wrangler.

### Configuração do deploy pelo painel da Cloudflare

Se você conectou o repositório em **Workers & Pages > Create application >
Workers**, não aceite a detecção automática como Next.js/OpenNext. Configure
manualmente:

```text
Build command:  pnpm build
Deploy command: pnpm exec wrangler deploy --config dist/server/wrangler.json
```

O deploy deve ser feito como **Worker**, não como Cloudflare Pages. O comando
`npx wrangler deploy` sem `--config` procura uma configuração padrão na raiz,
não encontra o `dist/server/wrangler.json` gerado pelo Vinext e pode abrir o
assistente interativo do Wrangler. Se o painel não oferecer um campo separado
para Deploy command, use o terminal local com `pnpm deploy`.

No ambiente de build do painel, cadastre `CLOUDFLARE_D1_DATABASE_ID` e, caso
necessário, `CLOUDFLARE_D1_DATABASE_NAME` como variáveis de ambiente de build.
O ID deve ser o banco D1 real da sua conta; não use o ID provisório
`00000000-0000-4000-8000-000000000000`. Configure `ADMIN_EMAIL` como variável
do Worker (não como variável pública).

### Login do painel com Cloudflare Access

Crie uma aplicação **Self-hosted** no Cloudflare Zero Trust para o domínio
publicado e proteja pelo menos o caminho `/admin*` e `/api/content*`.
Crie uma política que permita somente o e-mail usado em `ADMIN_EMAIL`.
O Access injeta `Cf-Access-Authenticated-User-Email`; o Worker usa esse
valor para autorizar o painel e as gravações. O login simulado do Sites
continua funcionando apenas no desenvolvimento local.

Proteja também o domínio de origem do Worker ou desative o acesso direto ao
`workers.dev` quando usar domínio próprio. Caso contrário, alguém poderia
contornar a política do Access acessando outra URL de origem.

Depois de configurar o Access, defina `ADMIN_EMAIL` como variável protegida
no Worker e publique novamente. Não coloque essa variável em
`NEXT_PUBLIC_*`, no código ou em `public/`.

Para usar `midnigh7.club`, registre ou controle o domínio e configure os registros DNS devolvidos pelo Sites. O domínio não é comprado automaticamente.
