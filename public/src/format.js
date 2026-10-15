export function cToF(value) {
  return value * 9 / 5 + 32;
}

export function msToKmh(value) {
  return value * 3.6;
}

export function msToMph(value) {
  return value * 2.236936;
}

export function temp(value, unit) {
  if (!Number.isFinite(value)) return "Not available";
  const converted = unit === "imperial" ? cToF(value) : value;
  return `${Math.round(converted)}°`;
}

export function wind(value, unit) {
  if (!Number.isFinite(value)) return "Not available";
  const converted = unit === "imperial" ? msToMph(value) : msToKmh(value);
  return `${Math.round(converted)} ${unit === "imperial" ? "mph" : "km/h"}`;
}

export function distance(meters) {
  if (!Number.isFinite(meters)) return "Not available";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function pressure(value) {
  return Number.isFinite(value) ? `${value} hPa` : "Not available";
}

export function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "Not available";
}

export function timeFromUnix(seconds, timezoneOffset, options = {}) {
  if (!Number.isFinite(seconds)) return "Not available";
  const date = new Date((seconds + timezoneOffset) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    ...options
  }).format(date);
}

export function dateFromUnix(seconds, timezoneOffset, options = {}) {
  const date = new Date((seconds + timezoneOffset) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    ...options
  }).format(date);
}

export function dayLabel(seconds, timezoneOffset, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date((seconds + timezoneOffset) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

export function relativeTime(timestamp) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export function windDirection(degrees) {
  if (!Number.isFinite(degrees)) return "Not available";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(degrees / 45) % 8];
}
