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
        ],
        attributes: {
          blockId: {
            default: null,
            rendered: false,
          },
          blockStyle: {
            default: null,
            rendered: false,
          },
        },
      },
    ];
  },
});
