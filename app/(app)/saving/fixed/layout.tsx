import type {ReactNode} from "react";

// Parallel-route layout: the @modal slot renders on top of the list page (children) when an
// intercepted /saving/fixed/[id] route is active, and renders nothing (default.tsx → null) otherwise.
export default function FixedSavingLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
