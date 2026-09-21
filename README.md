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

Para usar `midnigh7.club`, registre ou controle o domínio e configure os registros DNS devolvidos pelo Sites. O domínio não é comprado automaticamente.
