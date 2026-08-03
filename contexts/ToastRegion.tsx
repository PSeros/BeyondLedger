"use client";

import {Toast} from "@heroui/react";
import {scanToastQueue} from "@/lib/scanToasts";

// App-wide toast region, bound to our custom queue (see lib/scanToasts.ts) so the OCR scan toasts
// render here and their view-transition rejections stay handled.
export default function ToastRegion() {
  return <Toast.Provider queue={scanToastQueue} placement="bottom end"/>;
}
