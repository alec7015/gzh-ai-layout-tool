export type WechatComplianceRule =
  | "allowed-tags"
  | "no-class-id"
  | "no-style-script"
  | "no-grid-flex-float-position"
  | "no-modern-color"
  | "svg-data-uri-escaped"
  | "webkit-prefix";

export interface WechatComplianceViolation {
  rule: WechatComplianceRule;
  message: string;
  snippet: string;
}

export interface WechatComplianceResult {
  ok: boolean;
  violations: WechatComplianceViolation[];
}

const allowedTags = new Set([
  "section",
  "p",
  "span",
  "strong",
  "em",
  "img",
  "blockquote",
  "ul",
  "ol",
  "li",
  "table",
  "tbody",
  "thead",
  "tr",
  "th",
  "td",
  "br",
  "h1",
  "h2",
  "h3",
]);

export function scanWechatHtmlCompliance(html: string): WechatComplianceResult {
  const violations: WechatComplianceViolation[] = [];
  const push = (rule: WechatComplianceRule, message: string, snippet: string) => {
    violations.push({ rule, message, snippet: snippet.slice(0, 160) });
  };

  for (const match of html.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s[^>]*)?>/gi)) {
    const tag = match[1].toLowerCase();
    if (!allowedTags.has(tag)) {
      push("allowed-tags", `Tag <${tag}> is not in the WeChat renderer allowlist.`, match[0]);
    }
  }

  if (/<(?:style|script)\b/i.test(html)) {
    push("no-style-script", "Rendered HTML must not contain style or script tags.", firstMatch(html, /<(?:style|script)\b[^>]*>/i));
  }

  for (const match of html.matchAll(/\s(?:class|id)=["'][^"']*["']/gi)) {
    push("no-class-id", "Rendered HTML must not contain class or id attributes.", match[0]);
  }

  for (const match of html.matchAll(/style=["']([^"']*)["']/gi)) {
    const styleText = match[1];
    if (/\bdisplay\s*:\s*(?:grid|flex)\b/i.test(styleText) || /\bfloat\s*:/i.test(styleText) || /\bposition\s*:\s*(?:fixed|absolute|sticky)\b/i.test(styleText)) {
      push("no-grid-flex-float-position", "Rendered inline styles must avoid grid/flex/float/fixed positioning.", match[0]);
    }
    if (/(?:color-mix|oklch|lab)\(/i.test(styleText)) {
      push("no-modern-color", "Rendered inline styles must avoid modern color functions unsupported by older WebKit.", match[0]);
    }
    if (/\bbackdrop-filter\s*:/i.test(styleText) && !/-webkit-backdrop-filter\s*:/i.test(styleText)) {
      push("webkit-prefix", "backdrop-filter must be paired with -webkit-backdrop-filter.", match[0]);
    }
  }

  for (const match of html.matchAll(/url\(["']?data:image\/svg\+xml,([^"')]+)["']?\)/gi)) {
    if (/[#<>"\s]/.test(match[1])) {
      push("svg-data-uri-escaped", "SVG data URI must be percent-encoded for WebKit.", match[0]);
    }
  }

  return { ok: violations.length === 0, violations };
}

function firstMatch(value: string, pattern: RegExp): string {
  return value.match(pattern)?.[0] ?? value;
}
