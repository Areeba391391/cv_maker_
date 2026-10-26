"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Debounced auto-save for CV editor. Skips the first snapshot (initial load).
 * Queues a follow-up save if edits arrive while a request is in flight.
 */
export function useAutoSave(
  payload: unknown,
  save: () => Promise<void>,
  delayMs = 900,
): { status: Status; markSaved: () => void } {
  const [status, setStatus] = useState<Status>("idle");
  const ready = useRef(false);
  const saving = useRef(false);
  const queued = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const runSave = useDebouncedCallback(() => {
    if (saving.current) {
      queued.current = true;
      return;
    }

    saving.current = true;
    setStatus("saving");

    void (async () => {
      try {
        do {
          queued.current = false;
          // Always persist latest snapshot after debounce (not a stale closure)
          await saveRef.current();
        } while (queued.current);

        setStatus("saved");
      } catch {
        setStatus("error");
        // One quiet retry so a transient RPC/network blip does not stick on "error"
        queued.current = true;
        window.setTimeout(() => {
          if (queued.current && !saving.current) runSave();
        }, 1600);
      } finally {
        saving.current = false;
      }
    })();
  }, delayMs);

  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      return;
    }
    setStatus("dirty");
    runSave();
  }, [payload, runSave]);

  useEffect(() => {
    return () => runSave.cancel();
  }, [runSave]);

  return {
    status,
    markSaved: () => setStatus("saved"),
  };
}
