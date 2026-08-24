import { CountyStatus, RegionKey } from '../src/types';
import { parseStringPromise } from 'xml2js';

export const TAIWAN_COUNTIES_BASE: Array<{
  id: string;
  cityName: string;
  aliases: string[];
  region: RegionKey;
  regionName: string;
}> = [
  // 北部
  { id: 'keelung', cityName: '基隆市', aliases: ['基隆', 'keelung'], region: 'north', regionName: '北部地區' },
  { id: 'taipei', cityName: '臺北市', aliases: ['台北市', '台北', '臺北', 'taipei'], region: 'north', regionName: '北部地區' },
  { id: 'newtaipei', cityName: '新北市', aliases: ['新北', 'newtaipei'], region: 'north', regionName: '北部地區' },
  { id: 'taoyuan', cityName: '桃園市', aliases: ['桃園', 'taoyuan'], region: 'north', regionName: '北部地區' },
  { id: 'hsinchu_city', cityName: '新竹市', aliases: ['新竹市', 'hsinchu city'], region: 'north', regionName: '北部地區' },
  { id: 'hsinchu_county', cityName: '新竹縣', aliases: ['新竹縣', 'hsinchu county', '竹縣'], region: 'north', regionName: '北部地區' },
  { id: 'yilan', cityName: '宜蘭縣', aliases: ['宜蘭市', '宜蘭', 'yilan'], region: 'north', regionName: '北部地區' },

  // 中部
  { id: 'miaoli', cityName: '苗栗縣', aliases: ['苗栗', 'miaoli'], region: 'central', regionName: '中部地區' },
  { id: 'taichung', cityName: '臺中市', aliases: ['台中市', '台中', '臺中', 'taichung'], region: 'central', regionName: '中部地區' },
  { id: 'changhua', cityName: '彰化縣', aliases: ['彰化', 'changhua'], region: 'central', regionName: '中部地區' },
  { id: 'nantou', cityName: '南投縣', aliases: ['南投', 'nantou'], region: 'central', regionName: '中部地區' },
  { id: 'yunlin', cityName: '雲林縣', aliases: ['雲林', 'yunlin'], region: 'central', regionName: '中部地區' },

  // 南部
  { id: 'chiayi_city', cityName: '嘉義市', aliases: ['嘉義市', 'chiayi city'], region: 'south', regionName: '南部地區' },
  { id: 'chiayi_county', cityName: '嘉義縣', aliases: ['嘉義縣', 'chiayi county', '嘉縣'], region: 'south', regionName: '南部地區' },
  { id: 'tainan', cityName: '臺南市', aliases: ['台南市', '台南', '臺南', 'tainan'], region: 'south', regionName: '南部地區' },
  { id: 'kaohsiung', cityName: '高雄市', aliases: ['高雄', 'kaohsiung'], region: 'south', regionName: '南部地區' },
  { id: 'pingtung', cityName: '屏東縣', aliases: ['屏東', 'pingtung'], region: 'south', regionName: '南部地區' },

  // 東部
  { id: 'hualien', cityName: '花蓮縣', aliases: ['花蓮', 'hualien'], region: 'east', regionName: '東部地區' },
  { id: 'taitung', cityName: '臺東縣', aliases: ['台東市', '台東', '臺東', 'taitung'], region: 'east', regionName: '東部地區' },

  // 離島
  { id: 'penghu', cityName: '澎湖縣', aliases: ['澎湖', 'penghu'], region: 'islands', regionName: '離島地區' },
  { id: 'kinmen', cityName: '金門縣', aliases: ['金門', 'kinmen'], region: 'islands', regionName: '離島地區' },
  { id: 'lienchiang', cityName: '連江縣', aliases: ['連江', '馬祖', 'lienchiang', 'matsu'], region: 'islands', regionName: '離島地區' },
];

export function getDefaultCounties(): CountyStatus[] {
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  return TAIWAN_COUNTIES_BASE.map(item => ({
    id: item.id,
    cityName: item.cityName,
    aliases: item.aliases,
    region: item.region,
    regionName: item.regionName,
    status: '照常上班、照常上課。',
    isSuspended: false,
    isPartial: false,
    updateTime: nowStr,
    source: '行政院人事行政總處 (DGPA) 資料集 20457',
  }));
}

