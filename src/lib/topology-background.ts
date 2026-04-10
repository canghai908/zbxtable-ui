export type TopologyBackgroundSize = "cover" | "contain" | "auto"
export type TopologyBackgroundPosition = "center" | "top" | "bottom"
export type TopologyBackgroundRepeat = "no-repeat" | "repeat" | "repeat-x" | "repeat-y"

export type TopologyBackgroundConfig = {
  image: string
  size: TopologyBackgroundSize
  position: TopologyBackgroundPosition
  repeat: TopologyBackgroundRepeat
  opacity: number
}

export const DEFAULT_TOPOLOGY_BACKGROUND: TopologyBackgroundConfig = {
  image: "",
  size: "cover",
  position: "center",
  repeat: "no-repeat",
  opacity: 100,
}

export function parseTopologyBackground(value: unknown): TopologyBackgroundConfig {
  if (typeof value !== "string" || !value) {
    return DEFAULT_TOPOLOGY_BACKGROUND
  }

  if (!value.trim().startsWith("{")) {
    return {
      ...DEFAULT_TOPOLOGY_BACKGROUND,
      image: value,
    }
  }

  try {
    const parsed = JSON.parse(value) as Partial<TopologyBackgroundConfig> & {
      imageUrl?: string
      path?: string
      url?: string
    }

    return {
      image: parsed.image || parsed.imageUrl || parsed.path || parsed.url || "",
      size: parsed.size || DEFAULT_TOPOLOGY_BACKGROUND.size,
      position: parsed.position || DEFAULT_TOPOLOGY_BACKGROUND.position,
      repeat: parsed.repeat || DEFAULT_TOPOLOGY_BACKGROUND.repeat,
      opacity: Number(parsed.opacity ?? DEFAULT_TOPOLOGY_BACKGROUND.opacity),
    }
  } catch {
    return DEFAULT_TOPOLOGY_BACKGROUND
  }
}

export function serializeTopologyBackground(config: TopologyBackgroundConfig) {
  if (
    config.size === DEFAULT_TOPOLOGY_BACKGROUND.size &&
    config.position === DEFAULT_TOPOLOGY_BACKGROUND.position &&
    config.repeat === DEFAULT_TOPOLOGY_BACKGROUND.repeat &&
    config.opacity === DEFAULT_TOPOLOGY_BACKGROUND.opacity
  ) {
    return config.image
  }

  return JSON.stringify(config)
}

export function getTopologyBackgroundImagePath(value: unknown) {
  return parseTopologyBackground(value).image
}
