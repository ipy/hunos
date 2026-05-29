import Document from "@tiptap/extension-document";

/** Persists format-playground metadata on the doc node through autosave. */
export const PlaygroundDocument = Document.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      playgroundContentVersion: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      playgroundContentLocale: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },
});
