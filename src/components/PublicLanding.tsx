import React, { useState } from 'react';
import { CountyStatus, LineBotConfig } from '../types';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Bell,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Send,
  HelpCircle,
  QrCode,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PublicLandingProps {
  counties: CountyStatus[];
  config: LineBotConfig;
  onOpenSimulator: () => void;
  onQuickSubscribe?: (cityName: string) => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  counties,
  config,
  onOpenSimulator,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const botId = config.botBasicId || '@190azbzx';
  // LINE Official URL format
  const lineAddFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(botId)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(lineAddFriendUrl)}&margin=10`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(botId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const suspendedCount = counties.filter(c => c.isSuspended).length;
  const suspendedCounties = counties.filter(c => c.isSuspended);

  return (
    <div id="public-landing-page" className="space-y-10 pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white p-8 md:p-12 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Text & Intro */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>行政院人事行政總處 (DGPA) 資料集 20457 官方對接</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              台灣停班停課 <br />
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                LINE 智慧即時推送機器人
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              颱風天不再手忙腳亂刷新新聞！免費加入 LINE 好友，即可自訂關注縣市。人事行政總處一發布停止上班上課立即推送，更支援每日通勤定時總覽。
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={lineAddFriendUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all transform active:scale-98 flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>立即加入 LINE 好友</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={onOpenSimulator}
                className="px-5 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-2xl text-sm font-semibold border border-slate-700 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>線上互動模擬器體驗</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <span>即時異動推播</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <span>每日定時提醒</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span>22 縣市自由訂閱</span>
              </div>
            </div>
          </div>

          {/* Right Card: LINE Bot Card & QR Code */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-2xl text-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#06C755] text-white flex items-center justify-center font-black text-2xl shadow-md">
                    ⚡
                  </div>
                  <div>
                    <div className="font-bold text-base text-white">停班停課小幫手</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <span>LINE 官方帳號 ID: {botId}</span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#06C755]/20 text-[#06C755] text-[10px] font-black border border-[#06C755]/40">
                  LINE Verified
                </span>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="bg-white p-2 rounded-xl shadow-inner shrink-0">
                  <img
                    src={qrCodeImageUrl}
                    alt={`LINE QR Code ${botId}`}
                    className="w-28 h-28 object-contain rounded-lg"
                  />
                </div>
                <div className="space-y-2 text-xs text-center sm:text-left">
                  <div className="font-bold text-slate-200 flex items-center justify-center sm:justify-start gap-1">
                    <QrCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>手機打開 LINE 掃描加好友</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    或直接在 LINE 搜尋好友 ID：
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-sky-300 font-mono font-bold text-xs select-all border border-slate-700">
                      {botId}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="複製 LINE ID"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? '已複製' : '複製'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                加入後直接發送「<span className="text-sky-300 font-semibold">台北市</span>」、「<span className="text-sky-300 font-semibold">訂閱 雙北</span>」或點擊選單即可開始使用！
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Status Banner */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${
              suspendedCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {suspendedCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {suspendedCount > 0 ? `⚠️ 目前全台有 ${suspendedCount} 個縣市停止上班上課` : '全台 22 縣市目前照常上班、照常上課'}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                即時同步中
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {suspendedCount > 0
                ? `受影響地區：${suspendedCounties.map(c => c.cityName).join('、')}。LINE 機器人已即時推送通知。`
                : '行政院人事行政總處無停班課發布。機器人持續為您 24H 輪詢監測。'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSimulator}
          className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>前往指令體驗區</span>
        </button>
      </section>

      {/* 3 Steps Guide for LINE User */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <h3 className="text-xl font-bold text-slate-900">如何使用 LINE 停班停課小幫手？</h3>
          <p className="text-xs text-slate-500">超簡單三步驟，加入好友即刻擁有 24 小時災防秘書</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h4 className="text-base font-bold text-slate-900">加入 LINE 官方帳號</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              搜尋官方 ID <strong className="text-slate-800 font-mono">{botId}</strong> 或掃描上方 QR Code 加入好友，點擊「開始使用」。
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h4 className="text-base font-bold text-slate-900">設定關注縣市與時間</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              直接傳送縣市名稱（例如「<span className="text-slate-700 font-semibold">台北市</span>」）或「<span className="text-slate-700 font-semibold">訂閱 雙北</span>」，自訂每日提醒時間。
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative hover:border-sky-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h4 className="text-base font-bold text-slate-900">第一時間接收異動警報</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              只要人事行政總處有任何停班停課宣布，系統立即自動以精美圖卡推播到您的 LINE，安心出門無負擔。
            </p>
          </div>
        </div>
      </section>

      {/* Command Cheatsheet for Users */}
      <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-600" />
              <span>常用 LINE 對話指令清單</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              您可以隨時在 LINE 聊天室中傳送以下指令與機器人互動
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            支援自然語言與模糊比對
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>查詢單一縣市</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                台北市 / 高雄 / 花蓮
              </span>
            </div>
            <p className="text-[11px] text-slate-500">直接傳送縣市或簡稱，即時取得該地最新停班停課狀態。</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>查詢全台總覽</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                查全台 / 總覽
              </span>
            </div>
            <p className="text-[11px] text-slate-500">取得全台灣 22 縣市當前停班停課最新摘要圖卡。</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>訂閱指定縣市</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                訂閱 台北 新北 桃園
              </span>
            </div>
            <p className="text-[11px] text-slate-500">將多個縣市加入推播名單，有異動或定時自動通知。</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>設定定時推播時間</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                設定時間 06:30
              </span>
            </div>
            <p className="text-[11px] text-slate-500">指定每日幾點幾分接收關心縣市的當日總覽提醒。</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>切換通知頻率</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                即時推播 / 僅停班課
              </span>
            </div>
            <p className="text-[11px] text-slate-500">可自由選擇「即時通知」、「定時推播」或「僅停班課才通知」。</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>檢視個人設定</span>
              <span className="font-mono text-sky-600 text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                我的設定 / 查我訂閱
              </span>
            </div>
            <p className="text-[11px] text-slate-500">查看您目前關注的縣市清單、提醒時間與推播頻率。</p>
          </div>
        </div>
      </section>
    </div>
  );
};
