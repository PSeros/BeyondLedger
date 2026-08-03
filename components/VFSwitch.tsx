'use client'

import React from 'react';
import {useTranslations} from "next-intl";
import {Tabs} from "@heroui/react";
import {usePathname, useRouter} from "next/navigation";

type VfSwitchProps = {
  basePath: string;
  className?: string;
};

export default function VfSwitch({basePath, className}: VfSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()

  const selectedKey = pathname.includes('/fixed') ? 'fixed' : 'variable';

  return (
    <Tabs
      className={["w-fit max-w-sm", className].filter(Boolean).join(" ")}
      selectedKey={selectedKey}
      onSelectionChange={(key) => router.push(`${basePath}/${key}`)}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={t("common.options")}>
          <Tabs.Tab id="fixed">
            {t("vf.fixed")}
            <Tabs.Indicator/>
          </Tabs.Tab>
          <Tabs.Tab id="variable">
            {t("vf.variable")}
            <Tabs.Indicator/>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}