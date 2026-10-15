const memoryCache = new Map();
const ttl = 10 * 60 * 1000;
const apiBaseUrl = (window.AURORA_WEATHER_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

function cacheKey(path, params) {
  return `${path}?${new URLSearchParams(params).toString()}`;
}

async function request(path, params = {}, options = {}) {
  const key = cacheKey(path, params);
  const cached = memoryCache.get(key);

  if (!options.force && cached && Date.now() - cached.time < ttl) {
    return { data: cached.data, cached: true, fetchedAt: cached.time };
  }

  const response = await fetch(`${apiBaseUrl}${path}?${new URLSearchParams(params).toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Weather data is temporarily unavailable.");
  }

  memoryCache.set(key, { data: payload, time: Date.now() });
  return { data: payload, cached: false, fetchedAt: Date.now() };
}

export function searchLocations(query) {
  return request("/api/search", { q: query, limit: 6 });
}

export function reverseLocation(lat, lon) {
  return request("/api/reverse", { lat, lon, limit: 1 });
}

export async function getWeatherBundle(location, options = {}) {
  const coords = { lat: location.lat, lon: location.lon };
  const [current, forecast, air] = await Promise.all([
    request("/api/weather", coords, options),
    request("/api/forecast", coords, options),
    request("/api/air", coords, options).catch((error) => ({ error }))
  ]);

  return {
    current: current.data,
    forecast: forecast.data,
    air: air.data || null,
    airError: air.error || null,
    fetchedAt: Math.max(current.fetchedAt, forecast.fetchedAt)
  };
}
