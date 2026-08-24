import React, { useState } from 'react';
import { LineBotConfig } from '../types';
import {
  Key,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Save,
  Radio,
  Sliders,
  Sparkles,
  QrCode,
  Terminal,
  Activity,
} from 'lucide-react';

interface LineConfigPanelProps {
  config: LineBotConfig;
  onRefresh: () => Promise<void>;
}

export const LineConfigPanel: React.FC<LineConfigPanelProps> = ({ config, onRefresh }) => {
  const [channelAccessToken, setChannelAccessToken] = useState(config.channelAccessToken || '');
  const [channelSecret, setChannelSecret] = useState(config.channelSecret || '');
  const [autoPolling, setAutoPolling] = useState(config.autoPollingEnabled);
  const [pollingInterval, setPollingInterval] = useState(config.pollingIntervalSeconds || 60);
  const [botBasicId, setBotBasicId] = useState(config.botBasicId || '@dgpa_typhoon_bot');

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const activeWebhookUrl =
    config.webhookUrl && !config.webhookUrl.includes('localhost')
      ? config.webhookUrl
      : typeof window !== 'undefined'
      ? `${window.location.origin}/api/line/webhook`
      : config.webhookUrl;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(activeWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken,
          channelSecret,
          autoPollingEnabled: autoPolling,
          pollingIntervalSeconds: pollingInterval,
          botBasicId,
        }),
      });
      if (res.ok) {
        await onRefresh();
        alert('✅ LINE Bot 連線設定已成功更新！');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhookPing = async () => {
    setPingStatus('testing');
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setPingStatus('success');
      } else {
        setPingStatus('failed');
      }
    } catch {
      setPingStatus('failed');
    }
    setTimeout(() => setPingStatus(null), 4000);
  };

  return (
    <div id="line-config-panel" className="space-y-6">
      {/* Status Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">LINE Messaging API 官方連線設定</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                支援正式 LINE 官方帳號 Webhook 雙向互動與即時推播，亦支援瀏覽器模擬器無縫切換。
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.isConfigured ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>已連接 LINE 官方憑證</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>啟用模擬器 / 測試模式</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Form & Webhook Info */}
        <div className="lg:col-span-7 space-y-5">
          {/* Webhook Endpoint Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sky-600" />
                <span>您的 Webhook URL (端點網址)</span>
              </span>
              <button
                onClick={handleTestWebhookPing}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 transition-colors flex items-center gap-1"
              >
                <Activity className="w-3 h-3" />
                <span>測試連線 (Ping)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeWebhookUrl}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 select-all"
              />
              <button
                onClick={handleCopyWebhook}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWebhook ? '已複製' : '複製'}</span>
              </button>
            </div>

            {pingStatus === 'testing' && (
              <div className="text-xs text-sky-600 animate-pulse flex items-center gap-1">
                <span>正在測試 Webhook 端點響應...</span>
              </div>
            )}
            {pingStatus === 'success' && (
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>端點運作正常！HTTP 200 OK，已具備接收 LINE Webhook 條件。</span>
              </div>
            )}
            {pingStatus === 'failed' && (
              <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <span>連線測試未完成，請確認服務運行中。</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              💡 請將此網址貼至 LINE Developers 控制台的 <strong>Messaging API &gt; Webhook URL</strong>，並開啟 <strong>Use Webhook</strong>。
            </p>
          </div>

          {/* Credentials Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Key className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-bold text-slate-900">LINE Developers 憑證填寫 (可選)</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Channel Access Token (Long-Lived)</label>
                <textarea
                  rows={3}
                  value={channelAccessToken}
                  onChange={e => setChannelAccessToken(e.target.value)}
                  placeholder="請貼上 LINE Messaging API Channel access token..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Channel Secret</label>
                <input
                  type="password"
                  value={channelSecret}
                  onChange={e => setChannelSecret(e.target.value)}
                  placeholder="請貼上 LINE Basic Settings 之 Channel Secret..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">LINE 官方帳號 Basic ID (Bot ID)</label>
                <input
                  type="text"
                  value={botBasicId}
                  onChange={e => setBotBasicId(e.target.value)}
                  placeholder="@dgpa_typhoon_bot"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Polling settings */}
            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">DGPA 自動定時輪詢 (Background Polling)</div>
                  <div className="text-[11px] text-slate-400">定期與行政院人事行政總處檢查是否有新發布</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPolling}
                  onChange={e => setAutoPolling(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">檢查頻率 (秒)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={15}
                    max={300}
                    step={15}
                    value={pollingInterval}
                    onChange={e => setPollingInterval(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-bold text-slate-700 text-xs w-16 text-right">
                    {pollingInterval} 秒/次
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>儲存連線設定</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 4-Step Guide */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-bold text-slate-900">LINE Developers 快速串接 4 步驟</h4>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  <span>前往 LINE Developers 建立頻道</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
                  登入 <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-sky-600 underline">LINE Developers Console</a> 建立 Provider，並新增一個 <strong>Messaging API</strong> 頻道。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>設定 Webhook URL 並開啟開關</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
                  在 Messaging API 頁籤將上方複製的 Webhook URL 貼上，務必開啟 <strong>Use Webhook</strong>。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>發行 Channel Access Token</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
                  在 Messaging API 最下方點擊 <strong>Issue</strong> 取得長期 Token，填入左側設定儲存。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                    4
                  </span>
                  <span>至 LINE Official 關閉罐頭自動回應</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
                  至 <a href="https://chat.line.biz/" target="_blank" rel="noreferrer" className="text-sky-600 underline">LINE 官方帳號管理後台</a> ➔ 回應設定 ➔ 設為「<strong>聊天機器人 (Bot)</strong>」並關閉「<strong>自動回應訊息</strong>」。
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting Checklist Box */}
          <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 text-amber-950 space-y-3 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
              <span>⚠️ 傳訊息給 LINE 官方帳號沒回應？請檢查以下 4 點：</span>
            </div>
            <ul className="space-y-2 text-[11px] text-amber-900 leading-relaxed list-disc list-inside">
              <li>
                <strong>未填寫 Channel Access Token</strong>：如果左側未填寫並儲存 Token，伺服器就無法呼叫 LINE 回覆訊息。
              </li>
              <li>
                <strong>LINE Developers 未開啟「Use Webhook」</strong>：請確認 Messaging API 頁面的 Webhook URL 開關已開啟為綠色「Enabled」。
              </li>
              <li>
                <strong>LINE 官方後台回應模式設錯</strong>：在 LINE Official Account Manager 中，若開啟了官方的「自動回應訊息」，會攔截或覆蓋 Bot Webhook。
              </li>
              <li>
                <strong>即時查看伺服器日誌</strong>：切換至「推播與事件日誌」頁籤，可即時看到 LINE 送過來的訊息與回覆狀態代碼。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
