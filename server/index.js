// server/index.js
// TinyHawk dev server (Prisma + SQLite / Postgres-ready) with ipapi.co geo enrichment
// CommonJS style (require). Safe fetch handling to work across Node versions.

const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");

// Try to require node-fetch (works if installed and CommonJS-compatible).
// If it isn't available or is ESM-only, fall back to global fetch (Node 18+).
let fetchImpl = null;
try {
  const nf = require("node-fetch");
  // node-fetch v3 may export default - handle both
  fetchImpl = nf && nf.default ? nf.default : nf;
} catch (e) {
  // no node-fetch installed; rely on global fetch if available (Node 18+)
  if (typeof fetch !== "undefined") fetchImpl = fetch;
  else fetchImpl = null;
}

const prisma = new PrismaClient();
const app = express();

// If running behind a proxy (Render, Heroku), trust proxy to get real IP from X-Forwarded-For
app.set("trust proxy", true);

const PORT = process.env.PORT || 4000;
// Note: we no longer hardcode BASE_URL here — we prefer process.env.BASE_URL when present.
// When not present we compute a fallback per-request (so shortUrl can reflect the deployed domain).
const DEFAULT_BASE_URL = `http://localhost:${PORT}`;

const GEO_PROVIDER = process.env.GEO_PROVIDER || "ipapi";
const GEO_API_KEY = process.env.GEO_API_KEY || "";

// Optional: allow restricting origins via FRONTEND_ORIGIN env var (comma-separated)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";

const corsOptions = FRONTEND_ORIGIN
  ? {
      origin: FRONTEND_ORIGIN.split(",").map((s) => s.trim()),
    }
  : {}; // default: allow all origins

app.use(cors(corsOptions));
app.use(bodyParser.json());

// utility to generate a code (6 chars)
function generateCode(len = 6) {
  return nanoid(len);
}

/**
 * lookupGeo(ip)
 * - Uses ipapi.co by default (no API key required)
 * - Returns { country, region, city } or null on failure / private IPs
 */
async function lookupGeo(ip) {
  if (!ip) return null;

  // normalize ip & strip IPv6-mapped IPv4 prefix
  const ipStr = String(ip).replace(/^::ffff:/, "").trim();

  // skip private/local addresses
  if (
    ipStr === "127.0.0.1" ||
    ipStr === "localhost" ||
    ipStr.startsWith("10.") ||
    ipStr.startsWith("192.168.") ||
    ipStr.startsWith("172.") || // rough detection for private range
    ipStr.startsWith("::1")
  ) {
    return null;
  }

  // ensure we have a fetch implementation
  if (!fetchImpl) {
    console.warn("No fetch implementation available for geo lookup.");
    return null;
  }

  try {
    let url;
    if (GEO_PROVIDER === "ipapi") {
      url = `https://ipapi.co/${encodeURIComponent(ipStr)}/json/`;
    } else if (GEO_PROVIDER === "ipstack") {
      if (!GEO_API_KEY) return null;
      url = `http://api.ipstack.com/${encodeURIComponent(ipStr)}?access_key=${encodeURIComponent(GEO_API_KEY)}`;
    } else if (GEO_PROVIDER === "ipinfo") {
      if (!GEO_API_KEY) return null;
      url = `https://ipinfo.io/${encodeURIComponent(ipStr)}/json?token=${encodeURIComponent(GEO_API_KEY)}`;
    } else {
      return null;
    }

    // node-fetch accepts a 'timeout' option only in older versions; if it errors, fallback to plain fetch
    const resp = await fetchImpl(url, { timeout: 4000 }).catch((err) => {
      // if node-fetch doesn't accept timeout or fails, try again with plain fetch signature
      return fetchImpl(url);
    });

    if (!resp || !resp.ok) return null;
    const data = await resp.json();

    // ipapi returns country_name, region, city, country, etc.
    if (data && data.error) return null;

    const country = data.country_name || data.country || null;
    const region = data.region || data.region_code || null;
    const city = data.city || null;

    return { country, region, city };
  } catch (err) {
    console.warn("ipapi lookup failed:", err?.message || err);
    return null;
  }
}

/**
 * Helper to produce a usable base URL for short links:
 * - prefer process.env.BASE_URL if set (this is required in production)
 * - otherwise, derive from request (protocol + host) — useful for local dev or preview.
 */
