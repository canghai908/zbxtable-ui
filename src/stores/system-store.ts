import { create } from "zustand"

import { getStorage, sessionKeys, setStorage } from "@/lib/session"

type SystemInfo = {
  installed: boolean | null
  systemName: string
  systemLogo: string
  demoMode: boolean
}

type SystemState = SystemInfo & {
  setSystemInfo: (payload: Partial<SystemInfo>) => void
}

export const useSystemStore = create<SystemState>((set) => ({
  installed: null,
  systemName: "ZbxTable",
  systemLogo: "/logo.png",
  demoMode: false,
  ...getStorage<Partial<SystemInfo>>(sessionKeys.system, {}),
  setSystemInfo: (payload) => {
    set((state) => {
      const next = { ...state, ...payload }
      setStorage(sessionKeys.system, {
        installed: next.installed,
        systemName: next.systemName,
        systemLogo: next.systemLogo,
        demoMode: next.demoMode,
      })
      return next
    })
  },
}))
