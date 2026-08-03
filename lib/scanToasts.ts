"use client";

import type {ReactNode} from "react";
import {flushSync} from "react-dom";
import {ToastQueue, type ButtonProps} from "@heroui/react";

// A ViewTransition raises an AbortError ("Skipped ViewTransition due to another transition starting")
// when a new transition begins before the previous one settles — which is exactly what happens when a
// toast is closed and another opened in the same tick (e.g. loading → success). HeroUI's DEFAULT queue
// wraps its updates in `document.startViewTransition(...)` but discards the returned transition, so that
// rejection goes unhandled and Next's dev overlay reports it as a runtime error. This queue captures the
// transition's promises and swallows the benign rejection instead. We route the OCR scan toasts through
// it (and mount it on Toast.Provider) rather than the global `Toast.toast`, which is bound to the default.
export const scanToastQueue = new ToastQueue({
  wrapUpdate: (fn) => {
    const start = (
      document as unknown as {
        startViewTransition?: (cb: () => void) => {ready?: Promise<unknown>; finished?: Promise<unknown>};
      }
    ).startViewTransition;
    if (typeof start === "function") {
      const transition = start.call(document, () => flushSync(fn));
      transition.ready?.catch(() => undefined);
      transition.finished?.catch(() => undefined);
    } else {
      fn();
    }
  },
});

type ToastOptions = {
  description?: ReactNode;
  variant?: "default" | "success" | "danger";
  actionProps?: ButtonProps;
  isLoading?: boolean;
  // Milliseconds before auto-dismiss; 0 = persistent. Omitted → HeroUI's 4000ms default.
  timeout?: number;
};

// Adds a toast to the scan queue and returns its key (pass to closeToast to dismiss it early).
export function pushToast(title: ReactNode, options: ToastOptions = {}): string {
  const {timeout, description, variant, actionProps, isLoading} = options;
  return scanToastQueue.add({title, description, variant, actionProps, isLoading}, {timeout});
}

export function closeToast(key: string): void {
  scanToastQueue.close(key);
}
