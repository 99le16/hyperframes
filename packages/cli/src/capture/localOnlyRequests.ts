import type { Page } from "puppeteer-core";

// The template CDNs a --local-only page still loads: GSAP and Google Fonts.
const TEMPLATE_CDN_PREFIXES = [
  "https://cdn.jsdelivr.net/npm/gsap@",
  "https://cdn.jsdelivr.net/npm/gsap/",
  "https://fonts.googleapis.com/",
  "https://fonts.gstatic.com/",
];

/** True when a --local-only page may load `url`: the CLI's own server, data:/blob:, or a template CDN. */
export function allowedLocalOnlyRequest(url: string, serverUrl: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    if (new URL(url).origin === new URL(serverUrl).origin) return true;
  } catch {
    return false;
  }
  return TEMPLATE_CDN_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/** Every other request, redirect hops included, fails as a load blocked by the client. */
export async function guardLocalOnlyRequests(page: Page, serverUrl: string): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.isInterceptResolutionHandled()) return;
    const action = allowedLocalOnlyRequest(request.url(), serverUrl)
      ? request.continue()
      : request.abort("blockedbyclient");
    void action.catch(() => {});
  });
}
