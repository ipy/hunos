import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flushEditorAutosave = vi.fn().mockResolvedValue(null);

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
}));

import {
  bindEditorLifecycleAutosaveFlush,
  isHarmonyLifecycleListenerBound,
  resetEditorLifecycleAutosaveForTests,
} from "./editorLifecycleAutosave";
import {
  dispatchHarmonyLifecycleHide,
  HUNOS_LIFECYCLE_HIDE_EVENT,
} from "./harmonyLifecycleBridge";

type Listener = (event: Event) => void;

function createDomStub(initialVisibility: DocumentVisibilityState = "visible") {
  const documentListeners = new Map<string, Set<Listener>>();
  const windowListeners = new Map<string, Set<Listener>>();

  let visibilityState = initialVisibility;

  const document = {
    get visibilityState() {
      return visibilityState;
    },
    set visibilityState(next: DocumentVisibilityState) {
      visibilityState = next;
    },
    addEventListener(type: string, listener: Listener) {
      const bucket = documentListeners.get(type) ?? new Set<Listener>();
      bucket.add(listener);
      documentListeners.set(type, bucket);
    },
    removeEventListener(type: string, listener: Listener) {
      documentListeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      documentListeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
  };

  const window = {
    addEventListener(type: string, listener: Listener) {
      const bucket = windowListeners.get(type) ?? new Set<Listener>();
      bucket.add(listener);
      windowListeners.set(type, bucket);
    },
    removeEventListener(type: string, listener: Listener) {
      windowListeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      windowListeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
  };

  return { document, window };
}

describe("editorLifecycleAutosave", () => {
  let dom: ReturnType<typeof createDomStub>;

  beforeEach(() => {
    flushEditorAutosave.mockClear();
    resetEditorLifecycleAutosaveForTests();
    dom = createDomStub();
    vi.stubGlobal("document", dom.document);
    vi.stubGlobal("window", dom.window);
  });

  afterEach(() => {
    resetEditorLifecycleAutosaveForTests();
    vi.unstubAllGlobals();
  });

  it("flushes on visibilitychange when document becomes hidden", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.document.visibilityState = "hidden";
    dom.document.dispatchEvent(new Event("visibilitychange"));

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("does not flush on visibilitychange when document is visible", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.document.visibilityState = "visible";
    dom.document.dispatchEvent(new Event("visibilitychange"));

    expect(flushEditorAutosave).not.toHaveBeenCalled();
  });

  it("flushes on pagehide", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.window.dispatchEvent(new Event("pagehide"));

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("flushes on beforeunload", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.window.dispatchEvent(new Event("beforeunload"));

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("dedupes concurrent lifecycle flush requests", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.document.visibilityState = "hidden";
    dom.document.dispatchEvent(new Event("visibilitychange"));
    dom.window.dispatchEvent(new Event("pagehide"));

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("unbind removes lifecycle listeners", () => {
    const unbind = bindEditorLifecycleAutosaveFlush();
    unbind();

    dom.document.visibilityState = "hidden";
    dom.document.dispatchEvent(new Event("visibilitychange"));
    dom.window.dispatchEvent(new Event("pagehide"));
    dom.window.dispatchEvent(new Event("beforeunload"));

    expect(flushEditorAutosave).not.toHaveBeenCalled();
  });

  it("registers Harmony native background listener", () => {
    bindEditorLifecycleAutosaveFlush();

    expect(isHarmonyLifecycleListenerBound()).toBe(true);
    dom.window.dispatchEvent(new CustomEvent(HUNOS_LIFECYCLE_HIDE_EVENT));
    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("flushes on Harmony lifecycle hide event", () => {
    bindEditorLifecycleAutosaveFlush();

    dom.window.dispatchEvent(new CustomEvent(HUNOS_LIFECYCLE_HIDE_EVENT));

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("dispatchHarmonyLifecycleHide triggers flush when bound", () => {
    bindEditorLifecycleAutosaveFlush();

    dispatchHarmonyLifecycleHide();

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
  });

  it("clears Harmony listener on unbind", () => {
    const unbind = bindEditorLifecycleAutosaveFlush();
    unbind();

    expect(isHarmonyLifecycleListenerBound()).toBe(false);
    dispatchHarmonyLifecycleHide();
    expect(flushEditorAutosave).not.toHaveBeenCalled();
  });
});
