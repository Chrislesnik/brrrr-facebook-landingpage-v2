import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {defineConfig, type ViteDevServer} from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(root, "../..");

/** Jev stays on the dev server. JEV_API_KEY is a TypeSafe key, read from .env.local, and never sent to the browser. */
function jevProxy() {
  return {
    name: "jev-decisions",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/jev", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          if (chunks.reduce((sum, item) => sum + item.length, 0) > 16_000) req.destroy();
        });
        req.on("end", () => {
          void (async () => {
            const key = jevKey(envDir);
            if (!key) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({message: "JEV_API_KEY is not set"}));
              return;
            }
            let body: {state?: unknown; questions?: unknown};
            try {
              body = JSON.parse(Buffer.concat(chunks).toString()) as {state?: unknown; questions?: unknown};
            } catch {
              res.statusCode = 400;
              res.end();
              return;
            }
            try {
              const response = await fetch("https://api.typesafe.ai/v1/systemone", {
                method: "POST",
                headers: {Authorization: `Bearer ${key}`, "Content-Type": "application/json"},
                body: JSON.stringify({model: "jev-latest", state: body.state, questions: body.questions}),
                signal: AbortSignal.timeout(20000),
              });
              const json = (await response.json()) as {answers?: unknown};
              res.statusCode = response.ok && json.answers ? 200 : 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(response.ok ? {answers: json.answers} : {message: "Jev could not decide"}));
            } catch {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({message: "Jev could not decide"}));
            }
          })();
        });
      });
    },
  };
}

function jevKey(dir: string): string {
  try {
    const line = fs
      .readFileSync(path.join(dir, ".env.local"), "utf8")
      .split("\n")
      .find((item) => item.startsWith("JEV_API_KEY="));
    return line ? line.slice("JEV_API_KEY=".length).trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

export default defineConfig({
  plugins: [react(), jevProxy()],
  envDir: path.resolve(root, "../.."),
  resolve: {
    alias: {
      "@": root,
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
});
