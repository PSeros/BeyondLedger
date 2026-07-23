"use client";

import {useRouter} from "next/navigation";

// Footer "Close" action for the intercepted-route detail modals: mirrors the header X and the
// backdrop/Esc dismissal by navigating back, which unmounts the @modal slot. Modal-only —
// standalone detail pages have their own "Back to …" link instead.
export default function ModalCloseButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-muted hover:bg-default hover:text-foreground inline-flex items-center rounded-[var(--radius)] px-3 py-1.5 text-sm transition-colors"
    >
      Close
    </button>
  );
}
