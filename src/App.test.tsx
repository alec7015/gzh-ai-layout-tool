import { fireEvent, render, screen } from "@testing-library/react";
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

  it("uses custom writing inputs and removes redundant content actions", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));

    const wordsInput = screen.getByRole("spinbutton", { name: "目标字数" });
    await userEvent.clear(wordsInput);
    await userEvent.type(wordsInput, "1234");
    await userEvent.clear(screen.getByLabelText("风格"));
    await userEvent.type(screen.getByLabelText("风格"), "毒舌吐槽");
    await userEvent.clear(screen.getByLabelText("文体"));
    await userEvent.type(screen.getByLabelText("文体"), "复盘长文");

    expect(wordsInput).toHaveValue(1234);
    expect(screen.getByLabelText("风格")).toHaveValue("毒舌吐槽");
    expect(screen.getByLabelText("文体")).toHaveValue("复盘长文");
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
    expect(await screen.findByLabelText("排版工具栏")).toBeInTheDocument();
    expect(screen.queryByText("微调面板")).not.toBeInTheDocument();
    expect(screen.getByText("尚未运行")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制到公众号" })).not.toBeDisabled();
  });

  it("supports keyboard resizing for the layout preview column", () => {
    window.localStorage.setItem("gzh-preview-width", "350");
    const { container } = render(<App />);

    const handle = screen.getByRole("separator", { name: "调整预览宽度" });
    const layoutScreen = container.querySelector(".layout-screen") as HTMLElement;

    expect(layoutScreen.style.getPropertyValue("--preview-w")).toBe("350px");

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(layoutScreen.style.getPropertyValue("--preview-w")).toBe("366px");

    fireEvent.keyDown(handle, { key: "End" });
    expect(Number.parseInt(layoutScreen.style.getPropertyValue("--preview-w"), 10)).toBeGreaterThanOrEqual(390);
  });

  it("resizes the right preview column in the same direction as pointer dragging", () => {
    const { container } = render(<App />);

    const handle = screen.getByRole("separator", { name: "调整预览宽度" });
    const layoutScreen = container.querySelector(".layout-screen") as HTMLElement;

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 532 });

    expect(layoutScreen.style.getPropertyValue("--preview-w")).toBe("358px");
  });

  it("shows controlled custom line-height and font-size controls in layout editor", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "写作台" }));
    await userEvent.click(screen.getAllByRole("button", { name: "复制到排版台" })[0]);
    expect(await screen.findByLabelText("排版工具栏")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("行间距"), "custom");
    expect(screen.getByLabelText("自定义行距")).toHaveValue(1.9);

    await userEvent.selectOptions(screen.getByLabelText("字号"), "custom");
    expect(screen.getByLabelText("自定义字号")).toHaveValue(18);
  });
});
