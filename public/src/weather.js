export function normalizeLocation(item) {
  const parts = [item.name, item.state, item.country].filter(Boolean);
  return {
    name: item.name,
    state: item.state || "",
    country: item.country || "",
    lat: item.lat,
    lon: item.lon,
    label: parts.join(", ")
  };
}

export function iconUrl(icon) {
  return icon ? `https://openweathermap.org/img/wn/${icon}@4x.png` : "";
}

export function conditionTheme(weather, current) {
  const main = weather?.[0]?.main?.toLowerCase() || "";
  const isNight = weather?.[0]?.icon?.includes("n");
  if (isNight) return "night";
  if (main.includes("thunder")) return "storm";
  if (main.includes("rain") || main.includes("drizzle")) return "rain";
  if (main.includes("snow")) return "snow";
  if (main.includes("cloud")) return "clouds";
  if (main.includes("clear")) return "clear";
  return current?.clouds?.all > 65 ? "clouds" : "clear";
}

export function groupDailyForecast(list, timezone) {
  const days = new Map();

  list.forEach((entry) => {
    const date = new Date((entry.dt + timezone) * 1000).toISOString().slice(0, 10);
    if (!days.has(date)) {
      days.set(date, {
        dt: entry.dt,
        min: entry.main.temp_min,
        max: entry.main.temp_max,
        icons: {},
        condition: entry.weather?.[0]?.main || "Not available",
        pop: entry.pop
      });
    }

    const day = days.get(date);
    day.min = Math.min(day.min, entry.main.temp_min);
    day.max = Math.max(day.max, entry.main.temp_max);
    day.pop = Math.max(day.pop || 0, entry.pop || 0);
    const icon = entry.weather?.[0]?.icon;
    if (icon) day.icons[icon] = (day.icons[icon] || 0) + 1;
    if (entry.dt_txt?.includes("12:00:00")) {
      day.condition = entry.weather?.[0]?.main || day.condition;
      day.middayIcon = icon;
    }
  });

  return Array.from(days.values()).slice(0, 5).map((day) => {
    const commonIcon = Object.entries(day.icons).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { ...day, icon: day.middayIcon || commonIcon };
  });
}

export function precipitationSummary(forecast) {
  const upcoming = forecast.list.slice(0, 8);
  const maxPop = Math.max(...upcoming.map((item) => item.pop || 0), 0);
  const rain = upcoming.reduce((sum, item) => sum + (item.rain?.["3h"] || 0), 0);
  const snow = upcoming.reduce((sum, item) => sum + (item.snow?.["3h"] || 0), 0);
  return { maxPop, rain, snow, hasData: maxPop > 0 || rain > 0 || snow > 0 };
}

export function aqiInfo(value) {
  const levels = {
    1: ["Good", "Air quality is currently good. No significant concerns are expected for most people."],
    2: ["Fair", "Air quality is fair. Conditions are generally acceptable for most people."],
    3: ["Moderate", "Air quality is moderate. Sensitive groups may want to pay closer attention to local guidance."],
    4: ["Poor", "Air quality is poor. Consider reducing prolonged outdoor activity if you are sensitive to air pollution."],
    5: ["Very Poor", "Air quality is very poor. Follow local public health guidance where available."]
  };
  return levels[value] || ["Unavailable", "Air quality data is not available for this location right now."];
}

export function dayLength(sunrise, sunset) {
  if (!Number.isFinite(sunrise) || !Number.isFinite(sunset)) return "Not available";
  const diff = sunset - sunrise;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.round((diff % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
