import type { GridImage, GridLayout, ImageGridBlock } from "./types";

export interface ImageGridAttrs {
  images: GridImage[];
  layout: GridLayout;
  gap: number;
  radius: number;
}

export function createImageGridBlock(attrs: Partial<ImageGridAttrs> = {}): ImageGridBlock {
  return {
    id: `image-grid-${Date.now()}`,
    type: "imageGrid",
    images: attrs.images ?? [],
    layout: attrs.layout ?? "two",
    gap: attrs.gap ?? 6,
    radius: attrs.radius ?? 8,
    style: {},
  };
}

export function renderImageGridWechat(attrs: Partial<ImageGridAttrs>): string {
  const images = attrs.images ?? [];
  const layout = attrs.layout ?? "two";
  const gap = attrs.gap ?? 6;
  const radius = attrs.radius ?? 8;

  if (images.length === 0) {
    return "";
  }

  if (images.length === 1) {
    const image = images[0];
    return `<section style="margin:16px 0;font-size:0;"><img src="${escapeAttr(
      image.src
    )}" alt="${escapeAttr(image.alt ?? "")}" style="width:100%;display:block;border-radius:${radius}px;" /></section>`;
  }

  const columns = layout === "three" ? 3 : 2;
  const width = (100 / columns).toFixed(4);
  const padding = gap / 2;
  const cells = images
    .map(
      (image) =>
        `<section style="display:inline-block;width:${width}%;vertical-align:top;box-sizing:border-box;padding:${padding}px;font-size:0;line-height:0;"><img src="${escapeAttr(
          image.src
        )}" alt="${escapeAttr(
          image.alt ?? ""
        )}" style="width:100%;display:block;border-radius:${radius}px;" /></section>`
    )
    .join("");

  return `<section style="font-size:0;line-height:0;letter-spacing:0;word-spacing:0;margin:16px 0;">${cells}</section>`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}
