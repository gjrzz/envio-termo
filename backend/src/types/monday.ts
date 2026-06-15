/**
 * Coluna de uma board do Monday.com.
 */
export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

/**
 * Resultado de GET /api/monday/debug: identificacao da board e suas colunas.
 */
export interface MondayDebugResult {
  board: {
    id: string;
    name: string;
  };
  columns: MondayColumn[];
}

/**
 * Valor de uma coluna em um item da board, incluindo o titulo/tipo da
 * coluna para facilitar o mapeamento manual durante a fase de descoberta.
 */
export interface MondayItemColumnValue {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: string | null;
}

/**
 * Item (registro) de uma board do Monday.com com todos os campos
 * disponiveis.
 */
export interface MondaySampleItem {
  id: string;
  name: string;
  columnValues: MondayItemColumnValue[];
}

/**
 * Resultado de GET /api/monday/sample: amostra de itens da board com todos
 * os campos disponiveis.
 */
export interface MondaySampleResult {
  board: {
    id: string;
    name: string;
  };
  items: MondaySampleItem[];
}
