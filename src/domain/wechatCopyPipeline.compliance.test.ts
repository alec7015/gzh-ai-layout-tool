import { describe, expect, it } from "vitest";
import { prepareWechatHtml } from "./wechatCopyPipeline";
import { scanWechatHtmlCompliance } from "./wechatCompliance";

describe("wechatCopyPipeline compliance", () => {
  it("keeps reshaped lists and tables inside the WeChat compliance rules", async () => {
    const html = await prepareWechatHtml(
      [
        "<ol><li>第一步</li><li>第二步</li></ol>",
        "<table><thead><tr><th>字段</th><th>值</th></tr></thead><tbody><tr><td>状态</td><td>通过</td></tr></tbody></table>",
      ].join(""),
      "#1677ff"
    );

    expect(html).toContain("data-wx=\"1\"");
    expect(html).toMatch(/border:\s*1px solid/i);
    expect(scanWechatHtmlCompliance(html).violations).toEqual([]);
  });
});
