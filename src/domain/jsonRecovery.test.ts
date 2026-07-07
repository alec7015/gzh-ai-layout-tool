import { describe, expect, it } from "vitest";
import {
  extractBalancedJson,
  extractFencedBlock,
  extractJsonPayload,
  precleanModelText,
  repairJsonConservatively,
} from "./jsonRecovery";

describe("jsonRecovery", () => {
  it("precleans model wrappers and extracts fenced JSON", () => {
    const raw = "\uFEFF<think>推理</think>\n```json\n{\"ok\":true}\n```";

    expect(precleanModelText(raw)).not.toContain("<think>");
    expect(extractFencedBlock(raw)).toBe('{"ok":true}');
  });

  it("extracts the first balanced object from prose", () => {
    expect(extractBalancedJson('好的，结果是 {"plans":[{"styleId":"x"}]} 供参考')).toBe('{"plans":[{"styleId":"x"}]}');
  });

  it("repairs conservative trailing commas only", () => {
    expect(repairJsonConservatively('{"a":1,}')).toBe('{"a":1}');
    expect(repairJsonConservatively('{"a":[1,2,]}')).toBe('{"a":[1,2]}');
  });

  it("returns a parseable payload from dirty model output", () => {
    const payload = extractJsonPayload('说明\n```json\n{"a":[1,2,]}\n```\n结束');

    expect(JSON.parse(payload ?? "{}")).toEqual({ a: [1, 2] });
  });

  it("keeps valid JSON with Chinese quotes inside values unchanged", () => {
    const valid = JSON.stringify({ plans: [{ styleId: "x", reason: "引用“金句”与‘要点’测试" }] });
    const payload = extractJsonPayload(valid);

    expect(payload).toBe(valid);
    expect(JSON.parse(payload ?? "{}").plans[0].reason).toBe("引用“金句”与‘要点’测试");
  });

  it("repairs full-width quotes only on keys and keeps URL comments inside strings", () => {
    const dirty = '{“plans”:[{“styleId”:"x","reason":"看“这里” https://a.b//c",}]}';
    const payload = extractJsonPayload(dirty);

    expect(payload).not.toBeNull();
    const parsed = JSON.parse(payload ?? "{}");
    expect(parsed.plans[0].styleId).toBe("x");
    expect(parsed.plans[0].reason).toBe("看“这里” https://a.b//c");
    expect(repairJsonConservatively(payload ?? "")).toBe(payload);
  });

  it("strips line comments outside strings", () => {
    const payload = extractJsonPayload('{"plans":[\n// 方案A\n{"styleId":"x"}]}');

    expect(JSON.parse(payload ?? "{}").plans[0].styleId).toBe("x");
  });

  it("returns null for truncated JSON so the caller can classify it", () => {
    expect(extractJsonPayload('{"plans":[{"styleId":"x"')).toBeNull();
  });
});
