import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const vendorChunkMap = [
  { name: "react-vendor", packages: ["react", "react-dom", "react-router-dom"] },
  { name: "query-vendor", packages: ["@tanstack/react-query", "axios", "zustand", "js-cookie"] },
  { name: "ui-vendor", packages: ["radix-ui", "lucide-react", "class-variance-authority", "clsx", "tailwind-merge", "sonner", "vaul", "cmdk", "next-themes"] },
  { name: "form-vendor", packages: ["react-hook-form", "zod"] },
  { name: "i18n-vendor", packages: ["i18next", "react-i18next"] },
  { name: "file-vendor", packages: ["file-saver"] },
]

function getVendorChunk(id: string) {
  if (!id.includes("node_modules")) {
    return undefined
  }

  if (id.includes("node_modules/@antv/x6/")) {
    return "x6-vendor"
  }

  const match = vendorChunkMap.find((chunk) =>
    chunk.packages.some((packageName) => id.includes(`/node_modules/${packageName}/`))
  )

  return match?.name
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://127.0.0.1:8088"

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.0.1"),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "^/(v1|download|public|upload|install)": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        "/ws": {
          target: apiBaseUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks: getVendorChunk,
        },
      },
    },
  }
})
