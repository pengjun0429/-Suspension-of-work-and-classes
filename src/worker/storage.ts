import type { CountyStatus, UserSubscription, PushLog, DatasetMeta } from '../types';

const STORAGE_KEY = 'app_state';

interface AppState {
  counties: CountyStatus[];
  subscribers: UserSubscription[];
  logs: PushLog[];
  datasetMeta: DatasetMeta;
}

function getDefaultCounties(): CountyStatus[] {
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const TAIWAN_COUNTIES_BASE = [
    { id: 'keelung', cityName: '基隆市', aliases: ['基隆', 'keelung'], region: 'north' as const, regionName: '北部地區' },
    { id: 'taipei', cityName: '臺北市', aliases: ['台北市', '台北', '臺北', 'taipei'], region: 'north' as const, regionName: '北部地區' },
    { id: 'newtaipei', cityName: '新北市', aliases: ['新北', 'newtaipei'], region: 'north' as const, regionName: '北部地區' },
    { id: 'taoyuan', cityName: '桃園市', aliases: ['桃園', 'taoyuan'], region: 'north' as const, regionName: '北部地區' },
    { id: 'hsinchu_city', cityName: '新竹市', aliases: ['新竹市', 'hsinchu city'], region: 'north' as const, regionName: '北部地區' },
    { id: 'hsinchu_county', cityName: '新竹縣', aliases: ['新竹縣', 'hsinchu county', '竹縣'], region: 'north' as const, regionName: '北部地區' },
    { id: 'yilan', cityName: '宜蘭縣', aliases: ['宜蘭市', '宜蘭', 'yilan'], region: 'north' as const, regionName: '北部地區' },
    { id: 'miaoli', cityName: '苗栗縣', aliases: ['苗栗', 'miaoli'], region: 'central' as const, regionName: '中部地區' },
    { id: 'taichung', cityName: '臺中市', aliases: ['台中市', '台中', '臺中', 'taichung'], region: 'central' as const, regionName: '中部地區' },
    { id: 'changhua', cityName: '彰化縣', aliases: ['彰化', 'changhua'], region: 'central' as const, regionName: '中部地區' },
    { id: 'nantou', cityName: '南投縣', aliases: ['南投', 'nantou'], region: 'central' as const, regionName: '中部地區' },
    { id: 'yunlin', cityName: '雲林縣', aliases: ['雲林', 'yunlin'], region: 'central' as const, regionName: '中部地區' },
    { id: 'chiayi_city', cityName: '嘉義市', aliases: ['嘉義市', 'chiayi city'], region: 'south' as const, regionName: '南部地區' },
    { id: 'chiayi_county', cityName: '嘉義縣', aliases: ['嘉義縣', 'chiayi county', '嘉縣'], region: 'south' as const, regionName: '南部地區' },
    { id: 'tainan', cityName: '臺南市', aliases: ['台南市', '台南', '臺南', 'tainan'], region: 'south' as const, regionName: '南部地區' },
    { id: 'kaohsiung', cityName: '高雄市', aliases: ['高雄', 'kaohsiung'], region: 'south' as const, regionName: '南部地區' },
    { id: 'pingtung', cityName: '屏東縣', aliases: ['屏東', 'pingtung'], region: 'south' as const, regionName: '南部地區' },
    { id: 'hualien', cityName: '花蓮縣', aliases: ['花蓮', 'hualien'], region: 'east' as const, regionName: '東部地區' },
    { id: 'taitung', cityName: '臺東縣', aliases: ['台東市', '台東', '臺東', 'taitung'], region: 'east' as const, regionName: '東部地區' },
    { id: 'penghu', cityName: '澎湖縣', aliases: ['澎湖', 'penghu'], region: 'islands' as const, regionName: '離島地區' },
    { id: 'kinmen', cityName: '金門縣', aliases: ['金門', 'kinmen'], region: 'islands' as const, regionName: '離島地區' },
    { id: 'lienchiang', cityName: '連江縣', aliases: ['連江', '馬祖', 'lienchiang', 'matsu'], region: 'islands' as const, regionName: '離島地區' },
  ];

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

function getDefaultSubscribers(): UserSubscription[] {
  return [
    {
      id: 'sub_simulator',
      userId: 'simulated_user_current',
      displayName: '網頁模擬器用戶 (Simulator)',
      subscribedCities: ['臺北市', '新北市', '桃園市'],
      alertFrequency: 'realtime',
      scheduledTime: '07:00',
      createdAt: new Date().toISOString(),
      isMock: true,
    },
  ];
}

function getDefaultDatasetMeta(): DatasetMeta {
  return {
    datasetId: '20457',
    title: '天然災害停止上班及上課情形 (行政院人事行政總處)',
    sourceUrl: 'https://data.gov.tw/dataset/20457',
    lastFetchedAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    fetchStatus: 'ok',
    itemCount: 22,
    rawSource: 'Initial state loaded',
    isSimulatedData: false,
  };
}

export const storage = {
  getDefaultCounties,

  async load(kv: KVNamespace): Promise<AppState> {
    const raw = await kv.get(STORAGE_KEY, 'json');
    if (raw) {
      return raw as AppState;
    }
    // Return default state
    const defaultState: AppState = {
      counties: getDefaultCounties(),
      subscribers: getDefaultSubscribers(),
      logs: [
        {
          id: `log_${Date.now()}_startup`,
          timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
          type: 'incoming_webhook',
          targetCount: 0,
          targetUsers: [],
          title: '系統啟動',
          content: 'LINE 停班停課自動推送服務已就緒，已載入全台 22 縣市監測節點。',
          status: 'success',
          details: '資料集來源：https://data.gov.tw/dataset/20457',
        },
      ],
      datasetMeta: getDefaultDatasetMeta(),
    };
    await kv.put(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  },

  async save(kv: KVNamespace, state: AppState): Promise<void> {
    await kv.put(STORAGE_KEY, JSON.stringify(state));
  },
};
