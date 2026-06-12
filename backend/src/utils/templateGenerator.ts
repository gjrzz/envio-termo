import type { EquipmentItem } from '../types/term';

/**
 * Escapa caracteres especiais HTML para evitar problemas de renderizacao
 * no documento gerado.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEquipmentList(equipamentos: EquipmentItem[]): string {
  return equipamentos
    .map((item) => {
      const identifier = item.inventoryNumber ?? item.serial ?? `#${item.id}`;
      return `<li>${escapeHtml(item.name)} - ${escapeHtml(identifier)} (${escapeHtml(item.itemtype)})</li>`;
    })
    .join('\n');
}

/**
 * Gera o documento HTML do Termo de Responsabilidade, substituindo os
 * placeholders {{nome}}, {{email}}, {{lista_de_equipamentos}} e {{data}}.
 *
 * O HTML resultante e enviado ao DocuSign como documento do envelope.
 */
export function generateTermoHtml(params: {
  nome: string;
  email: string;
  data: string;
  equipamentos: EquipmentItem[];
}): string {
  const { nome, email, data, equipamentos } = params;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; color: #1a1a1a; padding: 40px; }
      h1 { font-size: 16pt; text-align: center; margin-bottom: 32px; }
      p { line-height: 1.6; }
      ul { line-height: 1.6; }
      .signature-area { margin-top: 64px; }
    </style>
  </head>
  <body>
    <h1>TERMO DE RESPONSABILIDADE</h1>
    <p>
      Eu, <strong>${escapeHtml(nome)}</strong>, portador do email
      <strong>${escapeHtml(email)}</strong>, declaro que recebi os seguintes
      equipamentos para uso corporativo:
    </p>
    <ul>
      ${formatEquipmentList(equipamentos)}
    </ul>
    <p>
      Comprometo-me a zelar pelos equipamentos e devolve-los quando solicitado.
    </p>
    <p>Data: ${escapeHtml(data)}</p>
    <div class="signature-area">
      <p>/sn1/</p>
      <p>Assinatura eletronica via DocuSign.</p>
    </div>
  </body>
</html>
`.trim();
}
