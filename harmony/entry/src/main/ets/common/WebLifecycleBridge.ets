import { webview } from '@kit.ArkWeb';

/** Must match HUNOS_LIFECYCLE_HIDE_EVENT in src/store/harmonyLifecycleBridge.ts */
const LIFECYCLE_HIDE_SCRIPT =
  'void window.dispatchEvent(new CustomEvent("hunos:lifecycle-hide"));';

export class WebLifecycleBridge {
  private static controller: webview.WebviewController | null = null;

  static register(controller: webview.WebviewController): void {
    WebLifecycleBridge.controller = controller;
  }

  static notifyBackground(): void {
    const controller = WebLifecycleBridge.controller;
    if (!controller) {
      return;
    }
    controller.runJavaScript(LIFECYCLE_HIDE_SCRIPT).catch(() => {
      // Page may not be ready during early background; ignore.
    });
  }
}
