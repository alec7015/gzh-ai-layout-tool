import { X } from "lucide-react";
import {
  AI_PROVIDER_PRESETS,
  maskApiKey,
  presetToSettings,
  type AiProvider,
  type AiSettings,
} from "../domain/aiSettings";

interface SettingsModalProps {
  settings: AiSettings;
  testing: boolean;
  testMessage: string;
  onChange(settings: AiSettings): void;
  onClose(): void;
  onTest(): void;
}

export function SettingsModal({
  settings,
  testing,
  testMessage,
  onChange,
  onClose,
  onTest,
}: SettingsModalProps) {
  function update(next: Partial<AiSettings>) {
    onChange({ ...settings, ...next });
  }

  function selectProvider(provider: AiProvider) {
    const preset = AI_PROVIDER_PRESETS.find((item) => item.provider === provider);
    if (preset) {
      onChange(presetToSettings(preset, settings));
    }
  }

  return (
    <div className="settings-backdrop">
      <section
        aria-labelledby="model-settings-title"
        aria-modal="true"
        className="settings-modal"
        role="dialog"
      >
        <header className="settings-modal-header">
          <div>
            <h2 id="model-settings-title">模型设置</h2>
            <p>API Key 明文保存在本机浏览器或桌面 WebView 的 localStorage 中。</p>
          </div>
          <button aria-label="关闭设置" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="provider-grid" aria-label="服务商预设">
          {AI_PROVIDER_PRESETS.map((preset) => (
            <button
              className={settings.provider === preset.provider ? "provider-chip active" : "provider-chip"}
              key={preset.provider}
              onClick={() => selectProvider(preset.provider)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="writer-field">
          接口地址
          <input
            value={settings.baseUrl}
            onChange={(event) => update({ baseUrl: event.target.value, provider: "custom" })}
          />
        </label>
        <label className="writer-field">
          模型
          <input
            value={settings.model}
            onChange={(event) => update({ model: event.target.value, provider: "custom" })}
          />
        </label>
        <label className="writer-field">
          API Key
          <input
            type="password"
            placeholder={maskApiKey(settings.apiKey)}
            value={settings.apiKey}
            onChange={(event) => update({ apiKey: event.target.value })}
          />
        </label>
        <label className="writer-field">
          Temperature：{settings.temperature.toFixed(1)}
          <input
            max="1"
            min="0"
            step="0.1"
            type="range"
            value={settings.temperature}
            onChange={(event) => update({ temperature: Number(event.target.value) })}
          />
        </label>
        <label className="writer-field">
          最大输出 tokens
          <input
            min="256"
            step="256"
            type="number"
            value={settings.maxTokens}
            onChange={(event) => update({ maxTokens: Number(event.target.value) })}
          />
        </label>

        <footer className="settings-modal-footer">
          <span>{testMessage}</span>
          <button className="secondary-action" disabled={testing} onClick={onTest} type="button">
            {testing ? "测试中…" : "测试连接"}
          </button>
        </footer>
      </section>
    </div>
  );
}
