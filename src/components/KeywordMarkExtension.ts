import { Mark } from "@tiptap/core";

export const KeywordMark = Mark.create({
  name: "keyword",

  parseHTML() {
    return [{ tag: "span[data-keyword]" }];
  },

  renderHTML() {
    return ["span", { "data-keyword": "true" }, 0];
  },
});
