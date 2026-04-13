import { useState, useEffect } from 'react';

// ── WMO Weather Interpretation Codes ─────────────────────────────────────────
// https://open-meteo.com/en/docs#weathervariables
const WMO: Record<number, { label: string; emoji: string; intensity: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' }> = {
  0:  { label: 'Clear',           emoji: '☀️',  intensity: 'clear'  },
  1:  { label: 'Mostly Clear',    emoji: '🌤️',  intensity: 'clear'  },
  2:  { label: 'Partly Cloudy',   emoji: '⛅',  intensity: 'cloudy' },
  3:  { label: 'Overcast',        emoji: '☁️',  intensity: 'cloudy' },
  45: { label: 'Foggy',           emoji: '🌫️',  intensity: 'fog'    },
  48: { label: 'Icy Fog',         emoji: '🌫️',  intensity: 'fog'    },
  51: { label: 'Light Drizzle',   emoji: '🌦️',  intensity: 'rain'   },
  53: { label: 'Drizzle',         emoji: '🌦️',  intensity: 'rain'   },
  55: { label: 'Heavy Drizzle',   emoji: '🌧️',  intensity: 'rain'   },
  61: { label: 'Light Rain',      emoji: '🌧️',  intensity: 'rain'   },
  63: { label: 'Rain',            emoji: '🌧️',  intensity: 'rain'   },
  65: { label: 'Heavy Rain',      emoji: '🌧️',  intensity: 'rain'   },
  71: { label: 'Light Snow',      emoji: '🌨️',  intensity: 'snow'   },
  73: { label: 'Snow',            emoji: '❄️',  intensity: 'snow'   },
  75: { label: 'Heavy Snow',      emoji: '❄️',  intensity: 'snow'   },
  77: { label: 'Snow Grains',     emoji: '🌨️',  intensity: 'snow'   },
  80: { label: 'Rain Showers',    emoji: '🌦️',  intensity: 'rain'   },
  81: { label: 'Rain Showers',    emoji: '🌧️',  intensity: 'rain'   },
  82: { label: 'Violent Showers', emoji: '🌧️',  intensity: 'rain'   },
  85: { label: 'Snow Showers',    emoji: '🌨️',  intensity: 'snow'   },
  86: { label: 'Heavy Snow',      emoji: '❄️',  intensity: 'snow'   },
  95: { label: 'Thunderstorm',    emoji: '⛈️',  intensity: 'storm'  },
  96: { label: 'Thunderstorm',    emoji: '⛈️',  intensity: 'storm'  },
  99: { label: 'Thunderstorm',    emoji: '⛈️',  intensity: 'storm'  },
};

export interface WeatherData {
  tempC: number;
  label: string;
  emoji: string;
  windKmh: number;
  intensity: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
}

export function useWeather(coords: [number, number] | null): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;

    const [lat, lon] = coords;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=temperature_2m,weather_code,wind_speed_10m` +
      `&wind_speed_unit=kmh&forecast_days=1`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const cur = data?.current;
        if (!cur) return;
        const code = cur.weather_code ?? 0;
        const info = WMO[code] ?? { label: 'Unknown', emoji: '🌡️', intensity: 'clear' as const };
        setWeather({
          tempC:    Math.round(cur.temperature_2m ?? 0),
          label:    info.label,
          emoji:    info.emoji,
          windKmh:  Math.round(cur.wind_speed_10m ?? 0),
          intensity: info.intensity,
        });
      })
      .catch(() => { /* silently ignore — weather is optional */ });

    return () => { cancelled = true; };
  }, [coords?.[0], coords?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return weather;
}
