#!/usr/bin/env python3
"""animate_seedance.py — animate a PNG into a video plate with Seedance, via the
Higgsfield CLI.

The AI-driven counterpart to `animate_assets.py`: that one composes generated
PNGs into motion in *code* (positions, typography, house easing). This one hands
a single PNG to ByteDance's Seedance image-to-video model and gets back real,
model-generated motion — camera drift, parallax, cloth/hair/water movement —
none of which code can fake. Use it when the shot needs to *move on its own*,
not be laid out and pushed around.

    # one asset, animated, landed straight in broll
    python3 animate_seedance.py assets/ai/brain.png \
        --prompt "slow gentle rotation, soft studio light drifting across the surface" \
        --out assets/broll/B31.mp4 --duration 5 --aspect-ratio 16:9

    # a whole set from a spec file
    python3 animate_seedance.py --spec work/seedance_shots.json --out-dir assets/broll

This is a thin wrapper around the **Higgsfield CLI** (`higgsfield`, npm package
`@higgsfield/cli`), not a direct API call. That distinction matters: Higgsfield
has two separate integrations —

  * **Higgsfield Cloud** (`api.higgsfield.ai`, key pair `HF_API_KEY_ID` /
    `HF_API_KEY_SECRET`) — a *separate* developer account with its own billing,
    starting at 0 credits. Do not use this route; it is not the same balance as
    the app.
  * **The CLI** (this script) — logs into your normal higgsfield.ai account and
    spends the *same* subscription credits you already see in the web app. This
    is confirmed by Higgsfield's own docs: "Your existing Higgsfield plan
    credits work seamlessly through any connected agent."

One-time setup, per machine (not per project):

    npm install -g @higgsfield/cli   # installs the `higgsfield` command globally
    higgsfield auth login            # opens a browser OAuth flow, approve there
    higgsfield workspace list        # find your workspace id
    higgsfield workspace set <id>    # select it — required before any generation

After that the login persists (token cached by the CLI itself, not in this
repo), so this is normally a once-per-machine step, not once-per-edit.

This script shells out to `higgsfield generate create seedance_2_0 ... --wait
--json`, which in one call: uploads the local PNG, submits the job, polls until
it finishes, and returns the result. This script then downloads that result to
the path you asked for and writes a `<name>.gen.json` sidecar (id, prompt,
model, params, the CLI job id, the source result_url) — same discipline as
`gen_images.py`'s sidecars, and for the same reason: a clip nobody can
re-derive is a clip that cannot be revised.

**Do not add API-key plumbing to this script.** There is no key to manage —
auth is the `higgsfield auth login` browser flow, done once, cached by the CLI.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request

# seedance1_5 is the cheap tier and it is the one to reach for on a budget:
# 12 credits for 4 s at 1080p against 45 for seedance_2_0 at the same size.
# It only accepts durations of 4, 8 or 12 seconds — the API rejects anything
# else — so pick one of those when using it.
MODELS = ("seedance_2_0", "seedance_2_0_mini", "seedance_2_5", "seedance1_5")
DEFAULT_MODEL = "seedance_2_0"
RESOLUTIONS = ("480p", "720p", "1080p", "4k")
ASPECT_RATIOS = ("auto", "16:9", "9:16", "4:3", "3:4", "1:1", "21:9")


def require_cli():
    if shutil.which("higgsfield") is None:
        raise SystemExit(
            "the `higgsfield` CLI is not on PATH — install it once with:\n"
            "  npm install -g @higgsfield/cli\n"
            "then log in and pick a workspace:\n"
            "  higgsfield auth login\n"
            "  higgsfield workspace list   # note the id\n"
            "  higgsfield workspace set <id>"
        )


def run_cli(args, timeout):
    proc = subprocess.run(
        ["higgsfield", *args, "--json"],
        capture_output=True, text=True, timeout=timeout,
    )
    if proc.returncode != 0:
        raise SystemExit("higgsfield %s failed:\n%s" % (" ".join(args), proc.stderr.strip()))
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise SystemExit("could not parse `higgsfield %s` output as JSON:\n%s"
                          % (" ".join(args), proc.stdout[:800]))


def one_job(job, args):
    if not os.path.exists(job["image"]):
        raise SystemExit("%s: image not found: %s" % (job["id"], job["image"]))

    model = job.get("model") or args.model
    if model not in MODELS:
        raise SystemExit("%s: unknown model %r — choose from %s"
                          % (job["id"], model, ", ".join(MODELS)))

    cli_args = [
        "generate", "create", model,
        "--prompt", job["prompt"],
        "--start-image", job["image"],
        "--duration", str(job.get("duration", args.duration)),
        "--resolution", job.get("resolution", args.resolution),
        "--aspect_ratio", job.get("aspect_ratio", args.aspect_ratio),
        "--wait", "--wait-timeout", args.wait_timeout,
    ]
    sys.stderr.write("  %s: submitting to %s…\n" % (job["id"], model))
    result = run_cli(cli_args, args.timeout)
    row = result[0] if isinstance(result, list) else result

    if row.get("status") != "completed" or not row.get("result_url"):
        raise SystemExit("%s: %s — %s" % (job["id"], row.get("status"), row))

    out = job["out"]
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with urllib.request.urlopen(row["result_url"], timeout=args.timeout) as r:
        with open(out, "wb") as f:
            f.write(r.read())

    manifest = {
        "id": job["id"],
        "source_image": job["image"],
        "prompt": job["prompt"],
        "model": model,
        "higgsfield_job_id": row.get("id"),
        "result_url": row.get("result_url"),
        **{k: row["params"][k] for k in ("duration", "resolution", "aspect_ratio")
           if k in row.get("params", {})},
        "file": out,
    }
    with open(os.path.splitext(out)[0] + ".gen.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return manifest


def build_jobs(args):
    if args.spec:
        with open(args.spec, encoding="utf-8") as f:
            spec = json.load(f)
        rows = spec["shots"] if isinstance(spec, dict) else spec
        jobs = []
        for i, r in enumerate(rows):
            if r.get("skip"):
                continue
            jid = r.get("id") or "shot%02d" % (i + 1)
            out = r.get("out") or os.path.join(args.out_dir, jid + ".mp4")
            jobs.append({**r, "id": jid, "out": out})
        return jobs
    if not args.image or not args.prompt:
        raise SystemExit("give an image and --prompt, or --spec a file of shots")
    out = args.out or os.path.join(args.out_dir, os.path.splitext(os.path.basename(args.image))[0] + ".mp4")
    return [{"id": os.path.splitext(os.path.basename(out))[0], "image": args.image,
             "prompt": args.prompt, "out": out, "model": args.model}]


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("image", nargs="?", help="source PNG/JPG (omit when using --spec)")
    p.add_argument("--prompt", help="motion description — what should move and how")
    p.add_argument("--spec", help="JSON file: a list of {id, image, prompt, out, ...}")
    p.add_argument("--out", help="output mp4 path for a single shot")
    p.add_argument("--out-dir", default="assets/broll", help="where spec shots land (default assets/broll)")
    p.add_argument("--model", default=DEFAULT_MODEL, choices=MODELS)
    p.add_argument("--duration", type=int, default=5, help="seconds")
    p.add_argument("--resolution", default="720p", choices=RESOLUTIONS)
    p.add_argument("--aspect-ratio", default="16:9", choices=ASPECT_RATIOS)
    p.add_argument("--timeout", type=int, default=600, help="python-side subprocess/download timeout, seconds")
    p.add_argument("--wait-timeout", default="10m", help="passed through to `higgsfield generate create --wait-timeout`")
    p.add_argument("--dry", action="store_true", help="print the work-list, call nothing")
    args = p.parse_args()

    jobs = build_jobs(args)
    if args.dry:
        print(json.dumps(jobs, ensure_ascii=False, indent=2))
        return

    require_cli()
    sys.stderr.write("animating %d shot(s) with Seedance…\n" % len(jobs))
    out = [one_job(j, args) for j in jobs]
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
