import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the core writing and layout workbench controls", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "写作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "排版台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模型设置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 智能排版" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制到公众号" })).toBeInTheDocument();
    expect(screen.getByText("手机预览")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "手机" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "平板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "桌面" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("准备就绪");
  });

  it("shows the image grid insertion control in the writer workbench", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));

    expect(await screen.findByRole("button", { name: "插入多图" }, { timeout: 5000 })).toBeInTheDocument();
  }, 10000);

  it("opens model settings in a topbar dialog instead of the writer sidebar", async () => {
    const { container } = render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "模型设置" }));

    expect(screen.getByRole("dialog", { name: "模型设置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "测试连接" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "关闭设置" }));
    await userEvent.click(screen.getByRole("button", { name: "写作台" }));

    expect(container.querySelector(".model-settings-section")).toBeNull();
  });

  it("shows writer copy-to-layout and context-aware smart format controls", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));

    expect(screen.getAllByRole("button", { name: "复制到排版台" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "AI 智能排版" }).length).toBeGreaterThanOrEqual(1);
  });

  it("uses a custom target word count and removes redundant content actions", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));

    const wordsInput = screen.getByRole("spinbutton", { name: "目标字数" });
    await userEvent.clear(wordsInput);
    await userEvent.type(wordsInput, "1234");

    expect(wordsInput).toHaveValue(1234);
    expect(screen.queryByText("内容操作")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "润色" })).not.toBeInTheDocument();
  });

  it("keeps the layout workbench empty until the writer copies content into it", async () => {
    render(<App />);

    expect(screen.getByText("排版台还没有内容")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制到公众号" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));
    await userEvent.click(screen.getAllByRole("button", { name: "复制到排版台" })[0]);

    expect(screen.queryByText("排版台还没有内容")).not.toBeInTheDocument();
    expect(screen.getByText("所见即所得版面")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制到公众号" })).not.toBeDisabled();
  });
});
