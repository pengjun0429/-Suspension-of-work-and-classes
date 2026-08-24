import type { CountyStatus, UserSubscription, AlertFrequency } from '../types';
import { TAIWAN_COUNTIES_BASE, matchCityName } from './dgpaData';

interface AppState {
  counties: CountyStatus[];
  subscribers: UserSubscription[];
  logs: any[];
  datasetMeta: any;
}

export const lineBotService = {
  verifySignature(body: string, signature: string, channelSecret: string): boolean {
    if (!channelSecret || !signature) return false;
    try {
      // Cloudflare Workers don't have Node.js crypto, use Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(channelSecret);
      const bodyData = encoder.encode(body);

      return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then(key => crypto.subtle.sign('HMAC', key, bodyData))
        .then(signatureBuffer => {
          const hash = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
          return hash === signature;
        })
        .catch(() => false) as any;
    } catch {
      return false;
    }
  },

  async processUserCommand(user: UserSubscription, text: string, store: AppState): Promise<{ messages: any[]; summary: string }> {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Check all Taiwan overview
    if (lower === '查全台' || lower === '全台' || lower === '全台狀況' || lower === '全台停班停課' || lower === '全台停班課' || lower === '今日停班停課' || lower === '最新狀態') {
      return {
        messages: [generateAllCountiesFlex(store.counties)],
        summary: '回傳全台 22 縣市最新停班停課看板',
      };
    }

    // Check user's subscribed cities
    if (lower === '查我訂閱' || lower === '查我的縣市' || lower === '我的縣市' || lower === '我的訂閱' || lower === '訂閱狀況') {
      return {
        messages: [generateUserSubscribedFlex(user, store.counties)],
        summary: `回傳用戶訂閱的縣市狀態 (${user.subscribedCities.join(', ')})`,
      };
    }

    // Check Settings / Profile
    if (lower === '我的設定' || lower === '設定' || lower === '個人設定' || lower === '推播設定' || lower === '查看設定') {
      return {
        messages: [generateSettingsFlex(user)],
        summary: '回傳用戶訂閱與提醒偏好設定卡片',
      };
    }

    // Change Notification Frequency commands
    if (lower.includes('即時') && (lower.includes('推播') || lower.includes('警報') || lower.includes('模式') || lower.includes('設定'))) {
      user.alertFrequency = 'realtime';
      return {
        messages: [{ type: 'text', text: '✅ 已將提醒模式切換為：【🔴 即時異動推播】' }],
        summary: '切換提醒頻率為：即時異動推播',
      };
    }

    if (lower.includes('定時') && (lower.includes('推播') || lower.includes('每日') || lower.includes('設定') || lower.includes('模式'))) {
      user.alertFrequency = 'daily_scheduled';
      return {
        messages: [{ type: 'text', text: `✅ 已將提醒模式切換為：【⏰ 每日定時推播】\n\n系統將於每天【${user.scheduledTime}】為您整理並推送您訂閱縣市的最新上班上課狀態。` }],
        summary: `切換提醒頻率為：每日定時推播 (${user.scheduledTime})`,
      };
    }

    if (lower.includes('僅') && (lower.includes('停班') || lower.includes('停課') || lower.includes('警報'))) {
      user.alertFrequency = 'alert_only';
      return {
        messages: [{ type: 'text', text: '✅ 已將提醒模式切換為：【🚨 僅在停班停課時通知】' }],
        summary: '切換提醒頻率為：僅停班停課時通知',
      };
    }

    if (lower.includes('關閉') || lower.includes('暫停') || lower === '停止通知' || lower === '靜音') {
      user.alertFrequency = 'disabled';
      return {
        messages: [{ type: 'text', text: '🔕 已暫停主動自動推播提醒。' }],
        summary: '已暫停自動推播',
      };
    }

    // Change Scheduled Time
    const timeMatch = trimmed.match(/(?:設定時間|時間|每日時間|每天)?\s*([0-2]?[0-9])[:：點時]([0-5][0-9])?/);
    if (timeMatch && (trimmed.includes('時間') || trimmed.includes('點') || trimmed.includes(':') || trimmed.includes('：'))) {
      const hours = timeMatch[1].padStart(2, '0');
      const mins = (timeMatch[2] || '00').padStart(2, '0');
      const formattedTime = `${hours}:${mins}`;
      user.scheduledTime = formattedTime;
      return {
        messages: [{ type: 'text', text: `⏰ 已成功將每日定時推播時間更新為：【${formattedTime}】！` }],
        summary: `更新定時推播時間為: ${formattedTime}`,
      };
    }

    // Subscribe
    if (trimmed.startsWith('訂閱') || trimmed.startsWith('加訂') || trimmed.startsWith('設定縣市') || trimmed.startsWith('選縣市')) {
      const cityQuery = trimmed.replace(/^(訂閱|加訂|設定縣市|選縣市)\s*/, '');
      if (!cityQuery) {
        return {
          messages: [{ type: 'text', text: '請輸入縣市名稱，例如：「訂閱 臺北市 新北市」' }],
          summary: '提供縣市快速選單',
        };
      }

      // 訂閱全台
      if (cityQuery === '全台' || cityQuery === '全部' || cityQuery === '所有縣市') {
        const allCities = TAIWAN_COUNTIES_BASE.map(c => c.cityName);
        const added = allCities.filter(c => !user.subscribedCities.includes(c));
        user.subscribedCities = allCities;
        return {
          messages: [{ type: 'text', text: `🎉 已為您訂閱全台 22 縣市！\n\n目前訂閱縣市：\n📌 ${user.subscribedCities.join('、')}` }],
          summary: `訂閱全台 22 縣市`,
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

      return {
        messages: [{
          type: 'text',
          text: added.length > 0
            ? `🎉 成功新增訂閱縣市：【${added.join('、')}】！\n\n目前您關注的縣市清單：\n📌 ${user.subscribedCities.join('、')}`
            : `📌 目前已訂閱縣市：${user.subscribedCities.join('、')}`,
        }],
        summary: `更新訂閱縣市: ${user.subscribedCities.join(', ')}`,
      };
    }

    // Unsubscribe
    if (trimmed.startsWith('取消訂閱') || trimmed.startsWith('退訂') || trimmed.startsWith('刪除縣市')) {
      const cityQuery = trimmed.replace(/^(取消訂閱|退訂|刪除縣市)\s*/, '');

      // 取消訂閱全台
      if (cityQuery === '全台' || cityQuery === '全部' || cityQuery === '所有縣市') {
        const removedCount = user.subscribedCities.length;
        user.subscribedCities = [];
        return {
          messages: [{ type: 'text', text: `🗑️ 已取消訂閱全台 ${removedCount} 個縣市。\n\n如需重新訂閱，請傳送「訂閱 全台」或「訂閱 臺北市」。` }],
          summary: '取消訂閱全台',
        };
      }

      const removed: string[] = [];
      user.subscribedCities = user.subscribedCities.filter(c => {
        const matched = cityQuery.includes(c) || cityQuery.includes(c.replace('臺', '台'));
        if (matched) removed.push(c);
        return !matched;
      });

      return {
        messages: [{
          type: 'text',
          text: removed.length > 0
            ? `🗑️ 已取消訂閱：【${removed.join('、')}】\n\n目前保留的訂閱縣市：\n📌 ${user.subscribedCities.length > 0 ? user.subscribedCities.join('、') : '（目前無訂閱任何縣市）'}`
            : `找不到欲取消的縣市，您目前訂閱的是：${user.subscribedCities.join('、')}`,
        }],
        summary: `取消訂閱: ${removed.join(', ')}`,
      };
    }

    // Check specific city
    const matchedCity = matchCityName(trimmed);
    if (matchedCity) {
      const county = store.counties.find((c: CountyStatus) => c.cityName === matchedCity) || store.counties[0];
      return {
        messages: [generateSingleCountyFlex(county, user)],
        summary: `回傳 ${county.cityName} 最新停班停課狀態 (${county.status})`,
      };
    }

    // Help
    if (lower === '說明' || lower === 'help' || lower === '指令' || lower === '選單' || lower === '功能') {
      return {
        messages: [generateWelcomeMessage(user)],
        summary: '回傳使用說明與指令引導',
      };
    }

    // Default
    return {
      messages: [{
        type: 'text',
        text: `👋 您好！我是「LINE 停班停課自動推送機器人」。\n\n您可以隨時傳送：\n• 📍 輸入縣市名稱（如「台北市」、「高雄」）查詢即時狀態\n• 🗺️「查全台」查看全台灣 22 縣市狀態總覽\n• 🔔「訂閱 台北市 新北市」自訂關注縣市\n• ⏰「設定時間 07:00」自訂每日定時推播時間\n• ⚙️「我的設定」管理通知偏好與提醒頻率`,
      }],
      summary: `回傳預設引導選單`,
    };
  },

  async processPostback(user: UserSubscription, data: string, store: AppState): Promise<{ messages: any[]; summary: string }> {
    const params = new URLSearchParams(data);
    const action = params.get('action');

    if (action === 'toggle_city') {
      const city = params.get('city');
      if (city) {
        if (user.subscribedCities.includes(city)) {
          user.subscribedCities = user.subscribedCities.filter((c: string) => c !== city);
          return {
            messages: [{ type: 'text', text: `🗑️ 已為您移除關注：【${city}】\n\n目前訂閱縣市：${user.subscribedCities.join('、') || '（尚未訂閱任何縣市）'}` }],
            summary: `移除關注縣市: ${city}`,
          };
        } else {
          user.subscribedCities.push(city);
          return {
            messages: [{ type: 'text', text: `🎉 已為您加入關注：【${city}】！\n\n目前訂閱縣市：${user.subscribedCities.join('、')}` }],
            summary: `加入關注縣市: ${city}`,
          };
        }
      }
    }

    if (action === 'set_frequency') {
      const freq = params.get('frequency') as AlertFrequency;
      if (freq) {
        user.alertFrequency = freq;
        return {
          messages: [{ type: 'text', text: `✅ 提醒模式已切換為：【${getFrequencyLabel(freq)}】` }],
          summary: `切換推播頻率為: ${freq}`,
        };
      }
    }

    if (action === 'set_time') {
      const time = params.get('time');
      if (time) {
        user.scheduledTime = time;
        return {
          messages: [{ type: 'text', text: `⏰ 定時推播時間已設定為：【${time}】` }],
          summary: `設定定時時間為: ${time}`,
        };
      }
    }

    return {
      messages: [generateWelcomeMessage(user)],
      summary: '預設回覆',
    };
  },

  async replyMessage(replyToken: string, messages: any[], token: string): Promise<boolean> {
    if (!token || !replyToken) return false;
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replyToken, messages }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async pushMessage(to: string | string[], messages: any[], token?: string): Promise<{ success: boolean; simulated: boolean; error?: string }> {
    if (!token) {
      return { success: true, simulated: true };
    }

    const targets = Array.isArray(to) ? to : [to];
    try {
      const endpoint = targets.length > 1
        ? 'https://api.line.me/v2/bot/message/multicast'
        : 'https://api.line.me/v2/bot/message/push';

      const payload = targets.length > 1
        ? { to: targets, messages }
        : { to: targets[0], messages };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
  },

  generateChangeAlertFlex(user: UserSubscription, changedCounties: CountyStatus[]): any {
    const userSummaryText = changedCounties
      .map(c => `${c.isSuspended ? '🔴' : c.isPartial ? '🟡' : '🟢'} ${c.cityName}：${c.status}`)
      .join('\n');

    return {
      type: 'flex',
      altText: `🚨【停班停課即時異動警報】${changedCounties.map(c => c.cityName).join('、')}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: changedCounties.some(c => c.isSuspended) ? '#991B1B' : '#0F172A',
          paddingAll: '16px',
          contents: [{
            type: 'text',
            text: '🚨 停班停課即時異動通知',
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
          }],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          contents: [
            { type: 'text', text: `親愛的 ${user.displayName}：您關注的縣市最新上班上課狀況已更新！`, size: 'xs', color: '#475569', wrap: true },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#F8FAFC',
              cornerRadius: '8px',
              paddingAll: '12px',
              margin: 'md',
              contents: [{ type: 'text', text: userSummaryText, size: 'sm', weight: 'bold', color: '#0F172A', wrap: true }],
            },
          ],
        },
      },
    };
  },
};

function generateWelcomeMessage(user: UserSubscription): any {
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
        contents: [{
          type: 'text',
          text: '⚡ 停班停課即時通知',
          weight: 'bold',
          size: 'lg',
          color: '#38BDF8',
        }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `您好 ${user.displayName}！`, weight: 'bold', size: 'sm', color: '#1E293B' },
          { type: 'text', text: '您可以輸入縣市名稱查詢，或使用「查全台」查看全台灣狀態。', size: 'xs', color: '#64748B', margin: 'sm' },
        ],
      },
    },
  };
}

function generateAllCountiesFlex(counties: CountyStatus[]): any {
  const suspendedCount = counties.filter(c => c.isSuspended).length;
  const normalCount = counties.filter(c => !c.isSuspended && !c.isPartial).length;

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
        contents: [{
          type: 'text',
          text: '🇹🇼 全台停班停課即時看板',
          weight: 'bold',
          size: 'md',
          color: '#FFFFFF',
        }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        contents: counties.map(c => ({
          type: 'text',
          text: `${c.isSuspended ? '🔴' : c.isPartial ? '🟡' : '🟢'} ${c.cityName}: ${c.status}`,
          size: 'xxs',
          color: '#1E293B',
          wrap: true,
          margin: 'xs',
        })),
      },
    },
  };
}

function generateUserSubscribedFlex(user: UserSubscription, counties: CountyStatus[]): any {
  const userCounties = counties.filter(c => user.subscribedCities.includes(c.cityName));

  if (userCounties.length === 0) {
    return {
      type: 'text',
      text: '⚠️ 您目前尚未關注任何縣市！\n\n請傳送「訂閱 台北市」來設定您關心的地區。',
    };
  }

  return {
    type: 'flex',
    altText: `📍 您訂閱的縣市狀態`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        paddingAll: '16px',
        contents: [{
          type: 'text',
          text: '📍 您關注的縣市停班停課情形',
          weight: 'bold',
          size: 'md',
          color: '#38BDF8',
        }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        contents: userCounties.map(c => ({
          type: 'text',
          text: `${c.isSuspended ? '🔴' : c.isPartial ? '🟡' : '🟢'} ${c.cityName}: ${c.status}`,
          size: 'sm',
          color: c.isSuspended ? '#DC2626' : '#334155',
          wrap: true,
          margin: 'sm',
        })),
      },
    },
  };
}

function generateSingleCountyFlex(county: CountyStatus, user: UserSubscription): any {
  return {
    type: 'flex',
    altText: `【${county.cityName}】${county.status}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: county.isSuspended ? '#991B1B' : '#0F172A',
        paddingAll: '16px',
        contents: [{
          type: 'text',
          text: `${county.cityName} 即時狀態`,
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF',
        }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: county.status, size: 'md', weight: 'bold', color: '#1E293B', wrap: true },
          { type: 'text', text: `來源：行政院人事行政總處 (DGPA)`, size: 'xxs', color: '#94A3B8', margin: 'md' },
        ],
      },
    },
  };
}

function generateSettingsFlex(user: UserSubscription): any {
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
        contents: [{
          type: 'text',
          text: '⚙️ 停班停課推播與訂閱偏好',
          weight: 'bold',
          size: 'md',
          color: '#38BDF8',
        }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: `📌 關注縣市：${user.subscribedCities.join('、')}`, size: 'sm', color: '#0284C7', wrap: true },
          { type: 'text', text: `🔔 提醒模式：${getFrequencyLabel(user.alertFrequency)}`, size: 'sm', color: '#0F172A', margin: 'sm' },
          { type: 'text', text: `⏰ 定時時間：${user.scheduledTime}`, size: 'sm', color: '#0F172A', margin: 'sm' },
        ],
      },
    },
  };
}

function getFrequencyLabel(frequency: AlertFrequency): string {
  switch (frequency) {
    case 'realtime': return '🔴 即時異動推播';
    case 'daily_scheduled': return '⏰ 每日定時推播';
    case 'alert_only': return '🚨 僅在停班停課時通知';
    case 'disabled': return '🔕 已暫停推播';
    default: return '即時異動推播';
  }
}
