import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { storage } from './storage';
import { fetchDgpaOpenData, parseStatusText, TAIWAN_COUNTIES_BASE, matchCityName } from './dgpaData';
import { lineBotService } from './lineBotService';
import type { CountyStatus, UserSubscription } from '../types';

export interface Env {
  KV: KVNamespace;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  APP_URL: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_CHANNEL_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'LINE Work & School Closure Alert Bot',
    time: new Date().toISOString(),
  });
});

// Auth - Login
app.post('/api/auth/login', async (c) => {
  try {
    const { password } = await c.req.json();
    const correctPassword = c.env.ADMIN_PASSWORD || 'admin123';

    if (password === correctPassword) {
      // Generate simple token
      const token = btoa(`admin:${Date.now()}`);
      return c.json({ success: true, token });
    }

    return c.json({ success: false, message: '密碼錯誤' }, 401);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message }, 500);
  }
});

// Auth - Verify token
app.post('/api/auth/verify', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) {
      return c.json({ valid: false }, 401);
    }

    // Simple token validation (in production, use JWT)
    const decoded = atob(token);
    if (decoded.startsWith('admin:')) {
      return c.json({ valid: true });
    }

    return c.json({ valid: false }, 401);
  } catch {
    return c.json({ valid: false }, 401);
  }
});

// Get full state
app.get('/api/status', async (c) => {
  const store = await storage.load(c.env.KV);
  return c.json({
    counties: store.counties,
    subscribers: store.subscribers,
    config: {
      channelAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN || '',
      channelSecret: c.env.LINE_CHANNEL_SECRET || '',
      isConfigured: !!(c.env.LINE_CHANNEL_ACCESS_TOKEN && c.env.LINE_CHANNEL_SECRET),
      webhookUrl: `${c.env.APP_URL}/api/line/webhook`,
      botBasicId: '@190azbzx',
      autoPollingEnabled: true,
      pollingIntervalSeconds: 60,
    },
    datasetMeta: store.datasetMeta,
    logs: store.logs,
  });
});

// Force refresh from DGPA
app.post('/api/refresh-dgpa', async (c) => {
  try {
    const store = await storage.load(c.env.KV);
    const { counties: fetchedCounties, raw, isLive } = await fetchDgpaOpenData();
    const changedCounties: CountyStatus[] = [];

    for (const fetched of fetchedCounties) {
      const existing = store.counties.find((c: CountyStatus) => c.cityName === fetched.cityName);
      if (existing && (existing.status !== fetched.status || existing.isSuspended !== fetched.isSuspended)) {
        changedCounties.push(fetched);
      }
    }

    store.counties = fetchedCounties;
    store.datasetMeta.lastFetchedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    store.datasetMeta.fetchStatus = 'ok';
    store.datasetMeta.itemCount = fetchedCounties.length;
    store.datasetMeta.rawSource = raw;
    store.datasetMeta.isSimulatedData = false;

    await storage.save(c.env.KV, store);

    return c.json({
      success: true,
      hasChanges: changedCounties.length > 0,
      changedCounties,
      counties: store.counties,
      datasetMeta: store.datasetMeta,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Failed to refresh DGPA' }, 500);
  }
});

// LINE Webhook
app.post('/api/line/webhook', async (c) => {
  try {
    const body = await c.req.json();
    const signature = c.req.header('x-line-signature');
    const channelSecret = c.env.LINE_CHANNEL_SECRET;

    if (channelSecret && signature) {
      const rawBody = JSON.stringify(body);
      const isValid = lineBotService.verifySignature(rawBody, signature, channelSecret);
      if (!isValid) {
        return c.json({ message: 'Invalid signature' }, 403);
      }
    }

    const store = await storage.load(c.env.KV);
    const events = body.events || [];
    const results: any[] = [];

    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId) continue;

      let user = store.subscribers.find((s: UserSubscription) => s.userId === userId);
      if (!user) {
        user = {
          id: `sub_${crypto.randomUUID().slice(0, 8)}`,
          userId,
          displayName: `LINE 用戶 ${userId.slice(-4)}`,
          subscribedCities: ['臺北市', '新北市'],
          alertFrequency: 'realtime',
          scheduledTime: '07:00',
          createdAt: new Date().toISOString(),
        };
        store.subscribers.push(user);
      }

      if (event.type === 'message' && event.message?.type === 'text') {
        const userText = event.message.text.trim();
        const response = await lineBotService.processUserCommand(user, userText, store);

        if (event.replyToken && c.env.LINE_CHANNEL_ACCESS_TOKEN) {
          await lineBotService.replyMessage(event.replyToken, response.messages, c.env.LINE_CHANNEL_ACCESS_TOKEN);
        }

        store.logs.unshift({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
          type: 'incoming_webhook',
          targetCount: 1,
          targetUsers: [user.displayName],
          title: `收到指令: ${userText}`,
          content: response.summary,
          status: 'success',
        });

        results.push({ userId, text: userText, response });
      }
    }

    await storage.save(c.env.KV, store);
    return c.json({ status: 'ok', processed: results.length });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Webhook processing failed' }, 500);
  }
});

