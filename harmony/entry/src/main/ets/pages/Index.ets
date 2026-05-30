import { webview } from '@kit.ArkWeb';
import { WebLifecycleBridge } from '../common/WebLifecycleBridge';

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  aboutToAppear(): void {
    // Debug: ArkWeb CDP for emulator (hdc fport → chrome://inspect). See harmony/scripts/e2e-cdp-forward.sh
    webview.WebviewController.setWebDebuggingAccess(true);
  }

  build() {
    Column() {
      Web({ src: $rawfile('index.html'), controller: this.controller })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .databaseAccess(true)
        .mixedMode(MixedMode.All)
        .onPageBegin(() => {
          console.info('[Hunos] Page loading started');
        })
        .onPageEnd(() => {
          console.info('[Hunos] Page loading completed');
          WebLifecycleBridge.register(this.controller);
        })
        .onErrorReceive((event) => {
          if (event) {
            console.error('[Hunos] Web error: ' + JSON.stringify(event.error));
          }
        })
    }
    .width('100%')
    .height('100%')
  }
}