function getBaseUrlFromReq(req) {
  if (process.env.BASE_URL && process.env.BASE_URL.trim().length > 0) {
    return process.env.BASE_URL.replace(/\/+$/, ""); // strip trailing slash
  }
  // derive from incoming request
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

// POST /api/shorten
app.post("/api/shorten", async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl) return res.status(400).json({ message: "originalUrl is required" });

    // validate URL
    try {
      const parsed = new URL(originalUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "only http(s) URLs allowed" });
      }
    } catch (e) {
      return res.status(400).json({ message: "invalid URL" });
    }

    const baseUrl = getBaseUrlFromReq(req);

    // handle custom alias
    if (customAlias) {
      const key = customAlias.trim();
      if (!/^[A-Za-z0-9\-_]+$/.test(key)) {
        return res.status(400).json({ message: "customAlias contains invalid characters" });
      }
      // check uniqueness (custom field is unique in schema)
      const existing = await prisma.url.findUnique({ where: { custom: key } });
      if (existing) return res.status(409).json({ message: "custom alias already in use" });

      const created = await prisma.url.create({
        data: {
          shortCode: key,
          original: originalUrl,
          custom: key,
        },
      });

      const shortUrl = `${baseUrl}/${created.shortCode}`;
      return res.json({
        shortUrl,
        shortCode: created.shortCode,
        analyticsUrl: `${baseUrl}/analytics/${created.shortCode}`,
        createdAt: created.createdAt,
        clickCount: created.clickCount,
      });
    }

    // create generated short code (retry on collision)
    let shortCode;
    let attempts = 0;
    while (true) {
      shortCode = generateCode(6);
      const maybe = await prisma.url.findUnique({ where: { shortCode } });
      if (!maybe) break;
      attempts++;
      if (attempts > 6) break;
    }

    const created = await prisma.url.create({
      data: {
        shortCode,
        original: originalUrl,
      },
    });

    const shortUrl = `${baseUrl}/${created.shortCode}`;
    return res.json({
      shortUrl,
      shortCode: created.shortCode,
      analyticsUrl: `${baseUrl}/analytics/${created.shortCode}`,
      createdAt: created.createdAt,
      clickCount: created.clickCount,
    });
  } catch (err) {
    console.error("POST /api/shorten error:", err);
    return res.status(500).json({ message: "server error" });
  }
});

// Redirect endpoint GET /:shortCode
app.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;
    const entry = await prisma.url.findUnique({ where: { shortCode } });
    if (!entry) return res.status(404).send("Not found");

    // increment click count atomically
    await prisma.url.update({
      where: { id: entry.id },
      data: { clickCount: { increment: 1 } },
    });

    // create click row, then enrich with geo (non-blocking)
    (async () => {
      try {
        // prefer X-Forwarded-For if present (proxy), otherwise req.ip
        const forwarded = (req.headers["x-forwarded-for"] || req.ip || "").toString();
        const clientIp = forwarded.split(",")[0].trim();

        const createdClick = await prisma.click.create({
          data: {
            urlId: entry.id,
            ip: clientIp || null,
            ua: req.headers["user-agent"] || null,
            referrer: req.get("referer") || null,
          },
        });

        // attempt geo lookup (best-effort)
        const ipForLookup = (clientIp || "").replace(/^::ffff:/, "");
        const geo = await lookupGeo(ipForLookup);

        if (geo) {
          await prisma.click.update({
            where: { id: createdClick.id },
            data: {
              country: geo.country,
              region: geo.region,
              city: geo.city,
            },
          });
        }
      } catch (e) {
        console.warn("Failed to record/enrich click:", e?.message || e);
      }
    })();

    return res.redirect(entry.original);
  } catch (err) {
    console.error("GET /:shortCode error:", err);
    return res.status(500).send("Server error");
  }
});

// GET /api/stats/:shortCode  -> dashboard friendly
app.get("/api/stats/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;
    const days = parseInt(req.query.days || "30", 10);

    // find url and recent clicks
    const url = await prisma.url.findUnique({
      where: { shortCode },
    });
    if (!url) return res.status(404).json({ message: "Not found" });

    // recent clicks (limit for detail)
    const recentClicks = await prisma.click.findMany({
      where: { urlId: url.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // timeseries (group by date) — build in JS from recentClicks
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    // init dates map
    const timeseriesMap = {};
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      timeseriesMap[key] = 0;
    }

    recentClicks.forEach((c) => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (timeseriesMap[key] === undefined) timeseriesMap[key] = 0;
      timeseriesMap[key]++;
    });

    const timeseries = Object.keys(timeseriesMap).map((date) => ({ date, count: timeseriesMap[date] }));

    // geo breakdown
    const geoCounts = {};
    recentClicks.forEach((c) => {
      const country = c.country || "Unknown";
      geoCounts[country] = (geoCounts[country] || 0) + 1;
    });
    const geo = Object.entries(geoCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    // top referrers
    const refCounts = {};
    recentClicks.forEach((c) => {
      const r = c.referrer || "Direct";
      refCounts[r] = (refCounts[r] || 0) + 1;
    });
    const topReferrers = Object.entries(refCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      summary: {
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL ? process.env.BASE_URL.replace(/\/+$/, "") : DEFAULT_BASE_URL}/${url.shortCode}`,
        originalUrl: url.original,
        createdAt: url.createdAt,
        clickCount: url.clickCount,
      },
      timeseries,
      geo,
      topReferrers,
      recentClicks: recentClicks.slice(0, 50).map((c) => ({
        id: c.id,
        ip: c.ip,
        ua: c.ua,
        referrer: c.referrer,
        country: c.country,
        region: c.region,
        city: c.city,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/stats/:shortCode error:", err);
    return res.status(500).json({ message: "server error" });
  }
});

// health
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down, disconnecting prisma...");
  await prisma.$disconnect();
  process.exit(0);
});

// If user set BASE_URL we display that in logs; otherwise we print the listen addr placeholder
const printedBase = (process.env.BASE_URL && process.env.BASE_URL.replace(/\/+$/, "")) || DEFAULT_BASE_URL;
app.listen(PORT, () => {
  console.log(`TinyHawk server running at ${printedBase}`);
});
