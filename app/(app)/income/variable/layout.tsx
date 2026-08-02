import type {ReactNode} from "react";

// Parallel-route layout: the @modal slot renders on top of the list page (children) when an
// intercepted /income/variable/[id] route is active, and renders nothing (default.tsx → null)
// otherwise.
export default function VariableIncomeLayout({
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
