import {
  ACCEPTED_IMAGE_TYPES,
  LARGE_FILE_WARNING_BYTES,
  MAX_IMAGE_DIMENSION,
  THUMBNAIL_DIMENSION,
} from '../data/initialData';

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return true;
  }
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp')
  );
}

export function isUnusuallyLarge(file: File): boolean {
  return file.size > LARGE_FILE_WARNING_BYTES;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image: ${file.name}`));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image'));
      },
      mimeType,
      quality,
    );
  });
}

function drawResized(
  source: HTMLImageElement,
  maxDimension: number,
): HTMLCanvasElement {
  const { naturalWidth: width, naturalHeight: height } = source;
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return canvas;
}

export interface ProcessedImage {
  imageBlob: Blob;
  thumbnailBlob: Blob;
  mimeType: string;
  fileName: string;
}

/**
 * Resize large images in the browser before IndexedDB storage.
 * Longest side capped at MAX_IMAGE_DIMENSION; a smaller thumbnail is also produced.
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const img = await loadImageFromFile(file);
  const outputType =
    file.type === 'image/png' || file.type === 'image/webp'
      ? file.type
      : 'image/jpeg';
  const quality = outputType === 'image/png' ? 0.92 : 0.85;

  const mainCanvas = drawResized(img, MAX_IMAGE_DIMENSION);
  const thumbCanvas = drawResized(img, THUMBNAIL_DIMENSION);

  const [imageBlob, thumbnailBlob] = await Promise.all([
    canvasToBlob(mainCanvas, outputType, quality),
    canvasToBlob(thumbCanvas, outputType, quality * 0.9),
  ]);

  return {
    imageBlob,
    thumbnailBlob,
    mimeType: outputType,
    fileName: file.name,
  };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
