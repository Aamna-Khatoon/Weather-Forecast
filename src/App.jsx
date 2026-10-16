
import { useEffect, useState } from "react";
import {
  Sun, Cloud, CloudSun, CloudRain, CloudSnow,
  CloudLightning, CloudFog, Wind, Droplets,
  Eye, Gauge, Sunrise, Sunset, Search, MapPin,
  Moon, SunMedium, RefreshCw, Thermometer,
  Navigation, CalendarDays
} from "lucide-react";
import "./App.css";

const DEFAULT_CITY = "Biratnagar";

function weatherInfo(code, isDay = true) {
  if (code === 0) return {
    label: "Clear sky", Icon: isDay ? Sun : Moon
  };
  if (code <= 2) return {
    label: "Partly cloudy", Icon: CloudSun
  };
  if (code === 3) return {
    label: "Overcast", Icon: Cloud
  };
  if ([45, 48].includes(code)) return {
    label: "Foggy", Icon: CloudFog
  };
  if ([51, 53, 55, 56, 57].includes(code)) return {
    label: "Drizzle", Icon: CloudRain
  };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: "Rain", Icon: CloudRain };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "Snow", Icon: CloudSnow };
  }
  if ([95, 96, 99].includes(code)) {
    return { label: "Thunderstorm", Icon: CloudLightning };
  }
  return { label: "Cloudy", Icon: Cloud };
}

function formatDay(date, options = { weekday: "short" }) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "en-US", options
  );
}

