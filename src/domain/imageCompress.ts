export interface ImageCompressOptions {
  maxEdge: number;
  quality: number;
}

const defaultOptions: ImageCompressOptions = {
  maxEdge: 1280,
  quality: 0.82,
};

export async function compressImageFile(
  file: File,
  options: ImageCompressOptions = defaultOptions
): Promise<string> {
  if (typeof createImageBitmap !== "function") {
    return readImageFileAsDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, options.maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close?.();
    return readImageFileAsDataUrl(file);
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const mime = file.type === "image/png" && hasAlpha(context, canvas) ? "image/png" : "image/jpeg";
  return canvas.toDataURL(mime, options.quality);
}

function hasAlpha(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
  try {
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
