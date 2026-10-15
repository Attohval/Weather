const keys = {
  theme: "aurora-theme",
  unit: "aurora-unit",
  favorites: "aurora-favorites",
  recent: "aurora-recent",
  lastLocation: "aurora-last-location"
};

export function read(key, fallback) {
  try {
    const value = localStorage.getItem(keys[key]);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  localStorage.setItem(keys[key], JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(keys[key]);
}

export function getInitialTheme() {
  const saved = read("theme", null);
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
