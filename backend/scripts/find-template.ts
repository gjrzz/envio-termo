import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import docusign from 'docusign-esign';

const env = process.env;

async function main() {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(env.DOCUSIGN_BASE_PATH!);
  apiClient.setOAuthBasePath(env.DOCUSIGN_AUTH_SERVER!);

  // Autenticar
  const privateKey = fs.readFileSync(path.resolve(process.cwd(), env.DOCUSIGN_PRIVATE_KEY_PATH!));
  const tokenResponse = await apiClient.requestJWTUserToken(
    env.DOCUSIGN_INTEGRATION_KEY!,
    env.DOCUSIGN_USER_ID!,
    ['signature', 'impersonation'],
    privateKey,
    3600,
  );
  const accessToken = tokenResponse.body.access_token;
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  // Obter account info
  const userInfo = await apiClient.getUserInfo(accessToken);
  const account = userInfo.accounts.find((a: any) => a.accountId === env.DOCUSIGN_ACCOUNT_ID) ?? userInfo.accounts[0];
  apiClient.setBasePath(`${account.baseUri}/restapi`);

  console.log(`Account: ${account.accountName} (${account.accountId})`);

  const templatesApi = new docusign.TemplatesApi(apiClient);

  // Buscar TODOS os templates sem filtro (paginando)
  let allTemplates: any[] = [];
  let startPosition = 0;
  const pageSize = 100;
  let totalSetSize = 0;

  do {
    const result = await templatesApi.listTemplates(account.accountId, {
      count: pageSize,
      startPosition: startPosition,
    }) as any;

    totalSetSize = parseInt(result.totalSetSize ?? '0', 10);
    const templates = result.envelopeTemplates ?? [];
    allTemplates.push(...templates);

    console.log(`Pagina ${Math.floor(startPosition / pageSize) + 1}: ${templates.length} templates (total: ${totalSetSize})`);

    startPosition += pageSize;
  } while (startPosition < totalSetSize);

  console.log(`\nTotal de templates na conta: ${allTemplates.length}`);

  // Buscar por nome contendo "Teste" ou "Modelo"
  const matches = allTemplates.filter((t: any) => {
    const name = (t.name ?? '').toLowerCase();
    return name.includes('teste') || name.includes('modelo');
  });

  console.log(`\nTemplates contendo "Teste" ou "Modelo" no nome: ${matches.length}\n`);

  matches.forEach((t: any) => {
    console.log(`  templateId: ${t.templateId}`);
    console.log(`  name: ${t.name}`);
    console.log(`  owner: ${t.owner?.userName ?? '(desconhecido)'} <${t.owner?.email ?? ''}>`);
    console.log(`  folder: ${t.folderName ?? t.folderId ?? '(nenhum)'}`);
    console.log(`  shared: ${t.shared ?? 'desconhecido'}`);
    console.log('');
  });

  // Salvar payload completo
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const outputPath = path.join(logsDir, 'docusign-all-templates.json');
  fs.writeFileSync(outputPath, JSON.stringify(allTemplates, null, 2), 'utf-8');
  console.log(`Payload completo salvo em: ${outputPath}`);

  // Buscar especificamente "TesteModelo"
  const testeModelo = allTemplates.find((t: any) => (t.name ?? '').includes('TesteModelo'));
  if (testeModelo) {
    console.log(`\n=== ENCONTRADO: TesteModelo ===`);
    console.log(`templateId: ${testeModelo.templateId}`);
    console.log(`name: ${testeModelo.name}`);
    console.log(JSON.stringify(testeModelo, null, 2));
  } else {
    console.log('\n=== TesteModelo NAO encontrado na listagem ===');

    // Tentar busca por search_text
    console.log('\nTentando busca com search_text="TesteModelo"...');
    try {
      const searchResult = await templatesApi.listTemplates(account.accountId, {
        searchText: 'TesteModelo',
      }) as any;
      console.log(`Resultado da busca: ${searchResult.resultSetSize ?? 0} template(s)`);
      (searchResult.envelopeTemplates ?? []).forEach((t: any) => {
        console.log(`  - ${t.templateId}: ${t.name}`);
      });
    } catch (err: any) {
      console.log('Erro na busca:', err.response?.data ?? err.message);
    }
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
