export function precleanModelText(input: string): string {
  return input
    .replace(/^\uFEFF/, "")
    .split("\u0000")
    .join("")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

export function extractFencedBlock(input: string): string | null {
  const cleaned = precleanModelText(input);
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
}

export function extractBalancedJson(input: string): string | null {
  const source = precleanModelText(input);
  const start = source.search(/[{[]/);
  if (start < 0) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if (char === "}" || char === "]") {
      if (stack.pop() !== char) {
        return null;
      }
      if (stack.length === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return null;
}

export function repairJsonConservatively(input: string): string {
  return input
    .trim()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractJsonPayload(input: string): string | null {
  const cleaned = precleanModelText(input);
  const fenced = extractFencedBlock(cleaned);
  const source = fenced ?? cleaned;
  const balanced = extractBalancedJson(source);
  const candidate = balanced ?? (/^\s*[{[]/.test(source) ? source : null);
  return candidate ? repairJsonConservatively(candidate) : null;
}
