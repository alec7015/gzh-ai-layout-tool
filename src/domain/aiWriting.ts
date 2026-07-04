import { astToMarkdown, markdownToAst } from "./draftStore";
import type { ArticleAst, ArticleBlock } from "./types";

export type RewriteMode = "润色" | "扩写" | "精简" | "续写";

export interface WritingRequestInput {
  topic: string;
  style: string;
  words: number;
  genre?: string;
  outline?: string;
}

export interface ChatCompletionRequest {
  model: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
  stream?: boolean;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}

export interface CoerceMarkdownOptions {
  allowPlaceholders?: boolean;
}

export interface ProtectedArticleMarkdown {
  markdown: string;
  protectedBlocks: Map<string, ArticleBlock>;
}

const WRITING_SYSTEM_PROMPT = `你是资深微信公众号主笔。直接输出文章正文，使用且仅使用以下 Markdown 语法：
- 第一行必须是文章标题，格式：# 标题
- 小节标题使用 ## 小节
- 列表使用 - 或 1.
- 引用使用 >
- 加粗使用 **文字**，斜体使用 *文字*
不要输出 JSON、HTML、代码围栏或解释。`;

const SMART_FORMAT_SYSTEM_PROMPT = `你是公众号编辑，负责结构化排版润色，不是重写。规则：
1. 保持原文事实、观点、语序和作者语气，只做结构与措辞的轻度优化
2. 第一行保留或优化为 # 标题
3. 合理增加 ## 小节、列表、引用和加粗
4. 不输出 HTML、JSON、代码围栏或解释
5. 形如 [[IMG:xxx]] 或 [[GRID:xxx]] 的占位符必须原样保留在原位置，不得删除、修改或移动到别处。`;

export function buildWritingRequest(input: WritingRequestInput): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: WRITING_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          `主题：${input.topic}`,
          `风格：${input.style}`,
          `目标字数：${input.words}`,
          input.genre ? `文体：${input.genre}` : "",
          input.outline ? `必须覆盖的要点/大纲：\n${input.outline}` : "",
          "请生成一篇完整的公众号文章。",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  };
}

export function buildSmartFormatRequest(markdown: string): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.4,
    messages: [
      { role: "system", content: SMART_FORMAT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请对下面这篇公众号草稿做结构化排版润色，输出完整 Markdown：\n\n${markdown}`,
      },
    ],
  };
}

export function buildRewriteRequest(mode: RewriteMode, markdown: string): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: mode === "精简" ? 0.3 : 0.6,
    messages: [
      {
        role: "system",
        content: "你是公众号编辑。只输出处理后的完整 Markdown 正文，第一行为 # 标题，不要任何解释。",
      },
      {
        role: "user",
        content: `请对下面文章执行「${mode}」。保留原有事实、图片占位符和主要结构。\n\n${markdown}`,
      },
    ],
  };
}

export function buildTitleRequest(markdown: string): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: "你是微信公众号标题编辑。只输出 4 行标题候选，不要编号，不要解释。",
      },
      {
        role: "user",
        content: `请根据下面正文起 4 个标题，每个标题不超过 28 个汉字：\n\n${markdown}`,
      },
    ],
  };
}

export function coerceMarkdownArticle(input: string, _options: CoerceMarkdownOptions = {}): ArticleAst | null {
  const markdown = stripMarkdownFence(input).trim();
  if (!markdown) {
    return null;
  }

  const normalized = firstContentLineIsHeading(markdown) ? markdown : `# 未命名草稿\n\n${markdown}`;
  return markdownToAst(normalized, { strictHeadings: true });
}

export function protectArticleImagesForAi(article: ArticleAst): ProtectedArticleMarkdown {
  const protectedBlocks = new Map<string, ArticleBlock>();
  const protectedArticle: ArticleAst = {
    ...article,
    blocks: article.blocks.map((block) => {
      if (block.type === "image") {
        protectedBlocks.set(block.id, block);
        return {
          id: `${block.id}-placeholder`,
          type: "paragraph",
          runs: [{ text: `[[IMG:${block.id}]]` }],
          style: {},
        };
      }

      if (block.type === "imageGrid") {
        protectedBlocks.set(block.id, block);
        return {
          id: `${block.id}-placeholder`,
          type: "paragraph",
          runs: [{ text: `[[GRID:${block.id}]]` }],
          style: {},
        };
      }

      return block;
    }),
  };

  return {
    markdown: astToMarkdown(protectedArticle),
    protectedBlocks,
  };
}

export function restoreProtectedImages(
  article: ArticleAst,
  protectedBlocks: Map<string, ArticleBlock>
): ArticleAst {
  const used = new Set<string>();
  const blocks = article.blocks.flatMap((block): ArticleBlock[] => {
    const placeholder = blockPlaceholder(block);
    if (!placeholder) {
      return [block];
    }

    const original = protectedBlocks.get(placeholder.id);
    if (!original) {
      return [block];
    }

    used.add(placeholder.id);
    return [original];
  });

  for (const [id, block] of protectedBlocks) {
    if (!used.has(id)) {
      blocks.push(block);
    }
  }

  return { ...article, blocks };
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

function stripMarkdownFence(input: string): string {
  return input
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function firstContentLineIsHeading(markdown: string): boolean {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
    ?.startsWith("#") ?? false;
}

function blockPlaceholder(block: ArticleBlock): { kind: "IMG" | "GRID"; id: string } | null {
  if (block.type !== "paragraph") {
    return null;
  }

  const text = block.runs.map((run) => run.text).join("").trim();
  const match = text.match(/^\[\[(IMG|GRID):(.+)]]$/);
  if (!match) {
    return null;
  }

  return { kind: match[1] as "IMG" | "GRID", id: match[2] };
}
