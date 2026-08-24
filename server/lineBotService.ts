import crypto from 'crypto';
import { storage } from './storage';
import { matchCityName, TAIWAN_COUNTIES_BASE } from './dgpaData';
import { AlertFrequency, CountyStatus, UserSubscription } from '../src/types';

export class LineBotService {
  /**
   * Verify LINE webhook signature using HMAC-SHA256
   */
  public verifySignature(body: string, signature: string, channelSecret: string): boolean {
    if (!channelSecret || !signature) return false;
    try {
      const hash = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');
      return hash === signature;
    } catch {
      return false;
    }
  }

  /**
   * Fetch LINE user profile
   */
  public async fetchUserProfile(userId: string, token: string): Promise<{ displayName?: string; pictureUrl?: string } | null> {
    if (!token || !userId || userId.startsWith('simulated_')) return null;
    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          displayName: data.displayName,
          pictureUrl: data.pictureUrl,
        };
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
    return null;
  }

  /**
   * Handle incoming Webhook Events
   */
  public async handleWebhookEvents(events: any[]): Promise<any[]> {
    const config = storage.getConfig();
    const results: any[] = [];

    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId) continue;

      // Ensure user profile is recorded
      let user = storage.getSubscriber(userId);
      if (!user) {
        let displayName = `LINE 用戶 ${userId.slice(-4)}`;
        let pictureUrl: string | undefined;

        if (config.channelAccessToken) {
          const profile = await this.fetchUserProfile(userId, config.channelAccessToken);
          if (profile?.displayName) displayName = profile.displayName;
          if (profile?.pictureUrl) pictureUrl = profile.pictureUrl;
        }

        user = storage.saveSubscriber({
          userId,
          displayName,
          pictureUrl,
          subscribedCities: ['臺北市', '新北市'],
          alertFrequency: 'realtime',
          scheduledTime: '07:00',
        });
      }

      if (event.type === 'follow') {
        const replyMessage = this.generateWelcomeMessage(user);
        await this.replyMessage(event.replyToken, [replyMessage], config.channelAccessToken);
        storage.addLog({
          type: 'incoming_webhook',
          targetCount: 1,
          targetUsers: [user.displayName],
          title: '新用戶加入好友',
          content: `${user.displayName} 加入了停班停課通知機器人。`,
          status: 'success',
        });
      } else if (event.type === 'message' && event.message?.type === 'text') {
        const userText = event.message.text.trim();
        const response = await this.processUserCommand(user, userText);

        if (event.replyToken && config.channelAccessToken) {
          await this.replyMessage(event.replyToken, response.messages, config.channelAccessToken);
        }

        storage.addLog({
          type: 'incoming_webhook',
          targetCount: 1,
          targetUsers: [user.displayName],
          title: `收到指令: ${userText}`,
          content: response.summary,
          status: 'success',
          details: `用戶: ${user.displayName} (${userId})`,
        });

        results.push({ userId, text: userText, response });
      } else if (event.type === 'postback') {
        const postbackData = event.postback?.data || '';
        const response = await this.processPostback(user, postbackData);

        if (event.replyToken && config.channelAccessToken) {
          await this.replyMessage(event.replyToken, response.messages, config.channelAccessToken);
        }

        storage.addLog({
          type: 'incoming_webhook',
          targetCount: 1,
          targetUsers: [user.displayName],
          title: `收到按鈕操作: ${postbackData}`,
          content: response.summary,
          status: 'success',
        });

        results.push({ userId, postbackData, response });
      }
    }

    return results;
  }

  /**
   * Process interactive free text command or quick reply from user
   */
  public async processUserCommand(user: UserSubscription, text: string): Promise<{ messages: any[]; summary: string }> {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Check all Taiwan overview
    if (
      lower === '查全台' ||
      lower === '全台' ||
      lower === '全台狀況' ||
      lower === '全台停班停課' ||
      lower === '全台停班課' ||
      lower === '今日停班停課' ||
      lower === '最新狀態'
    ) {
      return {
        messages: [this.generateAllCountiesFlex()],
        summary: '回傳全台 22 縣市最新停班停課看板',
      };
    }

    // 2. Check user's subscribed cities
    if (
      lower === '查我訂閱' ||
      lower === '查我的縣市' ||
      lower === '我的縣市' ||
      lower === '我的訂閱' ||
      lower === '訂閱狀況'
    ) {
      return {
        messages: [this.generateUserSubscribedFlex(user)],
        summary: `回傳用戶訂閱的縣市狀態 (${user.subscribedCities.join(', ')})`,
      };
    }

    // 3. Check Settings / Profile
    if (
      lower === '我的設定' ||
      lower === '設定' ||
      lower === '個人設定' ||
      lower === '推播設定' ||
      lower === '查看設定'
    ) {
      return {
        messages: [this.generateSettingsFlex(user)],
        summary: '回傳用戶訂閱與提醒偏好設定卡片',
      };
    }

    // 4. Change Notification Frequency commands
    if (lower.includes('即時') && (lower.includes('推播') || lower.includes('警報') || lower.includes('模式') || lower.includes('設定'))) {
      user.alertFrequency = 'realtime';
      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: `✅ 已將提醒模式切換為：【🔴 即時異動推播】\n\n只要行政院人事行政總處一有發布或變更您訂閱縣市的停班停課資訊，系統將於 1 分鐘內第一時間推播給您！`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: '切換提醒頻率為：即時異動推播',
      };
    }

    if (lower.includes('定時') && (lower.includes('推播') || lower.includes('每日') || lower.includes('設定') || lower.includes('模式'))) {
      user.alertFrequency = 'daily_scheduled';
      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: `✅ 已將提醒模式切換為：【⏰ 每日定時推播】\n\n系統將於每天【${user.scheduledTime}】為您整理並推送您訂閱縣市的最新上班上課狀態。`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: `切換提醒頻率為：每日定時推播 (${user.scheduledTime})`,
      };
    }

    if (lower.includes('僅') && (lower.includes('停班') || lower.includes('停課') || lower.includes('警報'))) {
      user.alertFrequency = 'alert_only';
      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: `✅ 已將提醒模式切換為：【🚨 僅在停班停課時通知】\n\n平常照常上班上課時不打擾您，僅在您訂閱的縣市宣佈「停止上班上課」時主動發送警報！`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: '切換提醒頻率為：僅停班停課時通知',
      };
    }

    if (lower.includes('關閉') || lower.includes('暫停') || lower === '停止通知' || lower === '靜音') {
      user.alertFrequency = 'disabled';
      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: `🔕 已暫停主動自動推播提醒。\n\n您仍可隨時傳送縣市名稱或「查全台」主動查詢即時資訊。如欲重新開啟推播，隨時傳送「即時推播」或「我的設定」即可！`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: '已暫停自動推播',
      };
    }

    // 5. Change Scheduled Time (e.g. "設定時間 06:30", "時間 07:00", "07:30", "20:00")
    const timeMatch = trimmed.match(/(?:設定時間|時間|每日時間|每天)?\s*([0-2]?[0-9])[:：點時]([0-5][0-9])?/);
    if (timeMatch && (trimmed.includes('時間') || trimmed.includes('點') || trimmed.includes(':') || trimmed.includes('：'))) {
      const hours = timeMatch[1].padStart(2, '0');
      const mins = (timeMatch[2] || '00').padStart(2, '0');
      const formattedTime = `${hours}:${mins}`;

      user.scheduledTime = formattedTime;
      // If user had realtime, suggest or keep
      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: `⏰ 已成功將每日定時推播時間更新為：【${formattedTime}】！\n\n當前推播模式：${this.getFrequencyLabel(user.alertFrequency)}\n訂閱縣市：${user.subscribedCities.join('、')}`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: `更新定時推播時間為: ${formattedTime}`,
      };
    }

    // 6. Subscribe / Unsubscribe explicitly (e.g., "訂閱 台北市 新北市", "設定縣市 高雄市 屏東縣", "取消訂閱 宜蘭")
    if (trimmed.startsWith('訂閱') || trimmed.startsWith('加訂') || trimmed.startsWith('設定縣市') || trimmed.startsWith('選縣市')) {
      const cityQuery = trimmed.replace(/^(訂閱|加訂|設定縣市|選縣市)\s*/, '');
      if (!cityQuery) {
        return {
          messages: [this.generateCityPickerQuickMenu(user)],
          summary: '提供縣市快速選單',
        };
      }

      const added: string[] = [];
      for (const base of TAIWAN_COUNTIES_BASE) {
        if (cityQuery.includes(base.cityName) || cityQuery.includes(base.cityName.replace('臺', '台'))) {
          if (!user.subscribedCities.includes(base.cityName)) {
            user.subscribedCities.push(base.cityName);
            added.push(base.cityName);
          }
        } else {
          for (const alias of base.aliases) {
            if (cityQuery.toLowerCase().includes(alias.toLowerCase())) {
              if (!user.subscribedCities.includes(base.cityName)) {
                user.subscribedCities.push(base.cityName);
                added.push(base.cityName);
              }
            }
          }
        }
      }

      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: added.length > 0
              ? `🎉 成功新增訂閱縣市：【${added.join('、')}】！\n\n目前您關注的縣市清單：\n📌 ${user.subscribedCities.join('、')}\n\n當有最新停班停課異動時，機器人將為您即時通知。`
              : `📌 目前已訂閱縣市：${user.subscribedCities.join('、')}\n\n如欲新增，請直接輸入縣市名稱，例如：「訂閱 臺中市 彰化縣」或點選下方快捷按鈕。`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: `更新訂閱縣市: ${user.subscribedCities.join(', ')}`,
      };
    }

    if (trimmed.startsWith('取消訂閱') || trimmed.startsWith('退訂') || trimmed.startsWith('刪除縣市')) {
      const cityQuery = trimmed.replace(/^(取消訂閱|退訂|刪除縣市)\s*/, '');
      const removed: string[] = [];
      user.subscribedCities = user.subscribedCities.filter(c => {
        const matched = cityQuery.includes(c) || cityQuery.includes(c.replace('臺', '台'));
        if (matched) removed.push(c);
        return !matched;
      });

      storage.saveSubscriber(user);
      return {
        messages: [
          {
            type: 'text',
            text: removed.length > 0
              ? `🗑️ 已取消訂閱：【${removed.join('、')}】\n\n目前保留的訂閱縣市：\n📌 ${user.subscribedCities.length > 0 ? user.subscribedCities.join('、') : '（目前無訂閱任何縣市）'}`
              : `找不到欲取消的縣市，您目前訂閱的是：${user.subscribedCities.join('、')}`,
            quickReply: this.getDefaultQuickReplies(),
          },
        ],
        summary: `取消訂閱: ${removed.join(', ')}`,
      };
    }

    // 7. Check specific single/multiple city status (e.g., "台北市", "台中", "花蓮停班了嗎", "高雄停課嗎")
    const matchedCity = matchCityName(trimmed);
    if (matchedCity) {
      const counties = storage.getCounties();
      const county = counties.find(c => c.cityName === matchedCity) || counties[0];
      return {
        messages: [this.generateSingleCountyFlex(county, user)],
        summary: `回傳 ${county.cityName} 最新停班停課狀態 (${county.status})`,
      };
    }

    // 8. Help / Menu
    if (lower === '說明' || lower === 'help' || lower === '指令' || lower === '選單' || lower === '功能') {
      return {
        messages: [this.generateWelcomeMessage(user)],
        summary: '回傳使用說明與指令引導',
      };
    }

    // Default Fallback
    return {
      messages: [
        {
          type: 'text',
          text: `👋 您好！我是「LINE 停班停課自動推送機器人」。\n\n您可以隨時傳送：\n• 📍 輸入縣市名稱（如「台北市」、「高雄」）查詢即時狀態\n• 🗺️「查全台」查看全台灣 22 縣市狀態總覽\n• 🔔「訂閱 台北市 新北市」自訂關注縣市\n• ⏰「設定時間 07:00」自訂每日定時推播時間\n• ⚙️「我的設定」管理通知偏好與提醒頻率\n\n資料來源同步：行政院人事行政總處 (DGPA)`,
          quickReply: this.getDefaultQuickReplies(),
        },
      ],
      summary: `回傳預設引導選單 (收到未辨識輸入: ${trimmed})`,
    };
  }

  /**
   * Process interactive Postback actions (e.g. from Flex Buttons)
   */
  public async processPostback(user: UserSubscription, data: string): Promise<{ messages: any[]; summary: string }> {
    const params = new URLSearchParams(data);
    const action = params.get('action');

    if (action === 'toggle_city') {
      const city = params.get('city');
      if (city) {
        if (user.subscribedCities.includes(city)) {
          user.subscribedCities = user.subscribedCities.filter(c => c !== city);
          storage.saveSubscriber(user);
          return {
            messages: [
              {
                type: 'text',
                text: `🗑️ 已為您移除關注：【${city}】\n\n目前訂閱縣市：${user.subscribedCities.join('、') || '（尚未訂閱任何縣市）'}`,
                quickReply: this.getDefaultQuickReplies(),
              },
            ],
            summary: `移除關注縣市: ${city}`,
          };
        } else {
          user.subscribedCities.push(city);
          storage.saveSubscriber(user);
          return {
            messages: [
              {
                type: 'text',
                text: `🎉 已為您加入關注：【${city}】！\n\n目前訂閱縣市：${user.subscribedCities.join('、')}\n只要人事總處發布異動，將立即為您通知。`,
                quickReply: this.getDefaultQuickReplies(),
              },
            ],
            summary: `加入關注縣市: ${city}`,
          };
        }
      }
    }

    if (action === 'set_frequency') {
      const freq = params.get('frequency') as AlertFrequency;
      if (freq) {
        user.alertFrequency = freq;
        storage.saveSubscriber(user);
        return {
          messages: [
            {
              type: 'text',
              text: `✅ 提醒模式已切換為：【${this.getFrequencyLabel(freq)}】\n\n目前訂閱縣市：${user.subscribedCities.join('、')}\n定時推播時間：${user.scheduledTime}`,
              quickReply: this.getDefaultQuickReplies(),
            },
          ],
          summary: `切換推播頻率為: ${freq}`,
        };
      }
    }

    if (action === 'set_time') {
      const time = params.get('time');
      if (time) {
        user.scheduledTime = time;
        storage.saveSubscriber(user);
        return {
          messages: [
            {
              type: 'text',
              text: `⏰ 定時推播時間已設定為：【${time}】\n每日該時間將自動為您推送關注縣市最新狀態！`,
              quickReply: this.getDefaultQuickReplies(),
            },
          ],
          summary: `設定定時時間為: ${time}`,
        };
      }
    }

    if (action === 'show_settings') {
      return {
        messages: [this.generateSettingsFlex(user)],
        summary: '查看個人設定',
      };
    }

    if (action === 'show_all') {
      return {
        messages: [this.generateAllCountiesFlex()],
        summary: '查看全台看板',
      };
    }

    return {
      messages: [this.generateWelcomeMessage(user)],
      summary: '預設回覆',
    };
  }

  /**
   * Helper: Send LINE message to API
   */
  public async replyMessage(replyToken: string, messages: any[], token: string): Promise<boolean> {
    if (!token) {
      console.warn('⚠️ [LINE Bot] 無法回覆訊息：未設定 LINE Channel Access Token，請至後台填入憑證。');
      storage.addLog({
        type: 'incoming_webhook',
        targetCount: 1,
        targetUsers: ['LINE API'],
        title: '⚠️ 訊息回覆失敗：缺少 Access Token',
        content: '伺服器收到 LINE 訊息，但尚未設定 Channel Access Token，故無法回傳訊息至 LINE。',
        status: 'failed',
        details: '請進入「後台管理 > LINE 官方串接」填入 Channel Access Token。',
      });
      return false;
    }
    if (!replyToken) return false;

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyToken,
          messages,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ [LINE Bot Reply Failed]:', res.status, errorText);
        storage.addLog({
          type: 'incoming_webhook',
          targetCount: 1,
          targetUsers: ['LINE 用戶'],
          title: `❌ LINE 回覆失敗 (HTTP ${res.status})`,
          content: `LINE 官方伺服器拒絕訊息：${errorText}`,
          status: 'failed',
          details: `狀態碼: ${res.status}, 回覆內容: ${errorText}`,
        });
        return false;
      }
      return true;
    } catch (e: any) {
      console.error('Error in replyMessage:', e);
      storage.addLog({
        type: 'incoming_webhook',
        targetCount: 1,
        targetUsers: ['LINE 用戶'],
        title: '❌ LINE API 連線異常',
        content: e?.message || '網路連線失敗',
        status: 'failed',
      });
      return false;
    }
  }

  /**
   * Send Push Message to specific user or multicast
   */
  public async pushMessage(to: string | string[], messages: any[]): Promise<{ success: boolean; simulated: boolean; error?: string }> {
    const config = storage.getConfig();
    const isArray = Array.isArray(to);
    const targets = isArray ? to : [to];

    if (!config.channelAccessToken) {
      // Return simulated success
      return { success: true, simulated: true };
    }

    try {
      const endpoint = isArray && to.length > 1
        ? 'https://api.line.me/v2/bot/message/multicast'
        : 'https://api.line.me/v2/bot/message/push';

      const payload = isArray && to.length > 1
        ? { to: targets, messages }
        : { to: targets[0], messages };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.channelAccessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, simulated: false, error: errorText };
      }

      return { success: true, simulated: false };
    } catch (err: any) {
      return { success: false, simulated: false, error: err?.message || 'Network error' };
    }
  }

  // ==================== Flex Message Generators ====================

  public generateWelcomeMessage(user: UserSubscription): any {
    return {
      type: 'flex',
      altText: '⚡ LINE 停班停課即時通知機器人',
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0F172A',
          paddingAll: '20px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '⚡ 停班停課即時通知',
                  weight: 'bold',
                  size: 'lg',
                  color: '#38BDF8',
                },
                {
                  type: 'text',
                  text: 'DGPA 官方連線',
                  size: 'xxs',
                  color: '#94A3B8',
                  align: 'end',
                },
              ],
            },
            {
              type: 'text',
              text: '行政院人事行政總處 (Dataset 20457) 同步',
              size: 'xs',
              color: '#64748B',
              margin: 'sm',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: `您好 ${user.displayName}！已為您就緒自動推播服務。`,
              weight: 'bold',
              size: 'sm',
              color: '#1E293B',
              wrap: true,
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              backgroundColor: '#F8FAFC',
              cornerRadius: '8px',
              paddingAll: '12px',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '📌 關注縣市', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: user.subscribedCities.join('、'), size: 'xs', color: '#0284C7', weight: 'bold', flex: 7, wrap: true },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '🔔 提醒模式', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: this.getFrequencyLabel(user.alertFrequency), size: 'xs', color: '#0F172A', weight: 'bold', flex: 7 },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '⏰ 定時時間', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: user.scheduledTime, size: 'xs', color: '#0F172A', weight: 'bold', flex: 7 },
                  ],
                },
              ],
            },
            {
              type: 'text',
              text: '💡 常用指令：直接輸入「台北市」查特定縣市、或輸入「設定時間 06:30」自訂推播時間。',
              size: 'xs',
              color: '#64748B',
              margin: 'md',
              wrap: true,
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#0284C7',
              height: 'sm',
              action: {
                type: 'message',
                label: '🗺️ 查全台停班停課',
                text: '查全台',
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '📍 查我訂閱的縣市',
                text: '查我訂閱',
              },
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'message',
                label: '⚙️ 查看與修改我的設定',
                text: '我的設定',
              },
            },
          ],
        },
      },
      quickReply: this.getDefaultQuickReplies(),
    };
  }

  public generateAllCountiesFlex(): any {
    const counties = storage.getCounties();
    const suspendedCount = counties.filter(c => c.isSuspended).length;
    const partialCount = counties.filter(c => c.isPartial).length;
    const normalCount = counties.length - suspendedCount - partialCount;

    const regions: Array<{ name: string; items: CountyStatus[] }> = [
      { name: '北部地區', items: counties.filter(c => c.region === 'north') },
      { name: '中部地區', items: counties.filter(c => c.region === 'central') },
      { name: '南部地區', items: counties.filter(c => c.region === 'south') },
      { name: '東部與離島', items: counties.filter(c => c.region === 'east' || c.region === 'islands') },
    ];

    const regionBlocks = regions.map(reg => {
      const itemsText = reg.items.map(c => {
        let badge = '🟢';
        if (c.isSuspended) badge = '🔴';
        else if (c.isPartial) badge = '🟡';
        return `${badge} ${c.cityName}: ${c.status.replace(/。$/, '')}`;
      }).join('\n');

      return {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        backgroundColor: '#F8FAFC',
        cornerRadius: '6px',
        paddingAll: '10px',
        contents: [
          {
            type: 'text',
            text: reg.name,
            weight: 'bold',
            size: 'xs',
            color: '#475569',
          },
          {
            type: 'text',
            text: itemsText,
            size: 'xxs',
            color: '#1E293B',
            wrap: true,
            margin: 'xs',
          },
        ],
      };
    });

    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    return {
      type: 'flex',
      altText: `🗺️ 全台停班停課總覽 (${suspendedCount} 停班課 / ${normalCount} 正常)`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: suspendedCount > 0 ? '#991B1B' : '#0F172A',
          paddingAll: '16px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '🇹🇼 全台停班停課即時看板',
                  weight: 'bold',
                  size: 'md',
                  color: '#FFFFFF',
                },
                {
                  type: 'text',
                  text: suspendedCount > 0 ? '🔴 警報中' : '🟢 全台正常',
                  size: 'xs',
                  weight: 'bold',
                  color: suspendedCount > 0 ? '#FECACA' : '#86EFAC',
                  align: 'end',
                },
              ],
            },
            {
              type: 'text',
              text: `更新時間：${nowStr} (來源: DGPA 20457)`,
              size: 'xxs',
              color: '#94A3B8',
              margin: 'xs',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '14px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#FEE2E2',
                  cornerRadius: '6px',
                  paddingAll: '8px',
                  alignItems: 'center',
                  contents: [
                    { type: 'text', text: '停止上班課', size: 'xxs', color: '#991B1B' },
                    { type: 'text', text: `${suspendedCount} 縣市`, size: 'sm', weight: 'bold', color: '#DC2626' },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#FEF3C7',
                  cornerRadius: '6px',
                  paddingAll: '8px',
                  alignItems: 'center',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: '部分停班課', size: 'xxs', color: '#92400E' },
                    { type: 'text', text: `${partialCount} 縣市`, size: 'sm', weight: 'bold', color: '#D97706' },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#DCFCE7',
                  cornerRadius: '6px',
                  paddingAll: '8px',
                  alignItems: 'center',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: '正常上班課', size: 'xxs', color: '#166534' },
                    { type: 'text', text: `${normalCount} 縣市`, size: 'sm', weight: 'bold', color: '#16A34A' },
                  ],
                },
              ],
            },
            ...regionBlocks,
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
                label: '📍 查我訂閱的縣市',
                text: '查我訂閱',
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '⚙️ 我的設定',
                text: '我的設定',
              },
            },
          ],
        },
      },
      quickReply: this.getDefaultQuickReplies(),
    };
  }

  public generateUserSubscribedFlex(user: UserSubscription): any {
    const allCounties = storage.getCounties();
    const userCounties = allCounties.filter(c => user.subscribedCities.includes(c.cityName));
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    if (userCounties.length === 0) {
      return {
        type: 'text',
        text: `⚠️ 您目前尚未關注任何縣市！\n\n請傳送「訂閱 台北市」或「訂閱 雙北」來設定您關心的地區。`,
        quickReply: this.getDefaultQuickReplies(),
      };
    }

    const cards = userCounties.map(c => {
      const isSus = c.isSuspended;
      const isPart = c.isPartial;
      const badgeBg = isSus ? '#FEE2E2' : isPart ? '#FEF3C7' : '#DCFCE7';
      const badgeColor = isSus ? '#991B1B' : isPart ? '#92400E' : '#166534';
      const badgeIcon = isSus ? '🔴 停止上班上課' : isPart ? '🟡 部分地區停止' : '🟢 照常上班上課';

      return {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        backgroundColor: '#F8FAFC',
        cornerRadius: '8px',
        paddingAll: '12px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: c.cityName,
                weight: 'bold',
                size: 'md',
                color: '#0F172A',
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: badgeBg,
                cornerRadius: '4px',
                paddingStart: '6px',
                paddingEnd: '6px',
                paddingTop: '2px',
                paddingBottom: '2px',
                contents: [
                  {
                    type: 'text',
                    text: badgeIcon,
                    size: 'xxs',
                    weight: 'bold',
                    color: badgeColor,
                  },
                ],
              },
            ],
          },
          {
            type: 'text',
            text: c.status,
            size: 'xs',
            color: isSus ? '#DC2626' : '#334155',
            weight: isSus ? 'bold' : 'regular',
            wrap: true,
            margin: 'sm',
          },
        ],
      };
    });

    return {
      type: 'flex',
      altText: `📍 您訂閱的縣市狀態 (${user.subscribedCities.join('、')})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0F172A',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: '📍 您關注的縣市停班停課情形',
              weight: 'bold',
              size: 'md',
              color: '#38BDF8',
            },
            {
              type: 'text',
              text: `查詢時間：${nowStr}`,
              size: 'xxs',
              color: '#94A3B8',
              margin: 'xs',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '14px',
          contents: [
            {
              type: 'text',
              text: `共關注 ${userCounties.length} 個縣市（提醒模式：${this.getFrequencyLabel(user.alertFrequency)}）`,
              size: 'xs',
              color: '#64748B',
            },
            ...cards,
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '🗺️ 查全台狀況',
                text: '查全台',
              },
            },
            {
              type: 'button',
              style: 'primary',
              color: '#0284C7',
              height: 'sm',
              action: {
                type: 'message',
                label: '⚙️ 調整訂閱縣市',
                text: '我的設定',
              },
            },
          ],
        },
      },
      quickReply: this.getDefaultQuickReplies(),
    };
  }

  public generateSingleCountyFlex(county: CountyStatus, user: UserSubscription): any {
    const isSubscribed = user.subscribedCities.includes(county.cityName);
    const isSus = county.isSuspended;
    const isPart = county.isPartial;
    const headerBg = isSus ? '#991B1B' : isPart ? '#92400E' : '#0F172A';
    const statusColor = isSus ? '#DC2626' : isPart ? '#D97706' : '#16A34A';
    const statusBadge = isSus ? '🔴 停止上班上課' : isPart ? '🟡 部分地區停止' : '🟢 照常上班上課';

    return {
      type: 'flex',
      altText: `【${county.cityName}】${county.status}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: headerBg,
          paddingAll: '16px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: `${county.cityName} 即時狀態`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#FFFFFF',
                },
                {
                  type: 'text',
                  text: county.regionName,
                  size: 'xs',
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
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#F8FAFC',
              cornerRadius: '8px',
              paddingAll: '14px',
              contents: [
                {
                  type: 'text',
                  text: statusBadge,
                  size: 'xs',
                  weight: 'bold',
                  color: statusColor,
                },
                {
                  type: 'text',
                  text: county.status,
                  size: 'md',
                  weight: 'bold',
                  color: '#1E293B',
                  margin: 'sm',
                  wrap: true,
                },
                county.details
                  ? {
                      type: 'text',
                      text: `備註：${county.details}`,
                      size: 'xs',
                      color: '#64748B',
                      margin: 'md',
                      wrap: true,
                    }
                  : { type: 'filler' },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                { type: 'text', text: '來源單位：', size: 'xxs', color: '#94A3B8' },
                { type: 'text', text: '行政院人事行政總處 (DGPA)', size: 'xxs', color: '#64748B' },
              ],
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
              style: isSubscribed ? 'secondary' : 'primary',
              color: isSubscribed ? undefined : '#0284C7',
              height: 'sm',
              action: {
                type: 'postback',
                label: isSubscribed ? '➖ 取消訂閱' : '➕ 訂閱此縣市',
                data: `action=toggle_city&city=${encodeURIComponent(county.cityName)}`,
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '🗺️ 查全台',
                text: '查全台',
              },
            },
          ],
        },
      },
      quickReply: this.getDefaultQuickReplies(),
    };
  }

  public generateSettingsFlex(user: UserSubscription): any {
    return {
      type: 'flex',
      altText: '⚙️ LINE 停班停課推播設定',
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0F172A',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: '⚙️ 停班停課推播與訂閱偏好',
              weight: 'bold',
              size: 'md',
              color: '#38BDF8',
            },
            {
              type: 'text',
              text: `用戶：${user.displayName}`,
              size: 'xs',
              color: '#94A3B8',
              margin: 'xs',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          contents: [
            // Subscribed cities
            {
              type: 'text',
              text: '📌 目前關注縣市',
              weight: 'bold',
              size: 'xs',
              color: '#475569',
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#F1F5F9',
              cornerRadius: '6px',
              paddingAll: '10px',
              margin: 'xs',
              contents: [
                {
                  type: 'text',
                  text: user.subscribedCities.length > 0 ? user.subscribedCities.join('、') : '（未設定任何縣市）',
                  size: 'sm',
                  weight: 'bold',
                  color: '#0284C7',
                  wrap: true,
                },
              ],
            },
            // Alert frequency
            {
              type: 'text',
              text: '🔔 通知提醒頻率',
              weight: 'bold',
              size: 'xs',
              color: '#475569',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'xs',
              spacing: 'xs',
              contents: [
                {
                  type: 'button',
                  style: user.alertFrequency === 'realtime' ? 'primary' : 'secondary',
                  color: user.alertFrequency === 'realtime' ? '#DC2626' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '🔴 即時異動',
                    data: 'action=set_frequency&frequency=realtime',
                  },
                },
                {
                  type: 'button',
                  style: user.alertFrequency === 'daily_scheduled' ? 'primary' : 'secondary',
                  color: user.alertFrequency === 'daily_scheduled' ? '#0284C7' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '⏰ 每日定時',
                    data: 'action=set_frequency&frequency=daily_scheduled',
                  },
                },
                {
                  type: 'button',
                  style: user.alertFrequency === 'alert_only' ? 'primary' : 'secondary',
                  color: user.alertFrequency === 'alert_only' ? '#D97706' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '🚨 僅停班課',
                    data: 'action=set_frequency&frequency=alert_only',
                  },
                },
              ],
            },
            // Scheduled time selector
            {
              type: 'text',
              text: `⏰ 定時推播時間（目前: ${user.scheduledTime}）`,
              weight: 'bold',
              size: 'xs',
              color: '#475569',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'xs',
              spacing: 'xs',
              contents: [
                {
                  type: 'button',
                  style: user.scheduledTime === '06:30' ? 'primary' : 'secondary',
                  color: user.scheduledTime === '06:30' ? '#0284C7' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '早 06:30',
                    data: 'action=set_time&time=06:30',
                  },
                },
                {
                  type: 'button',
                  style: user.scheduledTime === '07:00' ? 'primary' : 'secondary',
                  color: user.scheduledTime === '07:00' ? '#0284C7' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '早 07:00',
                    data: 'action=set_time&time=07:00',
                  },
                },
                {
                  type: 'button',
                  style: user.scheduledTime === '20:00' ? 'primary' : 'secondary',
                  color: user.scheduledTime === '20:00' ? '#0284C7' : undefined,
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '晚 20:00',
                    data: 'action=set_time&time=20:00',
                  },
                },
              ],
            },
            {
              type: 'text',
              text: '💡 亦可直接輸入文字（例如「設定時間 07:30」或「訂閱 台中 高雄」）快速修改。',
              size: 'xxs',
              color: '#94A3B8',
              margin: 'md',
              wrap: true,
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
                label: '📍 立即查我訂閱',
                text: '查我訂閱',
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '🗺️ 查全台',
                text: '查全台',
              },
            },
          ],
        },
      },
      quickReply: this.getDefaultQuickReplies(),
    };
  }

  public generateCityPickerQuickMenu(user: UserSubscription): any {
    return {
      type: 'text',
      text: `🏙️ 請點選或輸入您想新增/關注的縣市：\n\n目前已訂閱：${user.subscribedCities.join('、') || '尚未設定'}\n\n可以直接輸入「訂閱 台北市 桃園市」或點選下方區域按鈕快速添加：`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: { type: 'message', label: '➕ 訂閱雙北', text: '訂閱 臺北市 新北市' },
          },
          {
            type: 'action',
            action: { type: 'message', label: '➕ 訂閱桃竹苗', text: '訂閱 桃園市 新竹市 新竹縣 苗栗縣' },
          },
          {
            type: 'action',
            action: { type: 'message', label: '➕ 訂閱中彰投', text: '訂閱 臺中市 彰化縣 南投縣' },
          },
          {
            type: 'action',
            action: { type: 'message', label: '➕ 訂閱南高屏', text: '訂閱 臺南市 高雄市 屏東縣' },
          },
          {
            type: 'action',
            action: { type: 'message', label: '➕ 訂閱宜花東', text: '訂閱 宜蘭縣 花蓮縣 臺東縣' },
          },
        ],
      },
    };
  }

  public getDefaultQuickReplies(): any {
    return {
      items: [
        {
          type: 'action',
          action: { type: 'message', label: '🗺️ 查全台狀況', text: '查全台' },
        },
        {
          type: 'action',
          action: { type: 'message', label: '📍 查我訂閱的縣市', text: '查我訂閱' },
        },
        {
          type: 'action',
          action: { type: 'message', label: '⚙️ 我的設定', text: '我的設定' },
        },
        {
          type: 'action',
          action: { type: 'message', label: '🔴 即時推播模式', text: '即時推播' },
        },
        {
          type: 'action',
          action: { type: 'message', label: '⏰ 每日定時模式', text: '定時推播' },
        },
        {
          type: 'action',
          action: { type: 'message', label: '❓ 使用說明', text: '說明' },
        },
      ],
    };
  }

  private getFrequencyLabel(frequency: AlertFrequency): string {
    switch (frequency) {
      case 'realtime':
        return '🔴 即時異動推播 (即時發送)';
      case 'daily_scheduled':
        return '⏰ 每日定時推播';
      case 'alert_only':
        return '🚨 僅在停班停課時通知';
      case 'disabled':
        return '🔕 已暫停推播';
      default:
        return '即時異動推播';
    }
  }
}

export const lineBotService = new LineBotService();
