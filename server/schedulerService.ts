import { storage } from './storage';
import { fetchDgpaOpenData } from './dgpaData';
import { lineBotService } from './lineBotService';
import { CountyStatus, UserSubscription } from '../src/types';

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private lastCheckedMinute = '';

  public start() {
    if (this.timer) clearInterval(this.timer);
    // Initial fetch
    this.checkAndUpdateDgpa();

    // Check every 30 seconds for accurate time triggering and fast change detection
    this.timer = setInterval(() => {
      this.tick();
    }, 30000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    const config = storage.getConfig();
    if (config.autoPollingEnabled) {
      await this.checkAndUpdateDgpa();
    }
    await this.checkDailyScheduledPushes();
  }

  /**
   * Fetch DGPA and detect status changes
   */
  public async checkAndUpdateDgpa(force = false): Promise<{ hasChanges: boolean; changedCounties: CountyStatus[] }> {
    if (this.isChecking && !force) return { hasChanges: false, changedCounties: [] };
    this.isChecking = true;

    try {
      const meta = storage.getDatasetMeta();
      // If simulated drill mode is active and not forced from web, do not overwrite simulation unless requested
      if (meta.isSimulatedData && !force) {
        this.isChecking = false;
        return { hasChanges: false, changedCounties: [] };
      }

      const { counties: fetchedCounties, raw, isLive } = await fetchDgpaOpenData();
      const currentCounties = storage.getCounties();

      // Find changed counties
      const changed: CountyStatus[] = [];
      for (const fetched of fetchedCounties) {
        const existing = currentCounties.find(c => c.cityName === fetched.cityName);
        if (existing && (existing.status !== fetched.status || existing.isSuspended !== fetched.isSuspended)) {
          changed.push(fetched);
        }
      }

      // Update stored counties
      storage.setCounties(fetchedCounties, raw, false);

      if (changed.length > 0) {
        await this.dispatchRealtimeChangeAlerts(changed);
      }

      return { hasChanges: changed.length > 0, changedCounties: changed };
    } catch (e: any) {
      storage.addLog({
        type: 'realtime_change',
        targetCount: 0,
        targetUsers: [],
        title: 'DGPA 資料擷取異常',
        content: `擷取人事行政總處資料失敗: ${e?.message || '未知錯誤'}`,
        status: 'failed',
      });
      return { hasChanges: false, changedCounties: [] };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Trigger push alert when specific counties have changed status
   */
  public async dispatchRealtimeChangeAlerts(changedCounties: CountyStatus[]) {
    const subscribers = storage.getSubscribers();
    const changedCityNames = changedCounties.map(c => c.cityName);

    const targetUsers: UserSubscription[] = [];

    for (const sub of subscribers) {
      if (sub.alertFrequency === 'disabled') continue;

      // Check if user subscribed to any of the changed cities
      const userMatchedCities = sub.subscribedCities.filter(c => changedCityNames.includes(c));

      if (userMatchedCities.length > 0) {
        if (sub.alertFrequency === 'realtime') {
          targetUsers.push(sub);
        } else if (sub.alertFrequency === 'alert_only') {
          // Check if any changed city is suspended or partial
          const isSus = changedCounties.some(c => userMatchedCities.includes(c.cityName) && (c.isSuspended || c.isPartial));
          if (isSus) {
            targetUsers.push(sub);
          }
        }
      }
    }

    if (targetUsers.length === 0) return;

    // Send push notification to target users
    const changedSummary = changedCounties
      .map(c => `${c.isSuspended ? '🔴' : c.isPartial ? '🟡' : '🟢'} 【${c.cityName}】${c.status}`)
      .join('\n');

    for (const user of targetUsers) {
      const userRelevantCounties = changedCounties.filter(c => user.subscribedCities.includes(c.cityName));
      if (userRelevantCounties.length === 0) continue;

      const userSummaryText = userRelevantCounties
        .map(c => `${c.isSuspended ? '🔴' : c.isPartial ? '🟡' : '🟢'} ${c.cityName}：${c.status}`)
        .join('\n');

      const flexMessage = {
        type: 'flex',
        altText: `🚨【停班停課即時異動警報】${userRelevantCounties.map(c => c.cityName).join('、')}`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: userRelevantCounties.some(c => c.isSuspended) ? '#991B1B' : '#0F172A',
            paddingAll: '16px',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🚨 停班停課即時異動通知',
                    weight: 'bold',
                    size: 'md',
                    color: '#FFFFFF',
                  },
                  {
                    type: 'text',
                    text: 'DGPA 最新發布',
                    size: 'xxs',
                    color: '#CBD5E1',
                    align: 'end',
                  },
                ],
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '16px',
            contents: [
              {
                type: 'text',
                text: `親愛的 ${user.displayName}：您關注的縣市最新上班上課狀況已更新！`,
                size: 'xs',
                color: '#475569',
                wrap: true,
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#F8FAFC',
                cornerRadius: '8px',
                paddingAll: '12px',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: userSummaryText,
                    size: 'sm',
                    weight: 'bold',
                    color: '#0F172A',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'text',
                text: `發布時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
                size: 'xxs',
                color: '#94A3B8',
                margin: 'md',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#0284C7',
                height: 'sm',
                action: {
                  type: 'message',
                  label: '📍 查我訂閱',
                  text: '查我訂閱',
                },
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'message',
                  label: '🗺️ 查全台看板',
                  text: '查全台',
                },
              },
            ],
          },
        },
        quickReply: lineBotService.getDefaultQuickReplies(),
      };

      const pushRes = await lineBotService.pushMessage(user.userId, [flexMessage]);
      user.lastNotifiedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      storage.saveSubscriber(user);

      storage.addLog({
        type: 'realtime_change',
        targetCount: 1,
        targetUsers: [user.displayName],
        title: `異動即時推播: ${user.displayName}`,
        content: userSummaryText,
        status: pushRes.simulated ? 'simulated' : pushRes.success ? 'success' : 'failed',
        details: pushRes.error || `發送至 LINE ID: ${user.userId}`,
      });
    }
  }

  /**
   * Check daily scheduled push at matching HH:mm
   */
  private async checkDailyScheduledPushes() {
    const nowTaipei = new Date().toLocaleTimeString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    if (nowTaipei === this.lastCheckedMinute) return;
    this.lastCheckedMinute = nowTaipei;

    const subscribers = storage.getSubscribers();
    const matchingUsers = subscribers.filter(
      u => u.alertFrequency === 'daily_scheduled' && u.scheduledTime === nowTaipei
    );

    if (matchingUsers.length === 0) return;

    for (const user of matchingUsers) {
      const flexMessage = lineBotService.generateUserSubscribedFlex(user);
      const pushRes = await lineBotService.pushMessage(user.userId, [
        {
          type: 'text',
          text: `⏰【每日定時推播提醒】早安/晚安！這是為您準備的 ${nowTaipei} 最新停班停課快訊：`,
        },
        flexMessage,
      ]);

      user.lastNotifiedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      storage.saveSubscriber(user);

      storage.addLog({
        type: 'daily_scheduled',
        targetCount: 1,
        targetUsers: [user.displayName],
        title: `每日定時推播 (${nowTaipei})`,
        content: `推送 ${user.displayName} 關注的縣市: ${user.subscribedCities.join('、')}`,
        status: pushRes.simulated ? 'simulated' : pushRes.success ? 'success' : 'failed',
      });
    }
  }
}

export const schedulerService = new SchedulerService();
