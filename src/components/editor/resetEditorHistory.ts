import type { Editor } from "@tiptap/react";
import { history } from "@tiptap/pm/history";
import { EditorState } from "@tiptap/pm/state";
import type { Plugin } from "@tiptap/pm/state";

function isHistoryPlugin(plugin: Plugin): boolean {
  const key = plugin.spec.key;
  return typeof key === "object" && key !== null && "key" in key && key.key === "history";
}

/** Replace the history plugin so undo/redo stacks start empty. */
export function createStateWithFreshHistory(state: EditorState): EditorState {
  const freshPlugins = state.plugins.map((plugin) => {
    if (!isHistoryPlugin(plugin)) return plugin;

    const config = (plugin.spec as { config?: { depth?: number; newGroupDelay?: number } })
      .config;
    return history({
      depth: config?.depth ?? 100,
      newGroupDelay: config?.newGroupDelay ?? 500,
    });
  });

  return EditorState.create({
    doc: state.doc,
    selection: state.selection,
    storedMarks: state.storedMarks,
    plugins: freshPlugins,
  });
}

/** Drop undo/redo stacks while keeping the current document and selection. */
export function resetEditorHistory(editor: Editor): void {
  editor.view.updateState(createStateWithFreshHistory(editor.state));
}
