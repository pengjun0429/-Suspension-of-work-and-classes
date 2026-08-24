export type RegionKey = 'north' | 'central' | 'south' | 'east' | 'islands';

export interface CountyStatus {
  id: string;
  cityName: string;
  aliases: string[];
  region: RegionKey;
  regionName: string;
  status: string;
  isSuspended: boolean;
  isPartial: boolean;
  updateTime: string;
  details?: string;
  source?: string;
}

export type AlertFrequency = 'realtime' | 'daily_scheduled' | 'alert_only' | 'disabled';

export interface UserSubscription {
  id: string;
  userId: string;
  displayName: string;
  pictureUrl?: string;
  subscribedCities: string[];
  alertFrequency: AlertFrequency;
  scheduledTime: string; // "HH:mm" e.g., "07:00", "20:00"
  createdAt: string;
  lastNotifiedAt?: string;
  lastNotifiedStatus?: Record<string, string>;
  isMock?: boolean;
}

export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
  isConfigured: boolean;
  webhookUrl: string;
  botBasicId?: string;
  autoPollingEnabled: boolean;
  pollingIntervalSeconds: number;
}

export interface PushLog {
  id: string;
  timestamp: string;
  type: 'realtime_change' | 'daily_scheduled' | 'test_push' | 'broadcast' | 'incoming_webhook';
  targetCount: number;
  targetUsers: string[];
  title: string;
  content: string;
  status: 'success' | 'failed' | 'simulated';
  details?: string;
}

export interface DatasetMeta {
  datasetId: string;
  title: string;
  sourceUrl: string;
  lastFetchedAt: string;
  fetchStatus: 'ok' | 'error';
  itemCount: number;
  rawSource: string;
  isSimulatedData: boolean;
}

export interface ServerStateResponse {
  counties: CountyStatus[];
  subscribers: UserSubscription[];
  config: LineBotConfig;
  datasetMeta: DatasetMeta;
  logs: PushLog[];
}

export interface LineChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  timestamp: string;
  flexMessage?: any;
  quickReplies?: Array<{
    label: string;
    text: string;
  }>;
}
