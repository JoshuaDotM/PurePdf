# PurePDF Studio 📄✨

> **Zero Paywalls. 100% Client-Side. 100% Free & Private.**  
> A full-featured modern PDF editor web application built with React, TypeScript, Tailwind CSS, `pdf-lib`, and `pdfjs-dist`.

---

## 🚀 Key Features

* **🗑️ Delete Any Page**: Remove single or multiple pages completely from your document.
* **📋 Duplicate Pages**: Clone any page with all annotations and place copies anywhere.
* **🔀 Reorder Pages**: Intuitive drag-and-drop thumbnail organizer or one-click arrow buttons.
* **🧼 Eraser / Whiteout Tool**:
  * **Rectangle Mask**: Drag to whiteout text blocks, paragraphs, or headers with clean white paint (or color-matched tones).
  * **Freehand Brush**: Paint freehand white strokes over signatures, numbers, or words with adjustable stroke thickness.
* **🔤 Add Text Boxes**:
  * Customizable typography: Helvetica, Times Roman, Courier.
  * Font sizes (10pt–48pt), colors, bold, italic, and alignment.
  * **"Solid White" Mask Mode**: Automatically whiteouts and replaces old text in one click!
* **🔀 Merge PDFs**:
  * Add an additional PDF document into your current workspace.
  * Choose exact insertion point: at the beginning, at the end, or after any specific page!
* **✂️ Split PDF**:
  * Specify starting and ending page numbers.
  * Visual slice preview with interactive page checkmarks.
  * Export only the selected range with 1 click.
* **🔒 100% Private & Offline Capable**:
  * Zero files uploaded to any external server. Everything processes locally in the browser.

---

## 🛠️ Tech Stack

* **Framework**: React 18 + Vite + TypeScript
* **Styling**: Tailwind CSS v4 + Lucide Icons
* **PDF Processing**: `pdf-lib` (vector manipulation, text drawing, page copying)
* **PDF Rendering**: Mozilla `pdfjs-dist` (high-DPI canvas rendering)

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/JoshuaDotM/PurePdf.git

# Enter project directory
cd PurePdf

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 📦 Production Build

```bash
npm run build
npm run preview
```