function App() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [search, setSearch] = useState("");
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [unit, setUnit] = useState("C");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(["Kathmandu", "Delhi"]);
  const [activeDay, setActiveDay] = useState(0);
  const [dark, setDark] = useState(true);

  async function loadCity(cityName) {
    if (!cityName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`
      );

      if (!geoResponse.ok) throw new Error("Unable to search for city.");

      const geoData = await geoResponse.json();
      const match = geoData.results?.find(
        item => item.feature_code?.startsWith("P")
      ) || geoData.results?.[0];

      if (!match) throw new Error("City not found. Try another name.");

      const params = new URLSearchParams({
        latitude: match.latitude,
        longitude: match.longitude,
        timezone: "auto",
        forecast_days: "5",
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "is_day",
          "precipitation",
          "weather_code",
          "wind_speed_10m",
          "wind_direction_10m",
          "surface_pressure"
        ].join(","),
        hourly: [
          "temperature_2m",
          "precipitation_probability",
          "weather_code"
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "sunrise",
          "sunset",
          "uv_index_max",
          "precipitation_probability_max"
        ].join(",")
      });

     const response = await fetch(
  `https://api.open-meteo.com/v1/forecast?${params}`
);


      if (!response.ok) throw new Error("Unable to retrieve weather.");

      const data = await response.json();

      setPlace({
        name: match.name,
        country: match.country || "",
        admin: match.admin1 || "",
        latitude: match.latitude,
        longitude: match.longitude,
        timezone: data.timezone
      });

      setWeather(data);
      setCity(match.name);
      setSearch("");
      setActiveDay(0);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCity(DEFAULT_CITY);
  }, []);

  function toggleFavorite() {
    setFavorites(previous =>
      previous.includes(city)
        ? previous.filter(item => item !== city)
        : [...previous, city]
    );
  }

  function convert(temp) {
    if (temp == null) return "--";
    return Math.round(unit === "F" ? temp * 9 / 5 + 32 : temp);
  }

  function getWindDirection(degrees = 0) {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
      Math.round(degrees / 45) % 8
    ];
  }

  function getLocalHour(dateString) {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      timeZone: place?.timezone || "UTC"
    });
  }

  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;
  const currentInfo = current
    ? weatherInfo(current.weather_code, current.is_day === 1)
    : { label: "Loading", Icon: CloudSun };

  const currentHour = current && hourly
    ? hourly.time.reduce((best, time, index) =>
        Math.abs(new Date(time).getTime() - new Date(current.time).getTime()) <
        Math.abs(new Date(hourly.time[best]).getTime() - new Date(current.time).getTime())
          ? index : best, 0)
    : 0;

  const hourlyItems = hourly
    ? Array.from({ length: 24 }, (_, i) => currentHour + i)
        .filter(i => i < hourly.time.length)
    : [];

  const selectedDate = daily?.time?.[activeDay];

  const selectedHours = hourly && selectedDate
    ? hourly.time.map((time, index) => ({ time, index }))
        .filter(item => item.time.slice(0, 10) === selectedDate)
        .map(item => item.index)
    : [];

  const chartHours = selectedHours.filter((_, i) =>
    i % Math.max(1, Math.ceil(selectedHours.length / 12)) === 0
  );

  const selectedWeather = daily
    ? weatherInfo(daily.weather_code[activeDay])
    : { label: "", Icon: Cloud };

  const maxTemp = daily?.temperature_2m_max?.[activeDay] ?? 0;
  const minTemp = daily?.temperature_2m_min?.[activeDay] ?? 0;
  const allTemps = chartHours.map(i => hourly.temperature_2m[i]);
  const chartMin = Math.min(...allTemps, minTemp);
  const chartMax = Math.max(...allTemps, maxTemp);
  const chartRange = Math.max(1, chartMax - chartMin);

  return (
    <main className={`app ${dark ? "dark" : "light"}`}>
      <aside className="sidebar">
        <a className="brand" href="#top">
          <span className="brand-icon"><Sun size={24} /></span>
          <span>sky<span className="brand-accent">cast</span></span>
        </a>

        <p className="nav-label">MENU</p>
        <a className="nav-item active" href="#top">
          <CloudSun size={19} /> Weather
        </a>
        <a className="nav-item" href="#forecast">
          <CalendarDays size={19} /> Forecast
        </a>
        <a className="nav-item" href="#hourly">
          <Thermometer size={19} /> Temperature
        </a>

        <p className="nav-label favorites-label">FAVORITE CITIES</p>
        <div className="favorite-list">
          {favorites.map(fav => (
            <button
              className={`favorite ${fav === city ? "selected" : ""}`}
              key={fav}
              onClick={() => loadCity(fav)}
            >
              <MapPin size={16} />
              <span>{fav}</span>
              {fav === city && <span className="favorite-dot" />}
            </button>
          ))}
          <button className="add-favorite" onClick={toggleFavorite}>
            {favorites.includes(city) ? "− Remove current city" : "+ Save current city"}
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <SunMedium size={23} />
            <strong>Stay weather-ready</strong>
            <p>Plan your day with the latest forecast.</p>
          </div>
          <button className="theme-button" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            Switch to {dark ? "light" : "dark"} mode
          </button>
          <p className="sidebar-footer">SKYCAST WEATHER · LIVE DATA</p>
        </div>
      </aside>

      <section className="main-content" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL WEATHER STATION</p>
            <h1>Weather Dashboard</h1>
          </div>

          <form
            className="search-box"
            onSubmit={e => {
              e.preventDefault();
              loadCity(search);
            }}
          >
            <Search size={19} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search any city..."
              aria-label="Search city"
            />
            <button type="submit" disabled={loading}>
              {loading ? "..." : "Search"}
            </button>
          </form>
        </header>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => loadCity(city)}>Try again</button>
          </div>
        )}

        {loading && !weather && (
          <div className="loading-banner">Loading weather data...</div>
        )}

        {current && weather && (
          <>
            <section className="hero-card">
              <div className="hero-glow glow-one" />
              <div className="hero-glow glow-two" />

              <div className="hero-top">
                <div>
                  <span className="live-pill">
                    <span className="live-dot" /> LIVE WEATHER
                  </span>
                  <h2><MapPin size={21} /> {place?.name}</h2>
                  <p className="hero-location">
                    {[place?.admin, place?.country].filter(Boolean).join(", ")}
                  </p>
                  <p className="hero-date">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: place?.timezone || "UTC"
                    })}
                  </p>
                </div>

                <div className="unit-toggle">
                  <button
                    className={unit === "C" ? "chosen" : ""}
                    onClick={() => setUnit("C")}
                  >°C</button>
                  <button
                    className={unit === "F" ? "chosen" : ""}
                    onClick={() => setUnit("F")}
                  >°F</button>
                </div>
              </div>

              <div className="hero-weather">
                <div>
                  <p className="temperature">
                    {convert(current.temperature_2m)}<span>°</span>
                  </p>
                  <h3>{currentInfo.label}</h3>
                  <p className="feels-like">
                    Feels like {convert(current.apparent_temperature)}°
                  </p>
                </div>
                <div className="hero-icon">
                  <currentInfo.Icon size={115} strokeWidth={1.25} />
                </div>
              </div>

              <div className="hero-bottom">
                <span><Droplets size={17} /> {current.relative_humidity_2m}% humidity</span>
                <span><Wind size={17} /> {Math.round(current.wind_speed_10m)} km/h wind</span>
                <span><Navigation size={16} style={{
                  transform: `rotate(${current.wind_direction_10m}deg)`
                }} /> {getWindDirection(current.wind_direction_10m)}</span>
                <button className="refresh-button" onClick={() => loadCity(city)}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <p className="eyebrow">AT A GLANCE</p>
                <h2>Today's highlights</h2>
              </div>
            </div>

            <section className="metrics-grid">
              <Metric
                title="Feels Like"
                value={`${convert(current.apparent_temperature)}°`}
                subtitle="Perceived temperature"
                icon={<Thermometer />}
                tone="orange"
              />
              <Metric
                title="Humidity"
                value={`${current.relative_humidity_2m}%`}
                subtitle="Relative humidity"
                icon={<Droplets />}
                tone="blue"
              />
              <Metric
                title="Wind Speed"
                value={`${Math.round(current.wind_speed_10m)}`}
                unit="km/h"
                subtitle={`Direction ${getWindDirection(current.wind_direction_10m)}`}
                icon={<Wind />}
                tone="purple"
              />
              <Metric
                title="UV Index"
                value={daily?.uv_index_max?.[0]?.toFixed(1) ?? "--"}
                subtitle="Today's maximum"
                icon={<SunMedium />}
                tone="yellow"
              />
              <Metric
                title="Pressure"
                value={Math.round(current.surface_pressure)}
                unit="hPa"
                subtitle="Surface pressure"
                icon={<Gauge />}
                tone="green"
              />
              <Metric
                title="Precipitation"
                value={`${current.precipitation}`}
                unit="mm"
                subtitle="Current precipitation"
                icon={<CloudRain />}
                tone="pink"
              />
            </section>

            <section className="content-section" id="forecast">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PLAN AHEAD</p>
                  <h2>5-day forecast</h2>
                </div>
                <span className="section-note">Next 5 days</span>
              </div>

              <div className="forecast-grid">
                {daily.time.map((date, i) => {
                  const info = weatherInfo(daily.weather_code[i]);
                  const Icon = info.Icon;
                  return (
                    <button
                      className={`forecast-card ${activeDay === i ? "forecast-active" : ""}`}
                      key={date}
                      onClick={() => setActiveDay(i)}
                    >
                      <span className="forecast-day">
                        {i === 0 ? "Today" : formatDay(date)}
                      </span>
                      <span className="forecast-date">
                        {formatDay(date, { month: "short", day: "numeric" })}
                      </span>
                      <Icon className="forecast-icon" size={36} strokeWidth={1.5} />
                      <span className="forecast-condition">{info.label}</span>
                      <strong className="forecast-high">
                        {convert(daily.temperature_2m_max[i])}°
                      </strong>
                      <span className="forecast-low">
                        {convert(daily.temperature_2m_min[i])}°
                      </span>
                      <span className="rain-chance">
                        <Droplets size={13} />
                        {daily.precipitation_probability_max?.[i] ?? 0}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="content-section" id="hourly">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TEMPERATURE TRENDS</p>
                  <h2>{activeDay === 0 ? "Today's temperature" : formatDay(selectedDate, { weekday: "long" }) + "'s temperature"}</h2>
                </div>
                <span className="section-note">°{unit}</span>
              </div>

              <div className="chart-card">
                <div className="chart-summary">
                  <div>
                    <span className="chart-label">Expected high</span>
                    <strong>{convert(maxTemp)}°</strong>
                  </div>
                  <div>
                    <span className="chart-label">Expected low</span>
                    <strong>{convert(minTemp)}°</strong>
                  </div>
                  <div>
                    <span className="chart-label">Conditions</span>
                    <strong>{selectedWeather.label}</strong>
                  </div>
                </div>

                <div className="temperature-chart">
                  {chartHours.length > 1 && (
                    <svg viewBox="0 0 600 175" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#79a9ff" stopOpacity=".35" />
                          <stop offset="100%" stopColor="#79a9ff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[35, 80, 125].map(y => (
                        <line key={y} x1="0" y1={y} x2="600" y2={y} className="chart-gridline" />
                      ))}
                      <polygon
                        fill="url(#chartFill)"
                        points={[
                          `0,155`,
                          ...chartHours.map((hourIndex, i) => {
                            const x = i / (chartHours.length - 1) * 600;
                            const y = 145 - (
                              (hourly.temperature_2m[hourIndex] - chartMin) /
                              chartRange
                            ) * 110;
                            return `${x},${y}`;
                          }),
                          `600,155`
                        ].join(" ")}
                      />
                      <polyline
                        fill="none"
                        stroke="#80aaff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chartHours.map((hourIndex, i) => {
                          const x = i / (chartHours.length - 1) * 600;
                          const y = 145 - (
                            (hourly.temperature_2m[hourIndex] - chartMin) /
                            chartRange
                          ) * 110;
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                      {chartHours.map((hourIndex, i) => {
                        const x = i / (chartHours.length - 1) * 600;
                        const y = 145 - (
                          (hourly.temperature_2m[hourIndex] - chartMin) /
                          chartRange
                        ) * 110;
                        return (
                          <circle key={hourIndex} cx={x} cy={y} r="4"
                            fill="#80aaff" stroke="currentColor" strokeWidth="1.5" />
                        );
                      })}
                    </svg>
                  )}
                </div>

                <div className="chart-labels">
                  {chartHours.map(i => (
                    <div key={i}>
                      <span>{getLocalHour(hourly.time[i])}</span>
                      <strong>{convert(hourly.temperature_2m[i])}°</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">UP NEXT</p>
                  <h2>Hourly forecast</h2>
                </div>
              </div>

              <div className="hourly-strip">
                {hourlyItems.slice(0, 12).map(i => {
                  const info = weatherInfo(hourly.weather_code[i]);
                  const Icon = info.Icon;
                  return (
                    <div className="hour-card" key={hourly.time[i]}>
                      <span>{i === currentHour ? "Now" : getLocalHour(hourly.time[i])}</span>
                      <Icon size={25} className="hour-icon" />
                      <strong>{convert(hourly.temperature_2m[i])}°</strong>
                      <small><Droplets size={12} /> {hourly.precipitation_probability[i] ?? 0}%</small>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">DAYLIGHT HOURS</p>
                  <h2>Sunrise & sunset</h2>
                </div>
              </div>
              <div className="sun-grid">
                <div className="sun-card sunrise-card">
                  <div className="sun-icon"><Sunrise size={29} /></div>
                  <div>
                    <span>Sunrise</span>
                    <strong>{daily.sunrise[activeDay]?.slice(11, 16) ?? "--:--"}</strong>
                  </div>
                </div>
                <div className="sun-card sunset-card">
                  <div className="sun-icon"><Sunset size={29} /></div>
                  <div>
                    <span>Sunset</span>
                    <strong>{daily.sunset[activeDay]?.slice(11, 16) ?? "--:--"}</strong>
                  </div>
                </div>
              </div>
            </section>

            <footer className="app-footer">
              <span>© {new Date().getFullYear()} SkyCast Weather</span>
              <span>Weather data powered by Open-Meteo</span>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ title, value, unit, subtitle, icon, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span className="metric-title">{title}</span>
      <div className="metric-value">
        {value} {unit && <span>{unit}</span>}
      </div>
      <span className="metric-subtitle">{subtitle}</span>
    </article>
  );
}

export default App;

