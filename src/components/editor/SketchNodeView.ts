import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  computeImageResizeHeight,
  isResizableBlockImage,
} from "./imageResizeUtils";

const IMAGE_RESIZE_KEY = new PluginKey("imageResize");

export const SketchResize = Extension.create({
  name: "sketchResize",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: IMAGE_RESIZE_KEY,
        props: {
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (isResizableBlockImage(node)) {
                const endPos = pos + node.nodeSize;
                const handle = document.createElement("div");
                handle.className = "sketch-resize-handle";
                handle.setAttribute("data-image-resize-pos", String(pos));
                decorations.push(
                  Decoration.widget(endPos, handle, { side: -1 }),
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },

          handleDOMEvents: {
            mousedown(view, event) {
              return handleDragStart(view, event, event.clientY);
            },
            touchstart(view, event) {
              const target = event.target as HTMLElement;
              if (!target.classList.contains("sketch-resize-handle"))
                return false;
              const touch = event.touches[0];
              return handleDragStart(view, event, touch.clientY);
            },
          },
        },
      }),
    ];

    function handleDragStart(view: any, event: Event, startY: number): boolean {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("sketch-resize-handle")) return false;

      event.preventDefault();
      const posStr = target.getAttribute("data-image-resize-pos");
      if (!posStr) return false;
      const pos = parseInt(posStr, 10);

      const node = view.state.doc.nodeAt(pos);
      if (!node) return false;

      const domNode = view.nodeDOM(pos) as HTMLElement | null;
      if (!domNode) return false;

      const img =
        domNode.tagName === "IMG"
          ? (domNode as HTMLImageElement)
          : (domNode.querySelector?.("img") as HTMLImageElement);
      if (!img) return false;

      const startHeight = img.offsetHeight || 200;

      const applyHeight = (clientY: number) => {
        const h = computeImageResizeHeight(startHeight, startY, clientY);
        img.style.height = `${h}px`;
        img.style.objectFit = "contain";
      };

      const onMouseMove = (e: MouseEvent) => {
        applyHeight(e.clientY);
      };

      const onTouchMove = (e: TouchEvent) => {
        applyHeight(e.touches[0].clientY);
      };

      const finish = (finalY: number) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);

        const finalHeight = computeImageResizeHeight(
          startHeight,
          startY,
          finalY,
        );
        const currentNode = view.state.doc.nodeAt(pos);
        if (currentNode) {
          const tr = view.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            height: Math.round(finalHeight),
          });
          view.dispatch(tr);
        }
      };

      const onMouseUp = (e: MouseEvent) => finish(e.clientY);
      const onTouchEnd = (e: TouchEvent) => finish(e.changedTouches[0].clientY);

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);

      return true;
    }
  },
});
