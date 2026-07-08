"use client"

import React from 'react';
import {Button, ButtonGroup} from "@heroui/react";
import {LuFilter, LuPlus, LuUpload} from "react-icons/lu";

type ContractActionsProps = {
  className?: string;
};

export default function ContractActions({className}: ContractActionsProps) {
  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <Button>
        <LuFilter/>
        Filter
      </Button>
      <Button>
        <ButtonGroup.Separator/>
        <LuUpload/>
        Upload
      </Button>
      <Button>
        <ButtonGroup.Separator/>
        <LuPlus/>
        Add
      </Button>
    </ButtonGroup>
  );
}