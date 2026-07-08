import React from "react"
import VfSwitch from "@/components/VFSwitch";
import {Button, ButtonGroup, SearchField} from "@heroui/react";
import {LuFilter, LuPlus} from "react-icons/lu";

export default function IncomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-3">
        <VfSwitch basePath={"/income"} className="justify-self-start"/>

        <SearchField aria-label="Search income" variant="secondary" className="justify-self-center">
          <SearchField.Group>
            <SearchField.SearchIcon/>
            <SearchField.Input className="w-lg" placeholder="Search..."/>
            <SearchField.ClearButton/>
          </SearchField.Group>
        </SearchField>

        <ButtonGroup size="md" variant="tertiary" className="justify-self-end">
          <Button>
            <LuFilter/>
            Filter
          </Button>
          <Button>
            <ButtonGroup.Separator/>
            <LuPlus/>
            Add
          </Button>
        </ButtonGroup>

      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8">
        {children}
      </div>
    </section>
  );
}
