import * as pdfjsLib from 'pdfjs-dist';

// Use the worker from the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export class PasswordRequiredError extends Error {
  constructor() {
    super('Password required');
    this.name = 'PasswordRequiredError';
  }
}

/**
 * Convert a PDF file to an array of JPEG blobs
 * @param file PDF File object
 * @param password Optional password for encrypted PDFs
 * @returns Promise resolving to an array of Blobs (JPEGs)
 */
export const convertPdfToImages = async (
  file: File,
  password?: string,
): Promise<Blob[]> => {
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const blobs: Blob[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better quality

      // Create a canvas to render the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to Blob (JPEG)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
      });

      if (blob) {
        blobs.push(blob);
      }
    }

    return blobs;
  } catch (error: any) {
    if (error.name === 'PasswordException' || error.code === 1) {
      throw new PasswordRequiredError();
    }
    throw error;
  }
};
