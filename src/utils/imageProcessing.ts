import {
  ACCEPTED_IMAGE_TYPES,
  LARGE_FILE_WARNING_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_BYTES,
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
  // Prefer JPEG for uploads to keep payload under Vercel body limits.
  const outputType =
    file.type === 'image/png' || file.type === 'image/webp'
      ? 'image/jpeg'
      : file.type === 'image/jpeg'
        ? 'image/jpeg'
        : 'image/jpeg';

  let quality = 0.82;
  let maxDimension = MAX_IMAGE_DIMENSION;
  let imageBlob = await canvasToBlob(drawResized(img, maxDimension), outputType, quality);

  while (imageBlob.size > MAX_UPLOAD_BYTES && (quality > 0.55 || maxDimension > 1280)) {
    if (quality > 0.55) quality -= 0.08;
    else maxDimension = Math.max(1280, Math.round(maxDimension * 0.85));
    imageBlob = await canvasToBlob(drawResized(img, maxDimension), outputType, quality);
  }

  return { imageBlob, mimeType: outputType, fileName: file.name };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
}
