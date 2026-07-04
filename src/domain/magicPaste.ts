import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { markdownToAst } from "./draftStore";
import type { ArticleAst } from "./types";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.use(gfm);

export function htmlToCleanMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

export function htmlToCleanArticle(html: string): ArticleAst {
  return markdownToAst(htmlToCleanMarkdown(html));
}
