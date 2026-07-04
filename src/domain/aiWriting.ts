import type { ArticleAst } from "./types";

export type RewriteMode = "润色" | "扩写" | "精简" | "续写";

export interface WritingRequestInput {
  topic: string;
  style: string;
  words: number;
}

export interface ChatCompletionRequest {
  model: string;
  temperature: number;
  response_format: { type: "json_object" };
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}

export function buildWritingRequest(input: WritingRequestInput): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是微信公众号写作助手。只输出 JSON，字段为 title、digest、blocks。blocks 只能表达内容结构，不要输出任何视觉样式。",
      },
      {
        role: "user",
        content: `主题：${input.topic}\n风格：${input.style}\n目标字数：${input.words}\n请生成一篇结构清晰、适合后续排版的公众号草稿。`,
      },
    ],
  };
}

export function generateDraftLocally(topic: string, style: string): ArticleAst {
  const normalizedTopic = topic.trim() || "新的文章主题";
  const tone = style.trim() || "清晰实用";

  return {
    meta: {
      title: `${normalizedTopic}：三个可执行的小方法`,
      digest: createDigest(`围绕${normalizedTopic}，用${tone}的方式整理出三个马上能做的动作。`),
    },
    blocks: [
      {
        id: "ai-title",
        type: "title",
        text: `${normalizedTopic}：三个可执行的小方法`,
        style: {},
      },
      {
        id: "ai-heading-1",
        type: "heading",
        text: "先把目标说清楚",
        style: {},
      },
      {
        id: "ai-paragraph-1",
        type: "paragraph",
        runs: [
          {
            text: `很多时候，${normalizedTopic}做不起来，不是因为不重要，而是因为第一步太模糊。先把目标缩小到今天能完成的一件事。`,
          },
        ],
        style: {},
      },
      {
        id: "ai-list-1",
        type: "list",
        ordered: false,
        items: ["写下一个最小动作", "给它安排固定时间", "提前清掉一个阻力"],
        style: {},
      },
      {
        id: "ai-quote-1",
        type: "quote",
        text: "真正能坚持的改变，通常从一个不费力的小动作开始。",
        style: {},
      },
      {
        id: "ai-heading-2",
        type: "heading",
        text: "让反馈来得更快",
        style: {},
      },
      {
        id: "ai-paragraph-2",
        type: "paragraph",
        runs: [
          {
            text: `如果想让${normalizedTopic}变成习惯，就要让自己更快看到结果。每天记录一次完成情况，比空想更能带来稳定感。`,
          },
        ],
        style: {},
      },
    ],
  };
}

export function rewriteSelectionLocally(text: string, mode: RewriteMode): string {
  const value = text.trim();

  if (!value) {
    return "";
  }

  if (mode === "扩写") {
    return `${value}。更具体地说，可以先从一个低成本动作开始，让改变更容易被重复。`;
  }

  if (mode === "精简") {
    return value
      .replace(/非常|特别|其实|真的|我觉得|可以说/g, "")
      .replace(/，?重要$/, "")
      .replace(/，，/g, "，")
      .replace(/，$/g, "");
  }

  if (mode === "续写") {
    return `${value}\n\n接下来要做的，是把这个判断落到每天都能执行的细节里。`;
  }

  return `${value}，这是一件值得认真对待的事。`;
}

export function suggestTitles(topic: string, body: string): string[] {
  const normalizedTopic = topic.trim() || "这件事";
  const hook = body.includes("方法") || body.includes("步骤") ? "方法" : "提醒";

  return [
    `${normalizedTopic}：三个真正能执行的${hook}`,
    `把${normalizedTopic}做好，其实先做这三步`,
    `关于${normalizedTopic}，我最想提醒你的事`,
    `${normalizedTopic}不是靠用力，而是靠顺手`,
  ];
}

export function createDigest(body: string): string {
  const compact = body.replace(/\s+/g, "");
  return compact.length <= 64 ? compact : `${compact.slice(0, 61)}...`;
}
