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
});
