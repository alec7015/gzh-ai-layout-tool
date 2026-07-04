import { describe, expect, it } from "vitest";
import {
  createDraft,
  createDraftLibrary,
  createVersionSnapshot,
  deleteVersion,
  deleteDraft,
  getCurrentDraft,
  loadDraftLibrary,
  restoreVersion,
  saveDraftLibrary,
  selectDraft,
  updateCurrentDraftArticle,
  updateCurrentDraftLayoutArticle,
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

  it("deletes a version and ignores unknown version ids", () => {
    const library = createVersionSnapshot(createDraftLibrary(createSampleArticle()), "手动保存");
    const versionId = getCurrentDraft(library).versions[0].id;

    const deleted = deleteVersion(library, versionId);
    const unchanged = deleteVersion(deleted, "missing-version");

    expect(getCurrentDraft(deleted).versions).toHaveLength(0);
    expect(unchanged).toEqual(deleted);
  });

  it("deduplicates adjacent identical snapshots and keeps the newest twenty versions", () => {
    let library = createDraftLibrary(createSampleArticle());
    library = createVersionSnapshot(library, "重复快照");
    library = createVersionSnapshot(library, "重复快照");

    expect(getCurrentDraft(library).versions).toHaveLength(1);

    for (let index = 0; index < 25; index += 1) {
      library = updateCurrentDraftArticle(library, {
        ...getCurrentDraft(library).article,
        meta: { title: `版本 ${index}` },
      });
      library = createVersionSnapshot(library, `保存 ${index}`);
    }

    expect(getCurrentDraft(library).versions).toHaveLength(20);
    expect(getCurrentDraft(library).versions[0].reason).toBe("保存 24");
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

  it("stores a layout article per draft without overwriting writing drafts", () => {
    const initial = createDraftLibrary(createSampleArticle());
    const withLayout = updateCurrentDraftLayoutArticle(initial, {
      ...createSampleArticle(),
      meta: { title: "排版稿" },
    });
    const withSecond = createDraft(withLayout, {
      ...createSampleArticle(),
      meta: { title: "第二篇" },
    });
    const updatedSecond = updateCurrentDraftLayoutArticle(withSecond, null);
    const first = updatedSecond.drafts.find((draft) => draft.id === initial.currentDraftId);

    expect(first?.layoutArticle?.meta.title).toBe("排版稿");
    expect(getCurrentDraft(updatedSecond).layoutArticle).toBeNull();
    expect(first?.article.meta.title).toBe("三个早起技巧");
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
