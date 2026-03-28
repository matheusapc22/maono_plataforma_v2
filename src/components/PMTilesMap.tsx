import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { MVTLayer } from '@deck.gl/geo-layers';

export default function PMTilesMap() {
  const [viewState, setViewState] = useState({
    longitude: -51.9253, // Ajuste para a coordenada central dos seus dados (ex: Brasil)
    latitude: -14.2350,
    zoom: 4,
    pitch: 0,
    bearing: 0
  });

  // 🚀 A URL PÚBLICA DO SEU CLOUDFLARE R2
  // Substitua a parte "SEU_SUBDOMINIO_PUBLICO.r2.dev" pelo link real do seu bucket
  // Certifique-se de que a extensão final bate com o que você gerou (.mvt ou .pbf)
  const TILE_URL = 'https://pub-1fec65e3cdea470b8229d27adfcca2d7.r2.dev/previa_corpal_empresas_otimizada_v4/{z}/{x}/{y}.mvt';

  const layer = useMemo(() => {
    return new MVTLayer({
      id: 'maono-r2-mvt-layer',
      data: TILE_URL, 
      
      // O Deck.gl fará as requisições HTTP automáticas para o seu Cloudflare R2!
      
      // Estilização Maõno
      getFillColor: [197, 160, 89, 140], 
      getLineColor: [197, 160, 89, 255], 
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [226, 194, 117, 200],
    });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0f18' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={[layer]}
        getTooltip={({ object }) => object && `Dados: ${JSON.stringify(object.properties)}`}
      />
      
      <div className="absolute top-6 left-6 z-50 bg-[#131c2a]/90 backdrop-blur-md border border-[#C5A059]/40 p-4 rounded-xl shadow-2xl">
        <h1 className="text-[#C5A059] text-xs font-extrabold tracking-widest uppercase mb-1">Maõno Engine MVT</h1>
        <p className="text-[#8c9fba] text-[10px] uppercase">Lendo diretório direto do Cloudflare R2</p>
      </div>
    </div>
  );
}