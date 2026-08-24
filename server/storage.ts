import { CountyStatus, LineBotConfig, PushLog, DatasetMeta, UserSubscription, AlertFrequency } from '../src/types';
import { getDefaultCounties } from './dgpaData';
import crypto from 'crypto';

class StorageService {
  private counties: CountyStatus[] = getDefaultCounties();
  private previousCounties: CountyStatus[] = getDefaultCounties();
  private subscribers: Map<string, UserSubscription> = new Map();
  private logs: PushLog[] = [];
  private config: LineBotConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    isConfigured: !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET),
    webhookUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/line/webhook`,
    botBasicId: process.env.LINE_BOT_BASIC_ID || '@190azbzx',
    autoPollingEnabled: true,
    pollingIntervalSeconds: 60,
  };
  private datasetMeta: DatasetMeta = {
    datasetId: '20457',
    title: '天然災害停止上班及上課情形 (行政院人事行政總處)',
    sourceUrl: 'https://data.gov.tw/dataset/20457',
    lastFetchedAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    fetchStatus: 'ok',
    itemCount: 22,
    rawSource: 'Initial state loaded',
    isSimulatedData: false,
  };

  constructor() {
    this.seedInitialSubscribers();
    this.addLog({
      type: 'incoming_webhook',
      targetCount: 0,
      targetUsers: [],
      title: '系統啟動',
      content: 'LINE 停班停課自動推送服務已就緒，已載入全台 22 縣市監測節點。',
      status: 'success',
      details: '資料集來源：https://data.gov.tw/dataset/20457',
    });
  }

  private seedInitialSubscribers() {
    const demoSubscribers: UserSubscription[] = [
      {
        id: 'sub_demo_1',
        userId: 'U10a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5',
        displayName: '陳小明 (雙北通勤族)',
        pictureUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
        subscribedCities: ['臺北市', '新北市', '基隆市'],
        alertFrequency: 'realtime',
        scheduledTime: '06:30',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastNotifiedAt: new Date(Date.now() - 3600000 * 5).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      },
      {
        id: 'sub_demo_2',
        userId: 'U22b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4',
        displayName: '林美惠 (高雄-台南家長)',
        pictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
        subscribedCities: ['高雄市', '臺南市', '屏東縣'],
        alertFrequency: 'daily_scheduled',
        scheduledTime: '07:00',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        lastNotifiedAt: new Date(Date.now() - 3600000 * 12).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      },
      {
        id: 'sub_demo_3',
        userId: 'U33c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3',
        displayName: '張志豪 (花東旅遊業)',
        pictureUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
        subscribedCities: ['花蓮縣', '臺東縣', '宜蘭縣'],
        alertFrequency: 'alert_only',
        scheduledTime: '20:00',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
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

    for (const sub of demoSubscribers) {
      this.subscribers.set(sub.userId, sub);
    }
  }

  public getCounties(): CountyStatus[] {
    return this.counties;
  }

  public getPreviousCounties(): CountyStatus[] {
    return this.previousCounties;
  }

  public setCounties(newCounties: CountyStatus[], rawSource?: string, isSimulated = false) {
    this.previousCounties = [...this.counties];
    this.counties = newCounties;
    this.datasetMeta = {
      ...this.datasetMeta,
      lastFetchedAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      fetchStatus: 'ok',
      itemCount: newCounties.length,
      rawSource: rawSource || this.datasetMeta.rawSource,
      isSimulatedData: isSimulated,
    };
  }

  public updateSingleCountyStatus(countyId: string, status: string, isSuspended: boolean, isPartial: boolean, details?: string) {
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    this.previousCounties = [...this.counties];
    this.counties = this.counties.map(c => {
      if (c.id === countyId) {
        return {
          ...c,
          status,
          isSuspended,
          isPartial,
          updateTime: nowStr,
          details,
          source: '管理員手動調整 / 演練模擬',
        };
      }
      return c;
    });
    this.datasetMeta.isSimulatedData = true;
    this.datasetMeta.lastFetchedAt = nowStr;
  }

  public getSubscribers(): UserSubscription[] {
    return Array.from(this.subscribers.values());
  }

  public getSubscriber(userId: string): UserSubscription | undefined {
    return this.subscribers.get(userId);
  }

  public saveSubscriber(sub: Partial<UserSubscription> & { userId: string }): UserSubscription {
    const existing = this.subscribers.get(sub.userId);
    const updated: UserSubscription = {
      id: existing?.id || `sub_${crypto.randomUUID().slice(0, 8)}`,
      userId: sub.userId,
      displayName: sub.displayName || existing?.displayName || `LINE 用戶 ${sub.userId.slice(-4)}`,
      pictureUrl: sub.pictureUrl || existing?.pictureUrl,
      subscribedCities: sub.subscribedCities || existing?.subscribedCities || ['臺北市', '新北市'],
      alertFrequency: sub.alertFrequency || existing?.alertFrequency || 'realtime',
      scheduledTime: sub.scheduledTime || existing?.scheduledTime || '07:00',
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastNotifiedAt: sub.lastNotifiedAt || existing?.lastNotifiedAt,
      lastNotifiedStatus: sub.lastNotifiedStatus || existing?.lastNotifiedStatus,
      isMock: sub.isMock !== undefined ? sub.isMock : existing?.isMock || false,
    };
    this.subscribers.set(sub.userId, updated);
    return updated;
  }

  public deleteSubscriber(userId: string): boolean {
    return this.subscribers.delete(userId);
  }

  public getConfig(requestHost?: string, requestProtocol?: string): LineBotConfig {
    let appUrl = process.env.APP_URL;
    if (!appUrl && requestHost) {
      const proto = requestProtocol || 'https';
      appUrl = `${proto}://${requestHost}`;
    }
    if (!appUrl) {
      appUrl = 'http://localhost:3000';
    }
    return {
      ...this.config,
      webhookUrl: `${appUrl.replace(/\/$/, '')}/api/line/webhook`,
      isConfigured: !!(this.config.channelAccessToken && this.config.channelSecret),
    };
  }

  public updateConfig(newConfig: Partial<LineBotConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      isConfigured: !!(
        (newConfig.channelAccessToken ?? this.config.channelAccessToken) &&
        (newConfig.channelSecret ?? this.config.channelSecret)
      ),
    };
  }

  public getDatasetMeta(): DatasetMeta {
    return this.datasetMeta;
  }

  public getLogs(): PushLog[] {
    return this.logs;
  }

  public addLog(log: Omit<PushLog, 'id' | 'timestamp'>) {
    const newLog: PushLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      ...log,
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 200) {
      this.logs.pop();
    }
    return newLog;
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const storage = new StorageService();
