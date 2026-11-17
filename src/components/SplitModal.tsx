import React, { useState } from 'react';
import { 
  Scissors, 
  X, 
  Download, 
  FileCheck, 
  Layers, 
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PDFPageItem } from '../types';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalFileName: string;
  pages: PDFPageItem[];
  onConfirmSplit: (startPage: number, endPage: number, exportFileName: string) => Promise<void>;
  onKeepOnlySlice?: (startPage: number, endPage: number) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  originalFileName,
  pages,
  onConfirmSplit,
  onKeepOnlySlice
}) => {
  const total = pages.length;
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(Math.min(total, 2));
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Generate dynamic filename
  const baseName = originalFileName.replace(/\.pdf$/i, '');
  const [fileName, setFileName] = useState(`${baseName}_pages_${startPage}-${endPage}.pdf`);

  if (!isOpen) return null;

  const count = Math.max(0, endPage - startPage + 1);

  const handleStartChange = (val: number) => {
    const s = Math.max(1, Math.min(total, val));
    setStartPage(s);
    if (s > endPage) {
      setEndPage(s);
      setFileName(`${baseName}_pages_${s}-${s}.pdf`);
    } else {
      setFileName(`${baseName}_pages_${s}-${endPage}.pdf`);
    }
  };

  const handleEndChange = (val: number) => {
    const e = Math.max(1, Math.min(total, val));
    setEndPage(e);
    if (e < startPage) {
      setStartPage(e);
      setFileName(`${baseName}_pages_${e}-${e}.pdf`);
    } else {
      setFileName(`${baseName}_pages_${startPage}-${e}.pdf`);
    }
  };

  const handleSplitAndDownload = async () => {
    try {
      setIsExporting(true);
      await onConfirmSplit(startPage, endPage, fileName.trim() || `${baseName}_split.pdf`);
      setIsSuccess(true);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        setIsSuccess(false);
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to split PDF: ' + (err as Error).message);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Split PDF Document</h3>
              <p className="text-xs text-slate-400">Extract a specific range of pages into a new independent PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Page Range Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Starting Page Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={total}
                  value={startPage}
                  onChange={(e) => handleStartChange(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-amber-500 text-center"
                />
                <span className="text-xs text-slate-400">of {total}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Ending Page Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={startPage}
                  max={total}
                  value={endPage}
                  onChange={(e) => handleEndChange(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-amber-500 text-center"
                />
                <span className="text-xs text-slate-400">of {total}</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Quick Select:</span>
            <button
              onClick={() => {
                handleStartChange(1);
                handleEndChange(1);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Page 1 Only
            </button>
            {total >= 2 && (
              <button
                onClick={() => {
                  handleStartChange(1);
                  handleEndChange(Math.ceil(total / 2));
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                First Half (1 to {Math.ceil(total / 2)})
              </button>
            )}
            {total >= 2 && (
              <button
                onClick={() => {
                  handleStartChange(Math.ceil(total / 2) + 1);
                  handleEndChange(total);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Second Half ({Math.ceil(total / 2) + 1} to {total})
              </button>
            )}
            <button
              onClick={() => {
                handleStartChange(1);
                handleEndChange(total);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              All Pages (1 to {total})
            </button>
          </div>

          {/* Visual Mini Page Strip */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Visual Slice Preview:</span>
              <span className="text-amber-400 font-bold">
                {count} {count === 1 ? 'Page' : 'Pages'} Selected
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pages.map((p, idx) => {
                const pageNum = idx + 1;
                const isIncluded = pageNum >= startPage && pageNum <= endPage;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (pageNum < startPage) handleStartChange(pageNum);
                      else handleEndChange(pageNum);
                    }}
                    className={`shrink-0 w-12 h-16 rounded border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isIncluded
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-md scale-105'
                        : 'border-slate-800 bg-slate-900/60 text-slate-600 opacity-40 hover:opacity-75'
                    }`}
                  >
                    <span className="text-[10px]">P.{pageNum}</span>
                    {isIncluded && <span className="text-[8px] text-amber-400 mt-1">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export File Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Split Output File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-3">
          {onKeepOnlySlice && (
            <button
              onClick={() => {
                onKeepOnlySlice(startPage, endPage);
                onClose();
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
              title="Isolate these pages in the editor workspace"
            >
              Keep Only Slice in Editor
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSplitAndDownload}
              disabled={isExporting || count <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-950 font-bold" />
                  <span>Split & Downloaded!</span>
                </>
              ) : isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Extracting Pages...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Split & Download ({count} Pages)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
