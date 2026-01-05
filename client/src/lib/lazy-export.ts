// client/src/lib/lazy-export.ts
// Lazy-loaded export utilities - only loads when user clicks export
// This reduces initial bundle size by ~600KB

interface PDFOptions {
  margin?: number;
  filename?: string;
  image?: { type: 'png' | 'jpeg' | 'webp'; quality: number };
  html2canvas?: { scale: number; useCORS?: boolean; logging?: boolean };
  jsPDF?: { unit: 'pt' | 'mm' | 'cm' | 'in'; format: string; orientation: 'portrait' | 'landscape' };
}

/**
 * Export an HTML element to PDF using html2pdf.js (lazy loaded)
 * @param element - The HTML element to export
 * @param filename - The filename for the PDF
 * @param options - Optional configuration for the PDF export
 */
export async function exportToPDF(
  element: HTMLElement,
  filename: string = 'export.pdf',
  options: Partial<PDFOptions> = {}
): Promise<void> {
  // Dynamic import - only loads when called
  const html2pdf = (await import('html2pdf.js')).default;

  const defaultOptions: PDFOptions = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return html2pdf().set(mergedOptions).from(element).save();
}

/**
 * Convert an HTML element to a canvas image (lazy loaded)
 * @param element - The HTML element to convert
 * @param options - Optional html2canvas configuration
 */
export async function elementToCanvas(
  element: HTMLElement,
  options: { scale?: number; useCORS?: boolean; logging?: boolean } = {}
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;

  return html2canvas(element, {
    scale: options.scale || 2,
    useCORS: options.useCORS ?? true,
    logging: options.logging ?? false,
  });
}

/**
 * Export an HTML element as a PNG image (lazy loaded)
 * @param element - The HTML element to export
 * @param filename - The filename for the image
 */
export async function exportToImage(
  element: HTMLElement,
  filename: string = 'export.png'
): Promise<void> {
  const canvas = await elementToCanvas(element);

  // Create download link
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Create a PDF document using jsPDF (lazy loaded)
 * @param options - jsPDF configuration options
 */
export async function createPDF(options?: {
  orientation?: 'portrait' | 'landscape';
  unit?: 'pt' | 'mm' | 'cm' | 'in';
  format?: string | [number, number];
}) {
  const { jsPDF } = await import('jspdf');
  return new jsPDF(options);
}

/**
 * Export data as a downloadable file
 * @param data - The data to export (string or object)
 * @param filename - The filename
 * @param type - MIME type (default: application/json)
 */
export function exportToFile(
  data: string | object,
  filename: string,
  type: string = 'application/json'
): void {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
