import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./uiStore";

describe("returnToNoteList", () => {
  beforeEach(() => {
    useUIStore.setState({
      currentScreen: "noteList",
      screenStack: ["noteList"],
      sidebarVisible: true,
    });
  });

  it("pops editor without pushing another noteList frame", () => {
    useUIStore.setState({
      currentScreen: "editor",
      screenStack: ["noteList", "editor"],
    });
    useUIStore.getState().returnToNoteList();
    const state = useUIStore.getState();
    expect(state.currentScreen).toBe("noteList");
    expect(state.screenStack).toEqual(["noteList"]);
    expect(state.sidebarVisible).toBe(false);
  });

  it("recovers from duplicate noteList entries after sidebar navigation", () => {
    useUIStore.setState({
      currentScreen: "noteList",
      screenStack: ["noteList", "editor", "noteList"],
      sidebarVisible: true,
    });
    useUIStore.getState().returnToNoteList();
    expect(useUIStore.getState().screenStack).toEqual(["noteList"]);
    expect(useUIStore.getState().currentScreen).toBe("noteList");
  });
});
