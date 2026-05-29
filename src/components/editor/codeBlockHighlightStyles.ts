export function getCodeBlockHighlightStyles(isDark: boolean): string {
  if (isDark) {
    return `
      .hunos-editor pre code { color: #e6edf3; }
      .hunos-editor pre code .hljs-keyword,
      .hunos-editor pre code .hljs-selector-tag,
      .hunos-editor pre code .hljs-literal { color: #ff7b72; }
      .hunos-editor pre code .hljs-string,
      .hunos-editor pre code .hljs-regexp,
      .hunos-editor pre code .hljs-addition { color: #a5d6ff; }
      .hunos-editor pre code .hljs-number,
      .hunos-editor pre code .hljs-symbol,
      .hunos-editor pre code .hljs-bullet { color: #79c0ff; }
      .hunos-editor pre code .hljs-comment,
      .hunos-editor pre code .hljs-quote,
      .hunos-editor pre code .hljs-deletion { color: #8b949e; font-style: italic; }
      .hunos-editor pre code .hljs-title,
      .hunos-editor pre code .hljs-section,
      .hunos-editor pre code .hljs-function .hljs-title,
      .hunos-editor pre code .hljs-title.function_ { color: #d2a8ff; }
      .hunos-editor pre code .hljs-built_in,
      .hunos-editor pre code .hljs-type,
      .hunos-editor pre code .hljs-class .hljs-title { color: #ffa657; }
      .hunos-editor pre code .hljs-variable,
      .hunos-editor pre code .hljs-template-variable,
      .hunos-editor pre code .hljs-attr,
      .hunos-editor pre code .hljs-attribute { color: #79c0ff; }
      .hunos-editor pre code .hljs-meta,
      .hunos-editor pre code .hljs-meta .hljs-keyword { color: #ffa657; }
      .hunos-editor pre code .hljs-params { color: #e6edf3; }
      .hunos-editor pre code .hljs-name,
      .hunos-editor pre code .hljs-selector-id,
      .hunos-editor pre code .hljs-selector-class { color: #7ee787; }
    `;
  }

  return `
    .hunos-editor pre code { color: #24292f; }
    .hunos-editor pre code .hljs-keyword,
    .hunos-editor pre code .hljs-selector-tag,
    .hunos-editor pre code .hljs-literal { color: #cf222e; }
    .hunos-editor pre code .hljs-string,
    .hunos-editor pre code .hljs-regexp,
    .hunos-editor pre code .hljs-addition { color: #0a3069; }
    .hunos-editor pre code .hljs-number,
    .hunos-editor pre code .hljs-symbol,
    .hunos-editor pre code .hljs-bullet { color: #0550ae; }
    .hunos-editor pre code .hljs-comment,
    .hunos-editor pre code .hljs-quote,
    .hunos-editor pre code .hljs-deletion { color: #57606a; font-style: italic; }
    .hunos-editor pre code .hljs-title,
    .hunos-editor pre code .hljs-section,
    .hunos-editor pre code .hljs-function .hljs-title,
    .hunos-editor pre code .hljs-title.function_ { color: #8250df; }
    .hunos-editor pre code .hljs-built_in,
    .hunos-editor pre code .hljs-type,
    .hunos-editor pre code .hljs-class .hljs-title { color: #953800; }
    .hunos-editor pre code .hljs-variable,
    .hunos-editor pre code .hljs-template-variable,
    .hunos-editor pre code .hljs-attr,
    .hunos-editor pre code .hljs-attribute { color: #0550ae; }
    .hunos-editor pre code .hljs-meta,
    .hunos-editor pre code .hljs-meta .hljs-keyword { color: #953800; }
    .hunos-editor pre code .hljs-params { color: #24292f; }
    .hunos-editor pre code .hljs-name,
    .hunos-editor pre code .hljs-selector-id,
    .hunos-editor pre code .hljs-selector-class { color: #116329; }
  `;
}
