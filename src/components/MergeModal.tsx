import React, { useState, useRef } from 'react';
import { 
  GitMerge, 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { loadPdfPages } from '../utils/pdfManager';
import { PDFPageItem } from '../types';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTotalPages: number;
  onConfirmMerge: (
    newBuffer: ArrayBuffer,
    newFileName: string,
    newPages: PDFPageItem[],
    insertAfterPageIndex: number
  ) => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  currentTotalPages,
  onConfirmMerge
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPages, setNewPages] = useState<PDFPageItem[]>([]);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Position: 0 means at beginning (before page 1), N means after page N
  // Default is currentTotalPages (append at the end)
  const [insertPosition, setInsertPosition] = useState<number>(currentTotalPages);
  const [positionMode, setPositionMode] = useState<'end' | 'start' | 'custom'>('end');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document (.pdf)');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
      const { pages } = await loadPdfPages(buffer, docId, file.name);
      setNewPages(pages);
    } catch (err) {
      console.error(err);
      setError('Failed to parse the selected PDF. Please try another file.');
      setSelectedFile(null);
      setNewPages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleMergeSubmit = () => {
    if (!fileBuffer || !selectedFile || newPages.length === 0) return;

    let targetIndex = currentTotalPages;
    if (positionMode === 'start') {
      targetIndex = 0;
    } else if (positionMode === 'custom') {
      targetIndex = Math.max(0, Math.min(currentTotalPages, insertPosition));
    }

    onConfirmMerge(fileBuffer, selectedFile.name, newPages, targetIndex);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setNewPages([]);
    setFileBuffer(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Merge Another PDF</h3>
              <p className="text-xs text-slate-400">Append pages from a second document into your current PDF</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If file is not yet selected */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/60 transition-all text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
              />
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Select the PDF to merge
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Click or drag & drop another PDF document here
              </p>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700">
                Browse Files
              </span>
            </div>
          ) : (
            /* Selected File Summary & Position Selector */
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white truncate max-w-[280px]">
                      {selectedFile.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {newPages.length} {newPages.length === 1 ? 'page' : 'pages'} ready to merge
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setNewPages([]);
                    setFileBuffer(null);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 underline"
                >
                  Change file
                </button>
              </div>

              {/* Insertion Position Options */}
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  Where should these {newPages.length} pages be added?
                </label>

                {/* Option 1: End */}
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 hover:bg-slate-850 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="position"
                    checked={positionMode === 'end'}
                    onChange={() => {
                      setPositionMode('end');
                      setInsertPosition(currentTotalPages);
                    }}
                    className="accent-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">At the end</span>
                    <span className="text-slate-400 ml-1.5">(After Page {currentTotalPages})</span>
                  </div>
                </label>

                {/* Option 2: Beginning */}
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 hover:bg-slate-850 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="position"
                    checked={positionMode === 'start'}
                    onChange={() => {
                      setPositionMode('start');
                      setInsertPosition(0);
                    }}
                    className="accent-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">At the beginning</span>
                    <span className="text-slate-400 ml-1.5">(Before Page 1)</span>
                  </div>
                </label>

                {/* Option 3: Specific Page */}
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 hover:bg-slate-850 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="position"
                    checked={positionMode === 'custom'}
                    onChange={() => setPositionMode('custom')}
                    className="accent-indigo-500"
                  />
                  <div className="flex items-center gap-2 text-xs flex-1">
                    <span className="font-semibold text-slate-200">After specific page:</span>
                    <select
                      value={insertPosition}
                      disabled={positionMode !== 'custom'}
                      onChange={(e) => setInsertPosition(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                    >
                      {Array.from({ length: currentTotalPages }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          Page {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              {/* Merge Preview Summary */}
              <div className="flex items-center justify-between text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 px-3 py-2 rounded-xl">
                <span>Resulting Document:</span>
                <span className="font-bold">
                  {currentTotalPages} + {newPages.length} = {currentTotalPages + newPages.length} Pages
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleMergeSubmit}
            disabled={!selectedFile || newPages.length === 0 || isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
          >
            <GitMerge className="w-4 h-4" />
            <span>Merge & Insert Pages</span>
          </button>
        </div>
      </div>
    </div>
  );
};
