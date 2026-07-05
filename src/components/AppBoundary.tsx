import { Component, type ReactNode } from "react";

interface AppBoundaryProps {
  children: ReactNode;
}

interface AppBoundaryState {
  failed: boolean;
}

export class AppBoundary extends Component<AppBoundaryProps, AppBoundaryState> {
  state: AppBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("App rendering failed", error);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="app-crash" role="alert">
        <h2>应用出现错误</h2>
        <p>你的草稿与设置仍保存在本地，不会丢失。</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>
          点击恢复
        </button>
      </div>
    );
  }
}
