import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the core writing and layout workbench controls", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "写作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "排版台" })).toBeInTheDocument();
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
});
