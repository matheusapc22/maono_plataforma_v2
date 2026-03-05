import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect
} from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectLayers,
  selectDatasets,
  selectFilters,
  selectVisState,
  selectUiState,
  selectMapState, 
  KEPLER_ID
} from '../pages/Kepler/keplerBridge';

import {
  layerConfigChange,
  layerVisConfigChange,
  removeLayer,
  addFilter,
  setFilter,
  removeFilter,
  wrapTo,
  interactionConfigChange,
  layerVisualChannelConfigChange,
  toggleMapControl,
  addLayer,
  duplicateLayer,
  reorderLayer,
  fitBounds,
  updateMap,
  addDataToMap,
  removeDataset
} from '@kepler.gl/actions';

import { processGeojson } from '@kepler.gl/processors'; 

import * as XLSX from 'xlsx';
import { WebMercatorViewport } from '@deck.gl/core';

// --- SVGs de Interface ---
const TableIcon = () => (
  <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em"><path d="M48 64C21.5 64 0 85.5 0 112v288c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm48 80h112v80H96v-80zm160 0h160v80H256v-80zm-160 128h112v80H96v-80zm160 0h160v80H256v-80zM48 144h416v-32H48v32zm0 160v-64h416v64H48z" /></svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" height="1.5em" width="1.5em"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" height="1.2em" width="1.2em"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const ExcelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" height="1.2em" width="1.2em"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2.5"></path><path d="M10.5 13v5"></path><path d="M8 18h2.5"></path></svg>
);

// --- SVGs Flutuantes ---
const LegendMapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);
const PinMarkerIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="#0a0f18" strokeWidth="1"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const IsochroneWavesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
);
const WalkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path><path d="M14.5 16.5L13 11l.5-4-3-1-3 1"></path><path d="M10 16.5l-1-4.5-2.5-1"></path><path d="M16 8.5l-2.5 1-1 4"></path></svg>
);
const BikeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="18.5" cy="17.5" r="3.5"></circle><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg>
);
const CarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="18" height="8" rx="2"></rect><path d="M3 12l2-4h14l2 4"></path><circle cx="7" cy="16" r="1"></circle><circle cx="17" cy="16" r="1"></circle></svg>
);

const LayersTabIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
);

const FiltersTabIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
);

const TooltipsTabIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

