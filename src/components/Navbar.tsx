import React from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Sparkles, 
  LayoutGrid, 
  PenTool, 
  ShieldCheck,
  FileCheck,
  GitMerge,
  Scissors
} from 'lucide-react';
import { EditorViewMode, DocumentMeta } from '../types';

interface NavbarProps {
  meta: DocumentMeta | null;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onUploadClick: () => void;
  onLoadSampleClick: () => void;
  onMergeClick: () => void;
  onSplitClick: () => void;
  onExportClick: () => void;
  isExporting: boolean;
  selectedPageNumber: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  meta,
  viewMode,
  onViewModeChange,
  onUploadClick,
  onLoadSampleClick,
  onMergeClick,
  onSplitClick,
  onExportClick,
  isExporting,
  selectedPageNumber
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              PurePDF <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold uppercase tracking-wider">Studio</span>
            </span>
            <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Free & Private • Zero Paywalls</span>
            </div>
          </div>
          {meta && (
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-slate-500 inline" />
              <span className="truncate">{meta.fileName}</span>
              <span className="text-slate-600">•</span>
              <span>{meta.totalPages} {meta.totalPages === 1 ? 'page' : 'pages'}</span>
            </p>
          )}
        </div>
      </div>

      {/* Center View Mode Switcher (Organizer vs Visual Canvas Editor) */}
      {meta && (
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onViewModeChange('organizer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'organizer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Manage, delete, duplicate, and reorder pages"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Page Organizer</span>
            <span className="sm:hidden">Pages</span>
          </button>

          <button
            onClick={() => onViewModeChange('canvas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'canvas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Edit page canvas: Whiteout eraser, text boxes, and drawings"
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">Visual Editor</span>
            <span className="sm:hidden">Edit (P.{selectedPageNumber})</span>
          </button>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sample Document quick load button */}
        <button
          onClick={onLoadSampleClick}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 transition-colors"
          title="Load a pre-made 3-page agreement to test delete, duplicate, whiteout, and text tools"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Try Sample PDF</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <Upload className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Open PDF</span>
          <span className="sm:hidden">Open</span>
        </button>

        {meta && (
          <>
            {/* Merge PDF Button */}
            <button
              onClick={onMergeClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 transition-colors shadow-sm"
              title="Add another PDF document and choose where its pages should be inserted"
            >
              <GitMerge className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Merge PDF</span>
              <span className="md:hidden">Merge</span>
            </button>

            {/* Split PDF Button */}
            <button
              onClick={onSplitClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 transition-colors shadow-sm"
              title="Specify start and end page numbers to extract only those pages"
            >
              <Scissors className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Split PDF</span>
              <span className="md:hidden">Split</span>
            </button>
          </>
        )}

        {/* Export & Download Button */}
        {meta && (
          <button
            onClick={onExportClick}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
