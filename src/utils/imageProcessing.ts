import {
  ACCEPTED_IMAGE_TYPES,
  LARGE_FILE_WARNING_BYTES,
  MAX_IMAGE_DIMENSION,
} from '../data/initialData';

export function isAcceptedImageFile(file: File): boolean {
  if (
    ACCEPTED_IMAGE_TYPES.includes(
      file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
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
  mimeType: string;
  fileName: string;
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const img = await loadImageFromFile(file);
  const outputType =
    file.type === 'image/png' || file.type === 'image/webp'
      ? file.type
      : 'image/jpeg';
  const quality = outputType === 'image/png' ? 0.92 : 0.85;
  const canvas = drawResized(img, MAX_IMAGE_DIMENSION);
  const imageBlob = await canvasToBlob(canvas, outputType, quality);
  return { imageBlob, mimeType: outputType, fileName: file.name };
}