export function parseStatusText(statusStr: string): { isSuspended: boolean; isPartial: boolean; cleanStatus: string } {
  const trimmed = (statusStr || '').trim();
  if (!trimmed) {
    return { isSuspended: false, isPartial: false, cleanStatus: '照常上班、照常上課。' };
  }

  // Check for partial stoppage
  const isPartial = /部分|局部|個別|下午|上午|晚上|特定|山區|鄉|鎮|村|學校/.test(trimmed) && /停止/.test(trimmed);
  // Check for full stoppage
  const isSuspended = /停止上班|停止上課|停班|停課/.test(trimmed);

  return {
    isSuspended,
    isPartial,
    cleanStatus: trimmed,
  };
}

export function matchCityName(query: string): string | null {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, '');
  for (const base of TAIWAN_COUNTIES_BASE) {
    if (base.cityName === normalized || base.cityName.replace('臺', '台') === normalized) {
      return base.cityName;
    }
    for (const alias of base.aliases) {
      if (alias.toLowerCase() === normalized || normalized.includes(alias.toLowerCase())) {
        return base.cityName;
      }
    }
  }
  return null;
}

/**
 * Fetch live data from DGPA Open Data dataset 20457
 * URL: https://www.dgpa.gov.tw/opendata/typhoon/ndwork.xml or .json
 */
export async function fetchDgpaOpenData(): Promise<{ counties: CountyStatus[]; raw: string; isLive: boolean }> {
  const xmlUrl = 'https://www.dgpa.gov.tw/opendata/typhoon/ndwork.xml';
  const jsonUrl = 'https://www.dgpa.gov.tw/opendata/typhoon/ndwork.json';
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  // Try JSON first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(jsonUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 LINE-Closure-Alert-Bot/1.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawStr = JSON.stringify(data);
      const countyMap = new Map<string, { status: string; updateTime?: string; details?: string }>();

      const items = Array.isArray(data) ? data : data?.records || data?.dataset || [];
      for (const item of items) {
        const city = item.CityName || item.city || item.location || '';
        const status = item.Status || item.status || item.description || '';
        const updateTime = item.UpdateTime || item.update_time || nowStr;
        if (city && status) {
          countyMap.set(city, { status, updateTime, details: item.Remark || item.remark });
        }
      }

      if (countyMap.size > 0) {
        const parsed = TAIWAN_COUNTIES_BASE.map(base => {
          const matchedKey = Array.from(countyMap.keys()).find(k => k.includes(base.cityName) || k.includes(base.cityName.replace('臺', '台')));
          const entry = matchedKey ? countyMap.get(matchedKey) : null;
          const statusText = entry?.status || '照常上班、照常上課。';
          const { isSuspended, isPartial, cleanStatus } = parseStatusText(statusText);

          return {
            id: base.id,
            cityName: base.cityName,
            aliases: base.aliases,
            region: base.region,
            regionName: base.regionName,
            status: cleanStatus,
            isSuspended,
            isPartial,
            updateTime: entry?.updateTime || nowStr,
            details: entry?.details,
            source: '行政院人事行政總處 (DGPA) JSON',
          };
        });
        return { counties: parsed, raw: rawStr.slice(0, 1000), isLive: true };
      }
    }
  } catch {
    // try XML next
  }

  // Try XML
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(xmlUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 LINE-Closure-Alert-Bot/1.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const xmlText = await res.text();
      const parsedXml = await parseStringPromise(xmlText, { explicitArray: false });
      const tables = parsedXml?.WorkSchool?.Table || parsedXml?.DataSet?.Table || [];
      const tableList = Array.isArray(tables) ? tables : [tables];

      const countyMap = new Map<string, string>();
      for (const t of tableList) {
        const city = t.CityName || t.city || '';
        const status = t.Status || t.status || '';
        if (city) {
          countyMap.set(city, status);
        }
      }

      const parsed = TAIWAN_COUNTIES_BASE.map(base => {
        const matchedKey = Array.from(countyMap.keys()).find(k => k.includes(base.cityName) || k.includes(base.cityName.replace('臺', '台')));
        const statusText = (matchedKey ? countyMap.get(matchedKey) : '') || '照常上班、照常上課。';
        const { isSuspended, isPartial, cleanStatus } = parseStatusText(statusText);

        return {
          id: base.id,
          cityName: base.cityName,
          aliases: base.aliases,
          region: base.region,
          regionName: base.regionName,
          status: cleanStatus,
          isSuspended,
          isPartial,
          updateTime: nowStr,
          source: '行政院人事行政總處 (DGPA) XML',
        };
      });

      return { counties: parsed, raw: xmlText.slice(0, 1000), isLive: true };
    }
  } catch {
    // fallback to default
  }

  return {
    counties: getDefaultCounties(),
    raw: 'DGPA 即時連線備援中（現行全台各縣市照常上班上課）',
    isLive: false,
  };
}
