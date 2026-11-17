import React, { useState } from 'react';
import { 
  Download, 
  X, 
  FileCheck, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Type, 
  Eraser,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PDFPageItem } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalFileName: string;
  pages: PDFPageItem[];
  onConfirmExport: (fileName: string) => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  originalFileName,
  pages,
  onConfirmExport
}) => {
  const defaultName = originalFileName.replace(/\.pdf$/i, '') + '_edited.pdf';
  const [fileName, setFileName] = useState(defaultName);
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Calculate statistics
  let totalTextBoxes = 0;
  let totalWhiteouts = 0;
  let totalDrawings = 0;

  for (const p of pages) {
    totalTextBoxes += p.annotations.textBoxes?.length || 0;
    totalWhiteouts += p.annotations.whiteouts?.length || 0;
    totalDrawings += p.annotations.drawings?.length || 0;
  }

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onConfirmExport(fileName.trim() || 'document_edited.pdf');
      setIsSuccess(true);
      
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        setIsSuccess(false);
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF: " + (err as Error).message);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Export & Download PDF</h3>
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
          {/* File Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Export File Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="document_edited.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Export Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-blue-400 mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-white">{pages.length}</div>
              <div className="text-[11px] text-slate-400">Total Pages</div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-rose-400 mb-1">
                <Eraser className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-white">{totalWhiteouts}</div>
              <div className="text-[11px] text-slate-400">Whiteout Masks</div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-indigo-400 mb-1">
                <Type className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-white">{totalTextBoxes}</div>
              <div className="text-[11px] text-slate-400">Text Boxes</div>
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              100% processed directly in your browser. Zero uploads, zero paywalls, zero watermarks.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || pages.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Downloaded Successfully!</span>
              </>
            ) : isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Vector PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
