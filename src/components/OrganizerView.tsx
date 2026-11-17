import React, { useState } from 'react';
import { 
  Trash2, 
  Copy, 
  RotateCw, 
  Edit3, 
  ArrowLeft, 
  ArrowRight, 
  GripVertical,
  Layers,
  Sparkles,
  UploadCloud,
  FilePlus,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { PDFPageItem } from '../types';

interface OrganizerViewProps {
  pages: PDFPageItem[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onEditPageCanvas: (id: string) => void;
  onDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onRotatePage: (id: string) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onAddBlankPage: () => void;
  onBatchDeletePages: (ids: string[]) => void;
  onUploadClick: () => void;
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onEditPageCanvas,
  onDeletePage,
  onDuplicatePage,
  onRotatePage,
  onReorderPages,
  onAddBlankPage,
  onBatchDeletePages,
  onUploadClick
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toggle page selection for batch operations
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to completely delete ${selectedIds.size} selected page(s)?`)) {
      onBatchDeletePages(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // clear highlight if leaving container
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorderPages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Empty state if no pages
  if (pages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-12 bg-slate-950">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Hero Banner */}
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 shadow-xl shadow-blue-500/10 animate-pulse-subtle">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
            <span>✨ 100% Free Forever • No Paywalls • No Credit Card • Zero Watermarks</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            The Truly Free PDF Editor. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              No Hidden Paywalls. No Limits.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mb-8 leading-relaxed">
            Delete, duplicate, and reorder pages. Mask text with the whiteout eraser, add custom text boxes, merge multiple documents, and split page ranges—completely free and 100% private in your browser.
          </p>

          <button
            onClick={onUploadClick}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base flex items-center gap-3 shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.03] active:scale-[0.98] border border-blue-400/30 mb-16"
          >
            <UploadCloud className="w-6 h-6" />
            <span>Open PDF Document to Edit</span>
          </button>

          {/* Feature Highlights Grid for Users & Search Crawlers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left w-full mb-16">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Delete, Duplicate & Reorder</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Remove unwanted pages permanently. Duplicate any page with a click and drag cards to place them in any order.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <Edit3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Whiteout Eraser & Text Boxes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mask off sensitive text, numbers, or clauses using pure white paint. Drop new text boxes with custom fonts, colors, and sizes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Merge & Split PDFs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Combine multiple PDFs with custom insertion positions, or extract exact page ranges into a separate PDF without fees.
              </p>
            </div>
          </div>

          {/* Privacy & Zero Paywall FAQ Section */}
          <div className="w-full text-left bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-slate-200 mb-1">Is PurePDF really free without any paywalls or credit card?</h4>
                <p className="text-slate-400 leading-relaxed">
                  Yes, 100% free with zero hidden paywalls. Unlike other sites that allow 2 free edits and then demand a subscription or credit card, PurePDF runs completely in your web browser. There are no server costs, so there is no reason to ever charge you.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-1">Are my confidential PDF documents safe and private?</h4>
                <p className="text-slate-400 leading-relaxed">
                  Completely safe. Your documents are never uploaded to any cloud server or third party. All parsing, rendering, editing, and exports happen locally inside your browser's memory.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-1">Does it add watermarks to exported documents?</h4>
                <p className="text-slate-400 leading-relaxed">
                  No. PurePDF will never stamp watermarks on your files. The exported PDF is clean, original vector quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Sub-toolbar */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>{pages.length} {pages.length === 1 ? 'Page' : 'Pages'}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Select all toggle */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            {selectedIds.size === pages.length && pages.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Batch delete button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-lg transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Quick instructions / tips */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 border border-slate-800 px-3 py-1 rounded-lg">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Drag cards to reorder anywhere • Click 📋 to duplicate • Click 🗑️ to delete completely</span>
          </div>

          <button
            onClick={onAddBlankPage}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
            title="Append a blank white page at the end of document"
          >
            <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Blank Page</span>
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {pages.map((page, index) => {
            const isSelected = selectedIds.has(page.id);
            const isDragTarget = dragOverIndex === index;
            const isBeingDragged = draggedIndex === index;
            const annotationCount = 
              (page.annotations.textBoxes?.length || 0) + 
              (page.annotations.whiteouts?.length || 0) + 
              (page.annotations.drawings?.length || 0);

            return (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectPage(page.id)}
                className={`group relative flex flex-col rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isBeingDragged ? 'opacity-40 scale-95 border-dashed border-blue-500' : ''
                } ${
                  isDragTarget ? 'ring-2 ring-blue-500 scale-[1.03] border-blue-400 shadow-xl' : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                } ${
                  isSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : ''
                }`}
              >
                {/* Header of the Card */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-850 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleSelect(page.id, e)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Select for batch delete"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 group-hover:text-slate-400" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-slate-200">
                      Page {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {annotationCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                        {annotationCount} edit{annotationCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-600 group-hover:text-slate-400 p-0.5" 
                      title="Drag to reorder anywhere"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Page Thumbnail Preview */}
                <div 
                  className="relative flex-1 p-3 flex items-center justify-center bg-slate-950/60 min-h-[220px]"
                  style={{
                    transform: `rotate(${page.rotation || 0}deg)`,
                    transition: 'transform 0.2s ease-in-out'
                  }}
                >
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${index + 1}`}
                      className="max-h-[210px] w-auto max-w-full rounded shadow-md object-contain border border-slate-800 bg-white"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-36 h-48 bg-slate-800/50 rounded flex items-center justify-center text-slate-600 text-xs">
                      Page {index + 1}
                    </div>
                  )}

                  {/* Duplicate / Copy Indicator */}
                  {page.id.includes('dup') && (
                    <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      DUPLICATE
                    </div>
                  )}

                  {/* Merged Document Indicator */}
                  {page.sourceDocId && page.sourceDocId !== 'doc_primary' && (
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur text-indigo-300 border border-indigo-500/30 text-[9px] font-medium px-2 py-0.5 rounded truncate shadow text-center">
                      Merged: {page.sourceFileName}
                    </div>
                  )}
                </div>

                {/* Card Action Footer Bar */}
                <div className="px-2.5 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-1">
                  {/* Left: Reorder buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index > 0) onReorderPages(index, index - 1);
                      }}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move page left (earlier in order)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index < pages.length - 1) onReorderPages(index, index + 1);
                      }}
                      disabled={index === pages.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move page right (later in order)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Middle: Rotate & Duplicate */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(page.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(page.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Duplicate this page and place copy right next to it"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit page visual canvas */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPageCanvas(page.id);
                      }}
                      className="p-1 rounded text-blue-400 hover:text-white hover:bg-blue-600 transition-colors"
                      title="Edit Canvas: Whiteout eraser & add text boxes"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Right: Delete Page completely */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pages.length === 1) {
                        alert("A PDF must contain at least one page.");
                        return;
                      }
                      if (window.confirm(`Are you sure you want to completely delete Page ${index + 1}?`)) {
                        onDeletePage(page.id);
                      }
                    }}
                    className="p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-950/80 transition-colors"
                    title="Delete this page completely"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
