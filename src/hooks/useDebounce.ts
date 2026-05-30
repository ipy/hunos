import { useRef, useCallback } from "react";

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  ) as unknown as T;
}
