import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageFile } from "./imageCompress";

describe("imageCompress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downscales large opaque images to jpeg data urls", async () => {
    const drawImage = vi.fn();
    const getImageData = vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }));
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage, getImageData })),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,compressed"),
    } as unknown as HTMLCanvasElement;

    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve({ width: 4000, height: 2000, close: vi.fn() })));
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    const result = await compressImageFile(new File(["x"], "photo.jpg", { type: "image/jpeg" }));

    expect(result).toBe("data:image/jpeg;base64,compressed");
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(640);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.82);
  });
});
