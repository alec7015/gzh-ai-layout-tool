export function precleanModelText(input: string): string {
  return stripInvisibleChars(input)
    .replace(/^\uFEFF/, "")
    .split("\u0000")
    .join("")
    .replace(/<(think|reasoning)>[\s\S]*?<\/\1>/gi, "")
    .replace(/^[\s\S]*?<(?:think|reasoning)>/i, "")
    .trim();
}

function stripInvisibleChars(input: string): string {
  return ["\u200B", "\u200C", "\u200D", "\u2060"].reduce(
    (current, char) => current.split(char).join(""),
    input
  );
}

export function extractFencedBlock(input: string): string | null {
  const cleaned = precleanModelText(input);
  const match = cleaned.match(/```(?:json|json5|javascript)?\s*([\s\S]*?)```/i);
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
  let result = stripLineCommentsOutsideStrings(input.trim());
  result = result.replace(/([{,]\s*)“([^”\n]{1,80})”(\s*:)/g, '$1"$2"$3');
  result = result.replace(/,(\s*[}\]])/g, "$1");
  return result;
}

export function extractJsonPayload(input: string): string | null {
  const cleaned = precleanModelText(input);
  if (!cleaned) {
    return null;
  }

  const fenced = extractFencedBlock(cleaned);
  const balanced = extractBalancedJson(fenced ?? cleaned);
  const candidates = [cleaned, fenced, balanced].filter(
    (item, index, list): item is string => Boolean(item) && list.indexOf(item) === index
  );

  for (const candidate of candidates) {
    if (parses(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    const repaired = repairJsonConservatively(candidate);
    if (parses(repaired)) {
      return repaired;
    }
  }

  return null;
}

function stripLineCommentsOutsideStrings(text: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      output += char;
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
      output += char;
      continue;
    }

    if (char === "/" && text[index + 1] === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }

    output += char;
  }

  return output;
}

function parses(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