// LINE Chat Simulator
app.post('/api/line/simulate-chat', async (c) => {
  try {
    const { userId = 'simulated_user_current', text = '', postbackData } = await c.req.json();
    const store = await storage.load(c.env.KV);

    let user = store.subscribers.find((s: UserSubscription) => s.userId === userId);
    if (!user) {
      user = {
        id: `sub_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        displayName: '網頁模擬用戶 (Simulator)',
        subscribedCities: ['臺北市', '新北市'],
        alertFrequency: 'realtime',
        scheduledTime: '07:00',
        createdAt: new Date().toISOString(),
        isMock: true,
      };
      store.subscribers.push(user);
    }

    let response;
    if (postbackData) {
      response = await lineBotService.processPostback(user, postbackData, store);
    } else {
      response = await lineBotService.processUserCommand(user, text, store);
    }

    const updatedUser = store.subscribers.find((s: UserSubscription) => s.userId === userId);
    await storage.save(c.env.KV, store);

    return c.json({
      success: true,
      user: updatedUser,
      messages: response.messages,
      summary: response.summary,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message }, 500);
  }
});

// Test push
app.post('/api/line/test-send', async (c) => {
  try {
    const { userId, type = 'instant_test', customMessage } = await c.req.json();
    const store = await storage.load(c.env.KV);
    const subscribers = store.subscribers;
    const targetUsers = userId ? subscribers.filter((s: UserSubscription) => s.userId === userId) : subscribers;

    if (targetUsers.length === 0) {
      return c.json({ success: false, error: '找不到推播目標用戶' }, 404);
    }

    for (const user of targetUsers) {
      const messages = customMessage
        ? [{ type: 'text', text: customMessage }]
        : [lineBotService.generateUserSubscribedFlex(user)];

      const pushRes = await lineBotService.pushMessage(user.userId, messages, c.env.LINE_CHANNEL_ACCESS_TOKEN);

      store.logs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
        type: 'test_push',
        targetCount: 1,
        targetUsers: [user.displayName],
        title: `手動測試推播: ${user.displayName}`,
        content: customMessage || `發送關注縣市快訊 (${user.subscribedCities.join('、')})`,
        status: pushRes.simulated ? 'simulated' : pushRes.success ? 'success' : 'failed',
        details: pushRes.simulated ? '（未設定 LINE Token，以模擬日誌紀錄）' : pushRes.error,
      });
    }

    await storage.save(c.env.KV, store);
    return c.json({ success: true, count: targetUsers.length, logs: store.logs });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message }, 500);
  }
});

// Save subscriber
app.post('/api/subscribers', async (c) => {
  try {
    const sub = await c.req.json();
    if (!sub.userId) {
      return c.json({ error: 'userId is required' }, 400);
    }
    const store = await storage.load(c.env.KV);
    const existing = store.subscribers.find((s: UserSubscription) => s.userId === sub.userId);
    if (existing) {
      Object.assign(existing, sub);
    } else {
      store.subscribers.push({
        id: `sub_${crypto.randomUUID().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        alertFrequency: 'realtime',
        scheduledTime: '07:00',
        subscribedCities: ['臺北市', '新北市'],
        ...sub,
      });
    }
    await storage.save(c.env.KV, store);
    const saved = store.subscribers.find((s: UserSubscription) => s.userId === sub.userId);
    return c.json({ success: true, subscriber: saved });
  } catch (err: any) {
    return c.json({ error: err?.message }, 500);
  }
});

// Delete subscriber
app.delete('/api/subscribers/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const store = await storage.load(c.env.KV);
    const before = store.subscribers.length;
    store.subscribers = store.subscribers.filter((s: UserSubscription) => s.userId !== userId);
    const deleted = store.subscribers.length < before;
    await storage.save(c.env.KV, store);
    return c.json({ success: deleted });
  } catch (err: any) {
    return c.json({ error: err?.message }, 500);
  }
});

