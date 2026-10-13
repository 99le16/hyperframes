import { build } from "esbuild";
await build({
  entryPoints: [new URL("./src/live.ts", import.meta.url).pathname],
  outfile: new URL("./dist/live.js", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
await build({
  entryPoints: [new URL("./src/liveRuntime.ts", import.meta.url).pathname],
  outfile: new URL("./dist/inspection.js", import.meta.url).pathname,
  bundle: true,
  platform: "browser",
  format: "iife",
});
