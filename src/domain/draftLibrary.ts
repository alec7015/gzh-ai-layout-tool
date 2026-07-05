import type { ArticleAst } from "./types";
import { createSampleArticle } from "./draftStore";

const DRAFT_LIBRARY_KEY = "gzh-draft-library";
const MAX_VERSIONS = 12;
const IMAGE_REF_PREFIX = "ref:";

export interface DraftLibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export interface DraftVersion {
  id: string;
  reason: string;
  createdAt: string;
  article: ArticleAst;
}

export interface DraftRecord {
  id: string;
  title: string;
  updatedAt: string;
  article: ArticleAst;
  layoutArticle: ArticleAst | null;
  versions: DraftVersion[];
}

export interface DraftLibrary {
  currentDraftId: string;
  drafts: DraftRecord[];
  schemaVersion?: number;
}

const DRAFT_SCHEMA_VERSION = 2;

export function createDraftLibrary(article: ArticleAst = createSampleArticle()): DraftLibrary {
  const draft = createDraftRecord(article);
  return {
    currentDraftId: draft.id,
    drafts: [draft],
  };
}

export function loadDraftLibrary(storage: DraftLibraryStorage | undefined): DraftLibrary {
  if (!storage) {
    return createDraftLibrary();
  }

  const raw = storage.getItem(DRAFT_LIBRARY_KEY);
  if (!raw) {
    return createDraftLibrary();
  }

  try {
    const parsed = JSON.parse(raw) as DraftLibrary;
    if (!parsed.drafts?.length || !parsed.currentDraftId) {
      return createDraftLibrary();
    }
    const library = {
      ...parsed,
      drafts: parsed.drafts.map((draft) => ({
        ...draft,
        layoutArticle: draft.layoutArticle ?? null,
        versions: draft.versions ?? [],
      })),
    };
    if ((library.schemaVersion ?? 1) < DRAFT_SCHEMA_VERSION) {
      library.drafts = library.drafts.map((draft) => ({
        ...draft,
        article: migrateHeadingLevels(draft.article),
        layoutArticle: draft.layoutArticle ? migrateHeadingLevels(draft.layoutArticle) : draft.layoutArticle,
        versions: draft.versions.map((v) => ({ ...v, article: migrateHeadingLevels(v.article) })),
      }));
      library.schemaVersion = DRAFT_SCHEMA_VERSION;
    }
    return library;
  } catch {
    return createDraftLibrary();
  }
}

