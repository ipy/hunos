import type { Editor } from "@tiptap/react";

type JsonNode = {
  type?: string;
  content?: JsonNode[];
};

function nodeContainsTaskList(node: JsonNode): boolean {
  if (node.type === "taskList") {
    return true;
  }

  return (node.content ?? []).some(nodeContainsTaskList);
}

/** Returns true when a TipTap/ProseMirror JSON doc includes at least one task list. */
export function jsonDocHasTaskList(doc: JsonNode | null | undefined): boolean {
  if (!doc) {
    return false;
  }
  return nodeContainsTaskList(doc);
}

/** Returns true when note JSON content includes at least one task list. */
export function noteContentHasTaskList(content: string): boolean {
  if (!content) {
    return false;
  }

  try {
    const doc = JSON.parse(content) as JsonNode;
    return jsonDocHasTaskList(doc);
  } catch {
    return false;
  }
}

/** Returns true when the live editor document includes at least one task list. */
export function editorHasTaskList(editor: Editor | null): boolean {
  if (!editor) {
    return false;
  }
  return jsonDocHasTaskList(editor.getJSON() as JsonNode);
}
