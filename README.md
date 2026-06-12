# Envio de Termos de Responsabilidade

Aplicação full stack para automatizar o envio de **Termos de Responsabilidade**
de equipamentos corporativos para colaboradores, integrando o **GLPI** (para
localizar o colaborador e os ativos atribuídos a ele) e o **DocuSign** (para
geração e envio do envelope de assinatura eletrônica).

## Sumário

- [Visão geral](#visão-geral)
- [Arquitetura e estrutura de pastas](#arquitetura-e-estrutura-de-pastas)
- [Fluxo da aplicação](#fluxo-da-aplicação)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do GLPI](#configuração-do-glpi)
- [Configuração do DocuSign](#configuração-do-docusign)
- [Instalação e execução (desenvolvimento)](#instalação-e-execução-desenvolvimento)
- [Executando com Docker](#executando-com-docker)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Endpoints da API](#endpoints-da-api)
- [Banco de dados](#banco-de-dados)
- [Lint e formatação](#lint-e-formatação)
- [Solução de problemas](#solução-de-problemas)

## Visão geral

| Camada    | Tecnologias                                                              |
| --------- | ------------------------------------------------------------------------ |
| Frontend  | React, Vite, TypeScript, Material UI (MUI), Axios, React Query, React Router |
| Backend   | Node.js, Express, TypeScript, Zod, `node:sqlite` (módulo nativo do Node) |
| Integrações | GLPI REST API, DocuSign eSignature API (SDK oficial `docusign-esign`)  |
| Banco     | SQLite                                                                    |

## Arquitetura e estrutura de pastas

Monorepo com dois workspaces npm:

```
envio-termo/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Handlers das rotas Express
│   │   ├── services/       # GLPIService, DocuSignService, TermService
│   │   ├── repositories/    # Acesso ao SQLite (TermRepository)
│   │   ├── routes/          # Definição das rotas /api
│   │   ├── middleware/      # validate (Zod) e errorHandler global
│   │   ├── config/          # env (Zod) e conexão com o banco
│   │   ├── types/           # Tipagens e schemas Zod
│   │   └── utils/           # logger, AppError, templateGenerator, asyncHandler
│   ├── data/                 # Arquivo SQLite (gerado em runtime)
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # Home, Result, History
│   │   ├── components/       # Layout, AssetList, SnackbarProvider
│   │   ├── hooks/             # Hooks React Query
│   │   ├── services/          # Cliente Axios (api.ts)
│   │   ├── theme/              # Tema MUI corporativo
│   │   └── types/              # Tipagens compartilhadas com o backend
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
└── package.json               # Workspaces npm (backend + frontend)
```

## Fluxo da aplicação

1. O usuário acessa a Home e informa o **email corporativo** do colaborador.
2. O frontend chama `GET /api/users/:email/assets`.
3. O backend abre uma sessão no GLPI (`initSession`), localiza o usuário pelo
   email (`GLPIService.getUserByEmail`) e busca os ativos atribuídos a ele
   (`GLPIService.getUserAssets`) nos itemtypes configurados (Computer,
   Monitor, Peripheral, Phone, etc.).
4. O frontend exibe o colaborador e a lista de equipamentos com checkboxes.
5. O usuário seleciona os equipamentos e clica em **"Enviar Termo"**, que
   chama `POST /api/terms/send`.
6. O backend gera o HTML do Termo de Responsabilidade (nome, email, data de
   emissão e lista de equipamentos) e cria um envelope no DocuSign
   (`DocuSignService.createEnvelope`), que envia automaticamente o documento
   para assinatura do colaborador.
7. O registro do termo é persistido no SQLite (tabela `termos`) com o
   `envelopeId` e o status retornado pelo DocuSign.
8. A tela de **Histórico** lista todos os termos enviados
   (`GET /api/terms`), com colaborador, email, data de envio, status no
   DocuSign e o Envelope ID.

## Pré-requisitos

- Node.js 22.5+ (o backend usa o módulo nativo `node:sqlite`)
- npm 10+
- Acesso a uma instância GLPI com a API REST habilitada
- Conta DocuSign (Developer/Sandbox ou produção) com um App configurado para
  autenticação JWT
- Docker e Docker Compose (opcional, para execução containerizada)

## Configuração do GLPI

1. Habilite a API REST em **Configurar > Geral > API** (ative "Ativar API
   REST" e "Ativar login com token de aplicação").
2. Gere um **App Token** (token da aplicação cliente) na mesma tela.
3. No perfil do usuário de serviço que será usado pela integração, gere um
   **Personal Token** em **Preferências > Chave de acesso remoto da API**.
4. Garanta que esse usuário tenha permissão de leitura sobre `User`,
   `Computer`, `Monitor`, `Peripheral`, `Phone` (ou os itemtypes que desejar
   consultar).
5. Anote a URL da API REST (geralmente `https://<seu-glpi>/apirest.php`).

Esses dados serão usados nas variáveis `GLPI_API_URL`, `GLPI_APP_TOKEN` e
`GLPI_USER_TOKEN` do backend.

> **Observação sobre a busca por email:** o GLPI armazena o email do usuário
> em uma tabela separada (`glpi_useremails`). A consulta usa o endpoint de
> busca (`/search/User`) filtrando pelo *search option* configurado em
> `GLPI_SEARCH_FIELD_EMAIL` (padrão `5`, que corresponde ao campo "Email" na
> maioria das instalações padrão). Caso sua instância tenha um *search
> option* diferente para o email, ajuste essa variável.

> **Observação sobre os ativos:** a busca de equipamentos usa o filtro
> `searchText[users_id]=<id>` nos endpoints `getItems` de cada itemtype
> listado em `GLPI_ASSET_TYPES`, retornando os ativos cujo campo "Usado por"
> (`users_id`) corresponde ao colaborador.

## Configuração do DocuSign

A integração usa o fluxo **JWT Grant** do SDK oficial `docusign-esign`.

1. Crie uma aplicação em
   [DocuSign Developer Center](https://developers.docusign.com/) (ambiente
   demo/sandbox) e anote a **Integration Key (Client ID)**.
2. Gere um par de chaves RSA para a aplicação (na própria tela da app, em
   "Authentication"). Salve a **chave privada** em um arquivo `.pem`.
3. Obtenha o **User ID (GUID)** do usuário que enviará os envelopes
   (disponível em "Minhas Preferências > Apps e Chaves de Integração").
4. Obtenha o **Account ID** da conta DocuSign.
5. Conceda o **consentimento JWT** (consent) uma única vez, acessando a URL
   abaixo no navegador (substitua os valores):

   ```
   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<INTEGRATION_KEY>&redirect_uri=https://www.docusign.com
   ```

6. Salve o arquivo da chave privada em
   `backend/docusign_private_key.pem` (ou outro caminho, ajustando
   `DOCUSIGN_PRIVATE_KEY_PATH`).

Esses dados alimentam as variáveis `DOCUSIGN_INTEGRATION_KEY`,
`DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_BASE_PATH`,
`DOCUSIGN_AUTH_SERVER` e `DOCUSIGN_PRIVATE_KEY_PATH` do backend.

> Para produção, use `DOCUSIGN_BASE_PATH=https://www.docusign.net/restapi` e
> `DOCUSIGN_AUTH_SERVER=account.docusign.com`.

## Instalação e execução (desenvolvimento)

1. Clone o repositório e instale as dependências de ambos os workspaces a
   partir da raiz:

   ```bash
   npm install
   ```

2. Configure o backend:

   ```bash
   cd backend
   cp .env.example .env
   # edite o .env com as credenciais do GLPI e DocuSign
   # coloque a chave privada do DocuSign em ./docusign_private_key.pem
   ```

3. Configure o frontend:

   ```bash
   cd ../frontend
   cp .env.example .env
   # ajuste VITE_API_URL se necessário
   ```

4. Em dois terminais (a partir da raiz do monorepo):

   ```bash
   npm run dev:backend   # inicia o backend em http://localhost:4000
   npm run dev:frontend  # inicia o frontend em http://localhost:5173
   ```

O banco SQLite é criado automaticamente em `backend/data/database.sqlite` na
primeira execução.

## Executando com Docker

1. Configure `backend/.env` (a partir de `backend/.env.example`) e coloque a
   chave privada do DocuSign em `backend/docusign_private_key.pem`.
2. Na raiz do projeto:

   ```bash
   docker compose up --build
   ```

3. Acesse:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000/api/health

Os dados do SQLite são persistidos no volume `backend-data`.

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `PORT` | Porta do servidor Express | `4000` |
| `NODE_ENV` | Ambiente (`development`/`production`/`test`) | `development` |
| `CORS_ORIGIN` | Origem permitida para CORS (frontend) | `http://localhost:5173` |
| `GLPI_API_URL` | URL base da API REST do GLPI | - |
| `GLPI_APP_TOKEN` | App Token do GLPI | - |
| `GLPI_USER_TOKEN` | User Token do usuário de serviço | - |
| `GLPI_ASSET_TYPES` | Itemtypes consultados (separados por vírgula) | `Computer,Monitor,Peripheral,Phone` |
| `GLPI_SEARCH_FIELD_EMAIL` | ID do search option de "Email" no itemtype User | `5` |
| `DOCUSIGN_BASE_PATH` | Base path da API DocuSign | `https://demo.docusign.net/restapi` |
| `DOCUSIGN_AUTH_SERVER` | Servidor OAuth do DocuSign | `account-d.docusign.com` |
| `DOCUSIGN_INTEGRATION_KEY` | Integration Key (Client ID) | - |
| `DOCUSIGN_USER_ID` | User ID (GUID) do usuário impersonado | - |
| `DOCUSIGN_ACCOUNT_ID` | Account ID do DocuSign | - |
| `DOCUSIGN_PRIVATE_KEY_PATH` | Caminho da chave privada RSA | `./docusign_private_key.pem` |
| `DOCUSIGN_BRAND_NAME` | Nome exibido como remetente | `Sua Empresa` |
| `DATABASE_PATH` | Caminho do arquivo SQLite | `./data/database.sqlite` |

### Frontend (`frontend/.env`)

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `VITE_API_URL` | URL base da API do backend | `http://localhost:4000/api` |

## Endpoints da API

Todas as rotas têm o prefixo `/api`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck simples |
| `GET` | `/users/:email/assets` | Retorna o colaborador e os equipamentos atribuídos a ele no GLPI |
| `POST` | `/terms/send` | Cria o envelope no DocuSign e registra o termo |
| `GET` | `/terms` | Lista o histórico de termos enviados |
| `GET` | `/terms/:id` | Detalhes de um termo (atualiza status via DocuSign se aplicável) |

### Exemplo: `POST /api/terms/send`

```json
{
  "nome": "Maria Silva",
  "email": "maria.silva@empresa.com",
  "equipamentos": [
    {
      "id": 12,
      "itemtype": "Computer",
      "name": "Notebook Dell Latitude 5420",
      "serial": "ABC123",
      "inventoryNumber": "MB001"
    }
  ]
}
```

Resposta (`201 Created`):

```json
{
  "id": 1,
  "nome": "Maria Silva",
  "email": "maria.silva@empresa.com",
  "equipamentos": [ ... ],
  "envelopeId": "5b1f2e3a-....",
  "status": "sent",
  "createdAt": "2026-06-12 14:32:10"
}
```

## Banco de dados

Tabela `termos` (SQLite):

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | INTEGER (PK) | Identificador do termo |
| `nome` | TEXT | Nome do colaborador |
| `email` | TEXT | Email do colaborador |
| `equipamentos` | TEXT (JSON) | Lista de equipamentos selecionados |
| `envelopeId` | TEXT | ID do envelope no DocuSign |
| `status` | TEXT | Status do envelope (`sent`, `delivered`, `completed`, etc.) |
| `createdAt` | TEXT | Data/hora de criação do registro |

## Lint e formatação

```bash
# Backend
npm run lint --workspace backend
npm run format --workspace backend

# Frontend
npm run lint --workspace frontend
npm run format --workspace frontend
```

## Solução de problemas

- **`Variáveis de ambiente inválidas ou ausentes`**: confira se todas as
  variáveis obrigatórias estão definidas em `backend/.env` (compare com
  `.env.example`).
- **`Nao foi possivel autenticar na API do GLPI`**: valide `GLPI_API_URL`,
  `GLPI_APP_TOKEN` e `GLPI_USER_TOKEN`, e confirme que a API REST está
  habilitada no GLPI.
- **`Nao foi possivel autenticar na API do DocuSign`**: confirme o caminho da
  chave privada (`DOCUSIGN_PRIVATE_KEY_PATH`), se o consentimento JWT foi
  concedido e se `DOCUSIGN_INTEGRATION_KEY`/`DOCUSIGN_USER_ID`/
  `DOCUSIGN_ACCOUNT_ID` estão corretos.
- **Nenhum equipamento encontrado**: verifique se os ativos no GLPI possuem o
  campo "Usado por" (`users_id`) preenchido com o usuário pesquisado, e se o
  itemtype do ativo está listado em `GLPI_ASSET_TYPES`.
