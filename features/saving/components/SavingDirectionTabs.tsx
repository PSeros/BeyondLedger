"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Tabs} from "@heroui/react";

export type SavingDirection = "deposit" | "withdraw";

// Deposit/Withdraw toggle; posts `direction` so the amount input stays positive (mobile numeric
// keyboards have no minus key). A withdrawal is stored as a negative amount.
export default function SavingDirectionTabs({defaultValue = "deposit"}: {defaultValue?: SavingDirection}) {
  const t = useTranslations("saving");
  const [direction, setDirection] = useState<SavingDirection>(defaultValue);

  return (
    <>
      <input type="hidden" name="direction" value={direction}/>
      <Tabs
        className="w-fit"
        selectedKey={direction}
        onSelectionChange={(key) => setDirection(String(key) as SavingDirection)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t("direction")}>
            <Tabs.Tab id="deposit">
              {t("deposit")}
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="withdraw">
              {t("withdraw")}
              <Tabs.Indicator/>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </>
  );
}
