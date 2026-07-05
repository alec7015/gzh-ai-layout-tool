import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppBoundary } from "./AppBoundary";

function CrashingView({ crash }: { crash: boolean }) {
  if (crash) {
    throw new Error("boom");
  }
  return <div>正常内容</div>;
}

describe("AppBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a recovery card when an app-level render error happens", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { rerender } = render(
      <AppBoundary>
        <CrashingView crash={false} />
      </AppBoundary>
    );

    rerender(
      <AppBoundary>
        <CrashingView crash />
      </AppBoundary>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("应用出现错误");
    await userEvent.click(screen.getByRole("button", { name: "点击恢复" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
