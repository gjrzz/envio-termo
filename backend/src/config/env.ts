import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  GLPI_API_URL: z.string().url(),
  GLPI_APP_TOKEN: z.string().min(1),
  GLPI_USER_TOKEN: z.string().min(1),
  GLPI_SEARCH_FIELD_EMAIL: z.coerce.number().default(5),

  MONDAY_API_TOKEN: z.string().default(''),
  MONDAY_BOARD_ID: z.string().default(''),

  EMPLOYEE_PROVIDER: z.enum(['monday', 'excel']).default('excel'),
  EMPLOYEE_EXCEL_PATH: z.string().default('./data/colaboradores.xlsx'),

  DOCUSIGN_BASE_PATH: z.string().default('https://demo.docusign.net/restapi'),
  DOCUSIGN_AUTH_SERVER: z.string().default('account-d.docusign.com'),
  DOCUSIGN_INTEGRATION_KEY: z.string().min(1),
  DOCUSIGN_USER_ID: z.string().min(1),
  DOCUSIGN_ACCOUNT_ID: z.string().min(1),
  DOCUSIGN_PRIVATE_KEY_PATH: z.string().default('./docusign_private_key.pem'),
  DOCUSIGN_BRAND_NAME: z.string().default('Sua Empresa'),

  DATABASE_PATH: z.string().default('./data/database.sqlite'),

  // Segredo para assinar tokens JWT de autenticacao
  JWT_SECRET: z.string().min(1).default('change-me-in-production'),

  // Pasta local onde os DOCX gerados serao salvos (sincronizada pelo OneDrive)
  GENERATED_TERMS_PATH: z.string().min(1),

  // Template DOCX
  DOCX_TEMPLATE_PATH: z.string().default('./templates/ModeloTermo.docx'),

  // DocuSign Template ID para Termo de Responsabilidade
  DOCUSIGN_TERM_TEMPLATE_ID: z.string().default('0bfcf43b-76aa-4c63-b73d-c74e803f9586'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Variaveis de ambiente invalidas ou ausentes:\n${issues}\n\nVerifique o arquivo .env (use .env.example como referencia).`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export type Env = typeof env;
