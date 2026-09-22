'use client';

import React, { useState } from 'react';
import { Download, Archive, Film, FileCode, Check, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { buildSpriteSheet } from '../lib/sprite-processor/sheet-builder';
import { createGif } from '../lib/sprite-processor/gif-builder';

interface ExportPanelProps {
  processedCanvases: HTMLCanvasElement[];
  sourceName: string;
  fps: number;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  processedCanvases,
  sourceName,
  fps,
}) => {
  const [baseName, setBaseName] = useState<string>(sourceName || 'character');
  const [columns, setColumns] = useState<number>(0); // 0 = auto
  const [padding, setPadding] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');

  // Update baseName when sourceName changes
  React.useEffect(() => {
    if (sourceName) setBaseName(sourceName);
  }, [sourceName]);

  const frameCount = processedCanvases.length;
  if (frameCount === 0) return null;

  const cellWidth = processedCanvases[0]?.width || 64;
  const cellHeight = processedCanvases[0]?.height || 64;

  const actualCols = columns > 0 ? columns : Math.max(1, Math.ceil(Math.sqrt(frameCount)));
  const actualRows = Math.ceil(frameCount / actualCols);
  const sheetWidth = actualCols * cellWidth + (actualCols + 1) * padding;
  const sheetHeight = actualRows * cellHeight + (actualRows + 1) * padding;

  // 1. Export Sprite Sheet PNG
  const handleExportSpriteSheet = async () => {
    setIsExporting(true);
    setExportMessage('Generating sprite sheet...');
    try {
      const { canvas } = buildSpriteSheet(processedCanvases, {
        columns,
        padding,
        baseName,
        fps,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${baseName}_sheet.png`);
        }
        setIsExporting(false);
      }, 'image/png');
    } catch (err: any) {
      alert('Error creating sprite sheet: ' + err.message);
      setIsExporting(false);
    }
  };

  // 2. Export ZIP of PNGs
  const handleExportZip = async () => {
    setIsExporting(true);
    setExportMessage('Packaging frames into ZIP...');
    try {
      const zip = new JSZip();
      const folder = zip.folder(baseName) || zip;

      for (let i = 0; i < processedCanvases.length; i++) {
        const c = processedCanvases[i];
        const dataUrl = c.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `${baseName}_${String(i).padStart(3, '0')}.png`;
        folder.file(filename, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${baseName}_frames.zip`);
    } catch (err: any) {
      alert('Error exporting ZIP: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export Animated GIF
  const handleExportGif = async () => {
    setIsExporting(true);
    setExportMessage('Encoding animated GIF...');
    try {
      // Small pause to allow UI update
      await new Promise((r) => setTimeout(r, 50));
      const gifBlob = createGif(processedCanvases, fps);
      saveAs(gifBlob, `${baseName}_anim.gif`);
    } catch (err: any) {
      alert('Error exporting GIF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Export JSON Atlas Metadata
  const handleExportJson = () => {
    try {
      const { metadata } = buildSpriteSheet(processedCanvases, {
        columns,
        padding,
        baseName,
        fps,
      });

      const blob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json',
      });
      saveAs(blob, `${baseName}_atlas.json`);
    } catch (err: any) {
      alert('Error exporting JSON: ' + err.message);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">
            4
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              📥 Game-Ready Download Options
            </h3>
            <p className="text-xs text-slate-400">
              Export transparent PNG sprite sheets, individual frame ZIPs, animated GIFs, or engine atlas JSONs.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Ready to Export ({frameCount} frames)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Configuration */}
        <div className="md:col-span-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Asset Base Name
            </label>
            <input
              type="text"
              value={baseName}
              onChange={(e) =>
                setBaseName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))
              }
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
              placeholder="character_walk"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sprite Sheet Columns
              </label>
              <select
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>Auto (Grid {actualCols} cols)</option>
                <option value={1}>1 (Single Column)</option>
                <option value={2}>2 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={8}>8 Columns</option>
                <option value={12}>12 Columns</option>
                <option value={frameCount}>Single Horizontal Row ({frameCount})</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Frame Cell Spacing
              </label>
              <select
                value={padding}
                onChange={(e) => setPadding(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>0 px (Flush)</option>
                <option value={1}>1 px</option>
                <option value={2}>2 px</option>
                <option value={4}>4 px</option>
              </select>
            </div>
          </div>

          {/* Dimension Summary */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Individual Cell Size:</span>
              <span className="font-mono text-slate-200">
                {cellWidth} × {cellHeight} px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Sheet Dimensions:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {sheetWidth} × {sheetHeight} px ({actualCols} × {actualRows} grid)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Export Actions */}
        <div className="md:col-span-6 flex flex-col justify-between gap-3">
          <button
            onClick={handleExportSpriteSheet}
            disabled={isExporting}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Sprite Sheet (.PNG)
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex flex-col items-center justify-center gap-1.5"
              title="Download all frames as separate PNG files in a ZIP archive"
            >
              <Archive className="w-4 h-4 text-amber-400" />
              Frames (.ZIP)
            </button>

            <button
              onClick={handleExportGif}
              disabled={isExporting}
              className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex flex-col items-center justify-center gap-1.5"
              title="Download animated GIF loop"
            >
              <Film className="w-4 h-4 text-purple-400" />
              Animated (.GIF)
            </button>

            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex flex-col items-center justify-center gap-1.5"
              title="Export Godot/Unity JSON atlas metadata"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              Atlas (.JSON)
            </button>
          </div>

          {isExporting && (
            <div className="text-center text-xs text-indigo-400 font-medium animate-pulse flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {exportMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
