import { getWeatherBundle, reverseLocation, searchLocations } from "./api.js";
import { dateFromUnix, dayLabel, distance, percent, pressure, relativeTime, temp, timeFromUnix, wind, windDirection } from "./format.js";
import { getInitialTheme, read, write } from "./storage.js";
import { aqiInfo, conditionTheme, dayLength, groupDailyForecast, iconUrl, normalizeLocation, precipitationSummary } from "./weather.js";

const state = {
  unit: read("unit", "metric"),
  theme: getInitialTheme(),
  location: read("lastLocation", { name: "Lagos", country: "NG", lat: 6.5244, lon: 3.3792, label: "Lagos, NG" }),
  favorites: read("favorites", []),
  recent: read("recent", []),
  bundle: null,
  fetchedAt: null
};

const els = {
  app: document.querySelector("#app"),
  navToggle: document.querySelector("#navToggle"),
  siteNav: document.querySelector("#siteNav"),
  themeToggle: document.querySelector("#themeToggle"),
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#locationSearch"),
  suggestions: document.querySelector("#suggestions"),
  status: document.querySelector("#statusMessage"),
  geo: document.querySelector("#geoButton"),
  favorite: document.querySelector("#favoriteButton"),
  refresh: document.querySelector("#refreshButton"),
  unitButtons: document.querySelectorAll("[data-unit]"),
  hero: document.querySelector("#weather"),
  heroLocation: document.querySelector("#heroLocation"),
  localDate: document.querySelector("#localDate"),
  heroTime: document.querySelector("#heroTime"),
  currentTemp: document.querySelector("#currentTemp"),
  weatherIcon: document.querySelector("#weatherIcon"),
  condition: document.querySelector("#condition"),
  feelsHighLow: document.querySelector("#feelsHighLow"),
  lastUpdated: document.querySelector("#lastUpdated"),
  summaryTemp: document.querySelector("#summaryTemp"),
  summaryCondition: document.querySelector("#summaryCondition"),
  cloudSummary: document.querySelector("#cloudSummary"),
  visibilitySummary: document.querySelector("#visibilitySummary"),
  overview: document.querySelector("#overview"),
  hourly: document.querySelector("#hourlyForecast"),
  daily: document.querySelector("#dailyForecast"),
  precipitation: document.querySelector("#precipitation"),
  windCompass: document.querySelector("#windCompass"),
  windSpeed: document.querySelector("#windSpeed"),
  windDetail: document.querySelector("#windDetail"),
  sunrise: document.querySelector("#sunrise"),
  sunset: document.querySelector("#sunset"),
  dayLength: document.querySelector("#dayLength"),
  dayStatus: document.querySelector("#dayStatus"),
  sunPosition: document.querySelector("#sunPosition"),
  aqiBadge: document.querySelector("#aqiBadge"),
  aqiStatus: document.querySelector("#aqiStatus"),
  aqiExplanation: document.querySelector("#aqiExplanation"),
  pollutants: document.querySelector("#pollutants"),
  favorites: document.querySelector("#favorites"),
  recent: document.querySelector("#recentSearches"),
  clearRecent: document.querySelector("#clearRecent"),
  copyright: document.querySelector("#copyrightYear")
};

function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function setStatus(message, type = "info") {
  els.status.textContent = message;
  els.status.dataset.type = type;
  els.status.hidden = !message;
}

function setLoading(isLoading) {
  els.hero.classList.toggle("loading", isLoading);
  document.body.classList.toggle("is-loading", isLoading);
}

async function loadLocation(location, options = {}) {
  state.location = location;
  write("lastLocation", location);
  setLoading(true);
  setStatus(options.message || `Loading weather for ${location.label || location.name}...`);

  try {
    const bundle = await getWeatherBundle(location, { force: options.force });
    state.bundle = bundle;
    state.fetchedAt = bundle.fetchedAt;
    addRecent(location);
    renderAll();
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Weather data is temporarily unavailable.", "error");
  } finally {
    setLoading(false);
  }
}

