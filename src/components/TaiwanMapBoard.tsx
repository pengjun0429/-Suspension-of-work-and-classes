import React, { useState } from 'react';
import { CountyStatus, RegionKey } from '../types';
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  RefreshCw,
  BellRing,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface TaiwanMapBoardProps {
  counties: CountyStatus[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onQuickSubscribe?: (cityName: string) => void;
  onTestCountyAlert?: (county: CountyStatus) => void;
  datasetMeta: {
    datasetId: string;
    sourceUrl: string;
    lastFetchedAt: string;
    isSimulatedData: boolean;
  };
}

export const TaiwanMapBoard: React.FC<TaiwanMapBoardProps> = ({
  counties,
  onRefresh,
  isRefreshing,
  onQuickSubscribe,
  onTestCountyAlert,
  datasetMeta,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspended' | 'normal'>('all');
  const [selectedCounty, setSelectedCounty] = useState<CountyStatus | null>(null);

  const suspendedCount = counties.filter(c => c.isSuspended).length;
  const partialCount = counties.filter(c => c.isPartial).length;
  const normalCount = counties.filter(c => !c.isSuspended && !c.isPartial).length;

  const filteredCounties = counties.filter(c => {
    if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
    if (statusFilter === 'suspended' && !c.isSuspended && !c.isPartial) return false;
    if (statusFilter === 'normal' && (c.isSuspended || c.isPartial)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.cityName.toLowerCase().includes(q) || c.cityName.replace('臺', '台').toLowerCase().includes(q);
      const matchAlias = c.aliases.some(a => a.toLowerCase().includes(q));
      const matchStatus = c.status.toLowerCase().includes(q);
      if (!matchName && !matchAlias && !matchStatus) return false;
    }
    return true;
  });

  const regions: Array<{ key: RegionKey | 'all'; label: string; count: number }> = [
    { key: 'all', label: '全台灣 (22)', count: counties.length },
    { key: 'north', label: '北部地區 (7)', count: counties.filter(c => c.region === 'north').length },
    { key: 'central', label: '中部地區 (5)', count: counties.filter(c => c.region === 'central').length },
    { key: 'south', label: '南部地區 (5)', count: counties.filter(c => c.region === 'south').length },
    { key: 'east', label: '東部地區 (2)', count: counties.filter(c => c.region === 'east').length },
    { key: 'islands', label: '離島地區 (3)', count: counties.filter(c => c.region === 'islands').length },
  ];

  return (
    <div id="taiwan-map-board" className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">即時停班停課總況</span>
            {suspendedCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                🔴 警報警戒中
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                🟢 全台正常
              </span>
            )}
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold tracking-tight">
              {suspendedCount > 0 ? `${suspendedCount} 縣市停班課` : '全台各縣市正常'}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              最後同步：{datasetMeta.lastFetchedAt}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <a
              href={datasetMeta.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>DGPA 資料集 20457</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              className="text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>即時同步</span>
            </button>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase tracking-wider">停止上班及上課</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-rose-700">{suspendedCount} <span className="text-base font-normal text-rose-600">個縣市</span></div>
            <p className="text-xs text-rose-600/80 mt-1">包含全天或時段性停止辦公上課</p>
          </div>
          <div className="text-xs text-rose-700 font-medium">
            {suspendedCount > 0
              ? counties.filter(c => c.isSuspended).map(c => c.cityName).join('、')
              : '目前無全體停班停課縣市'}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">部分地區/學校停止</span>
            <Info className="w-4 h-4 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-amber-700">{partialCount} <span className="text-base font-normal text-amber-600">個縣市</span></div>
            <p className="text-xs text-amber-600/80 mt-1">特定山區、鄉鎮或學校彈性停課</p>
          </div>
          <div className="text-xs text-amber-700 font-medium truncate">
            {partialCount > 0
              ? counties.filter(c => c.isPartial).map(c => c.cityName).join('、')
              : '目前無局部停班停課公告'}
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">照常上班及上課</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-emerald-700">{normalCount} <span className="text-base font-normal text-emerald-600">個縣市</span></div>
            <p className="text-xs text-emerald-600/80 mt-1">維持正常辦公及各級學校上課</p>
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            佔全台監測範圍 {Math.round((normalCount / 22) * 100)}%
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {regions.map(r => (
              <button
                key={r.key}
                onClick={() => setSelectedRegion(r.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedRegion === r.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋縣市（如台北、高雄、花蓮）..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'all' ? 'bg-white font-bold text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                全部
              </button>
              <button
                onClick={() => setStatusFilter('suspended')}
                className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'suspended' ? 'bg-rose-500 text-white font-bold shadow-sm' : 'text-slate-600'}`}
              >
                僅停班課
              </button>
              <button
                onClick={() => setStatusFilter('normal')}
                className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === 'normal' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-600'}`}
              >
                僅正常
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of County Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCounties.map(county => {
          const isSus = county.isSuspended;
          const isPart = county.isPartial;

          let cardBorder = 'border-slate-200 hover:border-slate-300';
          let statusBadgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          let statusText = '照常上班、照常上課';

          if (isSus) {
            cardBorder = 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/30';
            statusBadgeBg = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
            statusText = '停止上班、停止上課';
          } else if (isPart) {
            cardBorder = 'border-amber-300 ring-1 ring-amber-300 bg-amber-50/30';
            statusBadgeBg = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
            statusText = '部分地區或學校停止';
          }

          return (
            <div
              key={county.id}
              onClick={() => setSelectedCounty(county)}
              className={`bg-white rounded-xl p-4 border ${cardBorder} shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group cursor-pointer`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-slate-900">{county.cityName}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                        {county.regionName.replace('地區', '')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {county.aliases.slice(0, 2).join(', ')}
                    </p>
                  </div>

                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeBg} flex items-center gap-1`}>
                    {isSus ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                    ) : isPart ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    )}
                    {isSus ? '🔴 停班課' : isPart ? '🟡 部分停止' : '🟢 正常'}
                  </span>
                </div>

                <div className="my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`text-xs ${isSus ? 'text-rose-700 font-bold' : isPart ? 'text-amber-800 font-semibold' : 'text-slate-700'}`}>
                    {county.status}
                  </div>
                  {county.details && (
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                      備註：{county.details}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {county.updateTime ? county.updateTime.split(' ')[1] || county.updateTime : '即時'}
                </span>

                <div className="flex items-center gap-1.5">
                  {onQuickSubscribe && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onQuickSubscribe(county.cityName);
                      }}
                      className="text-sky-600 hover:text-sky-700 font-medium px-2 py-1 rounded hover:bg-sky-50 transition-colors flex items-center gap-0.5"
                    >
                      <BellRing className="w-3 h-3" />
                      <span>訂閱</span>
                    </button>
                  )}
                  {onTestCountyAlert && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onTestCountyAlert(county);
                      }}
                      className="text-slate-500 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100"
                      title="發送此縣市推播測試"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCounties.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">查無符合條件的縣市</h4>
          <p className="text-xs text-slate-500 mt-1">請嘗試變更搜尋關鍵字或調整篩選條件。</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRegion('all');
              setStatusFilter('all');
            }}
            className="mt-3 text-xs text-sky-600 hover:underline font-semibold"
          >
            重置所有篩選
          </button>
        </div>
      )}

      {/* County Detail Modal */}
      {selectedCounty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${selectedCounty.isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCounty.cityName}</h3>
                  <p className="text-xs text-slate-400">{selectedCounty.regionName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCounty(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className={`p-4 rounded-xl border ${selectedCounty.isSuspended ? 'bg-rose-50 border-rose-200' : selectedCounty.isPartial ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">官方發布上班上課狀態</span>
                <div className={`text-base font-bold mt-1 ${selectedCounty.isSuspended ? 'text-rose-700' : selectedCounty.isPartial ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {selectedCounty.status}
                </div>
                {selectedCounty.details && (
                  <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200/60">
                    {selectedCounty.details}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block">資料來源</span>
                  <span className="font-semibold text-slate-700">行政院人事行政總處</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block">最後同步時間</span>
                  <span className="font-semibold text-slate-700">{selectedCounty.updateTime || '即時同步'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {onQuickSubscribe && (
                <button
                  onClick={() => {
                    onQuickSubscribe(selectedCounty.cityName);
                    setSelectedCounty(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <BellRing className="w-4 h-4" />
                  <span>加入 LINE 關注訂閱</span>
                </button>
              )}
              <button
                onClick={() => setSelectedCounty(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
