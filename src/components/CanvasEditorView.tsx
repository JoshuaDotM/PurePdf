import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw,
  MousePointer, 
  Type, 
  Eraser, 
  Square, 
  PenTool, 
  Highlighter, 
  Trash2, 
  Undo2, 
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Eye,
  Check
} from 'lucide-react';
import { 
  PDFPageItem, 
  CanvasTool, 
  TextBoxAnnotation, 
  WhiteoutAnnotation, 
  DrawingAnnotation 
} from '../types';
import { generateId } from '../utils/pdfManager';

interface CanvasEditorViewProps {
  page: PDFPageItem;
  pdfDocProxy: any;
  totalPages: number;
  currentPageIndex: number;
  onPageChange: (index: number) => void;
  onBackToOrganizer: () => void;
  onUpdatePageAnnotations: (
    pageId: string, 
    annotations: {
      textBoxes: TextBoxAnnotation[];
      whiteouts: WhiteoutAnnotation[];
      drawings: DrawingAnnotation[];
    }
  ) => void;
  onRotatePage: (pageId: string) => void;
}

export const CanvasEditorView: React.FC<CanvasEditorViewProps> = ({
  page,
  pdfDocProxy,
  totalPages,
  currentPageIndex,
  onPageChange,
  onBackToOrganizer,
  onUpdatePageAnnotations,
  onRotatePage
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Local copy of annotations for snappy interactive editing
  const [textBoxes, setTextBoxes] = useState<TextBoxAnnotation[]>(page.annotations.textBoxes || []);
  const [whiteouts, setWhiteouts] = useState<WhiteoutAnnotation[]>(page.annotations.whiteouts || []);
  const [drawings, setDrawings] = useState<DrawingAnnotation[]>(page.annotations.drawings || []);

  // History stack for undo/redo
  const [history, setHistory] = useState<Array<{
    textBoxes: TextBoxAnnotation[];
    whiteouts: WhiteoutAnnotation[];
    drawings: DrawingAnnotation[];
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Tool settings
  const [whiteoutMode, setWhiteoutMode] = useState<'rect' | 'brush'>('rect');
  const [whiteoutColor, setWhiteoutColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(16);

  // Text formatting
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(16);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [textBgColor, setTextBgColor] = useState<string>('transparent');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse interaction state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [currentBrushPoints, setCurrentBrushPoints] = useState<{ x: number; y: number }[]>([]);

  // Sync state when page changes
  useEffect(() => {
    setTextBoxes(page.annotations.textBoxes || []);
    setWhiteouts(page.annotations.whiteouts || []);
    setDrawings(page.annotations.drawings || []);
    setSelectedId(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, [page.id]);

  // Push state to history
  const pushHistory = useCallback((
    newTexts: TextBoxAnnotation[], 
    newWhiteouts: WhiteoutAnnotation[], 
    newDrawings: DrawingAnnotation[]
  ) => {
    setHistory(prev => {
      const slice = prev.slice(0, historyIndex + 1);
      return [...slice, { textBoxes: newTexts, whiteouts: newWhiteouts, drawings: newDrawings }];
    });
    setHistoryIndex(prev => prev + 1);
    onUpdatePageAnnotations(page.id, {
      textBoxes: newTexts,
      whiteouts: newWhiteouts,
      drawings: newDrawings
    });
  }, [historyIndex, page.id, onUpdatePageAnnotations]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setTextBoxes(target.textBoxes);
      setWhiteouts(target.whiteouts);
      setDrawings(target.drawings);
      setHistoryIndex(historyIndex - 1);
      onUpdatePageAnnotations(page.id, target);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setTextBoxes(target.textBoxes);
      setWhiteouts(target.whiteouts);
      setDrawings(target.drawings);
      setHistoryIndex(historyIndex + 1);
      onUpdatePageAnnotations(page.id, target);
    }
  };

  // Render PDF page to background canvas
  useEffect(() => {
    let isCancelled = false;
    async function renderPage() {
      if (!pdfDocProxy || !pdfCanvasRef.current) return;

      try {
        const pdfPage = await pdfDocProxy.getPage(page.originalPageIndex + 1);
        if (isCancelled) return;

        const viewport = pdfPage.getViewport({ scale: zoom * 1.5, rotation: page.rotation || 0 });
        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / 1.5}px`;
        canvas.style.height = `${viewport.height / 1.5}px`;

        await pdfPage.render({
          canvasContext: ctx,
          viewport
        }).promise;

        // Also size overlay canvas identically
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = viewport.width;
          overlayCanvasRef.current.height = viewport.height;
          overlayCanvasRef.current.style.width = `${viewport.width / 1.5}px`;
          overlayCanvasRef.current.style.height = `${viewport.height / 1.5}px`;
          drawOverlayCanvas();
        }
      } catch (err) {
        console.error('Failed to render PDF page on canvas:', err);
      }
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDocProxy, page.originalPageIndex, page.rotation, zoom]);

  // Draw freehand whiteouts and brush strokes on the overlay canvas
  const drawOverlayCanvas = useCallback(() => {
    if (!overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved brush whiteouts
    const brushWhiteouts = whiteouts.filter(w => w.type === 'brush' && w.points && w.points.length > 0);
    for (const b of brushWhiteouts) {
      if (!b.points || b.points.length === 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = b.color || '#ffffff';
      ctx.lineWidth = (b.strokeWidth || 16) * (canvas.width / 600);

      const first = b.points[0];
      ctx.moveTo((first.x / 100) * canvas.width, (first.y / 100) * canvas.height);
      for (let i = 1; i < b.points.length; i++) {
        const pt = b.points[i];
        ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw saved drawings / highlighters
    for (const d of drawings) {
      if (!d.points || d.points.length === 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = d.color || '#000000';
      ctx.globalAlpha = d.opacity || 1;
      ctx.lineWidth = (d.strokeWidth || 4) * (canvas.width / 600);

      const first = d.points[0];
      ctx.moveTo((first.x / 100) * canvas.width, (first.y / 100) * canvas.height);
      for (let i = 1; i < d.points.length; i++) {
        const pt = d.points[i];
        ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw active drawing brush points
    if (currentBrushPoints.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = activeTool === 'whiteout_brush' ? whiteoutColor : activeTool === 'highlighter' ? '#facc15' : '#000000';
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1;
      const strokeSize = activeTool === 'whiteout_brush' ? brushSize : activeTool === 'highlighter' ? 24 : 3;
      ctx.lineWidth = strokeSize * (canvas.width / 600);

      const first = currentBrushPoints[0];
      ctx.moveTo((first.x / 100) * canvas.width, (first.y / 100) * canvas.height);
      for (let i = 1; i < currentBrushPoints.length; i++) {
        const pt = currentBrushPoints[i];
        ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [whiteouts, drawings, currentBrushPoints, activeTool, whiteoutColor, brushSize]);

  useEffect(() => {
    drawOverlayCanvas();
  }, [drawOverlayCanvas]);

  // Convert mouse event coordinates to percentage (0 - 100) relative to page container
  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking on text box content or handle, let the element handle it
    if ((e.target as HTMLElement).closest('.annotation-interactive')) {
      return;
    }

    const { x, y } = getRelativeCoords(e);
    setIsMouseDown(true);
    setDragStart({ x, y });

    if (activeTool === 'textbox') {
      // Create new text box at click position
      const newBox: TextBoxAnnotation = {
        id: generateId(),
        x,
        y,
        width: 32, // default 32% of page width
        height: 8,  // default 8% height
        text: 'Click to type text...',
        fontSize,
        fontFamily,
        color: textColor,
        backgroundColor: textBgColor,
        isBold,
        isItalic,
        align: textAlign
      };
      const updated = [...textBoxes, newBox];
      setTextBoxes(updated);
      setSelectedId(newBox.id);
      pushHistory(updated, whiteouts, drawings);
      setActiveTool('select');
      setIsMouseDown(false);
      setDragStart(null);
    } else if (activeTool === 'whiteout_rect') {
      setCurrentDragRect({ x, y, w: 0, h: 0 });
    } else if (activeTool === 'whiteout_brush' || activeTool === 'draw' || activeTool === 'highlighter') {
      setCurrentBrushPoints([{ x, y }]);
    } else if (activeTool === 'select') {
      setSelectedId(null);
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !dragStart) return;
    const { x, y } = getRelativeCoords(e);

    if (activeTool === 'whiteout_rect') {
      const rx = Math.min(dragStart.x, x);
      const ry = Math.min(dragStart.y, y);
      const rw = Math.abs(x - dragStart.x);
      const rh = Math.abs(y - dragStart.y);
      setCurrentDragRect({ x: rx, y: ry, w: rw, h: rh });
    } else if (activeTool === 'whiteout_brush' || activeTool === 'draw' || activeTool === 'highlighter') {
      setCurrentBrushPoints(prev => [...prev, { x, y }]);
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    if (activeTool === 'whiteout_rect' && currentDragRect) {
      if (currentDragRect.w > 1 && currentDragRect.h > 1) {
        const newWhiteout: WhiteoutAnnotation = {
          id: generateId(),
          type: 'rect',
          x: currentDragRect.x,
          y: currentDragRect.y,
          width: currentDragRect.w,
          height: currentDragRect.h,
          color: whiteoutColor
        };
        const updated = [...whiteouts, newWhiteout];
        setWhiteouts(updated);
        setSelectedId(newWhiteout.id);
        pushHistory(textBoxes, updated, drawings);
      }
      setCurrentDragRect(null);
    } else if (activeTool === 'whiteout_brush' && currentBrushPoints.length > 0) {
      const newBrush: WhiteoutAnnotation = {
        id: generateId(),
        type: 'brush',
        points: currentBrushPoints,
        strokeWidth: brushSize,
        color: whiteoutColor
      };
      const updated = [...whiteouts, newBrush];
      setWhiteouts(updated);
      pushHistory(textBoxes, updated, drawings);
      setCurrentBrushPoints([]);
    } else if ((activeTool === 'draw' || activeTool === 'highlighter') && currentBrushPoints.length > 0) {
      const isHigh = activeTool === 'highlighter';
      const newDraw: DrawingAnnotation = {
        id: generateId(),
        type: isHigh ? 'highlighter' : 'pen',
        points: currentBrushPoints,
        color: isHigh ? '#facc15' : textColor,
        strokeWidth: isHigh ? 24 : 3,
        opacity: isHigh ? 0.4 : 1
      };
      const updated = [...drawings, newDraw];
      setDrawings(updated);
      pushHistory(textBoxes, whiteouts, updated);
      setCurrentBrushPoints([]);
    }

    setDragStart(null);
  };

  // Delete selected annotation
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const newTexts = textBoxes.filter(t => t.id !== selectedId);
    const newWhiteouts = whiteouts.filter(w => w.id !== selectedId);
    const newDrawings = drawings.filter(d => d.id !== selectedId);

    setTextBoxes(newTexts);
    setWhiteouts(newWhiteouts);
    setDrawings(newDrawings);
    setSelectedId(null);
    pushHistory(newTexts, newWhiteouts, newDrawings);
  };

  // Clear all annotations on this page
  const handleClearAll = () => {
    if (window.confirm("Clear all text boxes and whiteout eraser masks from this page?")) {
      setTextBoxes([]);
      setWhiteouts([]);
      setDrawings([]);
      setSelectedId(null);
      pushHistory([], [], []);
    }
  };

  // Update text box properties
  const updateSelectedTextBox = (changes: Partial<TextBoxAnnotation>) => {
    if (!selectedId) return;
    const updated = textBoxes.map(t => t.id === selectedId ? { ...t, ...changes } : t);
    setTextBoxes(updated);
    pushHistory(updated, whiteouts, drawings);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing inside textarea or input
      if (['TEXTAREA', 'INPUT'].includes((document.activeElement as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('textbox');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('whiteout_rect');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentPageIndex > 0) onPageChange(currentPageIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPageIndex < totalPages - 1) onPageChange(currentPageIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, currentPageIndex, totalPages, textBoxes, whiteouts, drawings]);

  const selectedTextBox = textBoxes.find(t => t.id === selectedId);
  const selectedWhiteout = whiteouts.find(w => w.id === selectedId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 select-none">
      {/* Top Main Toolbar */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Navigation & Page Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOrganizer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            title="Return to Page Organizer grid view"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Pages Grid</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Page stepper */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => onPageChange(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-850"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-200 px-2 min-w-[75px] text-center">
              {currentPageIndex + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPageIndex + 1)}
              disabled={currentPageIndex === totalPages - 1}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-850"
              title="Next Page (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onRotatePage(page.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Rotate this page 90° clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Tool Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 shadow-inner">
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Select & Move tool (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          {/* Eraser / Whiteout Tool */}
          <button
            onClick={() => {
              setActiveTool('whiteout_rect');
              setWhiteoutMode('rect');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'whiteout_rect' || activeTool === 'whiteout_brush'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Eraser / Whiteout Paint tool (E) - Mask off existing text with white paint"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser (Whiteout)</span>
          </button>

          {/* Text Box Tool */}
          <button
            onClick={() => setActiveTool('textbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'textbox'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Add Text Box tool (T)"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text Box</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => setActiveTool('highlighter')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Highlighter tool"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Highlight</span>
          </button>

          {/* Draw / Sign */}
          <button
            onClick={() => setActiveTool('draw')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'draw'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Freehand Signature / Pen tool"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pen / Sign</span>
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-850"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-850"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-850"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-slate-300 px-2 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-850"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Clear annotations */}
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 transition-colors"
            title="Clear all annotations on this page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Secondary Context Toolbar (Changes based on active tool or selection) */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* If Eraser / Whiteout Tool is active */}
        {(activeTool === 'whiteout_rect' || activeTool === 'whiteout_brush') && (
          <div className="flex items-center gap-3">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Eraser className="w-3.5 h-3.5" />
              <span>Whiteout Eraser:</span>
            </span>

            {/* Sub-mode: Box vs Brush */}
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={() => {
                  setActiveTool('whiteout_rect');
                  setWhiteoutMode('rect');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  whiteoutMode === 'rect' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-3 h-3" />
                <span>Drag Box to Mask</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('whiteout_brush');
                  setWhiteoutMode('brush');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  whiteoutMode === 'brush' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>Freehand Paint</span>
              </button>
            </div>

            {/* Brush Size Slider (if brush mode) */}
            {whiteoutMode === 'brush' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Brush Size:</span>
                <input
                  type="range"
                  min="6"
                  max="48"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 accent-rose-500"
                />
                <span className="font-mono text-slate-300">{brushSize}px</span>
              </div>
            )}

            {/* Mask Color Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Mask Color:</span>
              <button
                onClick={() => setWhiteoutColor('#ffffff')}
                className={`w-5 h-5 rounded-full border bg-white ${
                  whiteoutColor === '#ffffff' ? 'ring-2 ring-rose-500 border-white' : 'border-slate-600'
                }`}
                title="Pure White (#FFFFFF)"
              />
              <button
                onClick={() => setWhiteoutColor('#faf8f5')}
                className={`w-5 h-5 rounded-full border bg-[#faf8f5] ${
                  whiteoutColor === '#faf8f5' ? 'ring-2 ring-rose-500 border-white' : 'border-slate-600'
                }`}
                title="Warm Paper (#FAF8F5)"
              />
              <button
                onClick={() => setWhiteoutColor('#f3f4f6')}
                className={`w-5 h-5 rounded-full border bg-[#f3f4f6] ${
                  whiteoutColor === '#f3f4f6' ? 'ring-2 ring-rose-500 border-white' : 'border-slate-600'
                }`}
                title="Off-White Cool (#F3F4F6)"
              />
              <input
                type="color"
                value={whiteoutColor}
                onChange={(e) => setWhiteoutColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                title="Pick custom background matching color"
              />
            </div>
          </div>
        )}

        {/* If Text Box Tool or a Text Box is selected */}
        {(activeTool === 'textbox' || selectedTextBox) && (
          <div className="flex items-center flex-wrap gap-3">
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              <span>Text Format:</span>
            </span>

            {/* Font Family */}
            <select
              value={selectedTextBox ? selectedTextBox.fontFamily : fontFamily}
              onChange={(e) => {
                const val = e.target.value as any;
                setFontFamily(val);
                if (selectedTextBox) updateSelectedTextBox({ fontFamily: val });
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs"
            >
              <option value="Helvetica">Helvetica (Sans)</option>
              <option value="TimesRoman">Times New Roman (Serif)</option>
              <option value="Courier">Courier (Monospace)</option>
            </select>

            {/* Font Size */}
            <select
              value={selectedTextBox ? selectedTextBox.fontSize : fontSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFontSize(val);
                if (selectedTextBox) updateSelectedTextBox({ fontSize: val });
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs"
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 36, 48].map(s => (
                <option key={s} value={s}>{s} pt</option>
              ))}
            </select>

            {/* Bold / Italic */}
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
              <button
                onClick={() => {
                  const val = selectedTextBox ? !selectedTextBox.isBold : !isBold;
                  setIsBold(val);
                  if (selectedTextBox) updateSelectedTextBox({ isBold: val });
                }}
                className={`p-1 rounded ${
                  (selectedTextBox ? selectedTextBox.isBold : isBold) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Bold"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const val = selectedTextBox ? !selectedTextBox.isItalic : !isItalic;
                  setIsItalic(val);
                  if (selectedTextBox) updateSelectedTextBox({ isItalic: val });
                }}
                className={`p-1 rounded ${
                  (selectedTextBox ? selectedTextBox.isItalic : isItalic) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Italic"
              >
                <Italic className="w-3 h-3" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => {
                    setTextAlign(align);
                    if (selectedTextBox) updateSelectedTextBox({ align });
                  }}
                  className={`p-1 rounded ${
                    (selectedTextBox ? selectedTextBox.align : textAlign) === align ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Align ${align}`}
                >
                  {align === 'left' && <AlignLeft className="w-3 h-3" />}
                  {align === 'center' && <AlignCenter className="w-3 h-3" />}
                  {align === 'right' && <AlignRight className="w-3 h-3" />}
                </button>
              ))}
            </div>

            {/* Text Color */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Color:</span>
              <input
                type="color"
                value={selectedTextBox ? selectedTextBox.color : textColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setTextColor(val);
                  if (selectedTextBox) updateSelectedTextBox({ color: val });
                }}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                title="Text Color"
              />
            </div>

            {/* Background mask option (transparent vs solid white) */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400">Mask Underneath:</span>
              <button
                onClick={() => {
                  const val = (selectedTextBox ? selectedTextBox.backgroundColor : textBgColor) === 'transparent' ? '#ffffff' : 'transparent';
                  setTextBgColor(val);
                  if (selectedTextBox) updateSelectedTextBox({ backgroundColor: val });
                }}
                className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                  (selectedTextBox ? selectedTextBox.backgroundColor : textBgColor) !== 'transparent'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Enable solid white background to automatically cover underlying text"
              >
                {(selectedTextBox ? selectedTextBox.backgroundColor : textBgColor) !== 'transparent' ? 'Solid White (Masks Text)' : 'Transparent'}
              </button>
            </div>
          </div>
        )}

        {/* Selected Annotation Actions */}
        {selectedId && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-400">Selected Item:</span>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400 hover:text-red-300 font-medium"
              title="Delete selected item (Delete or Backspace)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative bg-slate-950"
      >
        {/* Document Page Wrapper with Shadow */}
        <div 
          className="relative shadow-2xl transition-all duration-100 ease-out border border-slate-800 bg-white"
          style={{
            cursor: activeTool === 'whiteout_rect' 
              ? 'crosshair' 
              : activeTool === 'whiteout_brush' || activeTool === 'draw' || activeTool === 'highlighter' 
                ? 'crosshair' 
                : activeTool === 'textbox' 
                  ? 'text' 
                  : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Base PDF Render Canvas */}
          <canvas ref={pdfCanvasRef} className="block pointer-events-none" />

          {/* Interactive Overlay Layer */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay canvas for freehand eraser / brush strokes */}
            <canvas ref={overlayCanvasRef} className="absolute inset-0 pointer-events-none" />

            {/* Render Saved Whiteout Rectangles */}
            {whiteouts.filter(w => w.type === 'rect').map(w => {
              const isSelected = selectedId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(w.id);
                  }}
                  className={`absolute annotation-interactive transition-shadow ${
                    isSelected ? 'ring-2 ring-rose-500 shadow-lg' : 'hover:ring-1 hover:ring-rose-400/50'
                  }`}
                  style={{
                    left: `${w.x}%`,
                    top: `${w.y}%`,
                    width: `${w.width}%`,
                    height: `${w.height}%`,
                    backgroundColor: w.color || '#ffffff',
                    cursor: activeTool === 'select' ? 'pointer' : 'default'
                  }}
                >
                  {/* Subtle label when selected */}
                  {isSelected && (
                    <div className="absolute -top-5 left-0 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
                      Whiteout Mask
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Active Dragging Whiteout Rectangle Preview */}
            {currentDragRect && (
              <div
                className="absolute border-2 border-dashed border-rose-500 pointer-events-none"
                style={{
                  left: `${currentDragRect.x}%`,
                  top: `${currentDragRect.y}%`,
                  width: `${currentDragRect.w}%`,
                  height: `${currentDragRect.h}%`,
                  backgroundColor: `${whiteoutColor}CC`
                }}
              />
            )}

            {/* Render Text Boxes */}
            {textBoxes.map(t => {
              const isSelected = selectedId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(t.id);
                  }}
                  className={`absolute annotation-interactive group transition-shadow ${
                    isSelected ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:ring-1 hover:ring-indigo-400/50'
                  }`}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: `${t.width}%`,
                    minHeight: `${t.height}%`,
                    backgroundColor: t.backgroundColor || 'transparent',
                    cursor: activeTool === 'select' ? 'move' : 'text'
                  }}
                >
                  {/* Textarea for live direct typing */}
                  <textarea
                    value={t.text}
                    onChange={(e) => {
                      const newText = e.target.value;
                      const updated = textBoxes.map(box => box.id === t.id ? { ...box, text: newText } : box);
                      setTextBoxes(updated);
                      pushHistory(updated, whiteouts, drawings);
                    }}
                    onFocus={() => setSelectedId(t.id)}
                    className="w-full h-full min-h-[32px] resize-none outline-none bg-transparent p-1 leading-tight"
                    style={{
                      color: t.color || '#000000',
                      fontSize: `${t.fontSize * zoom}px`,
                      fontFamily: t.fontFamily === 'Courier' ? 'Courier, monospace' : t.fontFamily === 'TimesRoman' ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif',
                      fontWeight: t.isBold ? 'bold' : 'normal',
                      fontStyle: t.isItalic ? 'italic' : 'normal',
                      textAlign: t.align || 'left'
                    }}
                  />

                  {/* Drag & Resize Handle */}
                  {isSelected && (
                    <div className="absolute -top-5 left-0 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <span>Text Box</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSelected();
                        }}
                        className="hover:text-red-200 ml-1"
                        title="Delete this text box"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
