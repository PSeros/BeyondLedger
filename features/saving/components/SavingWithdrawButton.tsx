"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {LuArrowDownToLine} from "react-icons/lu";
import {SavingAddModal} from "@/features/saving/components/AddSavingButton";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";

// Opens the Add modal preset to a one-off withdrawal from this target.
export default function SavingWithdrawButton({options, targetId, targetName}: {
  options: SavingFormOptions;
  targetId: string;
  targetName: string;
}) {
  const t = useTranslations("saving");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={t("withdrawFrom", {target: targetName})}
        onPress={() => setOpen(true)}
      >
        <LuArrowDownToLine/>
      </Button>
      <SavingAddModal
        options={options}
        preset={{targetId, direction: "withdraw"}}
        isOpen={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
