import { describe, expect, it, vi } from "vitest";
import { copyWechatHtml } from "./clipboard";

describe("copyWechatHtml", () => {
  it("uses clipboard html items when the browser supports them", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const ClipboardItemMock = vi.fn();
    const originalClipboard = navigator.clipboard;
    const originalClipboardItem = window.ClipboardItem;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: ClipboardItemMock,
    });

    await copyWechatHtml("<section>正文</section>", "正文");

    expect(write).toHaveBeenCalledTimes(1);
    expect(ClipboardItemMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: originalClipboardItem,
    });
  });

  it("falls back to execCommand when modern clipboard is unavailable", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const originalClipboard = navigator.clipboard;
    const originalExecCommand = document.execCommand;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    document.execCommand = execCommand;

    await copyWechatHtml("<section>正文</section>", "正文");

    expect(execCommand).toHaveBeenCalledWith("copy");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    document.execCommand = originalExecCommand;
  });

  it("falls back to execCommand when modern clipboard rejects", async () => {
    const write = vi.fn().mockRejectedValue(new Error("denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    const ClipboardItemMock = vi.fn();
    const originalClipboard = navigator.clipboard;
    const originalClipboardItem = window.ClipboardItem;
    const originalExecCommand = document.execCommand;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: ClipboardItemMock,
    });
    document.execCommand = execCommand;

    await copyWechatHtml("<section>正文</section>", "正文");

    expect(write).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: originalClipboardItem,
    });
    document.execCommand = originalExecCommand;
  });
});
