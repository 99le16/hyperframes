// Standalone skills installs (`npx skills add`, `.agents/skills`) ship no plugin
// manifest and no built checkout, so hf-cli.cjs hands callers this file and it
// runs the published CLI through npx, as plugin-cli.mjs does for plugin installs.
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { win32 } = require("node:path");

function invocation(args, env = process.env, platform = process.platform, node = process.execPath) {
  const version = env.HYPERFRAMES_CLI_VERSION || "latest";
  const cliArgs = ["--yes", `hyperframes@${version}`, ...args];
  const childEnv = { ...env, HYPERFRAMES_SKIP_SKILLS: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1" };
  if (platform !== "win32") return { command: "npx", args: cliArgs, env: childEnv };
  const candidates = [
    env.npm_execpath && win32.join(win32.dirname(env.npm_execpath), "npx-cli.js"),
    win32.join(win32.dirname(node), "node_modules", "npm", "bin", "npx-cli.js"),
  ].filter(Boolean);
  const npx = candidates.find((p) => existsSync(p));
  if (!npx)
    throw new Error(
      "Cannot find npx-cli.js. Install Node.js with npm or run from an npm environment.",
    );
  return { command: node, args: [npx, ...cliArgs], env: childEnv };
}

module.exports = { invocation };

if (require.main === module) {
  const { command, args, env } = invocation(process.argv.slice(2));
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}