// Update config
app.post('/api/config', async (c) => {
  try {
    const body = await c.req.json();
    // Config is stored in env vars, not KV. Just return current config.
    return c.json({
      success: true,
      config: {
        channelAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN || '',
        channelSecret: c.env.LINE_CHANNEL_SECRET || '',
        isConfigured: !!(c.env.LINE_CHANNEL_ACCESS_TOKEN && c.env.LINE_CHANNEL_SECRET),
        webhookUrl: `${c.env.APP_URL}/api/line/webhook`,
        botBasicId: '@190azbzx',
        autoPollingEnabled: true,
        pollingIntervalSeconds: 60,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message }, 500);
  }
});

// Drill scenarios
app.post('/api/drill/apply-scenario', async (c) => {
  try {
    const { scenarioId } = await c.req.json();
    const store = await storage.load(c.env.KV);
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    let newCounties = storage.getDefaultCounties();

    if (scenarioId === 'typhoon_north') {
      newCounties = newCounties.map(c => {
        if (['keelung', 'taipei', 'newtaipei', 'taoyuan', 'yilan'].includes(c.id)) {
          return { ...c, status: '今日停止上班、停止上課。', isSuspended: true, isPartial: false, updateTime: nowStr, details: '受強烈颱風暴風圈影響，為顧及市民安全停止上班上課。' };
        }
        if (['hsinchu_city', 'hsinchu_county'].includes(c.id)) {
          return { ...c, status: '下午起停止上班、停止上課。', isSuspended: true, isPartial: true, updateTime: nowStr, details: '上午照常，12:00 起停止上班上課。' };
        }
        return c;
      });
    } else if (scenarioId === 'typhoon_south_east') {
      newCounties = newCounties.map(c => {
        if (['kaohsiung', 'tainan', 'pingtung', 'hualien', 'taitung', 'penghu'].includes(c.id)) {
          return { ...c, status: '今日停止上班、停止上課。', isSuspended: true, isPartial: false, updateTime: nowStr, details: '達天然災害停止上班及上課標準。' };
        }
        if (['chiayi_city', 'chiayi_county'].includes(c.id)) {
          return { ...c, status: '部分山區鄉鎮停止上班、停止上課。', isSuspended: false, isPartial: true, updateTime: nowStr, details: '阿里山鄉等特定地區停止上班上課。' };
        }
        return c;
      });
    } else if (scenarioId === 'heavy_rain_mountain') {
      newCounties = newCounties.map(c => {
        if (['nantou', 'hualien', 'yilan'].includes(c.id)) {
          return { ...c, status: '特定山區學校與鄉鎮停止上班、停止上課。', isSuspended: false, isPartial: true, updateTime: nowStr, details: '土石流黃色警戒，部分山區道路中斷學校停課。' };
        }
        return c;
      });
    } else if (scenarioId === 'all_normal') {
      newCounties = storage.getDefaultCounties();
    }

    store.counties = newCounties;
    store.datasetMeta.isSimulatedData = true;
    store.datasetMeta.lastFetchedAt = nowStr;
    await storage.save(c.env.KV, store);

    return c.json({ success: true, counties: store.counties, logs: store.logs });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message }, 500);
  }
});

// Update single county
app.post('/api/drill/update-county', async (c) => {
  try {
    const { countyId, status, isSuspended, isPartial, details } = await c.req.json();
    const store = await storage.load(c.env.KV);
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    store.counties = store.counties.map((county: CountyStatus) => {
      if (county.id === countyId) {
        return { ...county, status, isSuspended: !!isSuspended, isPartial: !!isPartial, updateTime: nowStr, details, source: '管理員手動調整 / 演練模擬' };
      }
      return county;
    });

    store.datasetMeta.isSimulatedData = true;
    store.datasetMeta.lastFetchedAt = nowStr;
    await storage.save(c.env.KV, store);

    return c.json({ success: true, counties: store.counties, logs: store.logs });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message }, 500);
  }
});

// Clear logs
app.delete('/api/logs', async (c) => {
  const store = await storage.load(c.env.KV);
  store.logs = [];
  await storage.save(c.env.KV, store);
  return c.json({ success: true });
});

// Scheduled handler for Cron Triggers
async function scheduledHandler(env: Env): Promise<void> {
  const store = await storage.load(env.KV);

  // Fetch DGPA data
  try {
    const { counties: fetchedCounties, raw } = await fetchDgpaOpenData();
    const changedCounties: CountyStatus[] = [];

    for (const fetched of fetchedCounties) {
      const existing = store.counties.find((c: CountyStatus) => c.cityName === fetched.cityName);
      if (existing && (existing.status !== fetched.status || existing.isSuspended !== fetched.isSuspended)) {
        changedCounties.push(fetched);
      }
    }

    // Only save if there are changes
    if (changedCounties.length > 0) {
      store.counties = fetchedCounties;
      store.datasetMeta.lastFetchedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      store.datasetMeta.fetchStatus = 'ok';
      store.datasetMeta.itemCount = fetchedCounties.length;
      store.datasetMeta.rawSource = raw;

      await storage.save(env.KV, store);

      // Send push notifications
      if (env.LINE_CHANNEL_ACCESS_TOKEN) {
        const changedCityNames = changedCounties.map(c => c.cityName);
        const targetUsers = store.subscribers.filter((sub: UserSubscription) => {
          if (sub.alertFrequency === 'disabled') return false;
          return sub.subscribedCities.some((city: string) => changedCityNames.includes(city));
        });

        for (const user of targetUsers) {
          const userRelevantCounties = changedCounties.filter((c: CountyStatus) => user.subscribedCities.includes(c.cityName));
          if (userRelevantCounties.length === 0) continue;

          const flexMessage = lineBotService.generateChangeAlertFlex(user, userRelevantCounties);
          await lineBotService.pushMessage(user.userId, [flexMessage], env.LINE_CHANNEL_ACCESS_TOKEN);
        }
      }
    }
  } catch (err) {
    console.error('Scheduled check failed:', err);
  }
}

// Fallback to assets for non-API routes
app.get('*', async (c) => {
  // Try to serve from assets first
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  // Fallback to index.html for SPA routing
  const indexResponse = await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
  return indexResponse;
});

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Env) => {
    await scheduledHandler(env);
  },
};
