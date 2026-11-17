import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OrganizerView } from './components/OrganizerView';
import { CanvasEditorView } from './components/CanvasEditorView';
import { UploadModal } from './components/UploadModal';
import { ExportModal } from './components/ExportModal';
import { MergeModal } from './components/MergeModal';
import { SplitModal } from './components/SplitModal';
import { 
  PDFPageItem, 
  EditorViewMode, 
  DocumentMeta, 
  TextBoxAnnotation, 
  WhiteoutAnnotation, 
  DrawingAnnotation 
} from './types';
import { 
  loadPdfPages, 
  createSamplePdf, 
  exportModifiedPdf, 
  downloadPdfBytes, 
  splitAndExportPdf,
  generateId 
} from './utils/pdfManager';

export default function App() {
  const [pages, setPages] = useState<PDFPageItem[]>([]);
  const [sourceDocs, setSourceDocs] = useState<Record<string, ArrayBuffer>>({});
  const [originalPdfBytes, setOriginalPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<EditorViewMode>('organizer');
  const [meta, setMeta] = useState<DocumentMeta | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading document...');

  // Auto-load sample PDF on initial load for instant interactive experience
  useEffect(() => {
    handleLoadSample();
  }, []);

  // Load PDF from ArrayBuffer
  const handleLoadPdf = async (buffer: ArrayBuffer, fileName: string) => {
    try {
      setIsLoading(true);
      setLoadingMessage('Rendering PDF pages and thumbnails...');
      
      const docId = 'doc_primary';
      const { pages: parsedPages, pdfDocProxy: proxy } = await loadPdfPages(buffer, docId, fileName);
      
      setOriginalPdfBytes(buffer);
      setSourceDocs({ [docId]: buffer });
      setPdfDocProxy(proxy);
      setPages(parsedPages);
      setSelectedPageId(parsedPages[0]?.id || null);
      setMeta({
        fileName,
        fileSize: buffer.byteLength,
        totalPages: parsedPages.length,
        isModified: false
      });
      setIsUploadOpen(false);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      alert('Could not read this PDF file. Please ensure it is not password-protected or corrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  // User uploaded a file
  const handleFileSelect = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await handleLoadPdf(buffer, file.name);
    } catch (err) {
      console.error('File read error:', err);
      alert('Failed to read file from disk.');
    }
  };

  // Load sample document
  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Generating sample agreement document...');
      const sampleBuffer = await createSamplePdf();
      await handleLoadPdf(sampleBuffer, 'Nexus_Agreement_Sample.pdf');
    } catch (err) {
      console.error('Failed to generate sample PDF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Page Operations
  // 1. Delete page completely
  const handleDeletePage = (pageId: string) => {
    setPages(prev => {
      const filtered = prev.filter(p => p.id !== pageId);
      if (selectedPageId === pageId) {
        setSelectedPageId(filtered[0]?.id || null);
      }
      return filtered;
    });
    setMeta(prev => prev ? { ...prev, totalPages: prev.totalPages - 1, isModified: true } : null);
  };

  // Batch delete
  const handleBatchDeletePages = (pageIds: string[]) => {
    const idSet = new Set(pageIds);
    setPages(prev => {
      const filtered = prev.filter(p => !idSet.has(p.id));
      if (selectedPageId && idSet.has(selectedPageId)) {
        setSelectedPageId(filtered[0]?.id || null);
      }
      return filtered;
    });
    setMeta(prev => prev ? { ...prev, totalPages: prev.totalPages - pageIds.length, isModified: true } : null);
  };

  // 2. Duplicate page and place it right next to it
  const handleDuplicatePage = (pageId: string) => {
    setPages(prev => {
      const index = prev.findIndex(p => p.id === pageId);
      if (index === -1) return prev;
      const original = prev[index];

      // Deep copy page and annotations
      const duplicated: PDFPageItem = {
        ...original,
        id: generateId() + '_dup',
        annotations: {
          textBoxes: original.annotations.textBoxes.map(t => ({ ...t, id: generateId() })),
          whiteouts: original.annotations.whiteouts.map(w => ({ ...w, id: generateId() })),
          drawings: original.annotations.drawings.map(d => ({ ...d, id: generateId() }))
        }
      };

      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setMeta(prev => prev ? { ...prev, totalPages: prev.totalPages + 1, isModified: true } : null);
  };

  // 3. Reorder pages (drag and drop or arrow buttons)
  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setMeta(prev => prev ? { ...prev, isModified: true } : null);
  };

  // 4. Rotate page
  const handleRotatePage = (pageId: string) => {
    setPages(prev =>
      prev.map(p => {
        if (p.id === pageId) {
          return { ...p, rotation: ((p.rotation || 0) + 90) % 360 };
        }
        return p;
      })
    );
    setMeta(prev => prev ? { ...prev, isModified: true } : null);
  };

  // 5. Add Blank Page
  const handleAddBlankPage = () => {
    if (pages.length === 0) return;
    const basePage = pages[0];
    const blankPage: PDFPageItem = {
      id: generateId() + '_blank',
      sourceDocId: basePage.sourceDocId || 'doc_primary',
      sourceFileName: basePage.sourceFileName,
      originalPageIndex: basePage.originalPageIndex,
      pageNumber: pages.length + 1,
      rotation: 0,
      width: basePage.width,
      height: basePage.height,
      aspectRatio: basePage.aspectRatio,
      thumbnailUrl: basePage.thumbnailUrl,
      annotations: {
        textBoxes: [],
        whiteouts: [
          // Whiteout mask covering the entire page to make it clean blank white!
          {
            id: generateId(),
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            color: '#ffffff'
          }
        ],
        drawings: []
      }
    };
    setPages(prev => [...prev, blankPage]);
    setMeta(prev => prev ? { ...prev, totalPages: prev.totalPages + 1, isModified: true } : null);
  };

  // 6. Update page annotations (Text boxes, whiteout masks, drawings)
  const handleUpdatePageAnnotations = (
    pageId: string,
    annotations: {
      textBoxes: TextBoxAnnotation[];
      whiteouts: WhiteoutAnnotation[];
      drawings: DrawingAnnotation[];
    }
  ) => {
    setPages(prev =>
      prev.map(p => {
        if (p.id === pageId) {
          return { ...p, annotations };
        }
        return p;
      })
    );
    setMeta(prev => prev ? { ...prev, isModified: true } : null);
  };

  // Switch to canvas visual editor for a specific page
  const handleEditPageCanvas = (pageId: string) => {
    setSelectedPageId(pageId);
    setViewMode('canvas');
  };

  // Merge another PDF into current document
  const handleConfirmMerge = (
    newBuffer: ArrayBuffer,
    newFileName: string,
    newPages: PDFPageItem[],
    insertAfterPageIndex: number
  ) => {
    const newDocId = newPages[0]?.sourceDocId || ('doc_' + Date.now());
    setSourceDocs(prev => ({ ...prev, [newDocId]: newBuffer }));

    setPages(prev => {
      const copy = [...prev];
      // insertAfterPageIndex: 0 = start, N = after page N
      copy.splice(insertAfterPageIndex, 0, ...newPages);
      return copy;
    });

    setMeta(prev => prev ? {
      ...prev,
      totalPages: (prev.totalPages || 0) + newPages.length,
      isModified: true
    } : null);
  };

  // Split and download PDF
  const handleConfirmSplit = async (startPage: number, endPage: number, fileName: string) => {
    if (pages.length === 0) return;
    await splitAndExportPdf(sourceDocs, pages, startPage, endPage, fileName);
  };

  // Keep only split slice in editor
  const handleKeepOnlySlice = (startPage: number, endPage: number) => {
    setPages(prev => {
      const sliced = prev.slice(startPage - 1, endPage);
      setSelectedPageId(sliced[0]?.id || null);
      return sliced;
    });
    setMeta(prev => prev ? {
      ...prev,
      totalPages: endPage - startPage + 1,
      isModified: true
    } : null);
  };

  // Export modified PDF
  const handleConfirmExport = async (fileName: string) => {
    if (pages.length === 0) return;
    const exportedBytes = await exportModifiedPdf(sourceDocs, pages);
    downloadPdfBytes(exportedBytes, fileName);
  };

  const selectedPageIndex = pages.findIndex(p => p.id === selectedPageId);
  const activePage = selectedPageIndex !== -1 ? pages[selectedPageIndex] : pages[0] || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        meta={meta}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUploadClick={() => setIsUploadOpen(true)}
        onLoadSampleClick={handleLoadSample}
        onMergeClick={() => setIsMergeOpen(true)}
        onSplitClick={() => setIsSplitOpen(true)}
        onExportClick={() => setIsExportOpen(true)}
        isExporting={false}
        selectedPageNumber={selectedPageIndex >= 0 ? selectedPageIndex + 1 : 1}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-200">{loadingMessage}</p>
            <p className="text-xs text-slate-500 mt-1">100% processed securely in your browser</p>
          </div>
        )}

        {viewMode === 'organizer' || !activePage ? (
          <OrganizerView
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
            onEditPageCanvas={handleEditPageCanvas}
            onDeletePage={handleDeletePage}
            onDuplicatePage={handleDuplicatePage}
            onRotatePage={handleRotatePage}
            onReorderPages={handleReorderPages}
            onAddBlankPage={handleAddBlankPage}
            onBatchDeletePages={handleBatchDeletePages}
            onUploadClick={() => setIsUploadOpen(true)}
            onLoadSampleClick={handleLoadSample}
          />
        ) : (
          <CanvasEditorView
            key={activePage.id}
            page={activePage}
            pdfDocProxy={pdfDocProxy}
            totalPages={pages.length}
            currentPageIndex={selectedPageIndex}
            onPageChange={(idx) => setSelectedPageId(pages[idx]?.id || null)}
            onBackToOrganizer={() => setViewMode('organizer')}
            onUpdatePageAnnotations={handleUpdatePageAnnotations}
            onRotatePage={handleRotatePage}
          />
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFileSelect={handleFileSelect}
        onLoadSample={handleLoadSample}
        isLoading={isLoading}
      />

      {/* Merge Modal */}
      <MergeModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        currentTotalPages={pages.length}
        onConfirmMerge={handleConfirmMerge}
      />

      {/* Split Modal */}
      <SplitModal
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        originalFileName={meta?.fileName || 'document.pdf'}
        pages={pages}
        onConfirmSplit={handleConfirmSplit}
        onKeepOnlySlice={handleKeepOnlySlice}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        originalFileName={meta?.fileName || 'document.pdf'}
        pages={pages}
        onConfirmExport={handleConfirmExport}
      />
    </div>
  );
}
