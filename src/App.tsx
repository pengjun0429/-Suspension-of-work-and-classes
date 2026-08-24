import React, { useState, useEffect } from 'react';
import {
  CountyStatus,
  UserSubscription,
  LineBotConfig,
  DatasetMeta,
  PushLog,
  ServerStateResponse,
} from './types';
import { TaiwanMapBoard } from './components/TaiwanMapBoard';
import { LineChatSimulator } from './components/LineChatSimulator';
import { SubscribersManager } from './components/SubscribersManager';
import { DrillSimulator } from './components/DrillSimulator';
import { LineConfigPanel } from './components/LineConfigPanel';
import { AuditLogsPanel } from './components/AuditLogsPanel';
import { PublicLanding } from './components/PublicLanding';
import { LoginPage } from './components/LoginPage';
import {
  Globe,
  MapPin,
  Smartphone,
  Users,
  AlertTriangle,
  Settings,
  FileText,
  RefreshCw,
  Clock,
  ShieldCheck,
  Sparkles,
  Zap,
  LogOut,
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [activeTab, setActiveTab] = useState<'map' | 'simulator' | 'subscribers' | 'drill' | 'config' | 'logs'>('map');
  const [counties, setCounties] = useState<CountyStatus[]>([]);
  const [subscribers, setSubscribers] = useState<UserSubscription[]>([]);
  const [config, setConfig] = useState<LineBotConfig>({
    channelAccessToken: '',
    channelSecret: '',
    isConfigured: false,
    webhookUrl: '',
    autoPollingEnabled: true,
    pollingIntervalSeconds: 60,
    botBasicId: '@190azbzx',
  });
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta>({
    datasetId: '20457',
    title: '天然災害停止上班及上課情形',
    sourceUrl: 'https://data.gov.tw/dataset/20457',
    lastFetchedAt: '載入中...',
    fetchStatus: 'ok',
    itemCount: 22,
    rawSource: '',
    isSimulatedData: false,
  });
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' }));
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch {
      localStorage.removeItem('admin_token');
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setViewMode('public');
  };

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: ServerStateResponse = await res.json();
        setCounties(data.counties || []);
        setSubscribers(data.subscribers || []);
        setConfig(data.config || config);
        setDatasetMeta(data.datasetMeta || datasetMeta);
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch status:', e);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/refresh-dgpa', { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestPush = async (userId: string) => {
    try {
      const res = await fetch('/api/line/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchStatus();
        alert('✅ 已發送測試推播訊息！');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickSubscribe = async (cityName: string) => {
    const simUser = subscribers.find(s => s.userId === 'simulated_user_current') || subscribers[0];
    if (simUser) {
      const updatedCities = simUser.subscribedCities.includes(cityName)
        ? simUser.subscribedCities
        : [...simUser.subscribedCities, cityName];

      await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...simUser,
          subscribedCities: updatedCities,
        }),
      });
      await fetchStatus();
      setActiveTab('simulator');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Show login page if not authenticated and trying to access admin
  if (viewMode === 'admin' && !isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const suspendedCount = counties.filter(c => c.isSuspended).length;
  const currentSimulatorUser =
    subscribers.find(s => s.userId === 'simulated_user_current') ||
    subscribers[0] || {
      id: 'sub_default',
      userId: 'simulated_user_current',
      displayName: '網頁模擬用戶',
      subscribedCities: ['臺北市', '新北市'],
      alertFrequency: 'realtime',
      scheduledTime: '07:00',
      createdAt: new Date().toISOString(),
    };

  const botId = config.botBasicId || '@190azbzx';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans flex flex-col">
      {/* Header Navigation */}
      {viewMode === 'public' ? (
        <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#06C755] to-emerald-400 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                      停班停課小幫手
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] text-[11px] font-bold border border-[#06C755]/30">
                      {botId}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span>行政院人事行政總處 (DGPA) 官方連線</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {suspendedCount > 0 ? (
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{suspendedCount} 縣市停班課</span>
                  </span>
                ) : (
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>全台正常上班上課</span>
                  </span>
                )}

                <button
                  onClick={() => setViewMode('admin')}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  title="切換至管理者後台"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg">
                  ⚙️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                      系統管理控制台
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      管理者模式
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{currentTime}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">同步 DGPA</span>
                </button>

                <button
                  onClick={() => setViewMode('public')}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>前台</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-colors"
                  title="登出"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/95 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'map'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>全台即時看板</span>
              </button>

              <button
                onClick={() => setActiveTab('simulator')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'simulator'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>LINE 模擬器</span>
              </button>

              <button
                onClick={() => setActiveTab('subscribers')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'subscribers'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>訂閱管理</span>
              </button>

              <button
                onClick={() => setActiveTab('drill')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'drill'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>演練模擬</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'config'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>LINE 串接</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>日誌</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {viewMode === 'public' ? (
          <PublicLanding
            counties={counties}
            config={config}
            onOpenSimulator={() => setShowSimulatorModal(true)}
            onQuickSubscribe={handleQuickSubscribe}
          />
        ) : (
          <>
            {activeTab === 'map' && (
              <TaiwanMapBoard
                counties={counties}
                onRefresh={handleManualRefresh}
                isRefreshing={isRefreshing}
                onQuickSubscribe={handleQuickSubscribe}
                onTestCountyAlert={c => handleQuickSubscribe(c.cityName)}
                datasetMeta={datasetMeta}
              />
            )}
            {activeTab === 'simulator' && (
              <LineChatSimulator
                currentUser={currentSimulatorUser}
                onUserUpdate={fetchStatus}
              />
            )}
            {activeTab === 'subscribers' && (
              <SubscribersManager
                subscribers={subscribers}
                onRefresh={fetchStatus}
                onTestPush={handleTestPush}
              />
            )}
            {activeTab === 'drill' && (
              <DrillSimulator
                counties={counties}
                onRefresh={fetchStatus}
              />
            )}
            {activeTab === 'config' && (
              <LineConfigPanel
                config={config}
                onRefresh={fetchStatus}
              />
            )}
            {activeTab === 'logs' && (
              <AuditLogsPanel
                logs={logs}
                onClearLogs={handleClearLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Simulator Modal */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#06C755]" />
                <span className="font-bold text-white text-sm">LINE 機器人互動體驗區</span>
              </div>
              <button
                onClick={() => setShowSimulatorModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold"
              >
                關閉
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-100">
              <LineChatSimulator
                currentUser={currentSimulatorUser}
                onUserUpdate={fetchStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <span>🇹🇼 <strong>LINE 停班停課自動推送機器人</strong> ({botId})</span>
          <span className="mx-2">·</span>
          <a
            href="https://data.gov.tw/dataset/20457"
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 hover:underline font-semibold"
          >
            政府資料開放平台
          </a>
        </div>
      </footer>
    </div>
  );
}
