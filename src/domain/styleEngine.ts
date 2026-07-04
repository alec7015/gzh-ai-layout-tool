import type { StyleOverrides, StylePreset } from "./types";

export function mergeStylePreset(
  base: StylePreset,
  aiOverrides: StyleOverrides = {},
  userOverrides: StyleOverrides = {}
): StylePreset {
  const merged = structuredClone(base);

  applyOverrides(merged, aiOverrides);
  applyOverrides(merged, userOverrides);

  return merged;
}

function applyOverrides(target: StylePreset, overrides: StyleOverrides): void {
  Object.entries(overrides).forEach(([path, value]) => {
    if (value === null) {
      return;
    }

    const segments = path.split(".");
    let cursor: Record<string, unknown> = target as unknown as Record<string, unknown>;

    segments.slice(0, -1).forEach((segment) => {
      const next = cursor[segment];
      if (!isRecord(next)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    });

    cursor[segments[segments.length - 1]] = value;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
