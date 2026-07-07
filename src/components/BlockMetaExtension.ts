import { Extension } from "@tiptap/core";

export const BlockMeta = Extension.create({
  name: "blockMeta",

  addGlobalAttributes() {
    return [
      {
        types: [
          "heading",
          "paragraph",
          "blockquote",
          "bulletList",
          "orderedList",
          "table",
          "horizontalRule",
          "imageGrid",
          "image",
          "codeBlock",
        ],
        attributes: {
          blockId: {
            default: null,
            rendered: false,
          },
          blockStyle: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => {
              const blockStyle = attrs.blockStyle;
              if (!blockStyle || typeof blockStyle !== "object" || Array.isArray(blockStyle)) {
                return {};
              }

              const style = Object.entries(blockStyle as Record<string, unknown>)
                .filter(([, value]) => typeof value === "string" || typeof value === "number")
                .map(([key, value]) => `${key}:${value}`)
                .join(";");

              return style ? { style } : {};
            },
          },
          blockType: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => {
              return typeof attrs.blockType === "string"
                ? { "data-block-type": attrs.blockType }
                : {};
            },
          },
          blockRole: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-role"),
            renderHTML: (attrs) => {
              return typeof attrs.blockRole === "string"
                ? { "data-block-role": attrs.blockRole }
                : {};
            },
          },
          blockRoleHint: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-role-hint"),
            renderHTML: (attrs) => {
              return typeof attrs.blockRoleHint === "string"
                ? { "data-block-role-hint": attrs.blockRoleHint }
                : {};
            },
          },
        },
      },
    ];
  },
});
