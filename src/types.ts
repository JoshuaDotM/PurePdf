export interface TextBoxAnnotation {
  id: string;
  x: number; // percentage (0 - 100) or absolute pts in PDF coordinates
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  text: string;
  fontSize: number; // in pt (e.g. 14, 18, 24)
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
  color: string; // hex
  backgroundColor: string; // 'transparent', '#ffffff', etc.
  isBold: boolean;
  isItalic: boolean;
  align: 'left' | 'center' | 'right';
}

export interface WhiteoutAnnotation {
  id: string;
  type: 'rect' | 'brush';
  // For 'rect' mode:
  x?: number; // percentage (0 - 100)
  y?: number; // percentage (0 - 100)
  width?: number; // percentage (0 - 100)
  height?: number; // percentage (0 - 100)
  // For 'brush' mode:
  points?: { x: number; y: number }[]; // array of percentage points (0 - 100)
  strokeWidth?: number; // stroke width relative to page width (e.g. 10 to 40)
  color: string; // '#ffffff' by default, or sampled background color
}

export interface DrawingAnnotation {
  id: string;
  type: 'pen' | 'highlighter' | 'shape';
  points?: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType?: 'rect' | 'circle' | 'line';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PDFPageItem {
  id: string; // unique page instance identifier (uuid)
  sourceDocId: string; // identifier of source document for multi-doc merge
  sourceFileName?: string; // name of source file
  originalPageIndex: number; // 0-indexed reference in source PDF
  pageNumber: number; // visual index 1..N
  rotation: number; // 0, 90, 180, 270
  width: number; // in PDF points (e.g. 595.28)
  height: number; // in PDF points (e.g. 841.89)
  aspectRatio: number; // width / height
  thumbnailUrl: string; // Data URL preview
  annotations: {
    textBoxes: TextBoxAnnotation[];
    whiteouts: WhiteoutAnnotation[];
    drawings: DrawingAnnotation[];
  };
}

export type EditorViewMode = 'organizer' | 'canvas';

export type CanvasTool = 
  | 'select' 
  | 'textbox' 
  | 'whiteout_rect' 
  | 'whiteout_brush' 
  | 'draw' 
  | 'highlighter';

export interface DocumentMeta {
  fileName: string;
  fileSize: number;
  totalPages: number;
  isModified: boolean;
}
