/**
 * Motor de Fórmulas Maõno Turbinado
 * Aceita sintaxes em inglês e português: "SOMA(valor)", "MÉDIA(idade)", "CONTAGEM_DISTINTA(cnpj)"
 */
export function evaluateFormula(formula: string, data: any[]): string {
  if (!data || data.length === 0) return "0";

  try {
    const match = formula.match(/^([a-zA-ZÀ-ÿ_]+)\((.*)\)$/i);
    if (!match) return "Sintaxe Inválida";

    const operation = match[1].toUpperCase();
    const column = match[2].trim();

    // Filtra e converte os valores para números (para soma, média, max, min)
    const numericValues = data
      .map(row => Number(row[column]))
      .filter(val => !isNaN(val));

    let result = 0;

    switch (operation) {
      case 'COUNT':
      case 'CONTAGEM':
        // Conta quantas linhas têm ALGUM valor nessa coluna (ignora vazios)
        result = data.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== '').length;
        if (column === '') result = data.length; // Se não tiver coluna específica, conta todas as linhas
        break;

      case 'DISTINCT':
      case 'CONTAGEM_DISTINTA':
        // Filtra valores únicos
        const unique = new Set(data.map(row => String(row[column])));
        result = Array.from(unique).filter(v => v !== 'null' && v !== 'undefined' && v !== '').length;
        break;
      
      case 'SUM':
      case 'SOMA':
        result = numericValues.reduce((acc, val) => acc + val, 0);
        break;
      
      case 'AVG':
      case 'MÉDIA':
      case 'MEDIA':
        result = numericValues.length ? numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length : 0;
        break;

      case 'MAX':
      case 'MÁXIMO':
      case 'MAXIMO':
        result = numericValues.length ? Math.max(...numericValues) : 0;
        break;

      case 'MIN':
      case 'MÍNIMO':
      case 'MINIMO':
        result = numericValues.length ? Math.min(...numericValues) : 0;
        break;

      default:
        return "N/A";
    }

    // Formata o número (ex: 1.250.400,5)
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(result);

  } catch (error) {
    return "Erro";
  }
}