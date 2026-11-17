import * as pdfjsLib from 'pdfjs-dist';

// Ensure the worker path resolves relative to the current deployed URL (e.g. /PurePdf/)
if (typeof window !== 'undefined') {
  try {
    // Correctly resolves to https://JoshuaDotM.github.io/PurePdf/pdf.worker.min.js on GitHub Pages
    // and http://localhost:5173/pdf.worker.min.js locally
    const base = import.meta.env.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const resolvedUrl = new URL(`${cleanBase}pdf.worker.min.js`, window.location.href).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedUrl;
  } catch {
    // Robust CDN fallback if local worker fails to load
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

export { pdfjsLib };
