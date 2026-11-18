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

const HIGHLIGHTER_COLORS = [
  { name: 'Yellow', hex: '#fde047', label: 'Classic Yellow' },
  { name: 'Lime Green', hex: '#86efac', label: 'Neon Green' },
  { name: 'Sky Cyan', hex: '#67e8f9', label: 'Sky Cyan' },
  { name: 'Pastel Pink', hex: '#f472b6', label: 'Pastel Pink' },
  { name: 'Neon Orange', hex: '#fb923c', label: 'Neon Orange' },
  { name: 'Lavender', hex: '#c084fc', label: 'Lavender Purple' },
];

const PEN_COLORS = [
  { name: 'Black', hex: '#000000', label: 'Black' },
  { name: 'Dark Blue', hex: '#1d4ed8', label: 'Navy Blue' },
  { name: 'Crimson Red', hex: '#dc2626', label: 'Crimson Red' },
  { name: 'Forest Green', hex: '#16a34a', label: 'Forest Green' },
  { name: 'Graphite', hex: '#475569', label: 'Graphite' },
];

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

  // Highlighter settings
  const [highlighterMode, setHighlighterMode] = useState<'rect' | 'brush'>('rect');
  const [highlighterColor, setHighlighterColor] = useState<string>('#fde047');
  const [highlighterWidth, setHighlighterWidth] = useState<number>(24);
  const [highlighterOpacity, setHighlighterOpacity] = useState<number>(0.38);

  // Pen settings
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penWidth, setPenWidth] = useState<number>(3);

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

    // Draw saved drawings / freehand highlighters (rect highlights are in the DOM)
    for (const d of drawings) {
      if (d.shapeType === 'rect') continue;
      if (!d.points || d.points.length === 0) continue;
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = d.color || '#000000';
      ctx.globalAlpha = d.opacity ?? (d.type === 'highlighter' ? 0.38 : 1);
      if (d.type === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
      }
      ctx.lineWidth = (d.strokeWidth || (d.type === 'highlighter' ? 24 : 3)) * (canvas.width / 600);

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
      if (activeTool === 'whiteout_brush') {
        ctx.strokeStyle = whiteoutColor;
        ctx.globalAlpha = 1;
        ctx.lineWidth = brushSize * (canvas.width / 600);
      } else if (activeTool === 'highlighter') {
        ctx.strokeStyle = highlighterColor;
        ctx.globalAlpha = highlighterOpacity;
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineWidth = highlighterWidth * (canvas.width / 600);
      } else {
        // activeTool === 'draw'
        ctx.strokeStyle = penColor;
        ctx.globalAlpha = 1;
        ctx.lineWidth = penWidth * (canvas.width / 600);
      }

      const first = currentBrushPoints[0];
      ctx.moveTo((first.x / 100) * canvas.width, (first.y / 100) * canvas.height);
      for (let i = 1; i < currentBrushPoints.length; i++) {
        const pt = currentBrushPoints[i];
        ctx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [
    whiteouts, 
    drawings, 
    currentBrushPoints, 
    activeTool, 
    whiteoutColor, 
    brushSize, 
    highlighterColor, 
    highlighterOpacity, 
    highlighterWidth, 
    penColor, 
    penWidth
  ]);

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
    } else if (activeTool === 'highlighter') {
      if (highlighterMode === 'rect') {
        setCurrentDragRect({ x, y, w: 0, h: 0 });
      } else {
        setCurrentBrushPoints([{ x, y }]);
      }
    } else if (activeTool === 'whiteout_brush' || activeTool === 'draw') {
      setCurrentBrushPoints([{ x, y }]);
    } else if (activeTool === 'select') {
      setSelectedId(null);
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !dragStart) return;
    const { x, y } = getRelativeCoords(e);

    if (activeTool === 'whiteout_rect' || (activeTool === 'highlighter' && highlighterMode === 'rect')) {
      const rx = Math.min(dragStart.x, x);
      const ry = Math.min(dragStart.y, y);
      const rw = Math.abs(x - dragStart.x);
      const rh = Math.abs(y - dragStart.y);
      setCurrentDragRect({ x: rx, y: ry, w: rw, h: rh });
    } else if (
      activeTool === 'whiteout_brush' || 
      activeTool === 'draw' || 
      (activeTool === 'highlighter' && highlighterMode === 'brush')
    ) {
      setCurrentBrushPoints(prev => [...prev, { x, y }]);
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    if (activeTool === 'whiteout_rect' && currentDragRect) {
      if (currentDragRect.w > 0.5 && currentDragRect.h > 0.5) {
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
    } else if (activeTool === 'highlighter' && highlighterMode === 'rect' && currentDragRect) {
      if (currentDragRect.w > 0.5 && currentDragRect.h > 0.5) {
        const newHighlight: DrawingAnnotation = {
          id: generateId(),
          type: 'highlighter',
          shapeType: 'rect',
          x: currentDragRect.x,
          y: currentDragRect.y,
          width: currentDragRect.w,
          height: currentDragRect.h,
          color: highlighterColor,
          strokeWidth: highlighterWidth,
          opacity: highlighterOpacity
        };
        const updated = [...drawings, newHighlight];
        setDrawings(updated);
        setSelectedId(newHighlight.id);
        pushHistory(textBoxes, whiteouts, updated);
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
    } else if (activeTool === 'highlighter' && highlighterMode === 'brush' && currentBrushPoints.length > 0) {
      const newHighlight: DrawingAnnotation = {
        id: generateId(),
        type: 'highlighter',
        points: currentBrushPoints,
        color: highlighterColor,
        strokeWidth: highlighterWidth,
        opacity: highlighterOpacity
      };
      const updated = [...drawings, newHighlight];
      setDrawings(updated);
      pushHistory(textBoxes, whiteouts, updated);
      setCurrentBrushPoints([]);
    } else if (activeTool === 'draw' && currentBrushPoints.length > 0) {
      const newDraw: DrawingAnnotation = {
        id: generateId(),
        type: 'pen',
        points: currentBrushPoints,
        color: penColor,
        strokeWidth: penWidth,
        opacity: 1
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
    if (window.confirm("Clear all text boxes, whiteout masks, and highlights from this page?")) {
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

  // Update drawing / highlighter properties
  const updateSelectedDrawing = (changes: Partial<DrawingAnnotation>) => {
    if (!selectedId) return;
    const updated = drawings.map(d => d.id === selectedId ? { ...d, ...changes } : d);
    setDrawings(updated);
    pushHistory(textBoxes, whiteouts, updated);
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
        setWhiteoutMode('rect');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('highlighter');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('draw');
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
  const selectedDrawing = drawings.find(d => d.id === selectedId);
  const isHighlighterSelected = selectedDrawing?.type === 'highlighter';
  const isPenSelected = selectedDrawing?.type === 'pen';

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

        {/* If Highlighter Tool is active OR a Highlighter is selected */}
        {(activeTool === 'highlighter' || isHighlighterSelected) && (
          <div className="flex items-center flex-wrap gap-3">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Highlighter className="w-3.5 h-3.5" />
              <span>{isHighlighterSelected && activeTool === 'select' ? 'Highlight Selected:' : 'Highlighter:'}</span>
            </span>

            {/* Sub-mode: Straight Box vs Freehand Marker */}
            {activeTool === 'highlighter' && (
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                <button
                  onClick={() => setHighlighterMode('rect')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    highlighterMode === 'rect' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Straight Box: Drag across text lines to create clean rectangular highlights"
                >
                  <Square className="w-3 h-3" />
                  <span>Text Line Box</span>
                </button>
                <button
                  onClick={() => setHighlighterMode('brush')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    highlighterMode === 'brush' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Freehand Marker: Draw and circle text freely"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Freehand Marker</span>
                </button>
              </div>
            )}

            {/* Color Palette Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Color:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {HIGHLIGHTER_COLORS.map(c => {
                  const currentColor = isHighlighterSelected && selectedDrawing?.color 
                    ? selectedDrawing.color 
                    : highlighterColor;
                  const isActive = currentColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => {
                        setHighlighterColor(c.hex);
                        if (isHighlighterSelected) {
                          updateSelectedDrawing({ color: c.hex });
                        }
                      }}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        isActive ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 scale-110 shadow' : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  );
                })}
                <input
                  type="color"
                  value={isHighlighterSelected && selectedDrawing?.color ? selectedDrawing.color : highlighterColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHighlighterColor(val);
                    if (isHighlighterSelected) {
                      updateSelectedDrawing({ color: val });
                    }
                  }}
                  className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 ml-0.5"
                  title="Custom highlighter color"
                />
              </div>
            </div>

            {/* Thickness / Stroke Size (if brush mode or selected brush) */}
            {(highlighterMode === 'brush' || (isHighlighterSelected && !selectedDrawing?.shapeType)) && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Width:</span>
                <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                  {[
                    { label: 'Fine', size: 14 },
                    { label: 'Medium', size: 24 },
                    { label: 'Broad', size: 36 }
                  ].map(preset => (
                    <button
                      key={preset.size}
                      onClick={() => {
                        setHighlighterWidth(preset.size);
                        if (isHighlighterSelected) {
                          updateSelectedDrawing({ strokeWidth: preset.size });
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        (isHighlighterSelected && selectedDrawing?.strokeWidth ? selectedDrawing.strokeWidth : highlighterWidth) === preset.size
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={isHighlighterSelected && selectedDrawing?.strokeWidth ? selectedDrawing.strokeWidth : highlighterWidth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHighlighterWidth(val);
                    if (isHighlighterSelected) {
                      updateSelectedDrawing({ strokeWidth: val });
                    }
                  }}
                  className="w-16 accent-amber-500"
                  title="Adjust stroke thickness"
                />
                <span className="font-mono text-slate-300 min-w-[28px] text-right">
                  {isHighlighterSelected && selectedDrawing?.strokeWidth ? selectedDrawing.strokeWidth : highlighterWidth}px
                </span>
              </div>
            )}

            {/* Opacity Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Intensity:</span>
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                {[
                  { label: 'Soft', val: 0.25 },
                  { label: 'Balanced', val: 0.38 },
                  { label: 'Vivid', val: 0.60 }
                ].map(op => {
                  const currentOp = isHighlighterSelected && selectedDrawing?.opacity !== undefined 
                    ? selectedDrawing.opacity 
                    : highlighterOpacity;
                  const isMatch = Math.abs(currentOp - op.val) < 0.05;
                  return (
                    <button
                      key={op.label}
                      onClick={() => {
                        setHighlighterOpacity(op.val);
                        if (isHighlighterSelected) {
                          updateSelectedDrawing({ opacity: op.val });
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        isMatch
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Helpful tip */}
            {activeTool === 'highlighter' && (
              <span className="hidden xl:inline-block text-[11px] text-amber-300/70 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded ml-auto">
                {highlighterMode === 'rect' ? '💡 Click & drag across any text to draw straight highlight boxes' : '💡 Draw freehand markers with smooth semi-transparent ink'}
              </span>
            )}
          </div>
        )}

        {/* If Pen / Draw tool is active OR a Pen drawing is selected */}
        {(activeTool === 'draw' || isPenSelected) && (
          <div className="flex items-center flex-wrap gap-3">
            <span className="font-semibold text-blue-400 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" />
              <span>Pen / Sign:</span>
            </span>

            {/* Pen Color Palette */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Ink Color:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {PEN_COLORS.map(c => {
                  const currentColor = isPenSelected && selectedDrawing?.color ? selectedDrawing.color : penColor;
                  const isActive = currentColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => {
                        setPenColor(c.hex);
                        if (isPenSelected) {
                          updateSelectedDrawing({ color: c.hex });
                        }
                      }}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        isActive ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 scale-110 shadow' : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  );
                })}
                <input
                  type="color"
                  value={isPenSelected && selectedDrawing?.color ? selectedDrawing.color : penColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPenColor(val);
                    if (isPenSelected) {
                      updateSelectedDrawing({ color: val });
                    }
                  }}
                  className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 ml-0.5"
                  title="Custom pen ink color"
                />
              </div>
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Nib Size:</span>
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                {[
                  { label: 'Fine (2px)', size: 2 },
                  { label: 'Medium (4px)', size: 4 },
                  { label: 'Broad (8px)', size: 8 }
                ].map(preset => (
                  <button
                    key={preset.size}
                    onClick={() => {
                      setPenWidth(preset.size);
                      if (isPenSelected) {
                        updateSelectedDrawing({ strokeWidth: preset.size });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      (isPenSelected && selectedDrawing?.strokeWidth ? selectedDrawing.strokeWidth : penWidth) === preset.size
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="16"
                value={isPenSelected && selectedDrawing?.strokeWidth ? selectedDrawing.strokeWidth : penWidth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPenWidth(val);
                  if (isPenSelected) {
                    updateSelectedDrawing({ strokeWidth: val });
                  }
                }}
                className="w-16 accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* If Select tool is active and nothing is selected */}
        {activeTool === 'select' && !selectedId && (
          <div className="flex items-center gap-2 text-slate-400">
            <MousePointer className="w-3.5 h-3.5 text-blue-400" />
            <span>Select mode: Click on any text box, whiteout mask, or highlight on the page to adjust or delete it.</span>
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
            cursor: (activeTool === 'whiteout_rect' || (activeTool === 'highlighter' && highlighterMode === 'rect')) 
              ? 'crosshair' 
              : (activeTool === 'whiteout_brush' || activeTool === 'draw' || (activeTool === 'highlighter' && highlighterMode === 'brush')) 
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

            {/* Render Saved Rectangle Highlights */}
            {drawings.filter(d => d.type === 'highlighter' && d.shapeType === 'rect').map(d => {
              const isSelected = selectedId === d.id;
              return (
                <div
                  key={d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(d.id);
                  }}
                  className={`absolute annotation-interactive group transition-all rounded-[2px] ${
                    isSelected ? 'ring-2 ring-amber-400 shadow-md' : 'hover:ring-1 hover:ring-amber-300/60'
                  }`}
                  style={{
                    left: `${d.x}%`,
                    top: `${d.y}%`,
                    width: `${d.width}%`,
                    height: `${d.height}%`,
                    backgroundColor: d.color || '#fde047',
                    opacity: d.opacity ?? 0.38,
                    mixBlendMode: 'multiply',
                    cursor: activeTool === 'select' ? 'pointer' : 'default'
                  }}
                  title="Highlighted text"
                >
                  {/* Label when selected */}
                  {isSelected && (
                    <div className="absolute -top-5 left-0 bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 pointer-events-auto">
                      <span>Highlight</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSelected();
                        }}
                        className="hover:text-red-950 font-black ml-1 text-xs"
                        title="Delete this highlight"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Active Dragging Rectangle Preview */}
            {currentDragRect && (
              <div
                className={`absolute border-2 border-dashed pointer-events-none rounded-[2px] ${
                  activeTool === 'highlighter' ? 'border-amber-400' : 'border-rose-500'
                }`}
                style={{
                  left: `${currentDragRect.x}%`,
                  top: `${currentDragRect.y}%`,
                  width: `${currentDragRect.w}%`,
                  height: `${currentDragRect.h}%`,
                  backgroundColor: activeTool === 'highlighter' ? highlighterColor : `${whiteoutColor}CC`,
                  opacity: activeTool === 'highlighter' ? highlighterOpacity : 0.85,
                  mixBlendMode: activeTool === 'highlighter' ? 'multiply' : 'normal'
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
