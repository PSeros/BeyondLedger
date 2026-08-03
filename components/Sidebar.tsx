"use client"

import React from 'react';
import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import {isActiveRoute, routes} from "@/lib/routes";
import {Avatar, Button, Description, Label} from "@heroui/react";
import {FaUser} from "react-icons/fa6";

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("nav")

  return (
    <div className="flex flex-col gap-2 w-50 mx-2">
      <div className="flex flex-1 align-middle gap-2 mt-8">
        <Avatar size="md">
          <FaUser/>
        </Avatar>
        <div className="flex flex-col text-left">
          <Label>Phillip Schlicht</Label>
          <Description>Admin</Description>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full mt-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const isActive = isActiveRoute(pathname, route)

          return (
            <Button
              key={route.href}
              variant={isActive ? "tertiary" : "ghost"}
              onPress={() => router.push(route.href)}
              className="justify-start w-full">
              <Icon/>
              <span>{t(route.key)}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}