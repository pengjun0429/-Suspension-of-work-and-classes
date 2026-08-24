import React, { useState } from 'react';
import { CountyStatus } from '../types';
import {
  AlertTriangle,
  CloudRain,
  Wind,
  Sun,
  Play,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';

interface DrillSimulatorProps {
  counties: CountyStatus[];
  onRefresh: () => Promise<void>;
}

export const DrillSimulator: React.FC<DrillSimulatorProps> = ({ counties, onRefresh }) => {
  const [applyingScenario, setApplyingScenario] = useState<string | null>(null);
  const [selectedCountyId, setSelectedCountyId] = useState<string>('taipei');
  const [customStatus, setCustomStatus] = useState('今日停止上班、停止上課。');
  const [customIsSuspended, setCustomIsSuspended] = useState(true);
  const [customIsPartial, setCustomIsPartial] = useState(false);
  const [customDetails, setCustomDetails] = useState('受強烈颱風暴風圈籠罩影響');

  const handleApplyScenario = async (scenarioId: string) => {
    setApplyingScenario(scenarioId);
    try {
      const res = await fetch('/api/drill/apply-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } finally {
      setApplyingScenario(null);
    }
  };

  const handleUpdateSingleCounty = async () => {
    try {
      const res = await fetch('/api/drill/update-county', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countyId: selectedCountyId,
          status: customStatus,
          isSuspended: customIsSuspended,
          isPartial: customIsPartial,
          details: customDetails,
        }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedCountyObj = counties.find(c => c.id === selectedCountyId);

  return (
    <div id="drill-simulator" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>天然災害演練與推播模擬測試</span>
        </div>
        <h3 className="text-xl font-bold mt-1">颱風/豪雨停班停課演練情境模擬器</h3>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          透過預設災情腳本或自訂各縣市停班停課狀態，即時觸發背景異動偵測器與 LINE 推播服務，驗證訂閱用戶是否能第一時間精準接收警報通知。
        </p>
      </div>

      {/* Preset Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scenario 1: Northern Typhoon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <Wind className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                強颱登陸
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-3">北部地區停班停課</h4>
            <p className="text-xs text-slate-500 mt-1">
              模擬基隆、台北、新北、桃園、宜蘭停止上班上課；新竹下午停班課。
            </p>
          </div>
          <button
            onClick={() => handleApplyScenario('typhoon_north')}
            disabled={applyingScenario === 'typhoon_north'}
            className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Play className={`w-3 h-3 ${applyingScenario === 'typhoon_north' ? 'animate-spin' : ''}`} />
            <span>套用北部停班課</span>
          </button>
        </div>

        {/* Scenario 2: South & East Typhoon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                南台灣警戒
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-3">南部及東部停班停課</h4>
            <p className="text-xs text-slate-500 mt-1">
              模擬高雄、台南、屏東、花蓮、台東、澎湖停止上班上課；嘉義山區部分停班課。
            </p>
          </div>
          <button
            onClick={() => handleApplyScenario('typhoon_south_east')}
            disabled={applyingScenario === 'typhoon_south_east'}
            className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Play className={`w-3 h-3 ${applyingScenario === 'typhoon_south_east' ? 'animate-spin' : ''}`} />
            <span>套用南東停班課</span>
          </button>
        </div>

        {/* Scenario 3: Mountain Heavy Rain */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <CloudRain className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                豪雨特報
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-3">山區局部停班停課</h4>
            <p className="text-xs text-slate-500 mt-1">
              模擬南投、花蓮、宜蘭特定山區學校鄉鎮因土石流警戒彈性停止上班上課。
            </p>
          </div>
          <button
            onClick={() => handleApplyScenario('heavy_rain_mountain')}
            disabled={applyingScenario === 'heavy_rain_mountain'}
            className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Play className={`w-3 h-3 ${applyingScenario === 'heavy_rain_mountain' ? 'animate-spin' : ''}`} />
            <span>套用局部豪雨</span>
          </button>
        </div>

        {/* Scenario 4: All Clear */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Sun className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                解除警報
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-3">全台恢復正常上班課</h4>
            <p className="text-xs text-slate-500 mt-1">
              重置所有 22 縣市狀態為「照常上班、照常上課」，解除警報推播。
            </p>
          </div>
          <button
            onClick={() => handleApplyScenario('all_normal')}
            disabled={applyingScenario === 'all_normal'}
            className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className={`w-3 h-3 ${applyingScenario === 'all_normal' ? 'animate-spin' : ''}`} />
            <span>全台恢復正常</span>
          </button>
        </div>
      </div>

      {/* Manual Single County Customizer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-sky-600" />
          <h4 className="text-sm font-bold text-slate-900">個別縣市狀態微調與即刻推播</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">選擇目標縣市</label>
            <select
              value={selectedCountyId}
              onChange={e => setSelectedCountyId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            >
              {counties.map(c => (
                <option key={c.id} value={c.id}>
                  {c.cityName} ({c.status})
                </option>
              ))}
            </select>
            {selectedCountyObj && (
              <div className="text-[11px] text-slate-500 mt-1.5">
                目前狀態：<span className="font-semibold text-slate-800">{selectedCountyObj.status}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">設定狀態文字</label>
            <input
              type="text"
              value={customStatus}
              onChange={e => setCustomStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomStatus('今日停止上班、停止上課。');
                  setCustomIsSuspended(true);
                  setCustomIsPartial(false);
                }}
                className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px]"
              >
                停止上班上課
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStatus('下午起停止上班、停止上課。');
                  setCustomIsSuspended(true);
                  setCustomIsPartial(true);
                }}
                className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px]"
              >
                下午起停止
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStatus('照常上班、照常上課。');
                  setCustomIsSuspended(false);
                  setCustomIsPartial(false);
                }}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px]"
              >
                照常上班上課
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">官方補充備註 / 原因</label>
            <input
              type="text"
              value={customDetails}
              onChange={e => setCustomDetails(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={handleUpdateSingleCounty}
              className="mt-3 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>更新並自動推送給關注此縣市的用戶</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
