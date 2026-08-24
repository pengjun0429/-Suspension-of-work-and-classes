import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { schedulerService } from './schedulerService';
import { lineBotService } from './lineBotService';
import { getDefaultCounties } from './dgpaData';

export const apiRouter = Router();

/**
 * GET /api/status - Get full state
 */
apiRouter.get('/status', (req: Request, res: Response) => {
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https') as string;
  res.json({
    counties: storage.getCounties(),
    subscribers: storage.getSubscribers(),
    config: storage.getConfig(host, proto),
    datasetMeta: storage.getDatasetMeta(),
    logs: storage.getLogs(),
  });
});

/**
 * POST /api/refresh-dgpa - Force live refresh from DGPA
 */
apiRouter.post('/refresh-dgpa', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.checkAndUpdateDgpa(true);
    storage.addLog({
      type: 'incoming_webhook',
      targetCount: 0,
      targetUsers: [],
      title: '手動重新整理 DGPA',
      content: `已成功與行政院人事行政總處 (Dataset 20457) 同步。異動縣市數: ${result.changedCounties.length}`,
      status: 'success',
    });
    res.json({
      success: true,
      hasChanges: result.hasChanges,
      changedCounties: result.changedCounties,
      counties: storage.getCounties(),
      datasetMeta: storage.getDatasetMeta(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to refresh DGPA' });
  }
});

/**
 * POST /api/line/webhook - Official LINE Webhook endpoint
 */
apiRouter.post('/line/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    const config = storage.getConfig();

    // If channel secret is set, verify signature
    if (config.channelSecret && signature) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const isValid = lineBotService.verifySignature(rawBody, signature, config.channelSecret);
      if (!isValid) {
        return res.status(403).json({ message: 'Invalid signature' });
      }
    }

    const events = req.body.events || [];
    const results = await lineBotService.handleWebhookEvents(events);

    res.status(200).json({ status: 'ok', processed: results.length });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err?.message || 'Webhook processing failed' });
  }
});

/**
 * POST /api/line/simulate-chat - In-browser interactive chat simulator
 */
