---
name: envato-stock
description: >
  Find, license and download real stock **video and photos** from Envato Elements
  and drop the files into a destination folder the caller chooses. Search runs
  through the Envato MCP (`mcp__envato__search_*`); licensing + downloading runs
  through the user's own logged-in Chrome via the Claude-for-Chrome extension (the
  MCP cannot download). Use this WHENEVER the user wants stock footage / b-roll /
  a photo from Envato ("búscame un vídeo de stock", "descarga esto de Envato",
  "licencia esta imagen"), OR when another skill (e.g. `chalk-motion-edit`,
  `general-video`, `faceless-explainer`) needs to pull real stock assets into an
  edit. It is provider-specific to Envato Elements and asset-type-limited to stock
  video + photos; it does not edit video itself — it just sources the files.
metadata:
  {
    "tags": "envato, envato-elements, stock-video, stock-photos, b-roll, assets, mcp, claude-in-chrome, download, license",
  }
---

# envato-stock

Source real **stock video and photos** from **Envato Elements**: search the
catalog, license + download the full-res watermark-free file, and move it into a
folder the caller specifies. This skill only _fetches_ assets — it does not edit or
compose anything. Other skills call it to get material; the user can also call it
directly for a one-off download.

## How the pieces divide (important)

The integration is **split across two tools on purpose** — neither does the whole
job:

- **Search → the Envato MCP** (`mcp__envato__search_photos`,
  `mcp__envato__search_stock_video`). This is _all_ the MCP does. Each result
  carries an `elements.envato.com/...` link. The MCP has **no download/license
  tool**, and its OAuth is not wired up — **never try to license through the MCP.**
- **License + download → the Chrome browser** (`mcp__claude-in-chrome__*`), driving
  the user's own signed-in Envato session. Clicking **Download** in the Envato web
  app is what applies the license and saves the clean file.

Envato Elements has **no public download API** (that is Envato _Market_, a different
platform), so the browser step is the only way to get a licensed file. Search works
logged-out; **download requires the user signed into Envato in the connected
Chrome.**

> **Scope: stock video + photos.** This skill covers `search_stock_video` and
> `search_photos`. The same license→download→move mechanic would work for any other
> Elements item type via its `search_*` tool, but that is out of scope here — and
> **do not source music or audio** unless the caller explicitly asks (most edits
> keep their original audio).

## Prerequisites

- **Envato MCP configured** — repo `.mcp.json` has `mcpServers.envato` →
  `https://mcp.envato.com/mcp`. If the `mcp__envato__*` tools aren't loaded, pull
  them with `ToolSearch` (`select:mcp__envato__search_stock_video,mcp__envato__search_photos`).
- **Claude-for-Chrome extension** installed and paired to the _same_ Claude
  account, with that Chrome **logged into the user's Envato account** (an active
  Elements subscription is what makes Download apply a license). If the browser
  tools aren't loaded, pull the core set with `ToolSearch` in one call
  (`tabs_context_mcp,navigate,computer,list_connected_browsers,select_browser`).

## Inputs the caller provides (or you ask for)

Before searching, make sure you know three things. If a calling skill passed them,
use those; if running standalone and any is missing, **ask the user** (one
`AskUserQuestion`):

1. **What** — the shots/subjects wanted, per asset. Either the user's concrete
   ideas (they drive `searchTerms`) or "elige tú" (you pick the best fit).
2. **How many** — the number of assets to license. This caps the work-list; don't
   bulk-license.
3. **Where** — the **destination folder** the downloaded files must end up in. A
   calling skill normally dictates this (e.g. "the source video's own folder"). If
   unknown, ask; never leave files in `~/Downloads`.

## Workflow

### 1. Build the search work-list

Turn each need into a row: `need → item type → searchTerms`. Only two item types:

| Need                                       | Item type   | MCP tool                          |
| ------------------------------------------ | ----------- | --------------------------------- |
| Photo / hero image / backdrop              | photos      | `mcp__envato__search_photos`      |
| Stock footage / b-roll / motion background | stock-video | `mcp__envato__search_stock_video` |

Keep the list to the **count** from the inputs. Draw `searchTerms` from the user's
concrete ideas when given, otherwise from the context the caller passed.

### 2. Search the catalog (MCP)

For each row, call the matching tool with tight English keywords (`searchTerms`,
≤60 chars), a small `perPage`, and typed visual `filters` when they sharpen the
result (orientation, colors, resolution, frame_rate…). `sortBy: "popular"` for
quality, `"latest"` for freshness.

