import { Component, type ReactNode } from "react";

interface EditorBoundaryProps {
  children: ReactNode;
  onReset(): void;
}

interface EditorBoundaryState {
  failed: boolean;
}

export class EditorBoundary extends Component<EditorBoundaryProps, EditorBoundaryState> {
  state: EditorBoundaryState = { failed: false };

  static getDerivedStateFromError(): EditorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("Editor rendering failed", error);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div className="editor-crash" role="alert">
        <p>编辑器渲染出错，当前内容已保存在草稿中。</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onReset();
          }}
        >
          点击恢复
        </button>
      </div>
    );
  }
}
