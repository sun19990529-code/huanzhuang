// ====================================================================
// SmartWardrobe 真实气象服务 (含 GPS 定位、全国真实城市库、离线缓存与严格地区校验)
// ====================================================================

export interface WeatherInfo {
  weatherTag: string;
  tempC: number;
  condition: string;
  city: string;
  icon: string;
  isCached?: boolean;
  timestamp?: number;
}

export interface CityCoord {
  name: string;
  latitude: number;
  longitude: number;
}

const CACHE_KEY = 'sw_cached_weather';
const SELECTED_CITY_KEY = 'sw_selected_city';

// 全国主要常用标准城市气象经纬度常数表 (免网络检索直出，秒级响应)
export const POPULAR_CITIES: CityCoord[] = [
  { name: '北京', latitude: 39.9042, longitude: 116.4074 },
  { name: '上海', latitude: 31.2304, longitude: 121.4737 },
  { name: '广州', latitude: 23.1291, longitude: 113.2644 },
  { name: '深圳', latitude: 22.5431, longitude: 114.0579 },
  { name: '杭州', latitude: 30.2741, longitude: 120.1551 },
  { name: '无锡', latitude: 31.4912, longitude: 120.3119 },
  { name: '南京', latitude: 32.0603, longitude: 118.7969 },
  { name: '苏州', latitude: 31.2989, longitude: 120.5853 },
  { name: '成都', latitude: 30.5728, longitude: 104.0668 },
  { name: '重庆', latitude: 29.5630, longitude: 106.5516 },
  { name: '武汉', latitude: 30.5928, longitude: 114.3055 },
  { name: '西安', latitude: 34.3416, longitude: 108.9398 },
  { name: '长沙', latitude: 28.2282, longitude: 112.9388 },
  { name: '青岛', latitude: 36.0671, longitude: 120.3826 },
  { name: '厦门', latitude: 24.4798, longitude: 118.0894 },
  { name: '天津', latitude: 39.0842, longitude: 117.2009 },
  { name: '三亚', latitude: 18.2528, longitude: 109.5119 },
  { name: '昆明', latitude: 24.8801, longitude: 102.8329 },
  { name: '哈尔滨', latitude: 45.8038, longitude: 126.5349 },
  { name: '香港', latitude: 22.3193, longitude: 114.1694 },
];

function parseWmoWeatherCode(code: number, temp: number): { tag: string; condition: string; icon: string } {
  let cond = 'CLEAR';
  let icon = '☀️';
  let desc = '晴朗';

  if (code === 0) {
    desc = '晴朗';
    icon = '☀️';
    cond = 'CLEAR';
  } else if (code >= 1 && code <= 3) {
    desc = code === 1 ? '微云' : code === 2 ? '多云' : '阴天';
    icon = '⛅';
    cond = 'CLOUDY';
  } else if (code >= 45 && code <= 48) {
    desc = '雾霾微风';
    icon = '🌫️';
    cond = 'CLOUDY';
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    desc = code >= 61 ? '中到大雨' : '阵雨';
    icon = '🌧️';
    cond = 'RAINY';
  } else if (code >= 71 && code <= 77) {
    desc = '小雪轻扬';
    icon = '❄️';
    cond = 'SNOWY';
  } else if (code >= 95) {
    desc = '雷雨交加';
    icon = '⛈️';
    cond = 'RAINY';
  }

  return {
    tag: `${desc} ${Math.round(temp)}°C`,
    condition: cond,
    icon,
  };
}

// 通过 Open-Meteo 真实气象台获取经纬度实时气象
async function fetchOpenMeteoWeather(lat: number, lon: number, cityName: string): Promise<WeatherInfo> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
    timestamp: Date.now(),
  };

  // 持久化保存至本地最后一次缓存
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(weather));
  } catch (e) {
    // ignore
  }

  return weather;
}

// 获取最后一次成功请求保存的本地离线缓存
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
    icon: '☀️',
    isCached: true,
    timestamp: Date.now(),
  };
}

