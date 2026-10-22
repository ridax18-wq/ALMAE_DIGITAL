import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import path from "node:path";

try {
  for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // Sin .env.local: solo corre tests unitarios puros
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

