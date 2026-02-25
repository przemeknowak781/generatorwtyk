import React, { useState } from 'react';
import { FrameConfig, CadConfig, DEFAULT_CAD_CONFIG } from '../types';
import { generateAllProjections } from '../utils/cadProjection';
import { generateCenterlines, generateDimensions } from '../utils/cadDimensions';
import { calculateSheetLayout } from '../utils/cadSheetLayout';
import { renderSvgDrawing, ViewLayout } from '../utils/cadSvgRenderer';
import { renderDxfDrawing } from '../utils/cadDxfRenderer';

interface CadExportPanelProps {
    config: FrameConfig;
    onClose: () => void;
}

export const CadExportPanel: React.FC<CadExportPanelProps> = ({ config, onClose }) => {
    const [cadConfig, setCadConfig] = useState<CadConfig>(DEFAULT_CAD_CONFIG);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');

    const handleExport = async () => {
        setIsGenerating(true);
        setProgress('Przygotowywanie geometrii...');

        try {
            // 1. Ekstrakcja krawędzi (może zająć chwilę)
            const projections = await generateAllProjections(
                config,
                cadConfig.views,
                cadConfig.angleThreshold,
                cadConfig.qualityMultiplier,
                (msg) => setProgress(msg),
                cadConfig.includeHiddenLines,
                cadConfig.showOutlines
            );

            // 2. Oblicz układ i wymiary
            const placements = calculateSheetLayout(projections, cadConfig);

            const layouts: ViewLayout[] = placements.map(pl => {
                const proj = projections.find(p => p.viewName === pl.viewName)!;
                return {
                    ...pl,
                    projection: proj,
                    dimensions: cadConfig.showDimensions ? generateDimensions(proj.viewName, config, proj.boundingBox) : [],
                    centerlines: cadConfig.showCenterlines ? generateCenterlines(proj.viewName, proj.boundingBox) : [],
                };
            });

            // 3. Renderuj pliki
            if (cadConfig.exportFormat === 'svg' || cadConfig.exportFormat === 'both') {
                const svg = renderSvgDrawing(layouts, cadConfig);
                downloadFile(svg, `rysunek_${config.petals}_platkow.svg`, 'image/svg+xml');
            }

            if (cadConfig.exportFormat === 'dxf' || cadConfig.exportFormat === 'both') {
                const dxf = renderDxfDrawing(layouts);
                downloadFile(dxf, `rysunek_${config.petals}_platkow.dxf`, 'application/dxf');
            }

            setProgress('Eksport zakończony!');
            setTimeout(() => {
                setIsGenerating(false);
                onClose();
            }, 1000);

        } catch (error) {
            console.error('CAD Export Error:', error);
            setProgress('Błąd podczas generowania CAD');
            setIsGenerating(false);
        }
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black mb-1">Eksport Dokumentacji CAD</h2>
                        <p className="text-indigo-100 text-sm opacity-90">ISO-128 Orthographic Projection Pipeline</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                    {/* Section: Views */}
                    <section>
                        <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">01</span>
                            Wybór Rzutów
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {(['front', 'right', 'back', 'top', 'section-aa', 'section-bb'] as const).map(view => (
                                <label key={view} className={`
                  flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer
                  ${cadConfig.views.includes(view)
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-100 hover:border-indigo-200 text-gray-400'}
                `}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={cadConfig.views.includes(view)}
                                        onChange={() => {
                                            const newViews = cadConfig.views.includes(view)
                                                ? cadConfig.views.filter(v => v !== view)
                                                : [...cadConfig.views, view];
                                            setCadConfig({ ...cadConfig, views: newViews });
                                        }}
                                    />
                                    <div className="text-xs font-black uppercase mb-1">
                                        {view === 'section-aa' ? 'Przekrój A-A' :
                                            view === 'section-bb' ? 'Przekrój B-B' : view}
                                    </div>
                                    <div className="text-[10px] opacity-70">
                                        {view.startsWith('section') ? 'Section View' : 'ISO View'}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Section: Drawing Settings */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <section>
                            <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">02</span>
                                Parametry Arkusza
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase ml-1">Rozmiar Papieru</span>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                                        value={cadConfig.sheetSize}
                                        onChange={(e) => setCadConfig({ ...cadConfig, sheetSize: e.target.value as any })}
                                    >
                                        <option value="A4">ISO A4 (297x210 mm)</option>
                                        <option value="A3">ISO A3 (420x297 mm)</option>
                                        <option value="A2">ISO A2 (594x420 mm)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase ml-1">Skala Rysunku</span>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                                        value={cadConfig.scale}
                                        onChange={(e) => setCadConfig({ ...cadConfig, scale: Number(e.target.value) })}
                                    >
                                        <option value="1">Skala 1:1</option>
                                        <option value="2">Skala 2:1</option>
                                        <option value="5">Skala 5:1</option>
                                        <option value="0.5">Skala 1:2</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">03</span>
                                Opcje Wizualne
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { key: 'showDimensions', label: 'Wymiarowanie Automatyczne' },
                                    { key: 'showCenterlines', label: 'Linie Osi Symetrii' },
                                    { key: 'showTitleBlock', label: 'Ramka i Tabelka Rysunkowa' },
                                    { key: 'showOutlines', label: 'Krawędzie Konturowe (Outline)' },
                                    { key: 'includeHiddenLines', label: 'Krawędzie Niewidoczne' },
                                ].map(opt => (
                                    <label key={opt.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={(cadConfig as any)[opt.key]}
                                            onChange={(e) => setCadConfig({ ...cadConfig, [opt.key]: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-900 transition-colors">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Section: Title Block Data */}
                    <section className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">04</span>
                            Dane Tabelki (Metadane)
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nazwa Projektu</span>
                                <input
                                    type="text"
                                    className="w-full h-10 px-4 rounded-lg bg-white border-gray-200 text-sm font-bold placeholder:text-gray-300 focus:ring-1 focus:ring-indigo-500"
                                    value={cadConfig.titleBlock.projectName}
                                    onChange={(e) => setCadConfig({ ...cadConfig, titleBlock: { ...cadConfig.titleBlock, projectName: e.target.value } })}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Autor</span>
                                <input
                                    type="text"
                                    className="w-full h-10 px-4 rounded-lg bg-white border-gray-200 text-sm font-bold placeholder:text-gray-300 focus:ring-1 focus:ring-indigo-500"
                                    value={cadConfig.titleBlock.author}
                                    onChange={(e) => setCadConfig({ ...cadConfig, titleBlock: { ...cadConfig.titleBlock, author: e.target.value } })}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Format Eksportu</span>
                        <div className="flex gap-2">
                            {['svg', 'dxf', 'both'].map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setCadConfig({ ...cadConfig, exportFormat: fmt as any })}
                                    className={`
                    px-4 py-2 rounded-lg text-xs font-black uppercase transition-all
                    ${cadConfig.exportFormat === fmt
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'bg-white text-gray-400 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}
                  `}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={isGenerating || cadConfig.views.length === 0}
                        className={`
              h-14 px-10 rounded-2xl font-black text-white shadow-xl transition-all flex items-center gap-3
              ${isGenerating || cadConfig.views.length === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95'}
            `}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {progress}
                            </>
                        ) : (
                            'GENERUJ DOKUMENTACJĘ'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
