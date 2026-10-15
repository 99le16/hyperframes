set -e
bun run build >/tmp/sm-build.log 2>&1 || { tail -20 /tmp/sm-build.log; exit 1; }
bun run --cwd packages/core build >/dev/null 2>&1
node packages/cli/dist/cli.js browser ensure >/dev/null 2>&1 || true
echo "built $(git rev-parse --short HEAD 2>/dev/null || echo nogit) at $(pwd)"
