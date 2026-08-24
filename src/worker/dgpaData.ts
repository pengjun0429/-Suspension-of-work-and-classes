import type { CountyStatus, RegionKey } from '../types';

export const TAIWAN_COUNTIES_BASE = [
  { id: 'keelung', cityName: '基隆市', aliases: ['基隆', 'keelung'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'taipei', cityName: '臺北市', aliases: ['台北市', '台北', '臺北', 'taipei'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'newtaipei', cityName: '新北市', aliases: ['新北', 'newtaipei'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'taoyuan', cityName: '桃園市', aliases: ['桃園', 'taoyuan'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'hsinchu_city', cityName: '新竹市', aliases: ['新竹市', 'hsinchu city'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'hsinchu_county', cityName: '新竹縣', aliases: ['新竹縣', 'hsinchu county', '竹縣'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'yilan', cityName: '宜蘭縣', aliases: ['宜蘭市', '宜蘭', 'yilan'], region: 'north' as RegionKey, regionName: '北部地區' },
  { id: 'miaoli', cityName: '苗栗縣', aliases: ['苗栗', 'miaoli'], region: 'central' as RegionKey, regionName: '中部地區' },
  { id: 'taichung', cityName: '臺中市', aliases: ['台中市', '台中', '臺中', 'taichung'], region: 'central' as RegionKey, regionName: '中部地區' },
  { id: 'changhua', cityName: '彰化縣', aliases: ['彰化', 'changhua'], region: 'central' as RegionKey, regionName: '中部地區' },
  { id: 'nantou', cityName: '南投縣', aliases: ['南投', 'nantou'], region: 'central' as RegionKey, regionName: '中部地區' },
  { id: 'yunlin', cityName: '雲林縣', aliases: ['雲林', 'yunlin'], region: 'central' as RegionKey, regionName: '中部地區' },
  { id: 'chiayi_city', cityName: '嘉義市', aliases: ['嘉義市', 'chiayi city'], region: 'south' as RegionKey, regionName: '南部地區' },
  { id: 'chiayi_county', cityName: '嘉義縣', aliases: ['嘉義縣', 'chiayi county', '嘉縣'], region: 'south' as RegionKey, regionName: '南部地區' },
  { id: 'tainan', cityName: '臺南市', aliases: ['台南市', '台南', '臺南', 'tainan'], region: 'south' as RegionKey, regionName: '南部地區' },
  { id: 'kaohsiung', cityName: '高雄市', aliases: ['高雄', 'kaohsiung'], region: 'south' as RegionKey, regionName: '南部地區' },
  { id: 'pingtung', cityName: '屏東縣', aliases: ['屏東', 'pingtung'], region: 'south' as RegionKey, regionName: '南部地區' },
  { id: 'hualien', cityName: '花蓮縣', aliases: ['花蓮', 'hualien'], region: 'east' as RegionKey, regionName: '東部地區' },
  { id: 'taitung', cityName: '臺東縣', aliases: ['台東市', '台東', '臺東', 'taitung'], region: 'east' as RegionKey, regionName: '東部地區' },
  { id: 'penghu', cityName: '澎湖縣', aliases: ['澎湖', 'penghu'], region: 'islands' as RegionKey, regionName: '離島地區' },
  { id: 'kinmen', cityName: '金門縣', aliases: ['金門', 'kinmen'], region: 'islands' as RegionKey, regionName: '離島地區' },
  { id: 'lienchiang', cityName: '連江縣', aliases: ['連江', '馬祖', 'lienchiang', 'matsu'], region: 'islands' as RegionKey, regionName: '離島地區' },
];

export function parseStatusText(statusStr: string): { isSuspended: boolean; isPartial: boolean; cleanStatus: string } {
  const trimmed = (statusStr || '').trim();
  if (!trimmed) {
    return { isSuspended: false, isPartial: false, cleanStatus: '照常上班、照常上課。' };
  }

  const isPartial = /部分|局部|個別|下午|上午|晚上|特定|山區|鄉|鎮|村|學校/.test(trimmed) && /停止/.test(trimmed);
  const isSuspended = /停止上班|停止上課|停班|停課/.test(trimmed);

  return { isSuspended, isPartial, cleanStatus: trimmed };
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

// City name patterns for matching in RSS feed (繁體中文)
const CITY_PATTERNS: Record<string, string[]> = {
  '基隆市': ['基隆市', '基隆'],
  '臺北市': ['臺北市', '台北市', '臺北', '台北'],
  '新北市': ['新北市', '新北'],
  '桃園市': ['桃園市', '桃園'],
  '新竹市': ['新竹市'],
  '新竹縣': ['新竹縣', '竹縣'],
  '宜蘭縣': ['宜蘭縣', '宜蘭市', '宜蘭'],
  '苗栗縣': ['苗栗縣', '苗栗'],
  '臺中市': ['臺中市', '台中市', '臺中', '台中'],
  '彰化縣': ['彰化縣', '彰化'],
  '南投縣': ['南投縣', '南投'],
  '雲林縣': ['雲林縣', '雲林'],
  '嘉義市': ['嘉義市'],
  '嘉義縣': ['嘉義縣', '嘉縣'],
  '臺南市': ['臺南市', '台南市', '臺南', '台南'],
  '高雄市': ['高雄市', '高雄'],
  '屏東縣': ['屏東縣', '屏東'],
  '花蓮縣': ['花蓮縣', '花蓮'],
  '臺東縣': ['臺東縣', '臺東市', '臺東', '台東'],
  '澎湖縣': ['澎湖縣', '澎湖'],
  '金門縣': ['金門縣', '金門'],
  '連江縣': ['連江縣', '馬祖'],
};

// Parse NCDR RSS/Atom feed for work/school closure data
function parseNcdrRss(xmlText: string): Map<string, { status: string; updateTime: string; details: string }> {
  const countyMap = new Map<string, { status: string; updateTime: string; details: string }>();
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  // Extract entries using regex
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
    const entryContent = entryMatch[1];

    // Extract summary (contains city and status info)
    const summaryMatch = entryContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const updatedMatch = entryContent.match(/<updated>([\s\S]*?)<\/updated>/);

    if (summaryMatch) {
      const summary = summaryMatch[1]
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"');

      const updateTime = updatedMatch ? updatedMatch[1] : nowStr;

      // Try to match city names in the summary
      for (const [cityName, patterns] of Object.entries(CITY_PATTERNS)) {
        for (const pattern of patterns) {
          if (summary.includes(pattern)) {
            // Extract status - look for 停止上班 or 停止上課
            let status = '照常上班、照常上課。';
            if (summary.includes('停止上班') && summary.includes('停止上課')) {
              status = '今日停止上班、停止上課。';
            } else if (summary.includes('停止上班')) {
              status = '今日停止上班。';
            } else if (summary.includes('停止上課')) {
              status = '今日停止上課。';
            } else if (summary.includes('照常上班') && summary.includes('照常上課')) {
              status = '照常上班、照常上課。';
            }

            countyMap.set(cityName, {
              status,
              updateTime,
              details: summary,
            });
            break;
          }
        }
      }
    }
  }

  return countyMap;
}

export async function fetchDgpaOpenData(): Promise<{ counties: CountyStatus[]; raw: string; isLive: boolean }> {
  const rssUrl = 'https://alerts.ncdr.nat.gov.tw/RssAtomFeed.ashx?AlertType=33';
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  // Try NCDR RSS feed first (most reliable for current data)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 LINE-Closure-Alert-Bot/1.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const xmlText = await res.text();
      const countyMap = parseNcdrRss(xmlText);

      if (countyMap.size > 0) {
        const parsed = TAIWAN_COUNTIES_BASE.map(base => {
          const entry = countyMap.get(base.cityName);
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
            source: 'NCDR 災害防救科技中心 RSS',
          };
        });
        return { counties: parsed, raw: xmlText.slice(0, 2000), isLive: true };
      }
    }
  } catch {
    // Try original DGPA endpoint
  }

  // Fallback to original DGPA JSON
  const jsonUrl = 'https://www.dgpa.gov.tw/opendata/typhoon/ndwork.json';
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
    // fallback to default
  }

  return {
    counties: getDefaultCounties(),
    raw: 'DGPA 即時連線備援中（現行全台各縣市照常上班上課）',
    isLive: false,
  };
}

function getDefaultCounties(): CountyStatus[] {
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