function renderAll() {
  const { current, forecast, air } = state.bundle;
  const weather = current.weather?.[0] || {};
  const theme = conditionTheme(current.weather, current);

  document.body.dataset.weather = theme;
  renderHero(current, forecast);
  renderOverview(current);
  renderHourly(forecast);
  renderDaily(forecast);
  renderPrecipitation(forecast);
  renderWind(current);
  renderSun(current);
  renderAir(air);
  renderLocations();
  updateFavoriteButton();
}

function renderHero(current, forecast) {
  const weather = current.weather?.[0] || {};
  const high = Math.max(current.main.temp_max, forecast.list[0]?.main?.temp_max ?? current.main.temp_max);
  const low = Math.min(current.main.temp_min, forecast.list[0]?.main?.temp_min ?? current.main.temp_min);
  const now = Math.floor(Date.now() / 1000);

  els.heroLocation.textContent = `${current.name || state.location.name}, ${current.sys?.country || state.location.country || ""}`.replace(/,\s*$/, "");
  els.localDate.textContent = dateFromUnix(now, current.timezone);
  els.heroTime.textContent = `Local time ${timeFromUnix(now, current.timezone)}`;
  els.currentTemp.textContent = temp(current.main.temp, state.unit);
  els.weatherIcon.src = iconUrl(weather.icon);
  els.weatherIcon.alt = weather.description || weather.main || "Weather icon";
  els.condition.textContent = weather.description ? titleCase(weather.description) : "Condition unavailable";
  els.feelsHighLow.textContent = `Feels like ${temp(current.main.feels_like, state.unit)} · H: ${temp(high, state.unit)} L: ${temp(low, state.unit)}`;
  els.lastUpdated.textContent = `Last updated ${relativeTime(state.fetchedAt)}`;
  els.summaryTemp.textContent = temp(current.main.temp, state.unit);
  els.summaryCondition.textContent = weather.main || "Current";
  els.cloudSummary.textContent = percent(current.clouds?.all);
  els.visibilitySummary.textContent = distance(current.visibility);
}

function renderOverview(current) {
  const metrics = [
    ["Feels like", temp(current.main.feels_like, state.unit), "Thermal comfort"],
    ["Humidity", percent(current.main.humidity), "Moisture"],
    ["Wind", wind(current.wind?.speed, state.unit), windDirection(current.wind?.deg)],
    ["Pressure", pressure(current.main.pressure), "Atmosphere"],
    ["Visibility", distance(current.visibility), "Clarity"],
    ["Cloudiness", percent(current.clouds?.all), "Sky cover"],
    ["Dew point", "Not available", "OpenWeather current endpoint"],
    ["UV index", "Not available", "OpenWeather One Call required"]
  ];

  els.overview.innerHTML = metrics.map(([label, value, note]) => `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `).join("");
}

function renderHourly(forecast) {
  els.hourly.innerHTML = forecast.list.slice(0, 8).map((item, index) => {
    const weather = item.weather?.[0] || {};
    return `
      <article class="hour-card ${index === 0 ? "current" : ""}">
        <time>${index === 0 ? "Now" : timeFromUnix(item.dt, forecast.city.timezone, { hour: "numeric" })}</time>
        <img src="${iconUrl(weather.icon)}" alt="${weather.description || weather.main || "Weather"}" />
        <strong>${temp(item.main.temp, state.unit)}</strong>
        <span>${weather.main || "N/A"}</span>
      </article>
    `;
  }).join("");
}

function renderDaily(forecast) {
  const days = groupDailyForecast(forecast.list, forecast.city.timezone);
  els.daily.innerHTML = days.map((day, index) => `
    <article class="daily-row">
      <div>
        <strong>${dayLabel(day.dt, forecast.city.timezone, index)}</strong>
        <span>${day.condition}</span>
      </div>
      <img src="${iconUrl(day.icon)}" alt="${day.condition}" />
      <span>${percent((day.pop || 0) * 100)}</span>
      <strong>${temp(day.max, state.unit)} / ${temp(day.min, state.unit)}</strong>
    </article>
  `).join("");
}

