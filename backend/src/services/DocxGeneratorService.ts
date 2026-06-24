import fs from 'node:fs';
import path from 'node:path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { TermAsset } from '../types/generateTerm';

/**
 * Dados do colaborador necessarios para preencher o template.
 */
export interface DocxEmployeeData {
  fullName: string;
  cpf: string;
  birthDate: string;
  corporateEmail: string;
  personalEmail: string;
  phone: string;
}

/** Numero maximo de equipamentos suportados pelo template. */
const MAX_EQUIPMENT_SLOTS = 10;

/**
 * Mapeamento de itemtype do GLPI para o tipo legivel exibido no termo.
 * Peripheral usa o nome real do ativo como tipo.
 */
function mapAssetType(itemtype: string, assetName: string): string {
  switch (itemtype) {
    case 'Computer':
      return 'Computador';
    case 'Monitor':
      return 'Monitor';
    case 'Peripheral':
      return derivePeripheralType(assetName);
    default:
      return itemtype;
  }
}

/**
 * Tenta derivar o tipo real do periferico a partir do nome do ativo.
 * Ex.: se o nome contem "headset", retorna "Headset".
 */
function derivePeripheralType(name: string): string {
  const lower = name.toLowerCase();

  const peripheralTypes: { keyword: string; label: string }[] = [
    { keyword: 'headset', label: 'Headset' },
    { keyword: 'fone', label: 'Headset' },
    { keyword: 'teclado', label: 'Teclado' },
    { keyword: 'keyboard', label: 'Teclado' },
    { keyword: 'mouse', label: 'Mouse' },
    { keyword: 'webcam', label: 'Webcam' },
    { keyword: 'camera', label: 'Webcam' },
    { keyword: 'dock', label: 'Dock' },
    { keyword: 'docking', label: 'Dock' },
    { keyword: 'carregador', label: 'Carregador' },
    { keyword: 'charger', label: 'Carregador' },
    { keyword: 'adaptador', label: 'Adaptador' },
    { keyword: 'adapter', label: 'Adaptador' },
    { keyword: 'hub', label: 'Hub' },
    { keyword: 'mochila', label: 'Mochila' },
    { keyword: 'bag', label: 'Mochila' },
    { keyword: 'case', label: 'Case' },
    { keyword: 'suporte', label: 'Suporte' },
    { keyword: 'stand', label: 'Suporte' },
  ];

  for (const { keyword, label } of peripheralTypes) {
    if (lower.includes(keyword)) {
      return label;
    }
  }

  return 'Periferico';
}

/**
 * Formata a data atual no padrao YYYYMMDD_HHmmss para compor o nome do
 * arquivo.
 */
function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/**
 * Gera o nome do arquivo do termo no formato:
 * Termo_<Primeiro>_<Ultimo>_<YYYYMMDD>_<HHmmss>.docx
 */
function generateFileName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? 'Colaborador';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  const namePart = lastName ? `${firstName}_${lastName}` : firstName;

  return `Termo_${namePart}_${formatTimestamp()}.docx`;
}

/**
 * Servico responsavel por gerar o documento DOCX do Termo de
 * Responsabilidade a partir do template existente (ModeloTermo.docx).
 *
 * O template original NUNCA e alterado. O docxtemplater le o template em
 * memoria, substitui os placeholders {{...}} e gera uma copia preenchida
 * que e salva na pasta de destino.
 */
export class DocxGeneratorService {
  private readonly templatePath: string;

  constructor() {
    this.templatePath = path.resolve(process.cwd(), env.DOCX_TEMPLATE_PATH);

    if (!fs.existsSync(this.templatePath)) {
      throw AppError.badGateway(
        `Template DOCX nao encontrado em ${this.templatePath}. Verifique DOCX_TEMPLATE_PATH.`,
      );
    }

    logger.info(`[DOCX GENERATION] Template carregado: ${this.templatePath}`);
  }

  /**
   * Le o template do disco a cada geracao para garantir que alteracoes no
   * arquivo sejam refletidas sem reiniciar o servidor. O template original
   * permanece intacto — a renderizacao acontece sobre uma copia em memoria.
   */
  private readTemplate(): Buffer {
    return fs.readFileSync(this.templatePath);
  }

  /**
   * Gera uma copia preenchida do template DOCX com os dados do colaborador
   * e equipamentos selecionados. Retorna o buffer da copia e o nome do
   * arquivo gerado.
   *
   * Placeholders esperados no template (delimitadores simples { }):
   * - {NomeCompleto}, {CPF}, {DataNascimento}, {EmailCorporativo},
   *   {EmailPessoal}, {Telefone}
   * - {Equipamento_1} ... {Equipamento_10}
   * - {Patrimonio_1} ... {Patrimonio_10}
   * - {Modelo_1} ... {Modelo_10}
   * - {Serial_1} ... {Serial_10}
   * - {Obs_1} ... {Obs_10}
   */
  public generate(employee: DocxEmployeeData, assets: TermAsset[]): { buffer: Buffer; fileName: string } {
    const fileName = generateFileName(employee.fullName);

    logger.info(`[DOCX GENERATION] Gerando documento: ${fileName}`);

    // Ler template — copia em memoria, original intacto
    const templateBuffer = this.readTemplate();
    const zip = new PizZip(templateBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });

    const data: Record<string, string> = {
      NomeCompleto: employee.fullName,
      CPF: employee.cpf,
      DataNascimento: employee.birthDate,
      EmailCorporativo: employee.corporateEmail,
      EmailPessoal: employee.personalEmail,
      Telefone: employee.phone,
    };

    // Preencher os 10 slots de equipamentos
    for (let i = 1; i <= MAX_EQUIPMENT_SLOTS; i++) {
      const asset = assets[i - 1];

      if (asset) {
        data[`Equipamento_${i}`] = asset.type;
        data[`Patrimonio_${i}`] = asset.inventoryNumber ?? '';
        data[`Modelo_${i}`] = asset.model ?? '';
        data[`Serial_${i}`] = asset.serial ?? '';
        data[`Obs_${i}`] = asset.observations ?? '';
      } else {
        data[`Equipamento_${i}`] = '';
        data[`Patrimonio_${i}`] = '';
        data[`Modelo_${i}`] = '';
        data[`Serial_${i}`] = '';
        data[`Obs_${i}`] = '';
      }
    }

    doc.render(data);

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    logger.info(
      `[DOCX GENERATION] Arquivo: ${fileName} | Equipamentos: ${assets.length}/${MAX_EQUIPMENT_SLOTS}`,
    );

    return { buffer, fileName };
  }
}

export const docxGeneratorService = new DocxGeneratorService();

export { mapAssetType };
