import type { ArticleAst } from "./types";
import { createSampleArticle } from "./draftStore";

const DRAFT_LIBRARY_KEY = "gzh-draft-library";
const MAX_VERSIONS = 20;

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
}

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
    return {
      ...parsed,
      drafts: parsed.drafts.map((draft) => ({
        ...draft,
        layoutArticle: draft.layoutArticle ?? null,
        versions: draft.versions ?? [],
      })),
    };
  } catch {
    return createDraftLibrary();
  }
}

export function saveDraftLibrary(
  storage: DraftLibraryStorage | undefined,
  library: DraftLibrary
): void {
  storage?.setItem(DRAFT_LIBRARY_KEY, JSON.stringify(library));
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
  if (latestVersion && JSON.stringify(latestVersion.article) === JSON.stringify(current.article)) {
    return library;
  }

  const version: DraftVersion = {
    id: createId("version"),
    reason,
    createdAt: new Date().toISOString(),
    article: current.article,
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

  return updateCurrentDraftArticle(library, version.article);
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

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
