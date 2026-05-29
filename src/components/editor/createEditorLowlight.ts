import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

export function createEditorLowlight() {
  const lowlight = createLowlight({
    bash,
    css,
    javascript,
    json,
    markdown,
    plaintext,
    typescript,
    xml,
  });

  lowlight.registerAlias({
    javascript: ["js"],
    typescript: ["ts"],
    bash: ["sh", "shell"],
    xml: ["html"],
  });

  return lowlight;
}
