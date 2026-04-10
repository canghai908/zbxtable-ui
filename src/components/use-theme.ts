import { useContext } from "react"

import { ThemeProviderContext } from "@/components/theme-provider-context"

export function useTheme() {
  const value = useContext(ThemeProviderContext)
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return value
}
