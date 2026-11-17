import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import { PDFPageItem, TextBoxAnnotation, WhiteoutAnnotation, DrawingAnnotation } from '../types';

// Generate a random ID
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

// Convert Hex string #RRGGBB to PDF-lib rgb(0..1, 0..1, 0..1)
export function hexToRgb(hex: string) {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

// Load and parse PDF into page models with rendered thumbnails
export async function loadPdfPages(
  arrayBuffer: ArrayBuffer,
  sourceDocId: string = 'doc_primary',
  sourceFileName: string = 'document.pdf'
): Promise<{
  pages: PDFPageItem[];
  pdfDocProxy: any;
}> {
  // Use a copy of the buffer so PDF.js doesn't detach the original
  const bufferCopy = arrayBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: bufferCopy });
  const pdfDocProxy = await loadingTask.promise;
  const numPages = pdfDocProxy.numPages;
  const pages: PDFPageItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocProxy.getPage(i);
    const originalViewport = page.getViewport({ scale: 1.0 });
    
    // Render a high-quality thumbnail (width ~ 320px)
    const thumbScale = Math.min(1.5, 320 / originalViewport.width);
    const thumbViewport = page.getViewport({ scale: thumbScale });
    
    const canvas = document.createElement('canvas');
    canvas.width = thumbViewport.width;
    canvas.height = thumbViewport.height;
    const ctx = canvas.getContext('2d');
    
    let thumbnailUrl = '';
    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport: thumbViewport
      }).promise;
      thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
    }

    pages.push({
      id: generateId(),
      sourceDocId,
      sourceFileName,
      originalPageIndex: i - 1, // 0-indexed for pdf-lib
      pageNumber: i,
      rotation: originalViewport.rotation || 0,
      width: originalViewport.width,
      height: originalViewport.height,
      aspectRatio: originalViewport.width / originalViewport.height,
      thumbnailUrl,
      annotations: {
        textBoxes: [],
        whiteouts: [],
        drawings: []
      }
    });
  }

  return { pages, pdfDocProxy };
}

