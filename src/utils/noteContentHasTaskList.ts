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

/** Returns true when note JSON content includes at least one task list. */
export function noteContentHasTaskList(content: string): boolean {
  if (!content) {
    return false;
  }

  try {
    const doc = JSON.parse(content) as JsonNode;
    return nodeContainsTaskList(doc);
  } catch {
    return false;
  }
}
