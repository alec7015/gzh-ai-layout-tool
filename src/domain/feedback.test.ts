import { describe, expect, it } from "vitest";
import { createFeedback, feedbackText } from "./feedback";

describe("feedback", () => {
  it("creates concise feedback messages for user actions", () => {
    expect(feedbackText(createFeedback("success", "已复制到剪贴板"))).toBe("已复制到剪贴板");
    expect(createFeedback("error", "没有可导入的图片").tone).toBe("error");
  });
});
