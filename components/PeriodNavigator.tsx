"use client";

import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {LuChevronLeft, LuChevronRight, LuRotateCcw} from "react-icons/lu";

// Reusable ‹ prev / label / next › control for stepping a time window off the current period. It is
// presentation-only: the consumer computes the (already-formatted) `label`, decides whether we're on
// the current period (`isCurrent`, which reveals a reset affordance), and owns the anchor storage
// (budgets keep a month in ?at, charts keep an offset in ?co). Shared by the Budget toolbar and the
// chart-card headers.
type PeriodNavigatorProps = {
  label: string;
  isCurrent: boolean;
  onStep: (delta: -1 | 1) => void;
  onReset: () => void;
  className?: string;
};

export default function PeriodNavigator({label, isCurrent, onStep, onReset, className}: PeriodNavigatorProps) {
  const t = useTranslations("periodNavigator");

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Button variant="tertiary" size="sm" isIconOnly aria-label={t("prev")} onPress={() => onStep(-1)}>
        <LuChevronLeft className="size-4"/>
      </Button>
      <span className="min-w-28 text-center text-sm font-medium tabular-nums">{label}</span>
      <Button variant="tertiary" size="sm" isIconOnly aria-label={t("next")} onPress={() => onStep(1)}>
        <LuChevronRight className="size-4"/>
      </Button>
      {/* Always occupy the slot; hide via `visibility:hidden` when on the current period so its
          appearance doesn't shift the arrows/label. `invisible` also makes it non-focusable and
          non-clickable, so no `isDisabled` is needed — and avoids a React-Aria SSR/hydration mismatch
          on the native `disabled` attribute. `aria-hidden` keeps it out of the accessibility tree. */}
      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        aria-label={t("current")}
        onPress={onReset}
        aria-hidden={isCurrent || undefined}
        className={isCurrent ? "invisible" : undefined}
      >
        <LuRotateCcw className="size-4"/>
      </Button>
    </div>
  );
}
