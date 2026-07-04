import { describe, expect, it } from "vitest";
import {
  createDraft,
  createDraftLibrary,
  createVersionSnapshot,
  deleteDraft,
  getCurrentDraft,
  loadDraftLibrary,
  restoreVersion,
  saveDraftLibrary,
  selectDraft,
  updateCurrentDraftArticle,
} from "./draftLibrary";
import { createSampleArticle } from "./draftStore";

describe("draftLibrary", () => {
  it("creates, selects, and deletes drafts", () => {
    const firstArticle = createSampleArticle();
    const library = createDraftLibrary(firstArticle);
    const withSecond = createDraft(library, {
      ...firstArticle,
      meta: { title: "第二篇" },
    });
    const secondId = withSecond.currentDraftId;

    expect(withSecond.drafts).toHaveLength(2);
    expect(getCurrentDraft(withSecond).article.meta.title).toBe("第二篇");

    const selectedFirst = selectDraft(withSecond, library.currentDraftId);
    expect(getCurrentDraft(selectedFirst).article.meta.title).toBe(firstArticle.meta.title);

    const deletedSecond = deleteDraft(selectDraft(withSecond, secondId), secondId);
    expect(deletedSecond.drafts).toHaveLength(1);
    expect(deletedSecond.currentDraftId).toBe(library.currentDraftId);
  });

  it("creates and restores version snapshots", () => {
    const library = createDraftLibrary(createSampleArticle());
    const versioned = createVersionSnapshot(library, "去排版");
    const updated = updateCurrentDraftArticle(versioned, {
      ...getCurrentDraft(versioned).article,
      meta: { title: "改过的标题" },
    });

    const restored = restoreVersion(updated, getCurrentDraft(updated).versions[0].id);

    expect(getCurrentDraft(restored).article.meta.title).toBe("三个早起技巧");
  });

  it("auto-saving the current draft does not overwrite other drafts", () => {
    const initial = createDraftLibrary(createSampleArticle());
    const withSecond = createDraft(initial, {
      ...createSampleArticle(),
      meta: { title: "第二篇" },
    });
    const updatedSecond = updateCurrentDraftArticle(withSecond, {
      ...getCurrentDraft(withSecond).article,
      meta: { title: "第二篇已更新" },
    });

    expect(updatedSecond.drafts.find((draft) => draft.id === initial.currentDraftId)?.article.meta.title).toBe(
      "三个早起技巧"
    );
    expect(getCurrentDraft(updatedSecond).article.meta.title).toBe("第二篇已更新");
  });

  it("persists the full draft library", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const library = createDraft(createDraftLibrary(createSampleArticle()), {
      ...createSampleArticle(),
      meta: { title: "第二篇" },
    });

    saveDraftLibrary(adapter, library);

    expect(loadDraftLibrary(adapter).drafts).toHaveLength(2);
    expect(getCurrentDraft(loadDraftLibrary(adapter)).article.meta.title).toBe("第二篇");
  });
});
