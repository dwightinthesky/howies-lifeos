const ICLOUD_WEBCAL_URL =
  "webcal://p111-caldav.icloud.com/published/2/MTc0MzY0MzU0NDMxNzQzNjxDqL2A-wTmFJJ-CyH4Rit9MZWLPdKktwoRFaWzYcYs1z88Fgf-_9Q1HPA1Pa50Nsi-X-qH0gD5wl-IGzVE3Nk";
const ICLOUD_HTTPS_URL = ICLOUD_WEBCAL_URL.replace(/^webcal:/, "https:");

export async function onRequestGet() {
  try {
    const upstream = await fetch(ICLOUD_HTTPS_URL, {
      headers: {
        Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Cloudflare Pages Function)",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response(`Upstream calendar error: ${upstream.status}`, {
        status: 502,
      });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return new Response(`Calendar sync failed: ${error.message}`, {
      status: 502,
    });
  }
}
