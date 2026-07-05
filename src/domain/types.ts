export type BlockType =
  | "title"
  | "heading"
  | "paragraph"
  | "quote"
  | "list"
  | "image"
  | "imageGrid"
  | "table"
  | "divider";

export type TextMark = "bold" | "italic" | "emphasis" | "underline" | "strike";

export type BlockOverride = Record<string, string | number | boolean | null>;
export type BlockRole = "lead" | "keyQuote" | "emphasis" | "steps" | "summary";

export interface TextRun {
  text: string;
  marks?: TextMark[];
  attrs?: {
    color?: string;
    background?: string;
    fontSize?: string;
    fontFamily?: string;
  };
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  style?: BlockOverride;
  role?: BlockRole;
}

export interface TitleBlock extends BaseBlock {
  type: "title";
  text: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level?: 1 | 2 | 3;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  runs: TextRun[];
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  caption?: string;
}

export type GridLayout = "two" | "three" | "quad";

export interface GridImage {
  src: string;
  alt?: string;
}

export interface ImageGridBlock extends BaseBlock {
  type: "imageGrid";
  images: GridImage[];
  layout: GridLayout;
  gap: number;
  radius: number;
}

export interface TableRow {
  cells: string[];
  header?: boolean;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: TableRow[];
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export type ArticleBlock =
  | TitleBlock
  | HeadingBlock
  | ParagraphBlock
  | QuoteBlock
  | ListBlock
  | ImageBlock
  | ImageGridBlock
  | TableBlock
  | DividerBlock;

export interface ArticleAst {
  meta: {
    title: string;
    digest?: string;
  };
  blocks: ArticleBlock[];
}

export interface Palette {
  primary: string;
  secondary: string;
  bg: string;
  textMain: string;
  textSub: string;
  accent: string;
}

export interface Typography {
  titleSize: string;
  h2Size: string;
  bodySize: string;
  lineHeight: number;
  letterSpacing: string;
  firstLetterDrop: boolean;
}

export interface Rhythm {
  paragraphGap: string;
  sectionGap: string;
  contentPadding: string;
  align: "left" | "center";
  firstLineIndent?: string;
}

export interface ComponentVariant {
  variant: string;
}

export interface StylePreset {
  id: string;
  name: string;
  moods: string[];
  palette: Palette;
  typography: Typography;
  rhythm: Rhythm;
  components: {
    title: ComponentVariant;
    heading: ComponentVariant;
    quote: ComponentVariant;
    list: ComponentVariant;
    emphasis: ComponentVariant;
    divider: ComponentVariant;
    image: ComponentVariant;
  };
  decorations: {
    header: string | null;
    footer: string | null;
    footerText?: string;
    sectionOrnament: string | null;
  };
}

export interface ArticleAnalysis {
  genre: string;
  tone: string;
  hasList: boolean;
  strongQuotes: number;
  avgParaLen: number;
  length: "短" | "中" | "长";
  keywords: string[];
}

export type StyleOverrides = Record<string, string | number | boolean | null>;

export interface LayoutRecommendation {
  styleId: string;
  reason: string;
  overrides: StyleOverrides;
}

export interface LayoutPlan {
  styleId: string;
  reason: string;
  palette?: {
    primary: string;
  };
  components?: Partial<
    Record<"title" | "heading" | "quote" | "list" | "emphasis" | "divider", string>
  >;
  blocks?: Array<{
    blockId: string;
    role: BlockRole;
  }>;
}
