"use client";

import { useEffect, useMemo, useRef } from "react";

type DebouncedFn<T extends (...args: never[]) => void> = T & {
  cancel: () => void;
};

/** Stable debounced function — latest callback always runs after `delayMs` quiet. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number,
): DebouncedFn<T> {
  const cbRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useMemo(() => {
    const debounced = ((...args: never[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        cbRef.current(...args);
      }, delayMs);
    }) as DebouncedFn<T>;

    debounced.cancel = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    return debounced;
  }, [delayMs]);
}