// --- Utils ---
const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((x) => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

const hexToRgb = (hex: string) => {
  const match = hex.replace('#', '').match(/.{1,2}/g);
  return match ? [parseInt(match[0], 16), parseInt(match[1], 16), parseInt(match[2], 16)] : [255, 0, 0];
};

const getPlainFields = (rawFields: any) => {
  if (!rawFields) return [];
  const arr = typeof rawFields.toArray === 'function' ? rawFields.toArray() : Array.isArray(rawFields) ? rawFields : [];
  return arr.map((f: any) => {
    if (typeof f.toJS === 'function') return f.toJS();
    if (f.get) return { name: f.get('name'), format: f.get('format') };
    return { name: f.name, format: f.format };
  }).filter((f: any) => f && f.name);
};

const MAONO_PALETTES = [
  { id: 'fogo', name: 'Maõno Fogo', type: 'sequential', category: 'Maono', colors: ['#FFFFCC', '#FFF2B6', '#FFE4A1', '#FFD68C', '#FFC876', '#FFBA61', '#FFAC4C', '#FF9D36', '#FF8F21', '#FF810C', '#F87100', '#E96400', '#DA5700', '#CB4A00', '#BC3D00', '#AD3000', '#9E2300', '#8F1600', '#800900', '#710000'] },
  { id: 'blues', name: 'Maõno Ocean', type: 'sequential', category: 'Maono', colors: ['#f7fbff', '#f2f8fc', '#edf4f9', '#e7f0f6', '#e1ebf3', '#dbe6f0', '#d4e1ed', '#cddbea', '#c6d6e7', '#bfd0e3', '#b7cbe0', '#afc5dc', '#a7bfd9', '#9ebad5', '#95b4d1', '#8caecd', '#81a8c9', '#75a1c4', '#6698be', '#4a87b4'] },
  { id: 'purples', name: 'Maõno Royal', type: 'sequential', category: 'Maono', colors: ['#fcfbfd', '#f7f6fb', '#f2f1f8', '#edeaf5', '#e7e4f1', '#e0deed', '#dad7e8', '#d3d0e4', '#ccc9df', '#c5c1db', '#bebad6', '#b7b1d1', '#b0a8cc', '#a89fc7', '#a096c1', '#988cbb', '#8f82b5', '#8376ad', '#7465a3', '#5c4795'] }
];

const getSafeColors = (colorRange: any) => {
  if (!colorRange || !colorRange.colors) return MAONO_PALETTES[0].colors;
  if (Array.isArray(colorRange.colors)) return colorRange.colors;
  if (typeof colorRange.colors.toArray === 'function') return colorRange.colors.toArray();
  return MAONO_PALETTES[0].colors;
};

// --- Components ---

function MaonoDropdown({ value, options, onChange, placeholder = 'Selecione...' }: any) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options?.find((o: any) => o.value === value)?.label || placeholder, [options, value, placeholder]);

  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, direction: 'down', maxHeight: 256 });
  const close = () => setOpen(false);

  const computePosition = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 6;
    const availableBelow = Math.max(0, vh - r.bottom - margin);
    const availableAbove = Math.max(0, r.top - margin);
    const preferUp = availableBelow < 220 && availableAbove > availableBelow;
    const direction = preferUp ? 'up' : 'down';
    const maxHeight = Math.min(256, Math.max(140, direction === 'down' ? availableBelow : availableAbove));
    const width = r.width;
    let left = r.left;
    if (left + width > vw - margin) left = Math.max(margin, vw - margin - width);
    if (left < margin) left = margin;
    const top = direction === 'down' ? r.bottom + gap : Math.max(margin, r.top - gap - maxHeight);
    setPos({ left, top, width, direction: direction as 'up' | 'down', maxHeight });
  };

  useLayoutEffect(() => { if (open) computePosition(); }, [open, options?.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
    };
  }, [open]);

  return (
    <>
      <div className="relative">
        <button 
          ref={btnRef} 
          type="button" 
          onClick={() => setOpen((o) => !o)} 
          className="w-full !bg-[#131c2a] !border-[#2a3a54] hover:!border-[#C5A059] !text-white font-medium text-xs rounded-lg p-3 flex items-center justify-between outline-none shadow-sm transition-all border"
        >
          <span className={`truncate ${!value ? '!text-gray-400' : '!text-white'}`}>{selected}</span>
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} !text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      {open && createPortal(
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div ref={menuRef} style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }} className="z-[9999] pointer-events-auto">
            <div className="!bg-[#131c2a] border border-[#2a3a54] rounded-xl shadow-2xl overflow-hidden">
              <div className="overflow-y-auto maono-scroll py-1" style={{ maxHeight: pos.maxHeight }}>
                {options?.map((opt: any) => (
                  <button 
                    key={opt.value} 
                    type="button" 
                    onClick={() => { onChange(opt.value); close(); }} 
                    className={`w-full text-left px-4 py-3 text-xs hover:!bg-[#1a2435] transition-colors ${opt.value === value ? 'font-bold !border-l-2 !border-[#C5A059] !text-[#C5A059] !bg-[#0a0f18]' : '!text-white'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}

function RangeFilterBlock({ filterIndex, domain, value, dataset, currentField, onChange, allFilters }: any) {
  const safeDomain = Array.isArray(domain) && domain.length >= 2 ? domain : [0, 100];
  const safeValue = Array.isArray(value) && value.length >= 2 ? value : safeDomain;
  const range = safeDomain[1] - safeDomain[0] || 1;
  const rawMin = safeValue[0] !== undefined ? safeValue[0] : safeDomain[0];
  const rawMax = safeValue[1] !== undefined ? safeValue[1] : safeDomain[1];
  const valMin = isNaN(rawMin) ? safeDomain[0] : rawMin;
  const valMax = isNaN(rawMax) ? safeDomain[1] : rawMax;
  const leftPercent = ((valMin - safeDomain[0]) / range) * 100;
  const widthPercent = ((valMax - valMin) / range) * 100;

  const bins = useMemo(() => {
    if (!dataset || !dataset.rawDataset || !currentField) return [];
    const colIdx = dataset.fields?.findIndex((f: any) => f.name === currentField);
    if (colIdx === undefined || colIdx < 0) return [];

    const numBins = 24;
    const binSize = range / numBins;
    const rawBins = new Array(numBins).fill(0);
    const dataContainer = dataset.rawDataset.dataContainer;
    const allData = dataset.rawDataset.allData;
    const numRows = dataContainer ? dataContainer.numRows() : (allData ? allData.length : 0);

    const otherFilters = (allFilters || []).filter((f: any, idx: number) => {
      const fDataId = f.dataId?.[0] || f.dataId || (f.get && (f.getIn(['dataId', 0]) || f.get('dataId')));
      return idx !== filterIndex && fDataId === dataset.id;
    });

    const filterRules = otherFilters.map((f: any) => {
      const fNameArr = f.name || (f.get && f.get('name'));
      const fName = Array.isArray(fNameArr) ? fNameArr[0] : fNameArr?.toArray ? fNameArr.toArray()[0] : fNameArr || '';
      const cIdx = dataset.fields?.findIndex((col: any) => col.name === fName);
      const fType = f.type || (f.get && f.get('type'));
      const fValue = Array.isArray(f.value) ? f.value : f.value?.toArray ? f.value.toArray() : [];
      return { colIdx: cIdx, type: fType, value: fValue };
    }).filter((r: any) => r.colIdx >= 0);

    for (let i = 0; i < numRows; i++) {
      let passesCascade = true;
      for (const rule of filterRules) {
        const cellVal = dataContainer ? dataContainer.valueAt(i, rule.colIdx) : allData[i][rule.colIdx];
        if (rule.type === 'multiSelect' || rule.type === 'select') {
          if (rule.value && rule.value.length > 0 && !rule.value.includes(cellVal)) { passesCascade = false; break; }
        } else if (rule.type === 'range') {
          if (rule.value && rule.value.length === 2) {
            if (cellVal < rule.value[0] || cellVal > rule.value[1]) { passesCascade = false; break; }
          }
        }
      }
      if (!passesCascade) continue;

      const val = dataContainer ? dataContainer.valueAt(i, colIdx) : allData[i][colIdx];
      if (typeof val === 'number' && !isNaN(val)) {
        let bIdx = Math.floor((val - safeDomain[0]) / binSize);
        if (bIdx >= numBins) bIdx = numBins - 1;
        if (bIdx >= 0) rawBins[bIdx]++;
      }
    }
    const maxCount = Math.max(...rawBins, 1);
    return rawBins.map((count, i) => {
      const barCenter = safeDomain[0] + (i + 0.5) * binSize;
      return { height: (count / maxCount) * 100, center: barCenter, count };
    });
  }, [dataset, currentField, safeDomain, range, allFilters, filterIndex]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);
  const dragInfo = useRef({ startX: 0, minAtStart: 0, maxAtStart: 0, width: 0 });

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    dragInfo.current = { startX: e.clientX, minAtStart: valMin, maxAtStart: valMax, width: sliderRef.current.getBoundingClientRect().width };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingTrack(true);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTrack) return;
    const { startX, minAtStart, maxAtStart, width } = dragInfo.current;
    if (width === 0) return;
    const deltaX = e.clientX - startX;
    const deltaVal = (deltaX / width) * range;
    let newMin = minAtStart + deltaVal;
    let newMax = maxAtStart + deltaVal;
    const windowSize = maxAtStart - minAtStart;
    if (newMin < safeDomain[0]) { newMin = safeDomain[0]; newMax = newMin + windowSize; }
    if (newMax > safeDomain[1]) { newMax = safeDomain[1]; newMin = newMax - windowSize; }
    onChange([newMin, newMax]);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTrack) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDraggingTrack(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-4 z-10 mt-1">
      <div className="flex items-center gap-3">
        <input type="number" value={Math.round(valMin) || 0} onChange={(e) => onChange([Math.min(Number(e.target.value), valMax), valMax])} className="w-full !bg-[#131c2a] !border-[#2a3a54] !text-white font-medium text-xs rounded-lg p-2.5 text-center focus:!border-[#C5A059] outline-none transition-all border" />
        <span className="text-[9px] text-[#64748b] font-bold uppercase">A</span>
        <input type="number" value={Math.round(valMax) || 0} onChange={(e) => onChange([valMin, Math.max(Number(e.target.value), valMin)])} className="w-full !bg-[#131c2a] !border-[#2a3a54] !text-white font-medium text-xs rounded-lg p-2.5 text-center focus:!border-[#C5A059] outline-none transition-all border" />
      </div>
      <div className="flex flex-col w-full relative pt-2">
        {bins.length > 0 && (
          <div className="flex items-end w-full h-12 gap-[2px] px-[8px] mb-1">
            {bins.map((bin: any, i: number) => {
              const isSelected = bin.center >= valMin && bin.center <= valMax;
              const isEmpty = bin.count === 0;
              return <div key={i} className={`flex-1 rounded-t-[2px] transition-all duration-300 ${isEmpty ? 'opacity-0' : isSelected ? 'bg-gradient-to-t from-[#C5A059] to-[#dfb96f] shadow-[0_0_8px_rgba(197,160,89,0.3)]' : 'bg-[#1a2435] opacity-60'}`} style={{ height: isEmpty ? '0%' : `${Math.max(bin.height, 4)}%` }} />;
            })}
          </div>
        )}
        <div className="relative h-6 w-full flex items-center group" ref={sliderRef}>
          <div className="absolute w-full h-1 bg-[#0a0f18] border border-[#1a2435] rounded-full shadow-inner" />
          <div onPointerDown={handleTrackPointerDown} onPointerMove={handleTrackPointerMove} onPointerUp={handleTrackPointerUp} onPointerCancel={handleTrackPointerUp} className={`absolute h-1.5 bg-gradient-to-r from-[#8a6d3b] to-[#C5A059] rounded-full pointer-events-auto touch-none ${isDraggingTrack ? 'cursor-grabbing scale-y-150 brightness-125 shadow-[0_0_12px_rgba(197,160,89,0.5)] z-30' : 'cursor-grab hover:brightness-110 shadow-[0_0_8px_rgba(197,160,89,0.3)] z-10'} transition-[filter,transform,box-shadow]`} style={{ left: `${leftPercent || 0}%`, width: `${widthPercent || 0}%` }} />
          <input type="range" min={safeDomain[0]} max={safeDomain[1]} step={range / 100} value={valMin} onChange={(e) => onChange([Math.min(Number(e.target.value), valMax - range * 0.01), valMax])} className="absolute w-full h-full appearance-none bg-transparent outline-none z-20 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0b1019] [&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-[#C5A059] [&::-webkit-slider-thumb]:rounded-full cursor-ew-resize" />
          <input type="range" min={safeDomain[0]} max={safeDomain[1]} step={range / 100} value={valMax} onChange={(e) => onChange([valMin, Math.max(Number(e.target.value), valMin + range * 0.01)])} className="absolute w-full h-full appearance-none bg-transparent outline-none z-20 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0b1019] [&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-[#C5A059] [&::-webkit-slider-thumb]:rounded-full cursor-ew-resize" />
        </div>
      </div>
    </div>
  );
}

// 🚀 MODAL DE EXPORTAÇÃO
function DataExportModal({ dataset, filters, onClose }: { dataset: any, filters: any[], onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedFiltersString, setAppliedFiltersString] = useState<string>('');

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);

    const fields = dataset.fields || [];
    setHeaders(fields.map((f: any) => f.name));

    const dataContainer = dataset.rawDataset?.dataContainer;
    const allData = dataset.rawDataset?.allData;
    const numRows = dataContainer ? dataContainer.numRows() : (allData ? allData.length : 0);

    const datasetFilters = filters.filter(f => {
      const fDataId = f.dataId?.[0] || f.dataId || (f.get && (f.getIn(['dataId', 0]) || f.get('dataId')));
      return fDataId === dataset.id;
    });

    const filterTexts = datasetFilters.map((f: any) => {
      const fNameArr = f.name || (f.get && f.get('name'));
      const fName = Array.isArray(fNameArr) ? fNameArr[0] : fNameArr?.toArray ? fNameArr.toArray()[0] : fNameArr || '';
      const fType = f.type || (f.get && f.get('type'));
      const fValue = Array.isArray(f.value) ? f.value : f.value?.toArray ? f.value.toArray() : [];
      
      let valStr = '';
      if (fType === 'range') {
        valStr = `${fValue[0]} a ${fValue[1]}`;
      } else {
        valStr = fValue.join(', ');
      }
      return `${fName}: ${valStr}`;
    });
    setAppliedFiltersString(filterTexts.join(' | '));

    const filterRules = datasetFilters.map((f: any) => {
      const fNameArr = f.name || (f.get && f.get('name'));
      const fName = Array.isArray(fNameArr) ? fNameArr[0] : fNameArr?.toArray ? fNameArr.toArray()[0] : fNameArr || '';
      const cIdx = fields.findIndex((col: any) => col.name === fName);
      const fType = f.type || (f.get && f.get('type'));
      const fValue = Array.isArray(f.value) ? f.value : f.value?.toArray ? f.value.toArray() : [];
      return { colIdx: cIdx, type: fType, value: fValue };
    }).filter((r: any) => r.colIdx >= 0);

    const filteredData = [];

    for (let i = 0; i < numRows; i++) {
      let passesFilters = true;

      for (const rule of filterRules) {
        const cellVal = dataContainer ? dataContainer.valueAt(i, rule.colIdx) : allData[i][rule.colIdx];

        if (rule.type === 'multiSelect' || rule.type === 'select') {
          if (rule.value && rule.value.length > 0 && !rule.value.includes(cellVal)) {
            passesFilters = false;
            break;
          }
        } else if (rule.type === 'range') {
          if (rule.value && rule.value.length === 2) {
             if (cellVal < rule.value[0] || cellVal > rule.value[1]) {
               passesFilters = false;
               break;
             }
          }
        }
      }

      if (passesFilters) {
        const rowData = fields.map((_: any, j: number) => dataContainer ? dataContainer.valueAt(i, j) : allData[i][j]);
        filteredData.push(rowData);
      }
    }

    setData(filteredData);
    setLoading(false);

  }, [dataset, filters]);

  const exportCsv = () => {
    if (!data.length) return;
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map((cell: any) => {
          let cellStr = cell !== null && cell !== undefined ? String(cell) : '';
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              cellStr = `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataset.label || 'export'}_filtrado.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportExcel = () => {
    if (!data.length) return;
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dados Filtrados");
      XLSX.writeFile(workbook, `${dataset.label || 'export'}_filtrado.xlsx`);
    } catch (error) {
      console.error("Erro ao exportar para Excel:", error);
      alert("Ocorreu um erro interno ao gerar o arquivo Excel.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#030508]/90 backdrop-blur-md transition-all p-4">
      <div className="flex flex-col w-full max-w-6xl h-[85vh] bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(197,160,89,0.15)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2b3e]/80 bg-gradient-to-r from-[#131c2a] to-[#0a0f18] shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
              <TableIcon />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-medium text-gray-100 tracking-wide">Dados Filtrados: {dataset.label}</h2>
                {!loading && (
                   <span className="px-2.5 py-1 bg-[#1a2435] text-[#8c9fba] text-[10px] rounded-full border border-[#1f2b3e]">
                     {data.length} Linhas
                   </span>
                )}
              </div>
              {appliedFiltersString && (
                <span className="text-[11px] text-[#8c9fba] mt-0.5">
                  Filtros ativos: <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{appliedFiltersString}</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="!text-white hover:!text-[#C5A059] transition-colors p-2 rounded-full hover:!bg-[#1f2b3e]/50 cursor-pointer">
             <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-auto maono-scroll bg-[#0a0f18] relative">
          {loading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-50">
               <div className="w-12 h-12 border-4 border-[#1f2b3e] border-t-[#C5A059] rounded-full animate-spin shadow-[0_0_15px_rgba(197,160,89,0.3)]"></div>
               <span className="text-[#8c9fba] text-xs font-bold tracking-widest uppercase">Aplicando Filtros...</span>
             </div>
          ) : (
            data.length > 0 ? (
              <table className="min-w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr>
                    <th className="w-14 bg-[#161f30] text-[#64748b] text-[10px] font-bold text-center py-3.5 border-b border-r border-[#1f2b3e] sticky left-0 z-30">#</th>
                    {headers.map((header, idx) => (
                      <th key={idx} className="bg-[#131c2a] text-[#8c9fba] text-[10px] font-bold tracking-widest uppercase px-5 py-3.5 border-b border-r border-[#1f2b3e] hover:!bg-[#1a2435] transition-colors max-w-[300px] truncate" title={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-300 font-mono">
                  {data.slice(0, 100).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:!bg-[#131c2a]/60 transition-colors group">
                      <td className="w-14 bg-[#0d141f] text-[#64748b] text-center py-3 border-b border-r border-[#1f2b3e] sticky left-0 z-10 group-hover:!bg-[#161f30] transition-colors">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell: any, cellIndex: number) => {
                        const cellContent = cell !== null && cell !== undefined ? String(cell) : '';
                        const isNull = !cellContent;
                        return (
                          <td key={cellIndex} className={`px-5 py-3 border-b border-r border-[#1f2b3e] max-w-[300px] truncate ${isNull ? '!bg-[#1a2435]/30' : ''}`} title={cellContent}>
                            {isNull ? <span className="text-[#64748b]/40 italic text-[11px]">NULL</span> : cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <div className="flex h-full items-center justify-center text-[#64748b] text-sm">
                 Nenhum dado corresponde aos filtros atuais.
               </div>
            )
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2b3e]/80 bg-[#0a111f] shrink-0">
           <span className="text-xs text-[#64748b] italic">
             {data.length > 100 ? `Exibindo amostra de 100 de ${data.length} linhas` : ''}
           </span>
           <div className="flex items-center gap-4">
             <button onClick={exportCsv} disabled={loading || data.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-[#1f2b3e] hover:!bg-[#2a3a54] !text-white text-xs font-bold rounded-lg uppercase tracking-widest transition-all border border-[#3a4a64] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
               <DownloadIcon /> CSV
             </button>
             <button onClick={exportExcel} disabled={loading || data.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#1D6F42] to-[#124828] hover:brightness-110 !text-white text-xs font-bold rounded-lg uppercase tracking-widest shadow-[0_0_15px_rgba(29,111,66,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
               <ExcelIcon /> Excel (.xlsx)
             </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FilterPanel({ activeTab = 'layers' }: { activeTab?: 'layers' | 'filters' | 'tooltips' }) {
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState<'layers' | 'filters' | 'tooltips'>(activeTab);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [openFillPaletteId, setOpenFillPaletteId] = useState<string | null>(null);
  const [openStrokePaletteId, setOpenStrokePaletteId] = useState<string | null>(null);
  
  const [collapsedLayers, setCollapsedLayers] = useState<Record<string, boolean>>({});
  const [hoveringLayerId, setHoveringLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const [dragOverLayerIdx, setDragOverLayerIdx] = useState<number | null>(null);
  const isDraggingGripRef = useRef<boolean>(false);
  const [collapsedFilterGroups, setCollapsedFilterGroups] = useState<Record<string, boolean>>({});
  const [isAddLayerMenuOpen, setIsAddLayerMenuOpen] = useState(false);
  const addLayerMenuRef = useRef<HTMLDivElement>(null);
  const [isAddFilterMenuOpen, setIsAddFilterMenuOpen] = useState(false);
  const addFilterMenuRef = useRef<HTMLDivElement>(null);
  const [exportingDataset, setExportingDataset] = useState<any | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  // 🚀 ESTADOS DA NOVA ARQUITETURA DE MARCADOR & ISÓCRONAS
  const [markerState, setMarkerState] = useState<'idle' | 'placing' | 'placed'>('idle');
  const [markerOrigin, setMarkerOrigin] = useState<{lat: number, lng: number} | null>(null);
  const [showMarkerMenu, setShowMarkerMenu] = useState(false);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  
  const [showIsoModal, setShowIsoModal] = useState(false);
  const [isoType, setIsoType] = useState<'time' | 'distance'>('time');
  const [isoMode, setIsoMode] = useState<string>('drive_traffic');
  const [isoRanges, setIsoRanges] = useState<string[]>(['10', '20', '30']);

  const [isLoadingIsochrone, setIsLoadingIsochrone] = useState(false);
  const [previewDataId, setPreviewDataId] = useState<string | null>(null);

  const layersRaw = useSelector((state: any) => selectLayers(state, KEPLER_ID));
  const datasetsRaw = useSelector((state: any) => selectDatasets(state, KEPLER_ID));
  const filtersRaw = useSelector((state: any) => selectFilters(state, KEPLER_ID));
  const visState = useSelector((state: any) => selectVisState(state, KEPLER_ID) || {});
  const uiState = useSelector((state: any) => selectUiState(state, KEPLER_ID) || {});
  const mapState = useSelector((state: any) => selectMapState(state, KEPLER_ID)); 

  // 🚀 VARIÁVEL CORRIGIDA: Criada no escopo principal para evitar Crashes!
  const pinDragInfo = useRef({ startX: 0, startY: 0 });

  // 🚀 FEEDBACK VISUAL: Altera o cursor globalmente quando está 'placing'
  useEffect(() => {
    if (markerState === 'placing') {
      const svgStr = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#C5A059" stroke="#0a0f18" stroke-width="1.5"/><circle cx="12" cy="9" r="3" fill="#0a0f18"/></svg>`;
      const pinCursor = `url('data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}') 16 32, crosshair !important`;
      
      document.body.style.setProperty('cursor', pinCursor, 'important');
      const canvases = document.querySelectorAll('.mapboxgl-canvas');
      canvases.forEach(c => (c as HTMLElement).style.setProperty('cursor', pinCursor, 'important'));
    } else {
      document.body.style.removeProperty('cursor');
      const canvases = document.querySelectorAll('.mapboxgl-canvas');
      canvases.forEach(c => (c as HTMLElement).style.removeProperty('cursor'));
    }
    
    return () => { 
      document.body.style.removeProperty('cursor'); 
      const canvases = document.querySelectorAll('.mapboxgl-canvas');
      canvases.forEach(c => (c as HTMLElement).style.removeProperty('cursor'));
    };
  }, [markerState]);

  // 🚀 CAPTURA DO CLIQUE PARA INSERIR O MARCADOR
  const clickStart = useRef({x: 0, y: 0});
  useEffect(() => {
    if (markerState !== 'placing' || !mapState?.width) return;
    
    const onMouseDown = (e: MouseEvent) => { clickStart.current = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = (e: MouseEvent) => {
       if (Math.abs(e.clientX - clickStart.current.x) > 4 || Math.abs(e.clientY - clickStart.current.y) > 4) return;
       const target = e.target as Element;
       if (!target || typeof target.closest !== 'function') return;
       if (target.closest('aside') || target.closest('button')) return;

       try {
         const viewport = new WebMercatorViewport({
            width: mapState.width, height: mapState.height,
            longitude: mapState.longitude || 0, latitude: mapState.latitude || 0,
            zoom: mapState.zoom || 0, pitch: mapState.pitch || 0, bearing: mapState.bearing || 0
         });
         const [lng, lat] = viewport.unproject([e.clientX, e.clientY]);
         if (!isNaN(lng) && !isNaN(lat)) {
             setMarkerOrigin({ lat, lng });
             setMarkerState('placed');
             setShowMarkerMenu(true);
         }
       } catch(err) { console.warn("Falha ao fixar marcador", err); }
    };
    
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
       window.removeEventListener('mousedown', onMouseDown);
       window.removeEventListener('mouseup', onMouseUp);
    };
  }, [markerState, mapState]);

  // Alterna dinamicamente os valores sugeridos dependendo se é Tempo (min) ou Distância (km)
  useEffect(() => {
    if (isoType === 'time') setIsoRanges(['10', '20', '30']);
    else setIsoRanges(['1', '2', '3']);
  }, [isoType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addLayerMenuRef.current && !addLayerMenuRef.current.contains(event.target as Node)) setIsAddLayerMenuOpen(false);
      if (addFilterMenuRef.current && !addFilterMenuRef.current.contains(event.target as Node)) setIsAddFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { 
    if (activeTab) setCurrentTab(activeTab); 
  }, [activeTab]);

  useEffect(() => {
    setCollapsedLayers({});
    setCollapsedFilterGroups({});
  }, [currentTab]);
  
  const interactionConfig = visState.interactionConfig || {};
  const isMapLegendActive = uiState.mapControls?.mapLegend?.active || false;

  let layers: any[] = [];
  try { if (Array.isArray(layersRaw)) layers = layersRaw; else if (layersRaw?.toArray) layers = layersRaw.toArray(); } catch (e) {}
  let filters: any[] = [];
  try { if (Array.isArray(filtersRaw)) filters = filtersRaw; else if (filtersRaw?.toArray) filters = filtersRaw.toArray(); } catch (e) {}

  let layerOrder: string[] = [];
  try {
    const orderRaw = visState.layerOrder;
    layerOrder = Array.isArray(orderRaw) ? orderRaw : orderRaw?.toArray ? orderRaw.toArray() : [];
  } catch (e) {}

  const orderedLayers = useMemo(() => {
    const uiOrder = [...layerOrder]; 
    const mapped = uiOrder.map((id) => layers.find(l => (l.id || l.get?.('id')) === id)).filter(Boolean);
    const unmapped = layers.filter(l => !layerOrder.includes(l.id || l.get?.('id')));
    return [...mapped, ...unmapped];
  }, [layers, layerOrder]);

  const availableDatasets = useMemo(() => {
    const list: any[] = [];
    if (!datasetsRaw) return list;
    const entries = typeof datasetsRaw.entrySeq === 'function' ? datasetsRaw.entrySeq().toArray() : Object.entries(datasetsRaw);
    for (const [dataId, ds] of entries as any) {
      const fields = ds?.fields || ds?.get?.('fields') || [];
      const fieldsArray = Array.isArray(fields) ? fields : fields.toArray ? fields.toArray() : [];
      let datasetLabel = dataId; 
      if (ds) datasetLabel = ds.label || (ds.get && ds.get('label')) || (ds.info && ds.info.label) || (ds.getIn && ds.getIn(['info', 'label'])) || dataId;
      list.push({ id: dataId, label: datasetLabel, fields: fieldsArray, rawDataset: ds });
    }
    return list;
  }, [datasetsRaw]);

  const DATASET_ACCENT_COLORS = ['#C5A059', '#E2D7C1', '#9CA3AF', '#CD9575', '#64748B'];

  const getDatasetAccentColor = (dataId: string) => {
    const index = availableDatasets.findIndex(d => d.id === dataId);
    const safeIndex = Math.max(0, index); 
    return DATASET_ACCENT_COLORS[safeIndex % DATASET_ACCENT_COLORS.length];
  };

  const startEditingLayer = (layerId: string, currentName: string) => { setEditingLayerId(layerId); setEditingLayerName(currentName); };
  const saveLayerName = (layer: any) => {
    if (editingLayerId && editingLayerName.trim() !== '') dispatch(wrapTo(KEPLER_ID, layerConfigChange(layer, { label: editingLayerName })));
    setEditingLayerId(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isDraggingGripRef.current) { e.preventDefault(); return; }
    setDraggedLayerIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isDraggingGripRef.current) setDragOverLayerIdx(index);
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedLayerIdx !== null && draggedLayerIdx !== dropIndex) {
      const currentUiOrder = orderedLayers.map(l => l.id || (l.get && l.get('id')));
      const [movedLayerId] = currentUiOrder.splice(draggedLayerIdx, 1);
      currentUiOrder.splice(dropIndex, 0, movedLayerId);
      dispatch(wrapTo(KEPLER_ID, reorderLayer(currentUiOrder)));
    }
    setDraggedLayerIdx(null);
    setDragOverLayerIdx(null);
    isDraggingGripRef.current = false;
  };
  const handleDragEnd = () => { setDraggedLayerIdx(null); setDragOverLayerIdx(null); isDraggingGripRef.current = false; };

  const handleDuplicateLayer = (layerId: string) => { dispatch(wrapTo(KEPLER_ID, duplicateLayer(layerId))); };
  const handleRemoveLayer = (layerId: string) => { dispatch(wrapTo(KEPLER_ID, removeLayer(layerId))); };
  const toggleLayerCollapse = (layerId: string) => { setCollapsedLayers(prev => ({ ...prev, [layerId]: !(prev[layerId] ?? true) })); };
  const handleToggleVis = (layer: any, currentVis: boolean) => dispatch(wrapTo(KEPLER_ID, layerConfigChange(layer, { isVisible: !currentVis } as any)));
  const handleVisConfigChange = (layer: any, propName: string, value: any) => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { [propName]: value })));
  const handleColorChange = (layer: any, hex: string) => dispatch(wrapTo(KEPLER_ID, layerConfigChange(layer, { color: hexToRgb(hex) } as any)));
  const handleStrokeColorChange = (layer: any, hex: string) => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { strokeColor: hexToRgb(hex) })));

  const handleFillPaletteChange = (layer: any, paletteId: string) => {
    const pal = MAONO_PALETTES.find((p) => p.id === paletteId) || MAONO_PALETTES[0];
    const currentScale = layer.config?.visConfig?.colorScale || 'quantile';
    dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { colorRange: pal, colorScale: currentScale })));
  };
  const handleStrokePaletteChange = (layer: any, paletteId: string) => {
    const pal = MAONO_PALETTES.find((p) => p.id === paletteId) || MAONO_PALETTES[0];
    const currentScale = layer.config?.visConfig?.strokeColorScale || 'quantile';
    dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { strokeColorRange: pal, strokeColorScale: currentScale })));
  };

  const handleFillColorFieldChange = (layer: any, fieldName: string, datasetId: string) => {
    if (!fieldName) { dispatch(wrapTo(KEPLER_ID, layerVisualChannelConfigChange(layer, { colorField: null }, 'color'))); return; }
    const dataset = availableDatasets.find((d) => d.id === datasetId);
    if (!dataset) return;
    const rawField = dataset.fields?.find((f: any) => (f.name || f.get?.('name')) === fieldName);
    if (!rawField) return;
    const isImmutable = typeof rawField.get === 'function';
    const fieldType = isImmutable ? rawField.get('type') : rawField.type;
    const targetScale = (fieldType === 'string' || fieldType === 'boolean') ? 'ordinal' : 'quantile';
    dispatch(wrapTo(KEPLER_ID, layerVisualChannelConfigChange(layer, { colorField: rawField }, 'color')));
    const layerId = layer.id || (layer.get && layer.get('id'));
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      dispatch(wrapTo(KEPLER_ID, layerVisConfigChange({ id: layerId } as any, { colorScale: targetScale, colorRange: MAONO_PALETTES[0] })));
      if (ticks >= 8) clearInterval(interval);
    }, 250);
  };

  const handleStrokeColorFieldChange = (layer: any, fieldName: string, datasetId: string) => {
    if (!fieldName) { dispatch(wrapTo(KEPLER_ID, layerVisualChannelConfigChange(layer, { strokeColorField: null }, 'strokeColor'))); return; }
    const dataset = availableDatasets.find((d) => d.id === datasetId);
    if (!dataset) return;
    const rawField = dataset.fields?.find((f: any) => (f.name || f.get?.('name')) === fieldName);
    if (!rawField) return;
    const isImmutable = typeof rawField.get === 'function';
    const fieldType = isImmutable ? rawField.get('type') : rawField.type;
    const targetScale = (fieldType === 'string' || fieldType === 'boolean') ? 'ordinal' : 'quantile';
    dispatch(wrapTo(KEPLER_ID, layerVisualChannelConfigChange(layer, { strokeColorField: rawField }, 'strokeColor')));
    const layerId = layer.id || (layer.get && layer.get('id'));
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      dispatch(wrapTo(KEPLER_ID, layerVisConfigChange({ id: layerId } as any, { strokeColorScale: targetScale, strokeColorRange: MAONO_PALETTES[0] })));
      if (ticks >= 8) clearInterval(interval);
    }, 250);
  };

  const handleDeleteFilter = (index: number) => { dispatch(wrapTo(KEPLER_ID, removeFilter(index))); };
  const handleFieldChange = (index: number, fieldName: string) => dispatch(wrapTo(KEPLER_ID, setFilter(index, 'name', fieldName, 0)));
  const handleFilterValueChange = (index: number, newValue: any) => dispatch(wrapTo(KEPLER_ID, setFilter(index, 'value', newValue)));

  const handleToggleTooltipField = (datasetId: string, fieldName: string) => {
    const tooltip = interactionConfig.tooltip || {};
    const config = tooltip.config || {};
    const fieldsToShow = config.fieldsToShow || {};
    const currentFields = getPlainFields(fieldsToShow[datasetId]);
    const isShown = currentFields.some((f) => f.name === fieldName);
    const newFields = isShown ? currentFields.filter((f) => f.name !== fieldName) : [...currentFields, { name: fieldName, format: null }];
    dispatch(wrapTo(KEPLER_ID, interactionConfigChange({ id: 'tooltip', enabled: true, config: { ...config, fieldsToShow: { ...fieldsToShow, [datasetId]: newFields } } } as any)));
  };

 // CSS Refinado: Centralização matemática absoluta (mx-auto) e Brilho Intenso
  const getTabClass = (tabName: string) => {
    const isActive = currentTab === tabName;
    return `flex-1 py-4 flex items-center justify-center transition-all relative z-10 outline-none ${ 
      isActive 
        ? '!text-[#C5A059] after:content-[\'\'] after:absolute after:bottom-0 after:inset-x-0 after:mx-auto after:w-8 after:h-[3px] after:bg-[#C5A059] after:rounded-t-md after:shadow-[0_0_12px_2px_rgba(197,160,89,0.9)]' 
        : '!text-[#64748b] hover:!text-gray-400' 
    }`;
  };
 

  // =========================================================================
  // 🚀 LÓGICA REFINADA DE CÁLCULO DE ISÓCRONA (NOVO MODAL)
  // =========================================================================
  const handleCalculateIsochrone = async () => {
    if (!markerOrigin) return;
    setIsLoadingIsochrone(true);

    if (previewDataId) {
      dispatch(wrapTo(KEPLER_ID, removeDataset(previewDataId)));
      setPreviewDataId(null);
    }
    
    const { lat, lng } = markerOrigin;
    const validRanges = isoRanges.filter(v => v.trim() !== '').map(Number).filter(n => !isNaN(n) && n > 0);
    
    if (validRanges.length === 0) {
        alert("Insira pelo menos um intervalo válido.");
        setIsLoadingIsochrone(false);
        return;
    }

    try {
      const promises = validRanges.map(val => {
        // Conversão: Geoapify usa segundos para tempo e metros para distância.
        let rangeVal = isoType === 'time' ? val * 60 : val * 1000;
        
        // Simulação Exata: "Dirigindo com Trânsito" corta 25% do alcance
        if (isoMode === 'drive_traffic') {
            rangeVal = rangeVal * 0.75;
        }
        
        // O modo da API Geoapify ignora o nosso "_traffic" inventado
        const apiMode = isoMode === 'drive_traffic' ? 'drive' : isoMode;

        return fetch(`https://api.geoapify.com/v1/isoline?lat=${lat}&lon=${lng}&type=${isoType}&mode=${apiMode}&range=${rangeVal}&apiKey=88ca5fc7edfa494fbdce9875931e26f5`)
          .then(res => res.json())
          .then(data => ({ data, originalVal: val }));
      });

      const results = await Promise.all(promises);
      
      const polygons = results.flatMap((res) => {
         if (!res.data.features) return [];
         return res.data.features
           .filter((f: any) => f.geometry.type.includes('Polygon'))
           .map((f: any) => ({
             ...f, 
             properties: { 
                 ...f.properties, 
                 range_time: `${res.originalVal} ${isoType === 'time' ? 'Min' : 'Km'}` 
             }
           }));
      });

      if (polygons.length === 0) {
         console.warn("Nenhuma rota encontrada.");
         setIsLoadingIsochrone(false);
         return;
      }

      const originPoint = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { range_time: "Origem" } 
      };

      const geoJsonData = { type: "FeatureCollection", features: [...polygons, originPoint] };
      const dataId = `isochrone_${Date.now()}`;
      
      const modoTextLabel = isoMode === 'drive_traffic' ? 'Com Trânsito' : isoMode === 'walk' ? 'A pé' : isoMode === 'bicycle' ? 'Bike' : 'Carro';

      const isochroneConfig = {
        version: 'v1',
        config: {
          visState: {
            layers: [
              {
                id: `layer_${dataId}`,
                type: 'geojson',
                config: {
                  dataId: dataId,
                  label: `Análise: ${modoTextLabel}`,
                  color: [221, 178, 124], 
                  columns: { geojson: '_geojson' },
                  isVisible: true,
                  visConfig: {
                    opacity: 0.25,
                    filled: true,
                    stroked: true,
                    strokeColor: [193, 123, 62],
                    strokeOpacity: 1,
                    thickness: 1, 
                    radius: 20 
                  }
                }
              }
            ]
          }
        }
      };

      dispatch(wrapTo(KEPLER_ID, addDataToMap({
        datasets: { info: { label: `Análise: ${modoTextLabel}`, id: dataId }, data: processGeojson(geoJsonData) },
        options: { centerMap: true, keepExistingConfig: true },
        config: isochroneConfig
      })));

      setPreviewDataId(dataId);
      setShowIsoModal(false); // Fecha o modal de configuração
      setShowMarkerMenu(false); // Fecha o menu de contexto
      
    } catch (error) {
      console.error("Erro ao gerar isócrona:", error);
    } finally {
      setIsLoadingIsochrone(false);
    }
  };

  // =========================================================================
  // 🚀 SENSOR DE CÂMERA INTELIGENTE 
  // =========================================================================
  const [targetBounds, setTargetBounds] = useState<number[] | null>(null);
  const [centroid, setCentroid] = useState<{lat: number, lng: number} | null>(null);
  const [showCenterButton, setShowCenterButton] = useState(false);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const hasActiveFilter = filters?.some((f: any) => {
        const hasField = f.name || (f.get && f.get('name'));
        const val = f.value || (f.get && f.get('value'));
        const hasValue = Array.isArray(val) ? val.length > 0 : val !== null && val !== undefined && val !== '';
        return hasField && hasValue;
      });

      if (!filters || filters.length === 0 || !hasActiveFilter) {
        setTargetBounds(null);
        setCentroid(null);
        setShowCenterButton(false);
        return;
      }

      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      let hasValidCoords = false;

      const extractGeoJsonCoords = (coords: any) => {
        if (!coords) return;
        if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          const lng = coords[0];
          const lat = coords[1];
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          hasValidCoords = true;
        } else if (Array.isArray(coords)) {
          for (let j = 0; j < coords.length; j++) extractGeoJsonCoords(coords[j]);
        }
      };

      try {
        orderedLayers.forEach((layer: any) => {
          if (!layer.config?.isVisible) return;
          const isPoint = layer.type === 'point';
          const isGeojson = layer.type === 'geojson';
          if (!isPoint && !isGeojson) return;
          const dataId = layer.config.dataId;
          const ds = availableDatasets.find(d => d.id === dataId);
          if (!ds) return;

          let latIdx = -1, lngIdx = -1, geoIdx = -1;

          if (isPoint) {
            const latField = layer.config.columns?.lat?.value || layer.config.columns?.lat;
            const lngField = layer.config.columns?.lng?.value || layer.config.columns?.lng;
            if (latField && lngField) {
              latIdx = ds.fields.findIndex((f: any) => f.name === latField);
              lngIdx = ds.fields.findIndex((f: any) => f.name === lngField);
            }
          } else if (isGeojson) {
            const geoField = layer.config.columns?.geojson?.value || layer.config.columns?.geojson;
            if (geoField) {
              geoIdx = ds.fields.findIndex((f: any) => f.name === geoField);
            }
          }

          if (latIdx < 0 && lngIdx < 0 && geoIdx < 0) return;

          const filteredIdx = ds.rawDataset?.filteredIndex || ds.rawDataset?.allIndexes || [];
          const dataContainer = ds.rawDataset?.dataContainer;
          const allData = ds.rawDataset?.allData;

          for (let i = 0; i < filteredIdx.length; i++) {
            const rowIndex = filteredIdx[i];
            
            if (isPoint && latIdx >= 0 && lngIdx >= 0) {
              const lat = dataContainer ? dataContainer.valueAt(rowIndex, latIdx) : allData[rowIndex][latIdx];
              const lng = dataContainer ? dataContainer.valueAt(rowIndex, lngIdx) : allData[rowIndex][lngIdx];
              if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                hasValidCoords = true;
              }
            } else if (isGeojson && geoIdx >= 0) {
              const geoData = dataContainer ? dataContainer.valueAt(rowIndex, geoIdx) : allData[rowIndex][geoIdx];
              if (geoData) {
                let geomObj = geoData;
                if (typeof geoData === 'string') {
                  try { geomObj = JSON.parse(geoData); } catch (e) { continue; }
                }
                if (geomObj?.geometry?.coordinates) extractGeoJsonCoords(geomObj.geometry.coordinates);
                else if (geomObj?.coordinates) extractGeoJsonCoords(geomObj.coordinates);
                else if (Array.isArray(geomObj)) extractGeoJsonCoords(geomObj);
              }
            }
          }
        });

        if (hasValidCoords) {
          if (minLat === maxLat) { minLat -= 0.02; maxLat += 0.02; }
          if (minLng === maxLng) { minLng -= 0.02; maxLng += 0.02; }
          setTargetBounds([minLng, minLat, maxLng, maxLat]);
          setCentroid({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });
          setShowCenterButton(true); 
        } else {
          setTargetBounds(null);
          setCentroid(null);
          setShowCenterButton(false);
        }
      } catch (err) {}
    }, 600);
    return () => clearTimeout(debounceTimer);
  }, [filters, orderedLayers, availableDatasets]);

  useEffect(() => {
    if (!centroid || !targetBounds || !mapState || !mapState.width || !mapState.height || showCenterButton || isFlying) return;

    try {
      const viewport = new WebMercatorViewport({
        width: mapState.width,
        height: mapState.height,
        longitude: mapState.longitude,
        latitude: mapState.latitude,
        zoom: mapState.zoom,
        pitch: mapState.pitch,
        bearing: mapState.bearing
      });

      const [x, y] = viewport.project([centroid.lng, centroid.lat]);
      const marginX = mapState.width * 0.15;
      const marginY = mapState.height * 0.15;
      const isOutside = x < marginX || x > (mapState.width - marginX) || y < marginY || y > (mapState.height - marginY);

      const [minLng, minLat, maxLng, maxLat] = targetBounds;
      const idealViewport = viewport.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 100 });
      const zoomDiff = Math.abs(mapState.zoom - idealViewport.zoom);
      const isZoomChanged = zoomDiff > 0.8;

      if (isOutside || isZoomChanged) {
        setShowCenterButton(true);
      }
    } catch (error) {}
  }, [mapState?.latitude, mapState?.longitude, mapState?.zoom, centroid, targetBounds, showCenterButton, isFlying]);

  return (
    <aside className="relative flex flex-col w-full h-full min-h-0 bg-gradient-to-b from-[#0a111f] to-[#030508] text-white overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#1a2b45] rounded-full blur-[140px] opacity-30 pointer-events-none z-0" />

     {/* 🚀 ABAS COM ÍCONES E TOOLTIPS NATIVOS MANTIDOS */}
      <div className="relative flex bg-transparent border-b border-[#1f2b3e]/60 shrink-0 px-2 z-10">
        <button onClick={() => setCurrentTab('layers')} className={getTabClass('layers')} title="Camadas">
          <LayersTabIcon />
        </button>
        <button onClick={() => setCurrentTab('filters')} className={getTabClass('filters')} title="Filtros">
          <FiltersTabIcon />
        </button>
        <button onClick={() => setCurrentTab('tooltips')} className={getTabClass('tooltips')} title="Tooltips">
          <TooltipsTabIcon />
        </button>
      </div>

      <div className="relative flex flex-col gap-8 overflow-y-auto maono-scroll p-6 flex-1 min-h-0 touch-pan-y z-10">
        
        {currentTab === 'layers' && (
          <div className="flex flex-col gap-6 pb-6">
            <div className="flex flex-col gap-3 border-b border-[#1f2b3e]/60 pb-5">
              {/* 🚀 SUBSTITUIÇÃO 2: TÍTULO REMOVIDO E ALINHADO À DIREITA (justify-end) */}
              <div className="flex items-center justify-end">
                <div className="relative z-[999]" ref={addLayerMenuRef}>
                  <button 
                    onClick={() => setIsAddLayerMenuOpen(!isAddLayerMenuOpen)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0E8A5E] hover:bg-[#11A872] !text-white text-xs font-medium rounded shadow-[0_0_10px_rgba(14,138,94,0.3)] transition-all"
                  >
                    <span className="text-lg leading-none mb-0.5">+</span> Add Camada
                  </button>
                  {isAddLayerMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0f18] border border-[#1f2b3e] rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#131c2a] border-b border-[#1f2b3e]/60">
                        <span className="text-[9px] font-bold text-[#8c9fba] uppercase tracking-widest">Selecione os Dados</span>
                      </div>
                      <div className="flex flex-col max-h-48 overflow-y-auto maono-scroll py-1">
                        {availableDatasets.length > 0 ? (
                          availableDatasets.map((ds) => (
                            <button
                              key={ds.id}
                              onClick={() => {
                                const datasetFields = ds.fields || [];
                                let layerType = 'point'; 
                                let columnsConfig: any = {};
                                const geojsonField = datasetFields.find((f: any) => f.type === 'geojson' || String(f.name).toLowerCase() === '_geojson' || String(f.name).toLowerCase() === 'geometry');
                                if (geojsonField) {
                                  layerType = 'geojson';
                                  columnsConfig = { geojson: geojsonField.name };
                                } else {
                                  const latRegex = /^(lat|latitude|_lat|_latitude|y)$/i;
                                  const lngRegex = /^(lon|lng|longitude|_lon|_lng|_longitude|x)$/i;
                                  const latField = datasetFields.find((f: any) => (f.type === 'real' || f.type === 'integer') && latRegex.test(f.name));
                                  const lngField = datasetFields.find((f: any) => (f.type === 'real' || f.type === 'integer') && lngRegex.test(f.name));
                                  if (latField && lngField) {
                                    layerType = 'point';
                                    columnsConfig = { lat: latField.name, lng: lngField.name, altitude: null };
                                  }
                                }
                                dispatch(wrapTo(KEPLER_ID, addLayer({
                                  id: `layer_${Date.now()}`, type: layerType, 
                                  config: { dataId: ds.id, label: ds.label, isVisible: true, columns: columnsConfig, color: [197, 160, 89], visConfig: { filled: true, opacity: 0.8, stroked: true } }
                                })));
                                setIsAddLayerMenuOpen(false); 
                              }}
                              className="w-full text-left px-4 py-3 text-xs text-gray-200 hover:text-[#C5A059] hover:bg-[#131c2a] transition-colors truncate border-b border-[#1f2b3e]/30 last:border-0"
                              title={ds.label}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDatasetAccentColor(ds.id) }} />
                                <span className="truncate">{ds.label}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-gray-500 italic text-center">Nenhum dado importado.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {orderedLayers.map((layer: any, index: number) => {
              const config = layer.config || layer.get?.('config');
              const vis = config?.visConfig;
              const dataId = config?.dataId;
              const layerDataset = availableDatasets.find((d) => d.id === dataId);
              const layerId = layer.id || (layer.get && layer.get('id')) || String(index);
              const layerType = layer.type || (layer.get && layer.get('type')) || 'geojson';
              const isLayerVisible = config?.isVisible ?? true;
              const isCollapsed = collapsedLayers[layerId] ?? true; 
              const filled = vis?.filled ?? true;
              const fillOpacity = vis?.opacity ?? 0.8;
              const fillHexColor = Array.isArray(config?.color) ? rgbToHex(config.color[0], config.color[1], config.color[2]) : '#ff0000';
              const fillColorFieldName = config?.colorField?.name || '';
              const fillColorScale = vis?.colorScale || 'quantile';
              const fillColorsArray = getSafeColors(vis?.colorRange);
              const stroked = vis?.stroked ?? false;
              const thickness = vis?.thickness ?? 1;
              const strokeHexColor = Array.isArray(vis?.strokeColor) ? rgbToHex(vis.strokeColor[0], vis.strokeColor[1], vis.strokeColor[2]) : '#000000';
              const strokeColorFieldName = config?.strokeColorField?.name || '';
              const strokeColorScale = vis?.strokeColorScale || 'quantile';
              const strokeColorsArray = getSafeColors(vis?.strokeColorRange);
              const dropdownOptions = (layerDataset && layerDataset.fields && layerDataset.fields.length > 0)
                ? [ { label: 'Fixo (Sem Coluna)', value: '' }, ...layerDataset.fields.map((f: any) => ({ label: f.name || (f.get && f.get('name')), value: f.name || (f.get && f.get('name')) })) ]
                : [];
              const accentColor = getDatasetAccentColor(dataId);
              let dragBorderClass = 'border-[#1f2b3e]';
              if (dragOverLayerIdx === index) dragBorderClass = draggedLayerIdx !== null && draggedLayerIdx > index ? 'border-t-[#C5A059] border-t-2' : 'border-b-[#C5A059] border-b-2';
              else if (isLayerVisible) dragBorderClass = 'border-y-[#1f2b3e] border-r-[#1f2b3e]';
              else dragBorderClass = 'border-[#1f2b3e] opacity-60';
              const hasActiveFilters = filters.some(f => {
                const fDataId = f.dataId?.[0] || f.dataId || (f.get && (f.getIn(['dataId', 0]) || f.get('dataId')));
                return fDataId === dataId;
              });
              return (
                <div key={layerId} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd}
                  className={`group relative flex flex-col bg-gradient-to-b from-[#131c2a] to-[#0b1019] rounded border ${dragBorderClass} shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_25px_rgba(0,0,0,0.4)] transition-all duration-300 ${draggedLayerIdx === index ? 'opacity-40 scale-95' : ''}`}
                  onMouseEnter={() => setHoveringLayerId(layerId)} onMouseLeave={() => setHoveringLayerId(null)}
                >
                  <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l transition-opacity ${isLayerVisible ? 'opacity-100' : 'opacity-50'} z-10`} style={{ backgroundColor: accentColor }}></div>
                  <div className="relative flex items-center justify-between py-3 pr-4 cursor-pointer hover:bg-[#1a2435]/50 transition-colors">
                    <div className="w-8 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 cursor-grab text-[#64748b] hover:text-white transition-opacity" onMouseDown={() => { isDraggingGripRef.current = true; }} onMouseUp={() => { isDraggingGripRef.current = false; }} onMouseLeave={() => { isDraggingGripRef.current = false; }}>
                      <svg className="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="9" cy="18" r="2"></circle><circle cx="15" cy="6" r="2"></circle><circle cx="15" cy="12" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 pr-2" onClick={() => toggleLayerCollapse(layerId)}>
                      {editingLayerId === layerId ? (
                        <input type="text" value={editingLayerName} onChange={(e) => setEditingLayerName(e.target.value)} onBlur={() => saveLayerName(layer)} onKeyDown={(e) => { if (e.key === 'Enter') saveLayerName(layer); }} autoFocus className="bg-[#0a0f18] border border-[#C5A059] text-xs text-gray-200 px-2 py-0.5 rounded outline-none w-full max-w-[180px] shadow-[0_0_8px_rgba(197,160,89,0.3)]" onClick={(e) => e.stopPropagation()} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold tracking-wide truncate ${isLayerVisible ? 'text-gray-200' : 'text-gray-500'}`}>{config?.label || 'Nova Camada'}</span>
                          <button onClick={(e) => { e.stopPropagation(); startEditingLayer(layerId, config?.label || ''); }} className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-[#C5A059] transition-all shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        </div>
                      )}
                      <span className="text-[9px] text-gray-500 capitalize mt-0.5">{layerType}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1 transition-opacity duration-200 ${hoveringLayerId === layerId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                         {hasActiveFilters && layerDataset && (
                          <button onClick={(e) => { e.stopPropagation(); setExportingDataset(layerDataset); }} className="text-[#C5A059] hover:text-white transition-colors p-1 rounded" title="Baixar Dados Filtrados">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateLayer(layerId); }} className="text-[#64748b] hover:text-white transition-colors p-1 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveLayer(layerId); }} className="text-[#64748b] hover:text-red-400 transition-colors p-1 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleVis(layer, isLayerVisible); }} className="text-[#64748b] hover:text-white transition-colors p-1 ml-1 rounded">
                        {isLayerVisible ? (<svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>) : (<svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>)}
                      </button>
                      <svg onClick={() => toggleLayerCollapse(layerId)} className={`w-4 h-4 text-[#64748b] transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1200px] opacity-100'}`}>
                    {dropdownOptions.length > 0 ? (
                      <div className="relative p-5 flex flex-col gap-7 border-t border-[#1f2b3e]/40 z-10 overflow-visible">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#8c9fba]">Preenchimento</span>
                            <button onClick={() => handleVisConfigChange(layer, 'filled', !filled)} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-all ${ filled ? 'bg-gradient-to-r from-[#8a6d3b] to-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.3)]' : 'bg-[#161f30]' }`}>
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${ filled ? 'translate-x-4' : 'translate-x-1' }`} />
                            </button>
                          </div>
                          {filled && (
                            <div className="flex flex-col gap-5">
                              <div className="flex items-center gap-4">
                                <input type="color" value={fillHexColor} onChange={(e) => handleColorChange(layer, e.target.value)} className={`w-7 h-7 rounded border border-[#1f2b3e] cursor-pointer bg-[#0a0f18] p-0.5 ${ fillColorFieldName ? 'opacity-30 pointer-events-none' : '' }`} />
                                <div className="flex-1 flex flex-col gap-1.5">
                                  <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Opacidade</span>
                                  <input type="range" min="0" max="1" step="0.05" value={fillOpacity} onChange={(e) => handleVisConfigChange(layer, 'opacity', parseFloat(e.target.value))} className="w-full h-1 bg-[#1a2435] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[#0b1019] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#C5A059] [&::-webkit-slider-thumb]:rounded-full shadow-lg" />
                                </div>
                              </div>
                              <div className="flex flex-col gap-4 pt-4 border-t border-[#1f2b3e]/40">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Colorir por Coluna</span>
                                  <MaonoDropdown value={fillColorFieldName} options={dropdownOptions} onChange={(v: string) => handleFillColorFieldChange(layer, v, dataId)} placeholder="Fixo (Sem Coluna)" />
                                </div>
                                {fillColorFieldName && (
                                  <>
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Escala da Cor</span>
                                      <MaonoDropdown value={fillColorScale} options={[{ label: 'Quantile (Distribuição)', value: 'quantile' }, { label: 'Quantize (Intervalos Iguais)', value: 'quantize' }, { label: 'Linear (Contínua)', value: 'linear' }, { label: 'Ordinal (Texto/Categorias)', value: 'ordinal' }]} onChange={(v: string) => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { colorScale: v })))} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 relative">
                                      <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Paleta de Cores</span>
                                      <div onClick={() => setOpenFillPaletteId(openFillPaletteId === layerId ? null : layerId)} className="flex h-6 w-full cursor-pointer rounded-lg border border-[#1a2435] overflow-hidden hover:border-[#C5A059]/50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] transition-all">
                                        {fillColorsArray.map((c: string, i: number) => (<div key={i} style={{ backgroundColor: c, flex: 1 }} />))}
                                      </div>
                                      {openFillPaletteId === layerId && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setOpenFillPaletteId(null)} />
                                          <div className="absolute top-12 left-0 w-full z-50 bg-[#0a0f18] border border-[#1f2b3e] rounded-xl shadow-2xl overflow-hidden">
                                            <div className="max-h-48 overflow-y-auto maono-scroll">
                                              {MAONO_PALETTES.map((pal) => (
                                                <div key={pal.id} onClick={() => { handleFillPaletteChange(layer, pal.id); setOpenFillPaletteId(null); }} className="flex flex-col px-4 py-3 hover:bg-[#131c2a] cursor-pointer border-b border-[#1f2b3e]/50 last:border-0">
                                                  <span className="text-[10px] font-medium text-[#8c9fba] mb-2">{pal.name}</span>
                                                  <div className="flex h-2.5 w-full rounded overflow-hidden">{pal.colors.map((c, i) => <div key={i} style={{ backgroundColor: c, flex: 1 }} />)}</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-4 pt-5 border-t border-[#1f2b3e]/40">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#8c9fba]">Contorno das Bordas</span>
                            <button onClick={() => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { stroked: !stroked })))} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-all ${ stroked ? 'bg-gradient-to-r from-[#8a6d3b] to-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.3)]' : 'bg-[#161f30]' }`}>
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${ stroked ? 'translate-x-4' : 'translate-x-1' }`} />
                            </button>
                          </div>
                          {stroked && (
                            <div className="flex flex-col gap-5">
                              <div className="flex items-center gap-4">
                                <input type="color" value={strokeHexColor} onChange={(e) => handleStrokeColorChange(layer, e.target.value)} className={`w-7 h-7 rounded border border-[#1f2b3e] cursor-pointer bg-[#0a0f18] p-0.5 ${ strokeColorFieldName ? 'opacity-30 pointer-events-none' : '' }`} />
                                <div className="flex-1 flex flex-col gap-1.5">
                                  <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Espessura</span>
                                  <input type="range" min="0.1" max="10" step="0.1" value={thickness} onChange={(e) => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { thickness: parseFloat(e.target.value) })))} className="w-full h-1 bg-[#1a2435] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[#0b1019] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#C5A059] [&::-webkit-slider-thumb]:rounded-full shadow-lg" />
                                </div>
                              </div>
                              <div className="flex flex-col gap-4 pt-4 border-t border-[#1f2b3e]/40">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Contorno por Coluna</span>
                                  <MaonoDropdown value={strokeColorFieldName} options={dropdownOptions} onChange={(v: string) => handleStrokeColorFieldChange(layer, v, dataId)} placeholder="Fixo (Sem Coluna)" />
                                </div>
                                {strokeColorFieldName && (
                                  <>
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Escala da Cor (Borda)</span>
                                      <MaonoDropdown value={strokeColorScale} options={[{ label: 'Quantile (Distribuição)', value: 'quantile' }, { label: 'Quantize (Intervalos Iguais)', value: 'quantize' }, { label: 'Linear (Contínua)', value: 'linear' }, { label: 'Ordinal (Texto/Categorias)', value: 'ordinal' }]} onChange={(v: string) => dispatch(wrapTo(KEPLER_ID, layerVisConfigChange(layer, { strokeColorScale: v })))} />
                                    </div>
                                    <div className="flex flex-col gap-1.5 relative">
                                      <span className="text-[9px] text-[#64748b] uppercase tracking-widest">Paleta de Cores (Borda)</span>
                                      <div onClick={() => setOpenStrokePaletteId(openStrokePaletteId === layerId ? null : layerId)} className="flex h-6 w-full cursor-pointer rounded-lg border border-[#1a2435] overflow-hidden hover:border-[#C5A059]/50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] transition-all">
                                        {strokeColorsArray.map((c: string, i: number) => (<div key={i} style={{ backgroundColor: c, flex: 1 }} />))}
                                      </div>
                                      {openStrokePaletteId === layerId && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setOpenStrokePaletteId(null)} />
                                          <div className="absolute top-12 left-0 w-full z-50 bg-[#0a0f18] border border-[#1f2b3e] rounded-xl shadow-2xl overflow-hidden">
                                            <div className="max-h-48 overflow-y-auto maono-scroll">
                                              {MAONO_PALETTES.map((pal) => (
                                                <div key={pal.id} onClick={() => { handleStrokePaletteChange(layer, pal.id); setOpenStrokePaletteId(null); }} className="flex flex-col px-4 py-3 hover:bg-[#131c2a] cursor-pointer border-b border-[#1f2b3e]/50 last:border-0">
                                                  <span className="text-[10px] font-medium text-[#8c9fba] mb-2">{pal.name}</span>
                                                  <div className="flex h-2.5 w-full rounded overflow-hidden">{pal.colors.map((c, i) => <div key={i} style={{ backgroundColor: c, flex: 1 }} />)}</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 text-center text-xs text-[#8c9fba] italic bg-[#0a0f18]/50">Processando dados da camada...</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentTab === 'filters' && (
          <div className="flex flex-col gap-6 pb-6">
            <div className="relative z-50" ref={addFilterMenuRef}>
              <button onClick={() => setIsAddFilterMenuOpen(!isAddFilterMenuOpen)} className="w-full py-4 bg-gradient-to-b from-[#172233] to-[#0d141f] border border-[#C5A059]/20 shadow-lg hover:border-[#C5A059]/50 rounded-xl text-[#C5A059] font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 group">
                <span className="text-lg leading-none font-light group-hover:scale-110 transition-transform">+</span> Adicionar Novo Filtro
              </button>
              {isAddFilterMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#0a0f18] border border-[#1f2b3e] rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#131c2a] border-b border-[#1f2b3e]/60"><span className="text-[9px] font-bold text-[#8c9fba] uppercase tracking-widest">Filtrar qual Base de Dados?</span></div>
                  <div className="flex flex-col max-h-48 overflow-y-auto maono-scroll py-1">
                    {availableDatasets.length > 0 ? (
                      availableDatasets.map((ds) => (
                        <button key={ds.id} onClick={() => { dispatch(wrapTo(KEPLER_ID, addFilter(ds.id))); setIsAddFilterMenuOpen(false); setCollapsedFilterGroups(prev => ({ ...prev, [ds.id]: false })); }} className="w-full text-left px-4 py-3 text-xs text-gray-200 hover:text-[#C5A059] hover:bg-[#131c2a] transition-colors truncate border-b border-[#1f2b3e]/30 last:border-0">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDatasetAccentColor(ds.id) }} /><span className="truncate">{ds.label}</span></div>
                        </button>
                      ))
                    ) : (<div className="px-4 py-3 text-xs text-gray-500 italic text-center">Nenhum dado disponível.</div>)}
                  </div>
                </div>
              )}
            </div>
            {availableDatasets.map((ds) => {
              const dsFilters = filters.map((f: any, i: number) => ({ filter: f, absoluteIndex: i })).filter(({ filter }) => {
                const dataId = filter.dataId?.[0] || filter.dataId || (filter.get && (filter.getIn(['dataId', 0]) || filter.get('dataId')));
                return dataId === ds.id;
              });
              if (dsFilters.length === 0) return null; 
              const isGroupCollapsed = collapsedFilterGroups[ds.id] ?? true; 
              const accentColor = getDatasetAccentColor(ds.id); 
              return (
                <div key={ds.id} className="flex flex-col border border-[#1f2b3e]/60 rounded-xl bg-[#0a0f18]/30 overflow-hidden shadow-lg">
                  <div onClick={() => setCollapsedFilterGroups(prev => ({ ...prev, [ds.id]: !(prev[ds.id] ?? true) }))} className="flex items-center justify-between p-4 bg-gradient-to-b from-[#131c2a] to-[#0b1019] border-b border-[#1f2b3e]/60 cursor-pointer hover:bg-[#1a2435]/50 transition-colors">
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: accentColor }} />
                      <span className="text-[11px] font-bold tracking-widest truncate" style={{ color: accentColor }}>{ds.label}</span>
                      <span className="text-[10px] bg-[#1a2435] text-[#8c9fba] px-2 py-0.5 rounded-full ml-1 shrink-0">{dsFilters.length}</span>
                    </div>
                    <svg className={`w-4 h-4 text-[#64748b] transition-transform duration-300 shrink-0 ${isGroupCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isGroupCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                    <div className="p-4 flex flex-col gap-6">
                      {dsFilters.map(({ filter, absoluteIndex }) => {
                        const filterType = filter.type || (filter.get && filter.get('type'));
                        const domain = Array.isArray(filter.domain) ? filter.domain : filter.domain?.toArray ? filter.domain.toArray() : [];
                        const value = Array.isArray(filter.value) ? filter.value : filter.value?.toArray ? filter.value.toArray() : [];
                        const columns = ds.fields || [];
                        const dropdownOptions = columns.map((col: any) => ({ label: col.name || (col.get && col.get('name')), value: col.name || (col.get && col.get('name')) }));
                        const currentFieldArr = filter.name || (filter.get && filter.get('name'));
                        const currentField = Array.isArray(currentFieldArr) ? currentFieldArr[0] : currentFieldArr?.toArray ? currentFieldArr.toArray()[0] : currentFieldArr || '';
                        const filterId = filter.id || (filter.get && filter.get('id')) || String(absoluteIndex);
                        return (
                          <div key={filterId} className="relative bg-gradient-to-b from-[#131c2a] to-[#0b1019] rounded-lg border border-[#1f2b3e] p-4 shadow-md">
                            <div className="relative flex items-center justify-between mb-4 pb-2 z-10 border-b border-[#1f2b3e]/40">
                              <span className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase">Propriedade do Filtro</span>
                              <button onClick={() => handleDeleteFilter(absoluteIndex)} className="text-[#64748b] hover:text-red-400 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                            <div className="relative mb-5 z-10"><MaonoDropdown value={currentField} options={dropdownOptions} onChange={(v: string) => handleFieldChange(absoluteIndex, v)} placeholder="Selecione uma coluna..." /></div>
                            {filterType === 'range' && domain.length >= 2 && (<RangeFilterBlock filterIndex={absoluteIndex} domain={domain} value={value} dataset={ds} currentField={currentField} onChange={(nextValue: any) => handleFilterValueChange(absoluteIndex, nextValue)} allFilters={filters} />)}
                            {['multiSelect', 'select'].includes(filterType) && domain.length > 0 && (
                              <div className="relative flex flex-col gap-4 z-10 mt-1">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input type="text" placeholder="Pesquisar categoria..." value={searchQueries[absoluteIndex] || ''} onChange={(e) => setSearchQueries((prev) => ({ ...prev, [absoluteIndex]: e.target.value }))} className="w-full bg-[#131c2a] border border-[#2a3a54] shadow-[0_2px_5px_rgba(0,0,0,0.2)] focus:border-[#C5A059]/60 !text-white text-xs rounded-lg p-3 pl-9 outline-none transition-all" />
                                    <svg className="w-4 h-4 absolute left-3 top-3.5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  </div>
                                  {value && value.length > 0 && (
                                    <button onClick={() => handleFilterValueChange(absoluteIndex, [])} className="flex items-center justify-center p-3 bg-[#131c2a] border border-[#2a3a54] hover:border-[#ef4444] text-[#64748b] hover:text-[#ef4444] rounded-lg transition-all shadow-sm group" title="Limpar todas as seleções">
                                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-col max-h-48 overflow-y-auto maono-scroll pr-2 border-y border-[#1f2b3e]/40 py-2">
                                  {domain.filter((itemValue: any) => { 
                                      const search = (searchQueries[absoluteIndex] || '').toLowerCase(); 
                                      return !search ? true : String(itemValue).toLowerCase().includes(search); 
                                    })
                                    .sort((a: any, b: any) => {
                                      const aChecked = value.includes(a);
                                      const bChecked = value.includes(b);
                                      if (aChecked === bChecked) return String(a).localeCompare(String(b));
                                      return aChecked ? -1 : 1;
                                    })
                                    .map((itemValue: any, itemIdx: number) => {
                                      const valString = itemValue !== null && itemValue !== undefined ? String(itemValue) : '';
                                      if (!valString) return null;
                                      const isChecked = value.includes(itemValue);
                                      return (
                                        <label key={`${valString}-${itemIdx}`} className="flex items-center gap-3 text-xs !text-white hover:text-[#C5A059] cursor-pointer select-none py-2 px-2 rounded-lg hover:bg-[#1a2435] transition-all">
                                          <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-all ${isChecked ? 'border-[#C5A059] bg-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.5)]' : 'border-[#2a3a54] bg-[#0a0f18] shadow-inner'}`}>
                                            {isChecked && <svg className="w-3.5 h-3.5 text-[#0a0f18]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                          </div>
                                          <input type="checkbox" checked={isChecked} onChange={(e) => { let nextValue = [...value]; if (e.target.checked) nextValue.push(itemValue); else nextValue = nextValue.filter((v: any) => v !== itemValue); handleFilterValueChange(absoluteIndex, nextValue); }} className="hidden" />
                                          <span className={`truncate pt-0.5 transition-colors ${isChecked ? 'text-[#C5A059] font-bold' : ''}`}>{valString}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {currentTab === 'tooltips' && (
          <div className="flex flex-col gap-4 pb-6">
            {availableDatasets.map((dataset) => {
              const tooltipConf = interactionConfig?.tooltip?.config || (interactionConfig?.tooltip?.get && interactionConfig.tooltip.get('config'));
              const fieldsToShow = tooltipConf?.fieldsToShow || (tooltipConf?.get && tooltipConf.get('fieldsToShow')) || {};
              const datasetFields = fieldsToShow[dataset.id] || (fieldsToShow.get && fieldsToShow.get(dataset.id));
              const activeFields = getPlainFields(datasetFields);
              const accentColor = getDatasetAccentColor(dataset.id);
              return (
                <div key={dataset.id} className="relative flex flex-col bg-gradient-to-b from-[#131c2a] to-[#0b1019] rounded-xl border border-[#1f2b3e] shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2.5 p-4 border-b border-[#1f2b3e]/60 bg-[#0a0f18]/50">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: accentColor }} />
                    <span className="text-[11px] font-bold tracking-widest truncate" style={{ color: accentColor }}>{dataset.label}</span>
                  </div>
                  <div className="relative z-10 max-h-[500px] overflow-y-auto maono-scroll p-4 pt-2">
                    {dataset.fields.map((f: any) => {
                      const fieldName = f.name || (f.get && f.get('name'));
                      const isShown = activeFields.some((af: any) => af.name === fieldName);
                      return (
                        <div key={fieldName} className="relative flex items-center justify-between py-2.5 border-b border-[#1f2b3e]/30 last:border-0 group">
                          <span className="text-xs text-[#8c9fba] truncate pr-2 group-hover:text-white transition-colors">{fieldName}</span>
                          <button onClick={() => handleToggleTooltipField(dataset.id, fieldName)} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-all shrink-0 ${isShown ? 'bg-gradient-to-r from-[#8a6d3b] to-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.3)]' : 'bg-[#161f30] shadow-inner'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isShown ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 🚀 BOTÃO VOO SÍNCRONO */}
      {showCenterButton && targetBounds && createPortal(
        <div className="fixed top-20 z-[99999]" style={{ left: 'calc(50% + 140px)', transform: 'translateX(-50%)' }}>
          <div 
            onClick={() => {
              if (isFlying || !mapState?.width || !mapState?.height) return;
              setIsFlying(true); 

              const startLng = mapState.longitude;
              const startLat = mapState.latitude;
              const startZoom = mapState.zoom;

              const viewport = new WebMercatorViewport({ width: mapState.width, height: mapState.height });
              const [minLng, minLat, maxLng, maxLat] = targetBounds;
              const fitted = viewport.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 120 });
              
              const endLng = fitted.longitude;
              const endLat = fitted.latitude;
              const endZoom = Math.max(0, fitted.zoom - 0.5);

              const duration = 2000; 
              const startTime = performance.now();

              const animateCamera = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                let progress = elapsed / duration;
                if (progress > 1) progress = 1;

                const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                const currentLng = startLng + (endLng - startLng) * ease;
                const currentLat = startLat + (endLat - startLat) * ease;
                const currentZoom = startZoom + (endZoom - startZoom) * ease;

                dispatch(wrapTo(KEPLER_ID, updateMap({
                  longitude: currentLng,
                  latitude: currentLat,
                  zoom: currentZoom
                })));

                if (progress < 1) {
                  requestAnimationFrame(animateCamera);
                } else {
                  setShowCenterButton(false);
                  setIsFlying(false);
                }
              };
              requestAnimationFrame(animateCamera);
            }}
            role="button"
            style={{ backgroundColor: '#C5A059', color: '#0a0f18', border: '2px solid #dfb96f', boxShadow: '0 15px 40px rgba(197,160,89,0.5)' }}
            className={`flex items-center gap-3 px-8 py-3.5 text-sm font-extrabold uppercase tracking-widest rounded-full transition-all duration-300 transform group ${isFlying ? 'opacity-70 scale-95 pointer-events-none cursor-wait' : 'opacity-100 hover:brightness-110 hover:-translate-y-1 cursor-pointer'}`}
          >
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#0a0f18]/20 transition-colors">
              <svg style={{ color: '#0a0f18' }} className={`w-4 h-4 transition-transform ${isFlying ? 'animate-spin' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFlying ? ( <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> ) : ( <> <circle cx="12" cy="12" r="3" strokeWidth="2.5" /> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 2v3m0 14v3m10-10h-3M5 12H2" /> </> )}
              </svg>
            </div>
            <span style={{ color: '#0a0f18' }}>{isFlying ? "Centralizando..." : "Centralizar Resultados"}</span>
          </div>
        </div>,
        document.body
      )}

      {/* 🚀 CONTROLES FLUTUANTES DIRETOS */}
      {createPortal(
        <div className="fixed bottom-10 right-6 z-[9999] flex flex-col items-end gap-4 pointer-events-none">
          
          <button 
            onClick={() => dispatch(wrapTo(KEPLER_ID, toggleMapControl('mapLegend')))} 
            className={`pointer-events-auto w-12 h-12 flex items-center justify-center rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] border transition-all duration-300 ${isMapLegendActive ? 'bg-[#C5A059] border-[#dfb96f] text-[#0a0f18] scale-105' : 'bg-[#131c2a] border-[#1f2b3e] text-[#C5A059] hover:text-[#dfb96f] hover:border-[#C5A059] hover:bg-[#1a2435]'}`} 
            title="Mostrar Legenda"
          >
             <LegendMapIcon />
          </button>

          {/* 🚀 NOVO BOTÃO: Inserir Marcador (TOGGLE FIXO) */}
          <div className="flex flex-col items-end gap-4 pointer-events-auto relative">
            {!previewDataId && (
              <button 
                onClick={() => {
                   if (markerState === 'placing') {
                      setMarkerState('idle');
                   } else {
                      setMarkerState('placing');
                      setShowMarkerMenu(false);
                   }
                }} 
                className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] border transition-all duration-300 ${markerState === 'placing' ? 'bg-[#C5A059] border-[#dfb96f] text-[#0a0f18] scale-105' : 'bg-[#131c2a] border-[#1f2b3e] text-[#C5A059] hover:text-[#dfb96f] hover:border-[#C5A059] hover:bg-[#1a2435]'}`}
                title={markerState === 'placing' ? 'Cancelar inserção' : 'Inserir Marcador no Mapa'}
              >
                <PinMarkerIcon />
              </button>
            )}

            {/* Painel de Salvar/Descartar */}
            {previewDataId && (
              <div className="w-[280px] bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl shadow-2xl p-4 flex flex-col gap-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-gray-100 tracking-wide flex items-center gap-2">
                    <IsochroneWavesIcon /> Isócrona Gerada
                  </h3>
                  <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => { setPreviewDataId(null); setMarkerState('idle'); setMarkerOrigin(null); setShowMarkerMenu(false); }}
                        className="flex-1 py-2.5 bg-[#0E8A5E] hover:bg-[#11A872] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg transition-all flex justify-center items-center gap-1"
                      >
                        Salvar
                      </button>
                      <button 
                        onClick={() => { dispatch(wrapTo(KEPLER_ID, removeDataset(previewDataId))); setPreviewDataId(null); }}
                        className="flex-1 py-2.5 bg-[#131c2a] border border-[#ef4444]/40 hover:border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex justify-center items-center gap-1"
                      >
                        Descartar
                      </button>
                  </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 🚀 O ALFINETE GEOGRÁFICO ANCORADO AO CHÃO & MENU DE CONTEXTO */}
      {(() => {
        let pinX = -9999;
        let pinY = -9999;
        let shouldShowPin = false;

        if (markerState === 'placed' && markerOrigin && !previewDataId && mapState?.width > 0 && mapState?.height > 0) {
          try {
            const viewport = new WebMercatorViewport({
              width: mapState.width, height: mapState.height,
              longitude: mapState.longitude || 0, latitude: mapState.latitude || 0,
              zoom: mapState.zoom || 0, pitch: mapState.pitch || 0, bearing: mapState.bearing || 0
            });
            const projected = viewport.project([markerOrigin.lng, markerOrigin.lat]);
            if (projected && !isNaN(projected[0]) && !isNaN(projected[1])) {
              pinX = projected[0];
              pinY = projected[1];
              shouldShowPin = true;
            }
          } catch(e) {}
        }

        const handlePinPointerDown = (e: React.PointerEvent) => {
          e.stopPropagation(); 
          setIsDraggingPin(true);
          pinDragInfo.current = { startX: e.clientX, startY: e.clientY };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        };

        const handlePinPointerMove = (e: React.PointerEvent) => {
          if (!isDraggingPin || !mapState?.width) return;
          e.stopPropagation();

          const viewport = new WebMercatorViewport({
            width: mapState.width, height: mapState.height,
            longitude: mapState.longitude || 0, latitude: mapState.latitude || 0,
            zoom: mapState.zoom || 0, pitch: mapState.pitch || 0, bearing: mapState.bearing || 0
          });
          const [lng, lat] = viewport.unproject([e.clientX, e.clientY]);
          
          if (!isNaN(lng) && !isNaN(lat)) {
            setMarkerOrigin({ lat, lng });
          }
        };

        const handlePinPointerUp = (e: React.PointerEvent) => {
          e.stopPropagation();
          if (isDraggingPin) {
            setIsDraggingPin(false);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            
            const dx = Math.abs(e.clientX - pinDragInfo.current.startX);
            const dy = Math.abs(e.clientY - pinDragInfo.current.startY);
            
            if (dx < 3 && dy < 3) {
                setShowMarkerMenu(prev => !prev);
            } else {
                setShowMarkerMenu(false);
            }
          }
        };

        return shouldShowPin ? createPortal(
          <div
            className="fixed z-[99998] flex flex-col items-center pointer-events-none"
            style={{ left: pinX, top: pinY, transform: 'translate(-50%, -100%)', touchAction: 'none' }}
          >
            {/* 2. ALÇA DE ARRASTO (Drag Handle) */}
            <div
              className={`pointer-events-auto transition-transform ${isDraggingPin ? 'scale-125 cursor-grabbing drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]' : 'hover:scale-110 cursor-pointer drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]'}`}
              onPointerDown={handlePinPointerDown}
              onPointerMove={handlePinPointerMove}
              onPointerUp={handlePinPointerUp}
              title="Clique para opções. Arraste para mover."
            >
              <div className="text-[#C5A059]">
                <PinMarkerIcon />
              </div>
            </div>

            <span className="mt-1 px-2 py-0.5 bg-[#0a0f18]/80 text-[#C5A059] text-[9px] font-bold uppercase tracking-widest rounded-md border border-[#C5A059]/30 shadow-lg pointer-events-none select-none">
              {isDraggingPin ? 'Movendo...' : 'Origem'}
            </span>

            {/* 3. O MENU DE CONTEXTO DO MARCADOR (Fora da área de arrasto) */}
            {showMarkerMenu && !isDraggingPin && (
               <div className="absolute left-full top-0 ml-4 w-48 bg-[#0a0f18] border border-[#1f2b3e] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex flex-col p-1.5 pointer-events-auto">
                  <button 
                     onClick={(e) => { e.stopPropagation(); setShowIsoModal(true); setShowMarkerMenu(false); }}
                     className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1a2435] hover:text-[#C5A059] rounded-lg transition-colors"
                  >
                     <IsochroneWavesIcon /> Criar Isócronas
                  </button>
                  <div className="h-[1px] bg-[#1f2b3e] my-1 mx-2" />
                  <button 
                     onClick={(e) => { e.stopPropagation(); setMarkerState('idle'); setMarkerOrigin(null); setShowMarkerMenu(false); }}
                     className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-[#ef4444]/10 hover:text-[#ef4444] rounded-lg transition-colors"
                  >
                     <TrashIcon /> Remover Marcador
                  </button>
               </div>
            )}
          </div>,
          document.body
        ) : null;
      })()}

      {/* 🚀 MODAL DE CONFIGURAÇÃO DE ISÓCRONAS */}
      {showIsoModal && createPortal(
         <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#030508]/80 backdrop-blur-sm p-4">
            <div className="bg-[#0a0f18] border border-[#1f2b3e] rounded-2xl w-[400px] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
               
               <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2b3e]/80 bg-[#131c2a]">
                 <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                   <IsochroneWavesIcon /> Configurar Isócronas
                 </h3>
                 <button onClick={() => setShowIsoModal(false)} className="text-gray-500 hover:text-white transition-colors"><CloseIcon /></button>
               </div>

               <div className="p-6 flex flex-col gap-6">
                  {/* Tipo de Análise */}
                  <div className="flex flex-col gap-3">
                     <label className="text-[10px] text-[#8c9fba] uppercase tracking-widest font-bold">Método de Geração</label>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isoType === 'time' ? 'border-[#C5A059] bg-[#C5A059]/20' : 'border-[#2a3a54]'}`}>
                              {isoType === 'time' && <div className="w-2 h-2 bg-[#C5A059] rounded-full" />}
                           </div>
                           <input type="radio" value="time" checked={isoType === 'time'} onChange={() => setIsoType('time')} className="hidden" />
                           Tempo
                        </label>
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isoType === 'distance' ? 'border-[#C5A059] bg-[#C5A059]/20' : 'border-[#2a3a54]'}`}>
                              {isoType === 'distance' && <div className="w-2 h-2 bg-[#C5A059] rounded-full" />}
                           </div>
                           <input type="radio" value="distance" checked={isoType === 'distance'} onChange={() => setIsoType('distance')} className="hidden" />
                           Distância
                        </label>
                     </div>
                  </div>

                  {/* Modalidade (Exibida apenas se for por Tempo) */}
                  {isoType === 'time' && (
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[#8c9fba] uppercase tracking-widest font-bold">Modalidade do Movimento</label>
                        <select 
                           value={isoMode} 
                           onChange={(e) => setIsoMode(e.target.value)}
                           className="w-full bg-[#131c2a] border border-[#2a3a54] text-white text-xs rounded-lg p-3 outline-none focus:border-[#C5A059]"
                        >
                           <option value="drive_traffic">Dirigindo com Trânsito </option>
                           <option value="drive">Dirigindo (Normal)</option>
                           <option value="bicycle">Bicicleta</option>
                           <option value="walk">Caminhando</option>
                        </select>
                     </div>
                  )}

                  {/* Intervalos */}
                  <div className="flex flex-col gap-3">
                     <label className="text-[10px] text-[#8c9fba] uppercase tracking-widest font-bold">
                        Intervalos de {isoType === 'time' ? 'Tempo (Minutos)' : 'Distância (Quilômetros)'}
                     </label>
                     <div className="flex flex-col gap-2">
                        {isoRanges.map((val, idx) => (
                           <div key={idx} className="flex gap-2 items-center">
                              <input 
                                 type="number" 
                                 value={val} 
                                 onChange={(e) => {
                                    const newRanges = [...isoRanges];
                                    newRanges[idx] = e.target.value;
                                    setIsoRanges(newRanges);
                                 }}
                                 className="flex-1 bg-[#131c2a] border border-[#2a3a54] text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#C5A059]"
                                 placeholder={`Isócrona 0${idx + 1}`}
                              />
                              {isoRanges.length > 1 && (
                                 <button onClick={() => setIsoRanges(isoRanges.filter((_, i) => i !== idx))} className="p-2 text-gray-500 hover:text-red-400">
                                    <TrashIcon />
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                     {isoRanges.length < 4 && (
                        <button 
                           onClick={() => setIsoRanges([...isoRanges, ''])}
                           className="text-left text-[10px] text-[#C5A059] font-bold uppercase tracking-widest hover:brightness-125 transition-all mt-1"
                        >
                           + Adicionar
                        </button>
                     )}
                  </div>

                  {/* Submit */}
                  <button 
                     onClick={handleCalculateIsochrone}
                     disabled={isLoadingIsochrone}
                     className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#172233] to-[#0d141f] border border-[#C5A059]/30 hover:border-[#C5A059] text-[#C5A059] text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                     {isLoadingIsochrone ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     ) : (
                        'Concluir'
                     )}
                  </button>

               </div>
            </div>
         </div>,
         document.body
      )}

      {exportingDataset && (
        <DataExportModal dataset={exportingDataset} filters={filters} onClose={() => setExportingDataset(null)} />
      )}
    </aside>
  );
}