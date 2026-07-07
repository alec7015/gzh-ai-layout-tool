import type { ArticleAst, ImageBlock } from "./types";

export function isSupportedImageFile(file: File): boolean {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type);
}

export function createImageBlock(src: string, caption = ""): ImageBlock {
  return {
    id: `image-${Date.now()}`,
    type: "image",
    src,
    caption,
    style: {},
  };
}

export function appendImageBlock(article: ArticleAst, src: string, caption?: string): ArticleAst {
  return {
    ...article,
    blocks: [...article.blocks, createImageBlock(src, caption)],
  };
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
