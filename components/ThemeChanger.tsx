"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Tabs } from "@heroui/react"
import { FaSun, FaMoon, FaDesktop } from "react-icons/fa6"

type ThemeValue = "light" | "dark" | "system"

function isThemeValue(value: unknown): value is ThemeValue {
  return value === "light" || value === "dark" || value === "system"
}

export default function ThemeChanger() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const selectedTheme: ThemeValue = isThemeValue(theme) ? theme : "system"

  const tabStyle : string = "p-1 size-8"

  return (
    <Tabs
      selectedKey={selectedTheme}
      onSelectionChange={(key) => {
        if (isThemeValue(key)) {
          setTheme(key)
        }
      }}
      variant="primary"
      className="w-fit h-fit"
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Theme selection">
          <Tabs.Tab id="light" aria-label="Use light theme" className={tabStyle}>
            <FaSun />
            <Tabs.Indicator />
          </Tabs.Tab>

          <Tabs.Tab id="dark" aria-label="Use dark theme" className={tabStyle}>
            <FaMoon />
            <Tabs.Indicator />
          </Tabs.Tab>

          <Tabs.Tab id="system" aria-label="Use system theme" className={tabStyle}>
            <FaDesktop />
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  )
}
