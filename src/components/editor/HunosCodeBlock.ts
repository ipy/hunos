import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  backtickInputRegex,
  tildeInputRegex,
} from "@tiptap/extension-code-block";
import { textblockTypeInputRule } from "@tiptap/core";
import { createEditorLowlight } from "./createEditorLowlight";
import { normalizeCodeBlockLanguage } from "@/utils/codeBlockLanguage";

const lowlight = createEditorLowlight();

export const HunosCodeBlock = CodeBlockLowlight.extend({
  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: normalizeCodeBlockLanguage(match[1]),
        }),
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: normalizeCodeBlockLanguage(match[1]),
        }),
      }),
    ];
  },
});

export function getHunosCodeBlockExtension() {
  return HunosCodeBlock.configure({
    lowlight,
    defaultLanguage: null,
  });
}
