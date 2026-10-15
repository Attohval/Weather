import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const envPath = path.join(rootDir, ".env");
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, "utf8");
  envFile.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

const port = process.env.PORT || 3000;
const apiKey = process.env.OPENWEATHER_API_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const baseUrl = "https://api.openweathermap.org";
const publicDir = path.join(rootDir, "public");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers
  });
  res.end(JSON.stringify(body));
}

function requireApiKey(res) {
  if (!apiKey) {
    sendJson(res, 500, {
      error: "Weather service is not configured. Add OPENWEATHER_API_KEY to your environment."
    });
    return false;
  }
  return true;
}

async function proxyOpenWeather(reqUrl, res, endpoint, params = {}) {
  if (!requireApiKey(res)) return;

  const url = new URL(endpoint, baseUrl);
  const incomingParams = Object.fromEntries(reqUrl.searchParams.entries());
  Object.entries({ ...incomingParams, ...params, appid: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  try {
    const upstream = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    const body = await upstream.json();

    if (!upstream.ok) {
      const status = upstream.status === 401 ? 502 : upstream.status;
      sendJson(res, status, {
        error: status === 502
          ? "Weather service authentication failed."
          : body?.message || "Weather data is temporarily unavailable."
      });
      return;
    }

    sendJson(res, 200, body, { "Cache-Control": "public, max-age=180" });
  } catch {
    sendJson(res, 503, {
      error: "Unable to retrieve weather information right now. Please try again in a moment."
    });
  }
}

async function serveStatic(reqUrl, res) {
  const rawPath = decodeURIComponent(reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname);
  const normalized = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600"
    });
    res.end(file);
  } catch {
    const file = await readFile(path.join(publicDir, "index.html"));
    res.writeHead(200, { "Content-Type": mimeTypes[".html"], "Cache-Control": "no-cache" });
    res.end(file);
  }
}

createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (reqUrl.pathname === "/api/search") {
    proxyOpenWeather(reqUrl, res, "/geo/1.0/direct", { limit: reqUrl.searchParams.get("limit") || 6 });
    return;
  }
  if (reqUrl.pathname === "/api/reverse") {
    proxyOpenWeather(reqUrl, res, "/geo/1.0/reverse", { limit: reqUrl.searchParams.get("limit") || 1 });
    return;
  }
  if (reqUrl.pathname === "/api/weather") {
    proxyOpenWeather(reqUrl, res, "/data/2.5/weather", { units: "metric" });
    return;
  }
  if (reqUrl.pathname === "/api/forecast") {
    proxyOpenWeather(reqUrl, res, "/data/2.5/forecast", { units: "metric" });
    return;
  }
  if (reqUrl.pathname === "/api/air") {
    proxyOpenWeather(reqUrl, res, "/data/2.5/air_pollution");
    return;
  }

  serveStatic(reqUrl, res);
}).listen(port, () => {
  console.log(`Weather app running at http://localhost:${port}`);
});
