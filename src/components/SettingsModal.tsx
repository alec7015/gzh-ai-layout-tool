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
  storageUsage: {
    drafts: number;
    styles: number;
    settings: number;
    total: number;
  };
  onChange(settings: AiSettings): void;
  onClose(): void;
  onTest(): void;
  onClearVersions(): void;
  onDeleteDrafts(): void;
  onResetLocalData(): void;
}

export function SettingsModal({
  settings,
  testing,
  testMessage,
  storageUsage,
  onChange,
  onClose,
  onTest,
  onClearVersions,
  onDeleteDrafts,
  onResetLocalData,
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

        <section className="storage-management" aria-label="存储管理">
          <h3>存储管理</h3>
          <div className="storage-meter">
            <span style={{ width: `${Math.min(100, Math.round(storageUsage.total / 1024 / 1024 / 10 * 100))}%` }} />
          </div>
          <p>
            草稿 {formatBytes(storageUsage.drafts)} · 版式 {formatBytes(storageUsage.styles)} · 设置{" "}
            {formatBytes(storageUsage.settings)}
          </p>
          <div className="storage-actions">
            <button className="secondary-action" type="button" onClick={onClearVersions}>
              清空所有版本历史
            </button>
            <button className="secondary-action danger" type="button" onClick={onDeleteDrafts}>
              删除全部草稿
            </button>
            <button className="secondary-action danger" type="button" onClick={onResetLocalData}>
              重置全部本地数据
            </button>
          </div>
        </section>

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

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
