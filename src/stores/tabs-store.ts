import { create } from "zustand"

type TabItem = {
  path: string
  title: string
}

type TabsState = {
  tabs: TabItem[]
  visit: (tab: TabItem) => void
  close: (path: string) => void
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  visit: (tab) =>
    set((state) => ({
      tabs: state.tabs.some((item) => item.path === tab.path)
        ? state.tabs
        : [...state.tabs, tab],
    })),
  close: (path) =>
    set((state) => ({
      tabs: state.tabs.filter((item) => item.path !== path),
    })),
}))