function renderPrecipitation(forecast) {
  const summary = precipitationSummary(forecast);
  const pop = Math.round(summary.maxPop * 100);
  els.precipitation.innerHTML = `
    <div class="precip-summary">
      <div class="progress-ring" style="--value:${pop}">
        <span>${pop}%</span>
      </div>
      <div>
        <h3>${summary.hasData ? "Precipitation possible" : "No precipitation expected soon"}</h3>
        <p class="muted">Expected rain: ${summary.rain.toFixed(1)} mm · snow: ${summary.snow.toFixed(1)} mm over the next 24 hours where available.</p>
      </div>
    </div>
  `;
}

function renderWind(current) {
  const deg = current.wind?.deg || 0;
  els.windCompass.style.setProperty("--deg", `${deg}deg`);
  els.windSpeed.textContent = wind(current.wind?.speed, state.unit);
  els.windDetail.textContent = `${windDirection(current.wind?.deg)}${Number.isFinite(current.wind?.gust) ? ` · Gusts ${wind(current.wind.gust, state.unit)}` : ""}`;
}

function renderSun(current) {
  const { sunrise, sunset } = current.sys || {};
  const now = Math.floor(Date.now() / 1000);
  const progress = sunrise && sunset ? Math.min(100, Math.max(0, ((now - sunrise) / (sunset - sunrise)) * 100)) : 0;
  els.sunrise.textContent = timeFromUnix(sunrise, current.timezone);
  els.sunset.textContent = timeFromUnix(sunset, current.timezone);
  els.dayLength.textContent = dayLength(sunrise, sunset);
  els.dayStatus.textContent = now >= sunrise && now <= sunset ? "Daylight" : "Night";
  els.sunPosition.style.left = `${progress}%`;
}

function renderAir(air) {
  const item = air?.list?.[0];
  const aqi = item?.main?.aqi;
  const [status, explanation] = aqiInfo(aqi);
  els.aqiBadge.textContent = aqi || "--";
  els.aqiBadge.dataset.level = aqi || "none";
  els.aqiStatus.textContent = status;
  els.aqiExplanation.textContent = explanation;
  const components = item?.components || {};
  const wanted = ["pm2_5", "pm10", "no2", "o3", "co"];
  els.pollutants.innerHTML = wanted.map((key) => `
    <div><span>${key.toUpperCase().replace("_", ".")}</span><strong>${Number.isFinite(components[key]) ? `${components[key].toFixed(1)} μg/m³` : "N/A"}</strong></div>
  `).join("");
}

function renderLocations() {
  renderLocationList(els.favorites, state.favorites, "No saved locations yet.", true);
  renderLocationList(els.recent, state.recent, "No recent searches yet.", false);
}

function renderLocationList(container, locations, emptyText, removable) {
  if (!locations.length) {
    container.innerHTML = `<div class="empty-state"><strong>${emptyText}</strong><span>Search for a city and save it for quick access.</span></div>`;
    return;
  }

  container.innerHTML = locations.map((location, index) => `
    <div class="location-item">
      <button type="button" data-load="${index}" data-list="${removable ? "favorites" : "recent"}">${location.label}</button>
      ${removable ? `<button type="button" aria-label="Remove ${location.label}" data-remove="${index}">×</button>` : ""}
    </div>
  `).join("");
}

function addRecent(location) {
  state.recent = [location, ...state.recent.filter((item) => item.lat !== location.lat || item.lon !== location.lon)].slice(0, 6);
  write("recent", state.recent);
}

function updateFavoriteButton() {
  const saved = state.favorites.some((item) => item.lat === state.location.lat && item.lon === state.location.lon);
  els.favorite.textContent = saved ? "★ Saved Location" : "☆ Save Location";
}

function titleCase(value) {
  return value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}

