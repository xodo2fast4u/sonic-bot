import { emoji as e } from '../../config/config.js';

export default {
  cmd: ['weather'],
  desc: 'Get current weather and forecast for a location',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide a location.\nExample: !weather New York`);
      return;
    }

    const location = args.join(' ');

    try {
      const res = await fetch(`http://wttr.in/${encodeURIComponent(location)}?format=j1`);

      if (!res.ok) {
        await text(`${e.cross} Failed to fetch weather data.`);
        return;
      }

      const data = await res.json();

      if (!data?.current_condition?.[0]) {
        await text(`${e.cross} Could not find weather data for *${location}*.`);
        return;
      }

      const c = data.current_condition[0];
      const today = data.weather?.[0];
      const tomorrow = data.weather?.[1];
      const astronomy = today?.astronomy?.[0] || {};
      const hourly = today?.hourly?.[4] || {};

      const loc = data.nearest_area?.[0]?.areaName?.[0]?.value || location;
      const country = data.nearest_area?.[0]?.country?.[0]?.value || '';

      const forecast = tomorrow?.hourly?.[4]
        ? {
            condition: tomorrow.hourly[4].weatherDesc[0].value,
            min: tomorrow.mintempC,
            max: tomorrow.maxtempC,
            chance: tomorrow.hourly[4].chanceofrain,
          }
        : null;

      const weekday = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      let dayText = 'Unknown';
      let timeStr = 'Unknown';

      const localtime = data.time_zone?.[0]?.localtime || c.localObsDateTime || '';
      if (localtime) {
        const [dateStr, rawTime] = localtime
          .replace(/(AM|PM)$/i, '')
          .trim()
          .split(' ');
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, mo, d] = dateStr.split('-').map(Number);
          dayText = weekday[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
        }
        if (rawTime) timeStr = rawTime;
      }

      const msg = `
🌍 *Weather in ${loc}${country ? `, ${country}` : ''}*
🗓️ ${dayText} | 🕒 ${timeStr}

🌤️ Condition: ${c.weatherDesc[0].value}
🌡️ Temp: ${c.temp_C}°C / ${c.temp_F}°F
🥵 Feels Like: ${c.FeelsLikeC}°C / ${c.FeelsLikeF}°F
💧 Humidity: ${c.humidity}%
💨 Wind: ${c.windspeedKmph} km/h (${c.winddir16Point})
🌬️ Wind Gusts: ${hourly.WindGustKmph || 'N/A'} km/h
☁️ Cloud Cover: ${c.cloudcover}%
👁️ Visibility: ${c.visibility} km
📈 Pressure: ${c.pressure} MB
🔆 UV Index: ${c.uvIndex}
🌡️ Today Min/Max: ${today?.mintempC ?? 'N/A'}°C / ${today?.maxtempC ?? 'N/A'}°C
🌅 Sunrise: ${astronomy.sunrise || 'N/A'} | 🌇 Sunset: ${astronomy.sunset || 'N/A'}
🌙 Moon: ${astronomy.moon_phase || 'N/A'} (${astronomy.moon_illumination || 'N/A'}%)
🌧️ Rain Chance: ${hourly.chanceofrain || 'N/A'}%
❄️ Snow Chance: ${hourly.chanceofsnow || 'N/A'}%
⛈️ Thunder Chance: ${hourly.chanceofthunder || 'N/A'}%

📅 *Tomorrow's Forecast*
🌡️ Min/Max: ${forecast?.min ?? 'N/A'}°C / ${forecast?.max ?? 'N/A'}°C
🌥️ Condition: ${forecast?.condition ?? 'N/A'}
🌧️ Rain Chance: ${forecast?.chance ?? 'N/A'}%
      `.trim();

      await text(msg);
    } catch (err) {
      await text(`${e.cross} Error fetching weather data: ${err.message}`);
    }
  },
};
