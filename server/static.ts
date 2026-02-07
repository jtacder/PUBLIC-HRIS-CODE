import express from "express";
import type { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupStaticServing(app: Express) {
  const distPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // Serve static assets with cache headers
  app.use(
    express.static(distPath, {
      maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
      etag: true,
    })
  );

  // SPA fallback: any non-API route serves index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
