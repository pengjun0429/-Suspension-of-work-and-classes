import React, { useState } from 'react';
import { PushLog } from '../types';
import {
  FileText,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
} from 'lucide-react';

interface AuditLogsPanelProps {
  logs: PushLog[];
  onClearLogs: () => Promise<void>;
}

export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({ logs, onClearLogs }) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(l => {
    if (selectedType !== 'all' && l.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        l.title.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        l.targetUsers.some(u => u.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getLogTypeBadge = (type: PushLog['type']) => {
    switch (type) {
      case 'realtime_change':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <Zap className="w-3 h-3 text-rose-600" />
            <span>異動即時推播</span>
          </span>
        );
      case 'daily_scheduled':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>每日定時推播</span>
          </span>
        );
      case 'test_push':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
            <Send className="w-3 h-3 text-purple-600" />
            <span>手動測試推播</span>
          </span>
        );
      case 'incoming_webhook':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-slate-500" />
            <span>Webhook 事件</span>
          </span>
        );
      case 'broadcast':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-amber-600" />
            <span>全體廣播</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: PushLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            ✓ 成功發送
          </span>
        );
      case 'simulated':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            ⚡ 模擬紀錄
          </span>
        );
      case 'failed':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
            ✕ 失敗
          </span>
        );
    }
  };

  return (
    <div id="audit-logs-panel" className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">推播與 Webhook 事件日誌</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            即時監控 DGPA 資料集拉取、停班停課異動偵測與各訂閱用戶之推送歷程。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋日誌內容或對象..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            onClick={() => onClearLogs()}
            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空日誌</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
            selectedType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部日誌 ({logs.length})
        </button>
        <button
          onClick={() => setSelectedType('realtime_change')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
            selectedType === 'realtime_change' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          即時異動推播 ({logs.filter(l => l.type === 'realtime_change').length})
        </button>
        <button
          onClick={() => setSelectedType('daily_scheduled')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
            selectedType === 'daily_scheduled' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          每日定時推播 ({logs.filter(l => l.type === 'daily_scheduled').length})
        </button>
        <button
          onClick={() => setSelectedType('incoming_webhook')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all ${
            selectedType === 'incoming_webhook' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Webhook 事件 ({logs.filter(l => l.type === 'incoming_webhook').length})
        </button>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredLogs.map(log => (
          <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 text-xs">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {getLogTypeBadge(log.type)}
                <span className="font-bold text-slate-900 text-sm">{log.title}</span>
                {getStatusBadge(log.status)}
              </div>

              <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px]">
                {log.content}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                {log.targetUsers && log.targetUsers.length > 0 && (
                  <span>
                    對象：<strong className="text-slate-600">{log.targetUsers.join(', ')}</strong>
                  </span>
                )}
                {log.details && (
                  <span className="truncate max-w-md">
                    詳情：{log.details}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 text-slate-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{log.timestamp}</span>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs">
            目前暫無符合條件的日誌記錄。
          </div>
        )}
      </div>
    </div>
  );
};
