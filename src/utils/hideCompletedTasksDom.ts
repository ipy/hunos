/** Sync the editor root DOM attribute used to hide completed task rows. */
export function applyHideCompletedTasksDomAttribute(
  dom: HTMLElement,
  hideCompletedTasks: boolean,
): void {
  if (hideCompletedTasks) {
    dom.setAttribute("data-hide-completed-tasks", "true");
  } else {
    dom.removeAttribute("data-hide-completed-tasks");
  }
}