// 严谨查找城市坐标：先查本地预设库，未命中则请求标准气象地理逆编码
export async function resolveCityCoordinates(cityInput: string): Promise<CityCoord> {
  const clean = cityInput.trim().replace(/(市|区|县|省)$/, '');
  if (!clean) {
    throw new Error('请输入有效的城市或地区名称');
  }

  // 1. 优先比对预设高频城市
  const matched = POPULAR_CITIES.find(
    (c) => c.name === clean || c.name.includes(clean) || clean.includes(c.name)
  );
  if (matched) return matched;

  // 2. 在线严格地理逆编码校验 (防止用户胡乱输入非法字词)
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    clean
  )}&count=1&language=zh&format=json`;
  
  const geoRes = await fetch(geocodingUrl, { signal: AbortSignal.timeout(5000) });
  if (!geoRes.ok) throw new Error('气象地理逆编码服务暂时不可用');
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`未检索到地区【${cityInput}】的真实气象站点，请检查名称是否规范`);
  }

  const first = geoData.results[0];
  return {
    name: first.name || clean,
    latitude: Number(first.latitude.toFixed(4)),
    longitude: Number(first.longitude.toFixed(4)),
  };
}

// 按指定真实地区获取实时天气
export async function fetchWeatherByCity(cityName: string): Promise<WeatherInfo> {
  // 无网络时强制直接回退至最后一次缓存
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    console.log('[WeatherService] 当前设备离线，自动加载最后一次天气缓存');
    return getCachedWeather();
  }

  try {
    const coord = await resolveCityCoordinates(cityName);
    const info = await fetchOpenMeteoWeather(coord.latitude, coord.longitude, coord.name);
    try {
      localStorage.setItem(SELECTED_CITY_KEY, coord.name);
    } catch {}
    return info;
  } catch (err: any) {
    console.warn(`[WeatherService] 获取地区【${cityName}】天气失败:`, err.message);
    const cached = getCachedWeather();
    // 保留上次缓存的温度与状态，仅标注离线
    return { ...cached, isCached: true };
  }
}

// 获取当前偏好的指定城市
export function getSavedSelectedCity(): string | null {
  try {
    return localStorage.getItem(SELECTED_CITY_KEY);
  } catch {
    return null;
  }
}

// 综合智能获取天气（先读取用户指定地区，否则通过 GPS 定位当地，失败或无网络自动加载最后一次真实缓存）
export async function getSmartWeather(specifiedCity?: string): Promise<WeatherInfo> {
  // 1. 无网络直接安全回退至本地最后一次缓存
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    console.log('[WeatherService] 设备离线，自动读取最后一次真实天气');
    return getCachedWeather();
  }

  // 2. 若用户传入了指定城市，或者本地有之前挑选的偏好城市
  const targetCity = specifiedCity || getSavedSelectedCity();
  if (targetCity && targetCity !== 'LOCAL') {
    return fetchWeatherByCity(targetCity);
  }

  // 3. 尝试 GPS 定位当地
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      fetchWeatherByCity('无锡').then(resolve).catch(() => resolve(getCachedWeather()));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));
          const weather = await fetchOpenMeteoWeather(lat, lon, '本地');
          try {
            localStorage.setItem(SELECTED_CITY_KEY, 'LOCAL');
          } catch {}
          resolve(weather);
        } catch (err) {
          console.warn('[WeatherService] 定位天气获取失败，加载兜底真实天气:', err);
          fetchWeatherByCity('无锡').then(resolve).catch(() => resolve(getCachedWeather()));
        }
      },
      async (err) => {
        console.log(`[WeatherService] 未授权定位 (${err.message})，默认获取【无锡】实时天气`);
        fetchWeatherByCity('无锡').then(resolve).catch(() => resolve(getCachedWeather()));
      },
      { timeout: 4000, enableHighAccuracy: false }
    );
  });
}
