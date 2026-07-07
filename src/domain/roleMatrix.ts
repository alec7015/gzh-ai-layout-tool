import type { BlockRole, BlockType } from "./types";

export const ROLE_CARRIERS: Record<BlockRole, readonly BlockType[]> = {
  summary: ["paragraph"],
  tip: ["paragraph"],
  pullquote: ["paragraph", "quote"],
  quoteCenter: ["paragraph", "quote"],
  data: ["paragraph"],
  step: ["list"],
  toolLabel: ["paragraph"],
  sidenote: ["paragraph"],
  editorNote: ["paragraph"],
  toc: ["paragraph"],
  signature: ["paragraph"],
  lead: ["paragraph"],
  keyQuote: ["paragraph", "quote"],
  emphasis: ["paragraph"],
  steps: ["list"],
  imageSlot: ["paragraph"],
};

export function isRoleCompatible(role: BlockRole, blockType: BlockType): boolean {
  return ROLE_CARRIERS[role]?.includes(blockType) ?? false;
}