export function saveDraftLibrary(
  storage: DraftLibraryStorage | undefined,
  library: DraftLibrary
): boolean {
  if (!storage) {
    return true;
  }

  try {
    storage.setItem(DRAFT_LIBRARY_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

export function getCurrentDraft(library: DraftLibrary): DraftRecord {
  return (
    library.drafts.find((draft) => draft.id === library.currentDraftId) ??
    library.drafts[0] ??
    createDraftRecord(createSampleArticle())
  );
}

export function createDraft(library: DraftLibrary, article: ArticleAst = createSampleArticle()): DraftLibrary {
  const draft = createDraftRecord(article);
  return {
    currentDraftId: draft.id,
    drafts: [draft, ...library.drafts],
  };
}

export function selectDraft(library: DraftLibrary, draftId: string): DraftLibrary {
  if (!library.drafts.some((draft) => draft.id === draftId)) {
    return library;
  }

  return {
    ...library,
    currentDraftId: draftId,
  };
}

export function deleteDraft(library: DraftLibrary, draftId: string): DraftLibrary {
  if (library.drafts.length <= 1) {
    return library;
  }

  const drafts = library.drafts.filter((draft) => draft.id !== draftId);
  const currentDraftId =
    library.currentDraftId === draftId ? drafts[0].id : library.currentDraftId;

  return {
    currentDraftId,
    drafts,
  };
}

export function updateCurrentDraftArticle(
  library: DraftLibrary,
  article: ArticleAst
): DraftLibrary {
  return {
    ...library,
    drafts: library.drafts.map((draft) =>
      draft.id === library.currentDraftId
        ? {
            ...draft,
            title: article.meta.title || "未命名草稿",
            updatedAt: new Date().toISOString(),
            article,
          }
        : draft
    ),
  };
}

export function updateCurrentDraftLayoutArticle(
  library: DraftLibrary,
  layoutArticle: ArticleAst | null
): DraftLibrary {
  return {
    ...library,
    drafts: library.drafts.map((draft) =>
      draft.id === library.currentDraftId
        ? {
            ...draft,
            updatedAt: new Date().toISOString(),
            layoutArticle,
          }
        : draft
    ),
  };
}

export function createVersionSnapshot(
  library: DraftLibrary,
  reason: string
): DraftLibrary {
  const current = getCurrentDraft(library);
  const latestVersion = current.versions[0];
  const snapshotArticle = slimArticleImages(current.article);
  if (latestVersion && JSON.stringify(latestVersion.article) === JSON.stringify(snapshotArticle)) {
    return library;
  }

  const version: DraftVersion = {
    id: createId("version"),
    reason,
    createdAt: new Date().toISOString(),
    article: snapshotArticle,
  };

  return {
    ...library,
    drafts: library.drafts.map((draft) =>
      draft.id === current.id
        ? { ...draft, versions: [version, ...draft.versions].slice(0, MAX_VERSIONS) }
        : draft
    ),
  };
}

export function deleteVersion(library: DraftLibrary, versionId: string): DraftLibrary {
  const current = getCurrentDraft(library);
  if (!current.versions.some((version) => version.id === versionId)) {
    return library;
  }

  return {
    ...library,
    drafts: library.drafts.map((draft) =>
      draft.id === current.id
        ? { ...draft, versions: draft.versions.filter((version) => version.id !== versionId) }
        : draft
    ),
  };
}

export function restoreVersion(library: DraftLibrary, versionId: string): DraftLibrary {
  const current = getCurrentDraft(library);
  const version = current.versions.find((item) => item.id === versionId);

  if (!version) {
    return library;
  }

  return updateCurrentDraftArticle(library, restoreArticleImages(version.article, current));
}

export function clearAllVersionHistory(library: DraftLibrary): DraftLibrary {
  return {
    ...library,
    drafts: library.drafts.map((draft) => ({ ...draft, versions: [] })),
  };
}

export function resetDrafts(article: ArticleAst = createSampleArticle()): DraftLibrary {
  return createDraftLibrary(article);
}

function createDraftRecord(article: ArticleAst): DraftRecord {
  return {
    id: createId("draft"),
    title: article.meta.title || "未命名草稿",
    updatedAt: new Date().toISOString(),
    article,
    layoutArticle: null,
    versions: [],
  };
}

function migrateHeadingLevels(article: ArticleAst): ArticleAst {
  return {
    ...article,
    blocks: article.blocks.map((block) =>
      block.type === "heading" && typeof block.level === "number"
        ? { ...block, level: Math.max(1, Math.min(3, block.level - 1)) as 1 | 2 | 3 }
        : block
    ),
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slimArticleImages(article: ArticleAst): ArticleAst {
  return {
    ...article,
    blocks: article.blocks.map((block) => {
      if (block.type === "image") {
        return { ...block, src: imageRef(block.id) };
      }
      if (block.type === "imageGrid") {
        return {
          ...block,
          images: block.images.map((image, index) => ({
            ...image,
            src: imageRef(`${block.id}:${index}`),
          })),
        };
      }
      return block;
    }),
  };
}

function restoreArticleImages(article: ArticleAst, current: DraftRecord): ArticleAst {
  const lookup = collectImageSources(current);
  return {
    ...article,
    blocks: article.blocks.map((block) => {
      if (block.type === "image" && isImageRef(block.src)) {
        return { ...block, src: lookup.get(refId(block.src)) ?? missingImagePlaceholder() };
      }
      if (block.type === "imageGrid") {
        return {
          ...block,
          images: block.images.map((image) =>
            isImageRef(image.src)
              ? { ...image, src: lookup.get(refId(image.src)) ?? missingImagePlaceholder() }
              : image
          ),
        };
      }
      return block;
    }),
  };
}

function collectImageSources(current: DraftRecord): Map<string, string> {
  const lookup = new Map<string, string>();
  [current.article, current.layoutArticle, ...current.versions.map((version) => version.article)]
    .filter((article): article is ArticleAst => Boolean(article))
    .forEach((article) => {
      article.blocks.forEach((block) => {
        if (block.type === "image" && !isImageRef(block.src)) {
          lookup.set(block.id, block.src);
        }
        if (block.type === "imageGrid") {
          block.images.forEach((image, index) => {
            if (!isImageRef(image.src)) {
              lookup.set(`${block.id}:${index}`, image.src);
            }
          });
        }
      });
    });
  return lookup;
}

function imageRef(id: string): string {
  return `${IMAGE_REF_PREFIX}${id}`;
}

function isImageRef(src: string): boolean {
  return src.startsWith(IMAGE_REF_PREFIX);
}

function refId(src: string): string {
  return src.slice(IMAGE_REF_PREFIX.length);
}

function missingImagePlaceholder(): string {
  return "data:image/gif;base64,R0lGODlhAQABAPAAAP///8zMzCwAAAAAAQABAAACAkQBADs=";
}
