import "@testing-library/jest-dom/vitest";

function createRectList(rect: DOMRect) {
  return {
    length: 1,
    item: () => rect,
    [0]: rect,
  } as unknown as DOMRectList;
}

if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = function getClientRects() {
    return createRectList(this.getBoundingClientRect());
  };
}

if (typeof Text !== "undefined" && !("getClientRects" in Text.prototype)) {
  (Text.prototype as unknown as { getClientRects(): DOMRectList }).getClientRects = () =>
    createRectList(new DOMRect(0, 0, 0, 0));
}

if (typeof Node !== "undefined" && !("getClientRects" in Node.prototype)) {
  (Node.prototype as unknown as { getClientRects(): DOMRectList }).getClientRects = () =>
    createRectList(new DOMRect(0, 0, 0, 0));
}

if (typeof Range !== "undefined") {
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
  Range.prototype.getClientRects = () => createRectList(new DOMRect(0, 0, 0, 0));
}
