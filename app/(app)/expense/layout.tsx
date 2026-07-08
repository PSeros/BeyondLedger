import React from "react"

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      {children}
    </section>
  );
}
