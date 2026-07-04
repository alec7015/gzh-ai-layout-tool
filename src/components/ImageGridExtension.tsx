import { useRef } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { GridImage, GridLayout } from "../domain/types";
import { readImageFileAsDataUrl } from "../domain/imageAssets";

interface ImageGridAttrs {
  images: GridImage[];
  layout: GridLayout;
  gap: number;
  radius: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGrid: {
      insertImageGrid: (attrs?: Partial<ImageGridAttrs>) => ReturnType;
    };
  }
}

const layoutLabels: Record<GridLayout, string> = {
  two: "两列",
  three: "三列",
  quad: "田字格",
};

function ImageGridView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const attrs = node.attrs as ImageGridAttrs;
  const images = attrs.images ?? [];
  const layout = attrs.layout ?? "two";
  const columns = layout === "three" ? 3 : 2;

  async function addFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const nextImages = await Promise.all(
      Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .map(async (file) => ({ src: await readImageFileAsDataUrl(file), alt: file.name.replace(/\.[^.]+$/, "") }))
    );
    updateAttributes({ images: [...images, ...nextImages] });
  }

  function moveImage(index: number, offset: -1 | 1) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const next = images.slice();
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateAttributes({ images: next });
  }

  return (
    <NodeViewWrapper className="ig-block" data-selected={selected ? "true" : "false"}>
      <div className="ig-toolbar" contentEditable={false}>
        {(Object.keys(layoutLabels) as GridLayout[]).map((layoutKey) => (
          <button
            className={layout === layoutKey ? "active" : ""}
            key={layoutKey}
            type="button"
            onClick={() => updateAttributes({ layout: layoutKey })}
          >
            {layoutLabels[layoutKey]}
          </button>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()}>
          添加图片
        </button>
      </div>

      {images.length === 0 ? (
        <button className="ig-empty" contentEditable={false} type="button" onClick={() => fileRef.current?.click()}>
          点击添加多张图片
        </button>
      ) : (
        <div className="ig-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.map((image, index) => (
            <figure key={`${image.src}-${index}`}>
              <img src={image.src} alt={image.alt ?? ""} />
              <figcaption contentEditable={false}>
                <button type="button" onClick={() => moveImage(index, -1)}>
                  ←
                </button>
                <button type="button" onClick={() => moveImage(index, 1)}>
                  →
                </button>
                <button
                  type="button"
                  onClick={() => updateAttributes({ images: images.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  删除
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void addFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </NodeViewWrapper>
  );
}

export const ImageGrid = Node.create({
  name: "imageGrid",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      images: { default: [] },
      layout: { default: "two" },
      gap: { default: 6 },
      radius: { default: 8 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-grid]",
        getAttrs: (element) => {
          const node = element as HTMLElement;
          return {
            images: parseImages(node.getAttribute("data-images")),
            layout: node.getAttribute("data-layout") ?? "two",
            gap: Number(node.getAttribute("data-gap") ?? 6),
            radius: Number(node.getAttribute("data-radius") ?? 8),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-image-grid": "true",
        "data-images": JSON.stringify(node.attrs.images ?? []),
        "data-layout": node.attrs.layout,
        "data-gap": String(node.attrs.gap),
        "data-radius": String(node.attrs.radius),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGridView);
  },

  addCommands() {
    return {
      insertImageGrid:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: "imageGrid",
            attrs: { images: [], layout: "two", gap: 6, radius: 8, ...(attrs ?? {}) },
          }),
    };
  },
});

function parseImages(value: string | null): GridImage[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
