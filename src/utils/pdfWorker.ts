import * as pdfjsLib from 'pdfjs-dist';

// Point to local public worker for 100% offline and reliable rendering
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export { pdfjsLib };
