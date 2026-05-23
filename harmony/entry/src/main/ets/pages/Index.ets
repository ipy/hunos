import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

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
