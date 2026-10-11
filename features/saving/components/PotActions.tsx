"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {LuArrowRight, LuMinus, LuPlus} from "react-icons/lu";
import {SavingAddModal} from "@/features/saving/components/AddSavingButton";
import type {SavingPreset} from "@/features/saving/components/SavingAddForm";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";

// Every booking a pot offers opens the one Add modal with a preset.
function useBooking() {
  const [preset, setPreset] = useState<SavingPreset | null>(null);
  return {preset, open: setPreset, close: () => setPreset(null)};
}

// ＋ / − on a pot card (icon-only: five cards across leave no room for labels).
export function PotQuickActions({options, potId, potName}: {options: SavingFormOptions; potId: number; potName: string}) {
  const t = useTranslations("saving");
  const booking = useBooking();
  return (
    <div className="flex gap-1.5">
      <Button isIconOnly size="sm" variant="tertiary" aria-label={t("depositInto", {target: potName})}
        onPress={() => booking.open({targetId: String(potId), direction: "deposit"})}>
        <LuPlus className="size-4"/>
      </Button>
      <Button isIconOnly size="sm" variant="tertiary" aria-label={t("withdrawFrom", {target: potName})}
        onPress={() => booking.open({targetId: String(potId), direction: "withdraw"})}>
        <LuMinus className="size-4"/>
      </Button>
      <SavingAddModal options={options} preset={booking.preset ?? undefined} isOpen={booking.preset != null} onOpenChange={(open) => !open && booking.close()}/>
    </div>
  );
}

// Labelled actions for a pot's own page, plus "new plan".
export function PotActions({options, potId, showPlan = false}: {options: SavingFormOptions; potId: number; showPlan?: boolean}) {
  const t = useTranslations("saving");
  const booking = useBooking();
  const target = String(potId);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="tertiary" onPress={() => booking.open({targetId: target, direction: "deposit"})}>
        <LuPlus className="size-4"/>{t("deposit")}
      </Button>
      <Button size="sm" variant="tertiary" onPress={() => booking.open({targetId: target, direction: "withdraw"})}>
        <LuMinus className="size-4"/>{t("withdraw")}
      </Button>
      {showPlan ? (
        <Button size="sm" variant="tertiary" onPress={() => booking.open({targetId: target, direction: "deposit", kind: "plan"})}>
          <LuPlus className="size-4"/>{t("plan")}
        </Button>
      ) : null}
      <SavingAddModal options={options} preset={booking.preset ?? undefined} isOpen={booking.preset != null} onOpenChange={(open) => !open && booking.close()}/>
    </div>
  );
}

// Moving money out of the Überschuss is a plain deposit into a pot; the Überschuss drops by itself.
export function SurplusMoveButton({options, size = "sm"}: {options: SavingFormOptions; size?: "sm" | "md"}) {
  const t = useTranslations("saving");
  const booking = useBooking();
  return (
    <>
      <Button size={size} variant="tertiary" onPress={() => booking.open({direction: "deposit", kind: "move"})}>
        <LuArrowRight className="size-4"/>{t("move")}
      </Button>
      <SavingAddModal options={options} preset={booking.preset ?? undefined} isOpen={booking.preset != null} onOpenChange={(open) => !open && booking.close()}/>
    </>
  );
}
