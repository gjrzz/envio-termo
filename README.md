# Envio de Termos de Responsabilidade

Sistema interno da **Monte Bravo Investimentos** para automatizar o envio de Termos de Responsabilidade de equipamentos corporativos para assinatura digital via DocuSign.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, Vite, TypeScript, MUI v6, TanStack Query, React Router v7 |
| Backend | Node.js 22+, Express, TypeScript, Zod, SQLite (`node:sqlite` nativo) |
| Integrações | GLPI REST API, Monday.com GraphQL API, DocuSign eSignature (JWT Grant) |
| Conversão PDF | LibreOffice Headless (DOCX → PDF) |
| Infra | Docker Compose, Nginx (proxy reverso), Ubuntu 22.04 |

## Fluxo Principal

1. Usuário faz login no sistema
2. Pesquisa colaborador por email corporativo
3. Backend busca dados pessoais (Monday.com ou planilha Excel) + equipamentos atribuídos (GLPI)
4. Usuário seleciona equipamentos e escolhe destino do termo (email pessoal ou corporativo)
5. Backend gera DOCX preenchido → converte para PDF via LibreOffice → envia ao DocuSign
6. Colaborador recebe o documento pronto para assinatura
7. Registro é salvo no histórico (SQLite)

## Estrutura do Projeto

```
envio-termo/
├── backend/
│   ├── src/
│   │   ├── config/          # Validação env (Zod) + SQLite setup
│   │   ├── controllers/     # Handlers Express
│   │   ├── middleware/       # Auth JWT, validação Zod, rate limit, error handler
│   │   ├── repositories/    # Acesso a dados (termos, users)
│   │   ├── routes/          # Definição das rotas /api
│   │   ├── services/        # GLPI, DocuSign, Monday, DOCX, PDF, Auth
│   │   │   └── providers/   # Strategy pattern (Excel/Monday)
│   │   ├── types/           # Interfaces + schemas Zod
│   │   └── utils/           # Logger, AppError, asyncHandler
│   ├── data/                # SQLite + planilha Excel (runtime)
│   ├── templates/           # ModeloTermo.docx
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/           # Login, Home, Result, History, Users
│   │   ├── components/      # Layout, AssetList, Snackbar
│   │   ├── contexts/        # AuthContext (JWT + localStorage)
│   │   ├── hooks/           # React Query wrappers
│   │   ├── services/        # Axios client com interceptors
│   │   ├── theme/           # Tema corporativo MUI
│   │   └── types/           # Tipagens compartilhadas
│   ├── Dockerfile
│   └── nginx.conf           # Proxy reverso /api → backend
├── docker-compose.yml
└── README.md
```

## Deploy (Docker na VM Ubuntu)

### Pré-requisitos na VM

- Docker + Docker Compose
- Git

### Setup inicial (uma vez)

```bash
git clone https://github.com/gjrzz/envio-termo.git ~/envio-termo
cd ~/envio-termo

# Copiar arquivos sensíveis (não versionados)
cp ~/backup/.env backend/.env
cp ~/backup/docusign_private_key.pem backend/
cp ~/backup/colaboradores.xlsx backend/data/

# Build e subir
docker compose up -d --build
```

### Deploy de atualizações

```bash
cd ~/envio-termo
git pull origin main
docker compose down
docker compose up -d --build
```

### Acessar

- **Sistema:** `http://<ip-da-vm>` (porta 80)
- **API direto:** `http://<ip-da-vm>:4000/api/health`

### Credenciais iniciais

- Email: `admin@montebravo.com.br`
- Senha: `admin123`

> Troque a senha após o primeiro login na aba Usuários.

## Fluxo de Desenvolvimento

1. Desenvolver localmente (Windows)
2. Kiro faz commit + push para branch `git`
3. Merge `git` → `main` pelo GitHub
4. Na VM: `git pull origin main` + rebuild

## Variáveis de Ambiente (backend/.env)

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: 4000) |
| `CORS_ORIGIN` | Origem CORS (`*` em produção via proxy) |
| `GLPI_API_URL` | URL da API REST do GLPI |
| `GLPI_APP_TOKEN` | App Token do GLPI |
| `GLPI_USER_TOKEN` | User Token do GLPI |
| `GLPI_SEARCH_FIELD_EMAIL` | ID do campo de email no GLPI (padrão: 5) |
| `MONDAY_API_TOKEN` | Token da API Monday.com |
| `MONDAY_BOARD_ID` | ID da board do Monday |
| `EMPLOYEE_PROVIDER` | Fonte de dados: `monday` ou `excel` |
| `EMPLOYEE_EXCEL_PATH` | Caminho da planilha (se provider=excel) |
| `DOCUSIGN_BASE_PATH` | Base path DocuSign |
| `DOCUSIGN_AUTH_SERVER` | Auth server DocuSign |
| `DOCUSIGN_INTEGRATION_KEY` | Client ID DocuSign |
| `DOCUSIGN_USER_ID` | User ID para JWT Grant |
| `DOCUSIGN_ACCOUNT_ID` | Account ID DocuSign |
| `DOCUSIGN_PRIVATE_KEY_PATH` | Caminho da chave RSA |
| `DATABASE_PATH` | Caminho do SQLite |
| `GENERATED_TERMS_PATH` | Pasta de destino dos PDFs |
| `DOCX_TEMPLATE_PATH` | Caminho do template Word |
| `JWT_SECRET` | Segredo para tokens de autenticação |

## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/health` | Não | Health check |
| POST | `/api/auth/login` | Não | Login (rate limited: 5/min) |
| GET | `/api/auth/me` | Sim | Dados do usuário logado |
| PUT | `/api/auth/change-password` | Sim | Alterar senha |
| PUT | `/api/auth/avatar` | Sim | Atualizar foto de perfil |
| GET | `/api/users-management` | Sim | Listar usuários |
| POST | `/api/users-management` | Sim | Criar usuário |
| PUT | `/api/users-management/:id` | Sim | Editar usuário |
| DELETE | `/api/users-management/:id` | Sim | Excluir usuário |
| GET | `/api/users/:email/assets` | Sim | Equipamentos do colaborador (GLPI) |
| GET | `/api/monday/employee/:email` | Sim | Dados pessoais do colaborador |
| POST | `/api/terms/generate` | Sim | Gerar e enviar termo via DocuSign |
| GET | `/api/terms` | Sim | Histórico de termos enviados |
| GET | `/api/terms/:id` | Sim | Detalhes de um termo |

## Segurança

- Autenticação JWT com expiração de 24h
- Rate limiting no login (5 tentativas/min por IP)
- Logout automático no frontend quando token expira (401)
- Senhas hasheadas com bcrypt (salt rounds: 10)
- CORS configurável via variável de ambiente
- Trust proxy habilitado para IP real via Nginx

## Banco de Dados (SQLite)

**Tabela `termos`:** id, nome, email, equipamentos (JSON), envelopeId, status, createdAt

**Tabela `users`:** id, name, email, password (bcrypt), avatar (base64), createdAt
