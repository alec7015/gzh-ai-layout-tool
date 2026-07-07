interface ConfirmDialogState {
  kind: "confirm" | "prompt";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requiredText?: string;
  value?: string;
}

interface ConfirmDialogProps {
  state: ConfirmDialogState;
  onChangeValue(value: string): void;
  onCancel(): void;
  onConfirm(): void;
}

export type { ConfirmDialogState };

export function ConfirmDialog({ state, onChangeValue, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label={state.title}>
        <header>
          <strong>{state.title}</strong>
        </header>
        <p>{state.message}</p>
        {state.kind === "prompt" ? (
          <label>
            输入确认文本
            <input
              autoFocus
              value={state.value ?? ""}
              placeholder={state.requiredText}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          </label>
        ) : null}
        <footer>
          <button type="button" className="secondary-action" onClick={onCancel}>
            {state.cancelText ?? "取消"}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={state.kind === "prompt" && state.value !== state.requiredText}
            onClick={onConfirm}
          >
            {state.confirmText ?? "确认"}
          </button>
        </footer>
      </section>
    </div>
  );
}
