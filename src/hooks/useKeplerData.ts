import { useSelector } from 'react-redux';
import { useMemo } from 'react';

// Tipagem para exportar o formato exato da nossa base
export interface KeplerDataset {
  id: string;
  label: string;
  columns: string[];
  data: any[];
}

export function useKeplerData(): KeplerDataset[] {
  const state = useSelector((s: any) => s);

  const result = useMemo(() => {
    const output: KeplerDataset[] = [];
    
    try {
      if (!state) return output;

      const keplerGl = state.keplerGl || state.demo?.keplerGl;
      if (!keplerGl) return output;

      const mapState = keplerGl.map || Object.values(keplerGl)[0];
      if (!mapState || !mapState.visState || !mapState.visState.datasets) return output;

      const datasets = mapState.visState.datasets;
      const datasetKeys = Object.keys(datasets);
      
      if (datasetKeys.length === 0) return output;

      // 🚀 AGORA VARREMOS TODAS AS BASES DISPONÍVEIS
      datasetKeys.forEach(key => {
        const dataset = datasets[key];
        if (!dataset || !dataset.fields) return;

        const columns = dataset.fields.map((f: any) => f.name);
        const label = dataset.label || key; // Pega o nome do arquivo que o usuário subiu

        let rawRows = [];
        if (dataset.dataContainer && typeof dataset.dataContainer.flattenData === 'function') {
          rawRows = dataset.dataContainer.flattenData();
        } else if (dataset.allData) {
          rawRows = dataset.allData;
        } else if (dataset.dataContainer?._rows) {
          rawRows = dataset.dataContainer._rows;
        }

        const data: any[] = [];
        if (Array.isArray(rawRows) && rawRows.length > 0 && columns.length > 0) {
          rawRows.forEach((row: any[]) => {
            const obj: Record<string, any> = {};
            columns.forEach((col, index) => {
              obj[col] = row[index] !== undefined ? row[index] : null;
            });
            data.push(obj);
          });
        }

        output.push({ id: key, label, columns, data });
      });

      return output;
    } catch (error) {
      console.error("Maõno Engine: Erro interno ao rastrear dados.", error);
      return output;
    }
  }, [state]);

  return result;
}