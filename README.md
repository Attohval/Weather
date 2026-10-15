# Aurora Weather

A modern responsive weather dashboard powered by OpenWeather.

## Setup

1. Create a `.env` file or set the environment variable in your shell:

   ```powershell
   $env:OPENWEATHER_API_KEY="your_openweather_api_key_here"
   ```

2. Start the app:

   ```powershell
   node server/index.js
   ```

3. Open `http://localhost:3000`.

The API key is used only by the Node server in `server/index.js`. The browser calls local `/api/*` routes, so the key is not hardcoded into frontend source.

## Publishing With GitHub Pages

GitHub Pages can host the frontend, but it cannot run the Node API proxy. Use this setup:

1. Deploy this repo's backend to a service that runs Node, such as Render, Railway, Fly.io, or a VPS.
2. On that backend host, set these environment variables:

   ```text
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   ALLOWED_ORIGIN=https://your-github-username.github.io
   PORT=3000
   ```

   Some hosts provide `PORT` automatically. If they do, use their default.

3. After the backend is live, edit `public/config.js`:

   ```js
   window.AURORA_WEATHER_CONFIG = {
     API_BASE_URL: "https://your-weather-api-host.example.com"
   };
   ```

4. Push the project to GitHub and enable GitHub Pages for the `public` folder if your Pages settings support it. If not, publish the contents of `public` from a `gh-pages` branch.

The OpenWeather key must stay only on the backend host. `public/config.js` should contain only the public backend URL, not the OpenWeather key.

## Features

- Location search with OpenWeather geocoding
- Current location via browser geolocation
- Current conditions, hourly forecast, 5-day forecast, precipitation, wind, sunrise/sunset, and air quality
- Local favorites and recent searches
- Celsius/Fahrenheit and km/h/mph unit toggle
- Dark/light theme with saved preferences
- Short-lived client and server caching
- Friendly loading and error states
