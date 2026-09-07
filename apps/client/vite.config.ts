import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
    publicDir: "public",
    plugins: [
        react(),
        tailwindcss(),
        visualizer({ open: true, filename: "dist/stats.html" }),
    ],

    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (
                        id.includes("node_modules/react") ||
                        id.includes("node_modules/react-dom")
                    ) {
                        return "vendor-react";
                    }
                    if (
                        id.includes("node_modules/socket.io-client") ||
                        id.includes("node_modules/engine.io-client")
                    ) {
                        return "vendor-socket";
                    }
                },
            },
        },
    },
});
