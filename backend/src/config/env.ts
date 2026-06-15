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

  MONDAY_API_TOKEN: z.string().min(1),
  MONDAY_BOARD_ID: z.string().min(1),

  EMPLOYEE_PROVIDER: z.enum(['monday', 'excel']).default('monday'),
  EMPLOYEE_EXCEL_PATH: z.string().default('./data/colaboradores.xlsx'),

  DOCUSIGN_BASE_PATH: z.string().url(),
  DOCUSIGN_AUTH_SERVER: z.string().min(1),
  DOCUSIGN_INTEGRATION_KEY: z.string().min(1),
  DOCUSIGN_USER_ID: z.string().min(1),
  DOCUSIGN_ACCOUNT_ID: z.string().min(1),
  DOCUSIGN_PRIVATE_KEY_PATH: z.string().default('./docusign_private_key.pem'),
  DOCUSIGN_BRAND_NAME: z.string().default('Sua Empresa'),

  DATABASE_PATH: z.string().default('./data/database.sqlite'),
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
