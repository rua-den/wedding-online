export const MAX_CLIENT_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_CLIENT_IMAGE_EDGE = 3840;
export const MAX_CLIENT_IMAGE_PIXELS = 12_000_000;
const TARGET_IMAGE_BYTES = Math.floor(MAX_CLIENT_IMAGE_BYTES * 0.96);
const OUTPUT_TYPE = "image/webp";
const MIN_QUALITY = 0.86;
const MAX_QUALITY = 0.96;
const QUALITY_STEPS = 6;
const SCALE_STEPS = [1, 0.9, 0.8, 0.72, 0.64] as const;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export type PreparedImageUpload = {
  file: File;
  optimized: boolean;
  originalBytes: number;
};

function optimizedFilename(filename: string): string {
  return `${filename.replace(/\.[^.]+$/, "") || "wedding-photo"}.webp`;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Trình duyệt không thể tối ưu ảnh này."));
    }, OUTPUT_TYPE, quality);
  });
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không thể đọc ảnh để tối ưu."));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some browsers expose createImageBitmap but cannot decode every supported
      // format through it. Fall back to the regular image decoder before failing.
    }
  }
  return decodeWithImageElement(file);
}

async function bestBlobForCurrentSize(canvas: HTMLCanvasElement): Promise<Blob | null> {
  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let best: Blob | null = null;

  for (let step = 0; step < QUALITY_STEPS; step += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= TARGET_IMAGE_BYTES) {
      best = blob;
      low = quality;
    } else {
      high = quality;
    }
  }

  return best;
}

function safeDimensionScale(width: number, height: number): number {
  const longestEdgeScale = MAX_CLIENT_IMAGE_EDGE / Math.max(width, height);
  const pixelScale = Math.sqrt(MAX_CLIENT_IMAGE_PIXELS / (width * height));
  return Math.min(1, longestEdgeScale, pixelScale);
}

export function formatImageMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export async function prepareImageForUpload(file: File): Promise<PreparedImageUpload> {
  if (file.type === "image/gif") {
    if (file.size > MAX_CLIENT_IMAGE_BYTES) {
      throw new Error("GIF lớn hơn 12 MB không thể tự tối ưu mà vẫn giữ chuyển động. Hãy dùng JPG, PNG hoặc WebP cho ảnh cưới.");
    }
    return { file, optimized: false, originalBytes: file.size };
  }

  const decoded = await decodeImage(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) throw new Error("Không thể đọc kích thước ảnh.");

    const dimensionScale = safeDimensionScale(decoded.width, decoded.height);
    const oversizedBytes = file.size > MAX_CLIENT_IMAGE_BYTES;
    const oversizedDimensions = dimensionScale < 1;
    if (!oversizedBytes && !oversizedDimensions) {
      return { file, optimized: false, originalBytes: file.size };
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ tối ưu ảnh.");

    for (const scaleStep of SCALE_STEPS) {
      const scale = dimensionScale * scaleStep;
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      const blob = await bestBlobForCurrentSize(canvas);
      if (blob) {
        return {
          file: new File([blob], optimizedFilename(file.name), {
            type: OUTPUT_TYPE,
            lastModified: file.lastModified,
          }),
          optimized: true,
          originalBytes: file.size,
        };
      }
    }

    throw new Error("Ảnh quá lớn để tự tối ưu mà vẫn giữ chất lượng tốt. Hãy xuất ảnh WebP/JPG chất lượng cao rồi thử lại.");
  } finally {
    decoded.close();
  }
}