```
mcp__envato__search_stock_video { "searchTerms": "city traffic timelapse night",
                                   "perPage": 3, "filters": { "orientation": "landscape" } }
```

Each result card has a title, author, preview image, and the crucial `openLink`
**`elements.envato.com/...` URL** — that page is where Download lives.

**Present the candidates** (title + author + link) so the user picks — unless they
said "elige tú", in which case take the best fit and tell them what you chose. Note
the chosen item's `elements.envato.com` URL for the next step.

### 3. Connect the browser

1. `mcp__claude-in-chrome__list_connected_browsers`.
2. If it returns empty, the extension isn't paired: tell the user to open the Claude
   Chrome extension on the _same_ account and confirm they're logged into Envato,
   then re-list. (First pairing usually needs a full Chrome restart.)
3. When browsers appear you **must** confirm which one via `AskUserQuestion` — list
   every connected browser (display name + `deviceId`) plus a final option "Open a
   confirmation screen in every connected Chrome extension…". Then `select_browser`
   with the chosen `deviceId` (or `switch_browser` for the last option). Never pick
   silently.

### 4. License + download (browser) — hands-off

**One-time browser setup** (the connected "Chrome" on this Mac is **Brave**):
brave://settings/downloads → turn **off** "Preguntar dónde guardar cada archivo".
With it on, every download opens a native _Guardar_ dialog the page screenshot
cannot see, and the download sits there until someone clicks. (`defaults write
com.brave.Browser PromptForDownloadLocation -bool false` sets the same thing as a
policy.) app.envato.com must also be allowed to download several files
(Configuración del sitio → Descargas automáticas → Permitir) or Brave silently
stops saving after ~5 while Envato still spends the licence.

Per chosen item:

1. `tabs_context_mcp { createIfEmpty: true }` once, then `navigate` the tab to the
   item's `elements.envato.com` URL (redirects to `app.envato.com`). If the page
   shows only grey skeletons the tab is hidden: `osascript -e 'tell application
"Brave Browser" to activate'`.
2. `screenshot` to confirm you're logged in and see the green **Download** button.
   Login wall → **stop** and ask the user to sign in; never type credentials.
3. Arm the grabber, **then** click Download **once** (in video, the 1080p row of
   the quality menu both licenses and downloads — do not also press the green
   button; that fires a second copy):

   ```bash
   T0=$(date +%s)          # take this BEFORE the click
   # … click Download in the browser …
   python3 .claude/skills/envato-stock/scripts/grab_download.py \
       --since "$T0" --dest "<destination folder>" --name "<clean-name>"
   ```

   It watches Brave's download folder and ~/Downloads, presses Save if the
   _Guardar_ dialog is still enabled, waits for the file to finish, deletes the
   `(1)` twin, unzips a single-file zip, and moves it to `<dest>/<clean-name>.<ext>`.
   It **exits non-zero instead of guessing** (1 = nothing arrived, 2 = two
   different new files). On exit 1 do not click again blindly — screenshot the
   page first: "Automatically licensed" + nothing on disk = Brave blocked it
   (see setup), and a second click spends nothing extra only if the item is
   already licensed.

4. If a licence / project chooser appears instead of the toast, screenshot it and
   **ask** which project to license against.

Run items **one at a time** — arm, click, grab, verify — never several clicks then
one sweep: a failed download makes a sweep file the previous item's footage under
the new name.

Downloading a file and spending a license are real, account-affecting actions.
They're covered when the user (or the calling skill on the user's behalf) asked for
the download. If the user only said "search", stop after step 2 and hand them the
links.

### 5. Verify what landed

Pull one frame of every downloaded clip (`ffmpeg -ss 1 -i f -frames:v 1`) into a
contact sheet next to its search query. Identical durations or md5s across
unrelated items mean a mis-filed download. Report the **final path of each file**.

## Gotchas

- **Preview vs licensed file.** The image in the MCP result and the un-downloaded
  page preview are **watermarked**. Only the file from clicking Download is clean —
  never use the preview thumbnail as the real asset.
- **MCP can only search.** No amount of retrying finds a download tool; the browser
  is the only path to a licensed file.
- **Login required for full-res.** Search works logged-out; Download needs the
  signed-in Envato session in the connected Chrome.
- **Respect the requested count.** Each Download spends against the user's account —
  license only up to the number asked; don't bulk-license.
- **Chrome must be running for the download step.** Search needs no browser, but the
  license+download step needs Chrome open, the extension paired, and Envato logged
  in. If the browser list is empty at step 3, pause and get it connected before
  continuing.
