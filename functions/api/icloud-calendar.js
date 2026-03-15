const ICLOUD_WEBCAL_URL =
  "webcal://p111-caldav.icloud.com/published/2/MTc0MzY0MzU0NDMxNzQzNjxDqL2A-wTmFJJ-CyH4Rit9MZWLPdKktwoRFaWzYcYs1z88Fgf-_9Q1HPA1Pa50Nsi-X-qH0gD5wl-IGzVE3Nk";
const ICLOUD_HTTPS_URL = ICLOUD_WEBCAL_URL.replace(/^webcal:/, "https:");
const ESCP_HTTPS_URL =
  "https://orbit.escp.eu/api/calendars/getSpecificCalendar/2f6b7c9855f563b1ad9d3f5e221a2d60f3f3fdb2";

const SOURCES = [
  { name: "icloud", url: ICLOUD_HTTPS_URL },
  { name: "escp", url: ESCP_HTTPS_URL },
];

async function fetchCalendarSource(source) {
  try {
    const upstream = await fetch(source.url, {
      headers: {
        Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Cloudflare Pages Function)",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (!upstream.ok) {
      return { name: source.name, ok: false, error: `HTTP ${upstream.status}` };
    }

    const text = await upstream.text();
    if (!text || !text.includes("BEGIN:VEVENT")) {
      return { name: source.name, ok: false, error: "No calendar events in feed" };
    }
    return { name: source.name, ok: true, text };
  } catch (error) {
    return { name: source.name, ok: false, error: error.message };
  }
}

export async function onRequestGet() {
  try {
    const results = await Promise.all(SOURCES.map(fetchCalendarSource));
    const successful = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (successful.length === 0) {
      return new Response(
        `Calendar sync failed. ${failed
          .map((f) => `${f.name}: ${f.error}`)
          .join(" | ")}`,
        { status: 502 }
      );
    }

    const mergedCalendarText = successful.map((s) => s.text).join("\n");
    return new Response(mergedCalendarText, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Calendar-Sources": successful.map((s) => s.name).join(","),
        "X-Calendar-Failed-Sources": failed.map((f) => f.name).join(","),
      },
    });
  } catch (error) {
    return new Response(`Calendar sync failed: ${error.message}`, {
      status: 502,
    });
  }
}
