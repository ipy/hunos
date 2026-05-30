/** Reparent a BubbleMenu element detached by Tippy before React unmount. */
export function reparentBubbleMenuElement(
  host: HTMLElement | null,
  element: HTMLElement | null,
): void {
  if (!host || !element) return;
  if (element.parentNode === host) return;
  try {
    element.style.visibility = "hidden";
    host.appendChild(element);
  } catch {
    // Element may already be detached from the document.
  }
}
