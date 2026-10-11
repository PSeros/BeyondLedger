"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Checkbox} from "@heroui/react";

// Marks a one-off as the pot's starting balance (money saved before tracking began). Posts isOpening=1.
export default function SavingOpeningCheckbox({defaultSelected = false}: {defaultSelected?: boolean}) {
  const t = useTranslations("saving");
  const [selected, setSelected] = useState(defaultSelected);
  return (
    <>
      {selected ? <input type="hidden" name="isOpening" value="1"/> : null}
      <Checkbox isSelected={selected} onChange={setSelected}>
        <Checkbox.Control>
          <Checkbox.Indicator/>
        </Checkbox.Control>
        <Checkbox.Content>
          <span className="text-sm text-foreground">{t("openingLabel")}</span>
          <p className="text-xs text-muted">{t("openingHint")}</p>
        </Checkbox.Content>
      </Checkbox>
    </>
  );
}