async function handleSearch(query) {
  try {
    const { data } = await searchLocations(query);
    if (!data.length) {
      setStatus("We could not find that location. Try another city or country.", "error");
      return;
    }
    await loadLocation(normalizeLocation(data[0]));
  } catch (error) {
    setStatus(error.message || "Unable to search locations right now. Please try again in a moment.", "error");
  }
}

const suggest = debounce(async () => {
  const query = els.input.value.trim();
  if (query.length < 2) {
    els.suggestions.innerHTML = "";
    return;
  }
  try {
    const { data } = await searchLocations(query);
    els.suggestions.innerHTML = data.map((item, index) => {
      const location = normalizeLocation(item);
      return `<button type="button" role="option" data-suggestion="${index}">${location.label}</button>`;
    }).join("");
    els.suggestions._locations = data.map(normalizeLocation);
  } catch {
    els.suggestions.innerHTML = "";
  }
}, 250);

function bindEvents() {
  els.navToggle.addEventListener("click", () => {
    const open = els.siteNav.classList.toggle("open");
    els.navToggle.setAttribute("aria-expanded", String(open));
  });

  els.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    write("theme", state.theme);
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = els.input.value.trim();
    if (query) await handleSearch(query);
  });

  els.input.addEventListener("input", suggest);
  els.suggestions.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-suggestion]");
    if (!button) return;
    const location = els.suggestions._locations[Number(button.dataset.suggestion)];
    els.suggestions.innerHTML = "";
    els.input.value = location.label;
    await loadLocation(location);
  });

  els.geo.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not available in this browser. Search for a location instead.", "error");
      return;
    }
    setStatus("Requesting your location...");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude: lat, longitude: lon } = position.coords;
      try {
        const { data } = await reverseLocation(lat, lon);
        const location = data[0] ? normalizeLocation(data[0]) : { name: "Current Location", country: "", lat, lon, label: "Current Location" };
        await loadLocation({ ...location, lat, lon }, { message: "Loading weather for your current location..." });
      } catch {
        await loadLocation({ name: "Current Location", country: "", lat, lon, label: "Current Location" });
      }
    }, () => {
      setStatus("Location permission was denied. You can still search for any city manually.", "error");
    }, { enableHighAccuracy: false, timeout: 10000 });
  });

  els.favorite.addEventListener("click", () => {
    const exists = state.favorites.some((item) => item.lat === state.location.lat && item.lon === state.location.lon);
    state.favorites = exists
      ? state.favorites.filter((item) => item.lat !== state.location.lat || item.lon !== state.location.lon)
      : [state.location, ...state.favorites].slice(0, 8);
    write("favorites", state.favorites);
    renderLocations();
    updateFavoriteButton();
  });

  els.refresh.addEventListener("click", () => loadLocation(state.location, { force: true, message: "Refreshing live weather..." }));

  els.unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.unit = button.dataset.unit;
      write("unit", state.unit);
      updateUnitButtons();
      if (state.bundle) renderAll();
    });
  });

  document.querySelector("#locations").addEventListener("click", async (event) => {
    const loadButton = event.target.closest("[data-load]");
    const removeButton = event.target.closest("[data-remove]");
    if (loadButton) {
      const list = loadButton.dataset.list === "favorites" ? state.favorites : state.recent;
      await loadLocation(list[Number(loadButton.dataset.load)]);
    }
    if (removeButton) {
      state.favorites.splice(Number(removeButton.dataset.remove), 1);
      write("favorites", state.favorites);
      renderLocations();
      updateFavoriteButton();
    }
  });

  els.clearRecent.addEventListener("click", () => {
    state.recent = [];
    write("recent", []);
    renderLocations();
  });
}

function updateUnitButtons() {
  els.unitButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.unit === state.unit);
  });
}

function init() {
  document.documentElement.dataset.theme = state.theme;
  els.copyright.textContent = new Date().getFullYear();
  updateUnitButtons();
  renderLocations();
  bindEvents();
  loadLocation(state.location);
}

init();
