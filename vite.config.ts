import { defineConfig, loadEnv, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "api-chat",
        configureServer(server: ViteDevServer) {
          server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
            // Flexible matching for /api/chat (handles trailing slashes and query params)
            const isChatApi = req.url?.split('?')[0].replace(/\/$/, '') === '/api/chat';

            if (isChatApi && req.method === "POST") {
              console.log("🚀 [API] Chat request received...");
              let body = "";
              req.on("data", (chunk: Buffer) => {
                body += chunk.toString();
              });

              req.on("end", async () => {
                try {
                  const { messages } = JSON.parse(body);
                  const apiKey = env.GROQ_API_KEY;

                  if (!apiKey) {
                    console.error("❌ [API] Error: GROQ_API_KEY is missing from .env!");
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: "Missing GROQ_API_KEY in .env" }));
                    return;
                  }

                  console.log("📡 [API] Sending request to Groq...");
                  const response = await globalThis.fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${apiKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      messages,
                      model: "llama-3.3-70b-versatile",
                    }),
                  });

                  const data = (await response.json()) as any;
                  res.statusCode = response.ok ? 200 : response.status;
                  res.setHeader("Content-Type", "application/json");
                  
                  if (response.ok) {
                    console.log("✅ [API] Groq response successful.");
                  } else {
                    console.error("❌ [API] Groq Error:", data.error?.message || "Unknown error");
                  }

                  res.end(JSON.stringify(data));
                } catch (error) {
                  console.error("❌ [API] Internal Server Error:", (error as Error).message);
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Internal Server Error", details: (error as Error).message }));
                }
              });
              return;
            }
            next();
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three', 'three-stdlib'],
            'react-three': ['@react-three/fiber', '@react-three/drei'],
            'gsap': ['gsap'],
            'vendor': ['react', 'react-dom', 'react-router-dom']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    optimizeDeps: {
      include: ['three', 'gsap', 'lenis']
    }
  };
});
