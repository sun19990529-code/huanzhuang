// ====================================================================
// SmartWardrobe 实时天气服务 (含 GPS 定位、无锡默认兜底与离线缓存)
// ====================================================================

export interface WeatherInfo {
 weatherTag: string;
 tempC: number;
 condition: string;
 city: string;
 icon: string;
 isCached?: boolean;
}

const CACHE_KEY = 'sw_cached_weather';
const WUXI_COORDS = { latitude: 31.4912, longitude: 120.3119, cityName: '无锡' };

function parseWmoWeatherCode(code: number, temp: number): { tag: string; condition: string; icon: string } {
 let cond = 'CLEAR';
 let icon = '️';
 let desc = '晴朗';

 if (code === 0) {
 desc = '晴朗';
 icon = '️';
 cond = 'CLEAR';
 } else if (code >= 1 && code <= 3) {
 desc = '多云';
 icon = '';
 cond = 'CLOUDY';
 } else if (code >= 45 && code <= 48) {
 desc = '雾气';
 icon = '️';
 cond = 'CLOUDY';
 } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
 desc = '阵雨';
 icon = '️';
 cond = 'RAINY';
 } else if (code >= 71 && code <= 77) {
 desc = '小雪';
 icon = '️';
 cond = 'SNOWY';
 } else if (code >= 95) {
 desc = '雷雨';
 icon = '️';
 cond = 'RAINY';
 }

 return {
 tag: `${desc} ${Math.round(temp)}°C`,
 condition: cond,
 icon,
 };
}

async function fetchOpenMeteoWeather(lat: number, lon: number, cityName: string): Promise<WeatherInfo> {
 const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
 const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
 if (!res.ok) throw new Error(`Weather API Error: ${res.status}`);
 const data = await res.json();
 const current = data.current;
 const tempC = current.temperature_2m;
 const code = current.weather_code;
 const parsed = parseWmoWeatherCode(code, tempC);

 const weather: WeatherInfo = {
 weatherTag: `${cityName} ${parsed.tag}`,
 tempC: Math.round(tempC),
 condition: parsed.condition,
 city: cityName,
 icon: parsed.icon,
 isCached: false,
 };

 try {
 localStorage.setItem(CACHE_KEY, JSON.stringify(weather));
 } catch (e) {
 // ignore
 }

 return weather;
}

export function getCachedWeather(): WeatherInfo {
 try {
 const raw = localStorage.getItem(CACHE_KEY);
 if (raw) {
 const cached = JSON.parse(raw);
 return { ...cached, isCached: true };
 }
 } catch {
 // ignore
 }
 return {
 weatherTag: '无锡 晴朗 24°C',
 tempC: 24,
 condition: 'CLEAR',
 city: '无锡',
 icon: '️',
 isCached: true,
 };
}

export async function getSmartWeather(): Promise<WeatherInfo> {
 if (typeof navigator === 'undefined') {
 return getCachedWeather();
 }

 if (typeof navigator.onLine === 'boolean' && !navigator.onLine) {
 console.log('[WeatherService] 离线状态，自动装载本地最后一次缓存天气');
 return getCachedWeather();
 }

 return new Promise((resolve) => {
 if (!navigator.geolocation) {
 fetchOpenMeteoWeather(WUXI_COORDS.latitude, WUXI_COORDS.longitude, '无锡')
 .then(resolve)
 .catch(() => resolve(getCachedWeather()));
 return;
 }

 navigator.geolocation.getCurrentPosition(
 async (pos) => {
 try {
 const lat = Number(pos.coords.latitude.toFixed(4));
 const lon = Number(pos.coords.longitude.toFixed(4));
 const weather = await fetchOpenMeteoWeather(lat, lon, '本地');
 resolve(weather);
 } catch (err) {
 console.warn('[WeatherService] 远程天气获取失败，回退至无锡天气:', err);
 fetchOpenMeteoWeather(WUXI_COORDS.latitude, WUXI_COORDS.longitude, '无锡')
 .then(resolve)
 .catch(() => resolve(getCachedWeather()));
 }
 },
 async (err) => {
 console.log(`[WeatherService] 用户未授权定位 (${err.message})，默认获取【无锡】实时天气`);
 try {
 const weather = await fetchOpenMeteoWeather(WUXI_COORDS.latitude, WUXI_COORDS.longitude, '无锡');
 resolve(weather);
 } catch (fetchErr) {
 console.warn('[WeatherService] 无锡天气获取失败，加载本地离线缓存:', fetchErr);
 resolve(getCachedWeather());
 }
 },
 { timeout: 3500, enableHighAccuracy: false }
 );
 });
}