apiRouter.post('/line/simulate-chat', async (req: Request, res: Response) => {
  try {
    const { userId = 'simulated_user_current', text = '', postbackData } = req.body;
    let user = storage.getSubscriber(userId);

    if (!user) {
      user = storage.saveSubscriber({
        userId,
        displayName: '網頁模擬用戶 (Simulator)',
        subscribedCities: ['臺北市', '新北市'],
        alertFrequency: 'realtime',
        scheduledTime: '07:00',
        isMock: true,
      });
    }

    let response;
    if (postbackData) {
      response = await lineBotService.processPostback(user, postbackData);
    } else {
      response = await lineBotService.processUserCommand(user, text);
    }

    // Refresh subscriber after command
    const updatedUser = storage.getSubscriber(userId);

    res.json({
      success: true,
      user: updatedUser,
      messages: response.messages,
      summary: response.summary,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/line/test-send - Test sending push alert
 */
apiRouter.post('/line/test-send', async (req: Request, res: Response) => {
  try {
    const { userId, type = 'instant_test', customMessage } = req.body;
    const subscribers = storage.getSubscribers();
    const targetUsers = userId ? subscribers.filter(s => s.userId === userId) : subscribers;

    if (targetUsers.length === 0) {
      return res.status(404).json({ success: false, error: '找不到推播目標用戶' });
    }

    for (const user of targetUsers) {
      const messages = customMessage
        ? [{ type: 'text', text: customMessage }]
        : [lineBotService.generateUserSubscribedFlex(user)];

      const pushRes = await lineBotService.pushMessage(user.userId, messages);

      storage.addLog({
        type: 'test_push',
        targetCount: 1,
        targetUsers: [user.displayName],
        title: `手動測試推播: ${user.displayName}`,
        content: customMessage || `發送關注縣市快訊 (${user.subscribedCities.join('、')})`,
        status: pushRes.simulated ? 'simulated' : pushRes.success ? 'success' : 'failed',
        details: pushRes.simulated ? '（未設定 LINE Token，以模擬日誌紀錄）' : pushRes.error,
      });
    }

    res.json({
      success: true,
      count: targetUsers.length,
      logs: storage.getLogs(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/subscribers - Save or update subscriber
 */
apiRouter.post('/subscribers', (req: Request, res: Response) => {
  try {
    const sub = req.body;
    if (!sub.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const saved = storage.saveSubscriber(sub);
    res.json({ success: true, subscriber: saved });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * DELETE /api/subscribers/:userId - Delete subscriber
 */
apiRouter.delete('/subscribers/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const deleted = storage.deleteSubscriber(userId);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/config - Update LINE Bot & Polling Config
 */
apiRouter.post('/config', (req: Request, res: Response) => {
  try {
    const { channelAccessToken, channelSecret, autoPollingEnabled, pollingIntervalSeconds, botBasicId } = req.body;
    storage.updateConfig({
      channelAccessToken,
      channelSecret,
      autoPollingEnabled,
      pollingIntervalSeconds,
      botBasicId,
    });
    res.json({ success: true, config: storage.getConfig() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

/**
 * POST /api/drill/apply-scenario - Apply emergency drill scenario
 */
apiRouter.post('/drill/apply-scenario', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.body;
    const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    let newCounties = getDefaultCounties();

    if (scenarioId === 'typhoon_north') {
      // 北部停止上班上課
      newCounties = newCounties.map(c => {
        if (['keelung', 'taipei', 'newtaipei', 'taoyuan', 'yilan'].includes(c.id)) {
          return {
            ...c,
            status: '今日停止上班、停止上課。',
            isSuspended: true,
            isPartial: false,
            updateTime: nowStr,
            details: '受強烈颱風暴風圈影響，為顧及市民安全停止上班上課。',
          };
        }
        if (['hsinchu_city', 'hsinchu_county'].includes(c.id)) {
          return {
            ...c,
            status: '下午起停止上班、停止上課。',
            isSuspended: true,
            isPartial: true,
            updateTime: nowStr,
            details: '上午照常，12:00 起停止上班上課。',
          };
        }
        return c;
      });
    } else if (scenarioId === 'typhoon_south_east') {
      // 南部東部停止上班上課
      newCounties = newCounties.map(c => {
        if (['kaohsiung', 'tainan', 'pingtung', 'hualien', 'taitung', 'penghu'].includes(c.id)) {
          return {
            ...c,
            status: '今日停止上班、停止上課。',
            isSuspended: true,
            isPartial: false,
            updateTime: nowStr,
            details: '達天然災害停止上班及上課標準。',
          };
        }
        if (['chiayi_city', 'chiayi_county'].includes(c.id)) {
          return {
            ...c,
            status: '部分山區鄉鎮停止上班、停止上課。',
            isSuspended: false,
            isPartial: true,
            updateTime: nowStr,
            details: '阿里山鄉等特定地區停止上班上課。',
          };
        }
        return c;
      });
    } else if (scenarioId === 'heavy_rain_mountain') {
      // 豪雨特報部分停班課
      newCounties = newCounties.map(c => {
        if (['nantou', 'hualien', 'yilan'].includes(c.id)) {
          return {
            ...c,
            status: '特定山區學校與鄉鎮停止上班、停止上課。',
            isSuspended: false,
            isPartial: true,
            updateTime: nowStr,
            details: '土石流黃色警戒，部分山區道路中斷學校停課。',
          };
        }
        return c;
      });
    } else if (scenarioId === 'all_normal') {
      // 全台恢復正常
      newCounties = getDefaultCounties();
    }

    storage.setCounties(newCounties, `演練情境: ${scenarioId}`, true);

    // Trigger change alerts
    const changed = newCounties.filter(c => c.isSuspended || c.isPartial);
    if (changed.length > 0) {
      await schedulerService.dispatchRealtimeChangeAlerts(changed);
    } else {
      // All normal broadcast
      storage.addLog({
        type: 'realtime_change',
        targetCount: storage.getSubscribers().length,
        targetUsers: ['全部訂閱者'],
        title: '演練：全台恢復正常上班上課',
        content: '所有縣市均已恢復照常上班、照常上課。',
        status: 'simulated',
      });
    }

    res.json({
      success: true,
      counties: storage.getCounties(),
      logs: storage.getLogs(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * POST /api/drill/update-county - Manually update single county
 */
apiRouter.post('/drill/update-county', async (req: Request, res: Response) => {
  try {
    const { countyId, status, isSuspended, isPartial, details } = req.body;
    storage.updateSingleCountyStatus(countyId, status, !!isSuspended, !!isPartial, details);

    const updated = storage.getCounties().find(c => c.id === countyId);
    if (updated) {
      await schedulerService.dispatchRealtimeChangeAlerts([updated]);
    }

    res.json({
      success: true,
      counties: storage.getCounties(),
      logs: storage.getLogs(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/**
 * DELETE /api/logs - Clear logs
 */
apiRouter.delete('/logs', (req: Request, res: Response) => {
  storage.clearLogs();
  res.json({ success: true });
});
