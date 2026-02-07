import * as esbuild from "esbuild";
import { execSync } from "child_process";

// Build frontend with Vite
console.log("Building frontend...");
execSync("npx vite build", { stdio: "inherit" });

// Build backend with esbuild
console.log("Building backend...");
await esbuild.build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/index.cjs",
  format: "cjs",
  external: [
    "pg-native",
    "bufferutil",
    "utf-8-validate",
    "bcrypt",
  ],
  sourcemap: true,
  define: {
    "import.meta.dirname": "__dirname",
    "import.meta.url": "__filename",
  },
});

console.log("Build complete!");