// Generate a rich 3-page sample PDF for quick testing
export async function createSamplePdf(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // PAGE 1: Master Services Agreement / Contract
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width: p1W, height: p1H } = page1.getSize();

  // Header banner
  page1.drawRectangle({
    x: 0,
    y: p1H - 90,
    width: p1W,
    height: 90,
    color: rgb(0.08, 0.12, 0.22)
  });

  page1.drawText('NEXUS ENTERPRISE CONSULTING', {
    x: 40,
    y: p1H - 45,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page1.drawText('MASTER SERVICES AGREEMENT & STATEMENT OF WORK', {
    x: 40,
    y: p1H - 68,
    size: 10,
    font: fontRegular,
    color: rgb(0.6, 0.75, 1)
  });

  // Badge
  page1.drawRectangle({
    x: 40,
    y: p1H - 140,
    width: 140,
    height: 26,
    color: rgb(0.9, 0.94, 1)
  });
  page1.drawText('CONFIDENTIAL & BINDING', {
    x: 48,
    y: p1H - 132,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.35, 0.8)
  });

  // Metadata block
  page1.drawText('Agreement Ref: MSA-2026-X992', { x: 380, y: p1H - 128, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });
  page1.drawText('Effective Date: November 17, 2026', { x: 380, y: p1H - 144, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });

  // Body content
  let y = p1H - 190;
  page1.drawText('1. PARTIES & BACKGROUND', { x: 40, y, size: 13, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  
  y -= 25;
  const paragraph1 = 
    'This Agreement is entered into by Nexus Enterprise Solutions ("Provider") and Apex Dynamics Global ("Client").\n' +
    'The Provider agrees to provide high-performance cloud architecture and data pipeline automation services as detailed below.\n' +
    'Both parties acknowledge that the terms contained within this document are binding upon execution.';
  
  page1.drawText(paragraph1, {
    x: 40,
    y,
    size: 10,
    lineHeight: 16,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35)
  });

  y -= 70;
  page1.drawText('2. FINANCIAL CONSIDERATIONS & BUDGET', { x: 40, y, size: 13, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

  y -= 24;
  page1.drawText('Total Retainer Fee: $75,000 USD (Payable in 3 monthly installments)', {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.8, 0.2, 0.2) // highlighted red text - perfect for testing eraser / whiteout!
  });

  y -= 20;
  page1.drawText('Notice: You can use the PurePDF Eraser / Whiteout tool above to mask off this fee and add a custom text box!', {
    x: 40,
    y,
    size: 9,
    font: fontItalic,
    color: rgb(0.4, 0.45, 0.55)
  });

  y -= 40;
  page1.drawText('3. SCOPE OF SERVICES & DELIVERABLES', { x: 40, y, size: 13, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

  y -= 20;
  const deliverables = [
    'Deliverable A: Multi-region zero-downtime database failover cluster.',
    'Deliverable B: Real-time telemetry ingestion system with automated anomaly detection.',
    'Deliverable C: Comprehensive engineering documentation and team enablement workshops.',
    'Deliverable D: 24/7 dedicated escalation support during initial 90-day launch window.'
  ];

  for (const item of deliverables) {
    page1.drawText('•  ' + item, {
      x: 45,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35)
    });
    y -= 20;
  }

  // Footer
  page1.drawLine({
    start: { x: 40, y: 50 },
    end: { x: p1W - 40, y: 50 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92)
  });
  page1.drawText('PurePDF Studio Sample Document — Page 1 of 3', {
    x: 40,
    y: 35,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65)
  });


  // PAGE 2: Execution & Signatures
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2W, height: p2H } = page2.getSize();

  page2.drawRectangle({
    x: 0,
    y: p2H - 70,
    width: p2W,
    height: 70,
    color: rgb(0.12, 0.18, 0.3)
  });
  page2.drawText('SECTION 4: ACCEPTANCE & SIGNATURE CLAUSE', {
    x: 40,
    y: p2H - 42,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  let p2Y = p2H - 120;
  page2.drawText('By signing below, the authorized signatories affirm that they possess full authority to execute this contract.', {
    x: 40,
    y: p2Y,
    size: 10,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4)
  });

  // Provider Box
  p2Y -= 50;
  page2.drawRectangle({
    x: 40,
    y: p2Y - 140,
    width: 240,
    height: 160,
    color: rgb(0.97, 0.98, 1),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1
  });
  page2.drawText('PROVIDER: Nexus Enterprise Solutions', { x: 55, y: p2Y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page2.drawText('Representative: Alexander Wright, VP Solutions', { x: 55, y: p2Y - 25, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });
  page2.drawText('Signature: [ Alexander Wright ] (Verified)', { x: 55, y: p2Y - 70, size: 10, font: fontItalic, color: rgb(0.1, 0.4, 0.8) });
  page2.drawLine({ start: { x: 55, y: p2Y - 80 }, end: { x: 255, y: p2Y - 80 }, thickness: 1, color: rgb(0.7, 0.75, 0.85) });
  page2.drawText('Date: November 17, 2026', { x: 55, y: p2Y - 110, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });

  // Client Box (Empty, ready for user text box / signature!)
  page2.drawRectangle({
    x: 315,
    y: p2Y - 140,
    width: 240,
    height: 160,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1
  });
  page2.drawText('CLIENT: Apex Dynamics Global', { x: 330, y: p2Y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page2.drawText('Representative: [ Click "Add Text" to fill in ]', { x: 330, y: p2Y - 25, size: 9, font: fontItalic, color: rgb(0.5, 0.55, 0.65) });
  page2.drawText('Signature: (Place your signature or text box here)', { x: 330, y: p2Y - 70, size: 9, font: fontItalic, color: rgb(0.6, 0.65, 0.75) });
  page2.drawLine({ start: { x: 330, y: p2Y - 80 }, end: { x: 530, y: p2Y - 80 }, thickness: 1, color: rgb(0.7, 0.75, 0.85) });
  page2.drawText('Date: ________________________', { x: 330, y: p2Y - 110, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });

  // Additional instructions for testing
  p2Y -= 190;
  page2.drawRectangle({
    x: 40,
    y: p2Y - 100,
    width: 515,
    height: 110,
    color: rgb(0.94, 0.97, 0.94),
    borderColor: rgb(0.6, 0.8, 0.6),
    borderWidth: 1
  });
  page2.drawText('TESTING CHECKLIST FOR THIS PDF EDITOR:', { x: 55, y: p2Y - 15, size: 11, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
  page2.drawText('1. Delete Page: Go to the Organizer view and delete Page 3.', { x: 55, y: p2Y - 38, size: 9.5, font: fontRegular, color: rgb(0.2, 0.3, 0.2) });
  page2.drawText('2. Duplicate Page: Click "Duplicate" on Page 1 to create an exact copy.', { x: 55, y: p2Y - 56, size: 9.5, font: fontRegular, color: rgb(0.2, 0.3, 0.2) });
  page2.drawText('3. Reorder: Drag cards or click arrow buttons to reorder any page.', { x: 55, y: p2Y - 74, size: 9.5, font: fontRegular, color: rgb(0.2, 0.3, 0.2) });
  page2.drawText('4. Eraser & Text: Use Whiteout to cover text, then drop a Text Box with your name!', { x: 55, y: p2Y - 92, size: 9.5, font: fontRegular, color: rgb(0.2, 0.3, 0.2) });

  page2.drawLine({
    start: { x: 40, y: 50 },
    end: { x: p2W - 40, y: 50 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92)
  });
  page2.drawText('PurePDF Studio Sample Document — Page 2 of 3', {
    x: 40,
    y: 35,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65)
  });

  // PAGE 3: Appendix / Extra Page (Ideal to test deleting or moving to front)
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p3W, height: p3H } = page3.getSize();

  page3.drawRectangle({
    x: 0,
    y: p3H - 70,
    width: p3W,
    height: 70,
    color: rgb(0.4, 0.15, 0.2)
  });
  page3.drawText('APPENDIX A: DRAFT NOTES & SCRATCH SHEET', {
    x: 40,
    y: p3H - 42,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page3.drawText('Notice: This page is marked as a DRAFT page that can be deleted completely.', {
    x: 40,
    y: p3H - 120,
    size: 11,
    font: fontBold,
    color: rgb(0.7, 0.15, 0.15)
  });

  page3.drawText(
    'In real life workflows, you often receive PDF files containing unnecessary disclaimers, blank pages,\n' +
    'or draft pages that you want to remove before sending to a client or printing.\n\n' +
    'Click the trash icon 🗑️ on this page in PurePDF Studio to permanently delete it from the exported PDF!',
    {
      x: 40,
      y: p3H - 150,
      size: 10,
      lineHeight: 18,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45)
    }
  );

  page3.drawLine({
    start: { x: 40, y: 50 },
    end: { x: p3W - 40, y: 50 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92)
  });
  page3.drawText('PurePDF Studio Sample Document — Page 3 of 3 (Delete Me!)', {
    x: 40,
    y: 35,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65)
  });

  const savedBytes = await pdfDoc.save();
  const ab = new ArrayBuffer(savedBytes.byteLength);
  new Uint8Array(ab).set(savedBytes);
  return ab;
}

// Export the PDF with all page changes, deletions, duplications, whiteouts, and text boxes applied
export async function exportModifiedPdf(
  sources: ArrayBuffer | Record<string, ArrayBuffer>,
  pages: PDFPageItem[]
): Promise<Uint8Array> {
  const isSingleBuffer = sources instanceof ArrayBuffer;
  const outDoc = await PDFDocument.create();

  // Load and cache source documents
  const loadedSrcDocs = new Map<string, PDFDocument>();
  
  if (isSingleBuffer) {
    const singleDoc = await PDFDocument.load(sources);
    loadedSrcDocs.set('default', singleDoc);
  } else {
    for (const page of pages) {
      const docId = page.sourceDocId || 'doc_primary';
      if (!loadedSrcDocs.has(docId) && sources[docId]) {
        const doc = await PDFDocument.load(sources[docId]);
        loadedSrcDocs.set(docId, doc);
      }
    }
  }

  // Pre-embed standard fonts
  const fontHelvetica = await outDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaItalic = await outDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes = await outDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await outDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await outDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await outDoc.embedFont(StandardFonts.CourierBold);

  const fontMap: Record<string, any> = {
    'Helvetica_regular': fontHelvetica,
    'Helvetica_bold': fontHelveticaBold,
    'Helvetica_italic': fontHelveticaItalic,
    'TimesRoman_regular': fontTimes,
    'TimesRoman_bold': fontTimesBold,
    'TimesRoman_italic': fontTimes,
    'Courier_regular': fontCourier,
    'Courier_bold': fontCourierBold,
    'Courier_italic': fontCourier
  };

  // Group pages by source index for efficient copying
  for (let idx = 0; idx < pages.length; idx++) {
    const pageItem = pages[idx];
    
    // Copy the original page by its original index from corresponding source document
    const srcDoc = isSingleBuffer 
      ? loadedSrcDocs.get('default') 
      : (loadedSrcDocs.get(pageItem.sourceDocId) || loadedSrcDocs.values().next().value);
    
    if (!srcDoc) continue;
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageItem.originalPageIndex]);
    outDoc.addPage(copiedPage);

    // Apply rotation if modified
    if (pageItem.rotation) {
      copiedPage.setRotation(degrees(pageItem.rotation));
    }

    const { width: pW, height: pH } = copiedPage.getSize();

    // 1. APPLY WHITEOUT RECTANGLES (Mask off underlying text with white paint/color)
    const whiteoutRects = pageItem.annotations.whiteouts.filter(w => w.type === 'rect');
    for (const w of whiteoutRects) {
      if (w.x === undefined || w.y === undefined || w.width === undefined || w.height === undefined) continue;
      
      const xPt = (w.x / 100) * pW;
      const yFromTopPt = (w.y / 100) * pH;
      const wPt = (w.width / 100) * pW;
      const hPt = (w.height / 100) * pH;
      // In PDF coordinate space, (0,0) is bottom-left
      const yPt = pH - (yFromTopPt + hPt);

      copiedPage.drawRectangle({
        x: xPt,
        y: yPt,
        width: wPt,
        height: hPt,
        color: hexToRgb(w.color || '#ffffff')
      });
    }

    // 2. APPLY WHITEOUT BRUSH (Freehand whiteout strokes) & DRAWINGS
    // To ensure 100% faithful replication of freehand curves and brush strokes,
    // we render them onto an offscreen canvas and embed as a transparent high-res PNG
    const brushWhiteouts = pageItem.annotations.whiteouts.filter(w => w.type === 'brush' && w.points && w.points.length > 0);
    const drawings = pageItem.annotations.drawings || [];

    if (brushWhiteouts.length > 0 || drawings.length > 0) {
      const renderScale = 2; // high resolution for crystal clarity
      const canvas = document.createElement('canvas');
      canvas.width = pW * renderScale;
      canvas.height = pH * renderScale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(renderScale, renderScale);

        // Render brush whiteouts
        for (const brush of brushWhiteouts) {
          if (!brush.points || brush.points.length === 0) continue;
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = brush.color || '#ffffff';
          // strokeWidth is relative to page width (percentage) or pts
          const strokePt = ((brush.strokeWidth || 16) / 595) * pW;
          ctx.lineWidth = Math.max(4, strokePt);

          const first = brush.points[0];
          ctx.moveTo((first.x / 100) * pW, (first.y / 100) * pH);
          for (let p = 1; p < brush.points.length; p++) {
            const pt = brush.points[p];
            ctx.lineTo((pt.x / 100) * pW, (pt.y / 100) * pH);
          }
          ctx.stroke();
        }

        // Render drawings / highlighters / pen
        for (const draw of drawings) {
          if (!draw.points || draw.points.length === 0) continue;
          ctx.save();
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = draw.color || '#000000';
          ctx.globalAlpha = draw.opacity || 1;
          const strokePt = ((draw.strokeWidth || 3) / 595) * pW;
          ctx.lineWidth = Math.max(2, strokePt);

          const first = draw.points[0];
          ctx.moveTo((first.x / 100) * pW, (first.y / 100) * pH);
          for (let p = 1; p < draw.points.length; p++) {
            const pt = draw.points[p];
            ctx.lineTo((pt.x / 100) * pW, (pt.y / 100) * pH);
          }
          ctx.stroke();
          ctx.restore();
        }

        const pngDataUrl = canvas.toDataURL('image/png');
        const pngImageBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
        const embeddedPng = await outDoc.embedPng(pngImageBytes);
        copiedPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width: pW,
          height: pH
        });
      }
    }

    // 3. APPLY TEXT BOXES
    const textBoxes = pageItem.annotations.textBoxes || [];
    for (const box of textBoxes) {
      if (!box.text || box.text.trim() === '') continue;

      const xPt = (box.x / 100) * pW;
      const yFromTopPt = (box.y / 100) * pH;
      const wPt = (box.width / 100) * pW;
      const hPt = (box.height / 100) * pH;
      const yPt = pH - (yFromTopPt + hPt);

      // Draw background if specified (e.g. solid white or custom color to mask underneath)
      if (box.backgroundColor && box.backgroundColor !== 'transparent') {
        copiedPage.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          color: hexToRgb(box.backgroundColor)
        });
      }

      // Determine font
      const fontKey = `${box.fontFamily || 'Helvetica'}_${box.isBold ? 'bold' : box.isItalic ? 'italic' : 'regular'}`;
      const fontToUse = fontMap[fontKey] || fontHelvetica;
      const fontSize = Math.max(8, box.fontSize || 14);
      const textColor = hexToRgb(box.color || '#000000');
      const lineHeight = fontSize * 1.25;

      // Draw lines
      const lines = box.text.split('\n');
      let currentLineY = pH - yFromTopPt - fontSize;

      for (const line of lines) {
        if (currentLineY < yPt) break; // Don't draw outside box bottom
        
        let lineX = xPt + 4; // slight padding
        if (box.align === 'center') {
          const textWidth = fontToUse.widthOfTextAtSize(line, fontSize);
          lineX = xPt + (wPt - textWidth) / 2;
        } else if (box.align === 'right') {
          const textWidth = fontToUse.widthOfTextAtSize(line, fontSize);
          lineX = xPt + wPt - textWidth - 4;
        }

        try {
          copiedPage.drawText(line, {
            x: Math.max(xPt, lineX),
            y: currentLineY,
            size: fontSize,
            font: fontToUse,
            color: textColor
          });
        } catch (e) {
          // If characters are unsupported by standard PDF font, fallback to basic text
          console.warn('Text drawing warning:', e);
        }

        currentLineY -= lineHeight;
      }
    }
  }

  return await outDoc.save();
}

// Split PDF: extract a specific range of pages (1-indexed inclusive) and export
export async function splitAndExportPdf(
  sources: ArrayBuffer | Record<string, ArrayBuffer>,
  allPages: PDFPageItem[],
  startPage: number,
  endPage: number,
  fileName: string
): Promise<void> {
  const startIndex = Math.max(0, startPage - 1);
  const endIndex = Math.min(allPages.length, endPage);
  const slicedPages = allPages.slice(startIndex, endIndex);

  if (slicedPages.length === 0) {
    throw new Error('No pages selected in the specified range.');
  }

  const exportedBytes = await exportModifiedPdf(sources, slicedPages);
  downloadPdfBytes(exportedBytes, fileName);
}
export function downloadPdfBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
