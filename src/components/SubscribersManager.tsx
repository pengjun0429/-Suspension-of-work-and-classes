import React, { useState } from 'react';
import { UserSubscription, AlertFrequency } from '../types';
import {
  Users,
  Bell,
  Clock,
  MapPin,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Filter,
} from 'lucide-react';

interface SubscribersManagerProps {
  subscribers: UserSubscription[];
  onRefresh: () => Promise<void>;
  onTestPush: (userId: string) => Promise<void>;
}

const ALL_CITIES = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
  '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市',
  '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

export const SubscribersManager: React.FC<SubscribersManagerProps> = ({
  subscribers,
  onRefresh,
  onTestPush,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserSubscription | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

  // New / Edit Form state
  const [formData, setFormData] = useState<{
    userId: string;
    displayName: string;
    subscribedCities: string[];
    alertFrequency: AlertFrequency;
    scheduledTime: string;
  }>({
    userId: '',
    displayName: '',
    subscribedCities: ['臺北市', '新北市'],
    alertFrequency: 'realtime',
    scheduledTime: '07:00',
  });

  const filteredSubs = subscribers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.displayName.toLowerCase().includes(q) ||
      s.userId.toLowerCase().includes(q) ||
      s.subscribedCities.some(c => c.toLowerCase().includes(q))
    );
  });

  const handleOpenEdit = (user: UserSubscription) => {
    setEditingUser(user);
    setFormData({
      userId: user.userId,
      displayName: user.displayName,
      subscribedCities: [...user.subscribedCities],
      alertFrequency: user.alertFrequency,
      scheduledTime: user.scheduledTime,
    });
  };

  const handleOpenAdd = () => {
    setIsAddingUser(true);
    setFormData({
      userId: `U_${Math.random().toString(36).substring(2, 10)}`,
      displayName: '新訂閱用戶',
      subscribedCities: ['臺北市', '新北市'],
      alertFrequency: 'realtime',
      scheduledTime: '07:00',
    });
  };

  const handleSaveForm = async () => {
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setEditingUser(null);
        setIsAddingUser(false);
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('確定要刪除此訂閱用戶嗎？')) return;
    try {
      const res = await fetch(`/api/subscribers/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerPush = async (userId: string) => {
    setSendingUserId(userId);
    try {
      await onTestPush(userId);
    } finally {
      setSendingUserId(null);
    }
  };

  const toggleCityInForm = (city: string) => {
    setFormData(prev => {
      const exists = prev.subscribedCities.includes(city);
      return {
        ...prev,
        subscribedCities: exists
          ? prev.subscribedCities.filter(c => c !== city)
          : [...prev.subscribedCities, city],
      };
    });
  };

  const getFrequencyBadge = (freq: AlertFrequency) => {
    switch (freq) {
      case 'realtime':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            🔴 即時異動推播
          </span>
        );
      case 'daily_scheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            ⏰ 每日定時推播
          </span>
        );
      case 'alert_only':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🚨 僅停班課通知
          </span>
        );
      case 'disabled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            🔕 已暫停推播
          </span>
        );
    }
  };

  return (
    <div id="subscribers-manager" className="space-y-6">
      {/* Top Header & Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">LINE 訂閱用戶與自訂推播設定</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            管理全體 LINE 好友的關注縣市、每日提醒時間與推播觸發頻率，並支援個別或批量即時測試。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋用戶名稱或縣市..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增訂閱者</span>
          </button>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">用戶資訊</th>
                <th className="py-3 px-4">關注縣市清單</th>
                <th className="py-3 px-4">提醒頻率</th>
                <th className="py-3 px-4">定時推播時間</th>
                <th className="py-3 px-4">最後通知時間</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.map(sub => (
                <tr key={sub.userId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {sub.pictureUrl ? (
                        <img
                          src={sub.pictureUrl}
                          alt={sub.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                          {sub.displayName.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{sub.displayName}</span>
                          {sub.isMock && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                              模擬器
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                          {sub.userId}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {sub.subscribedCities.map(city => (
                        <span
                          key={city}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                        >
                          {city}
                        </span>
                      ))}
                      {sub.subscribedCities.length === 0 && (
                        <span className="text-slate-400 italic">未訂閱縣市</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {getFrequencyBadge(sub.alertFrequency)}
                  </td>

                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-500" />
                      {sub.scheduledTime}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {sub.lastNotifiedAt ? (
                      <span className="text-[11px]">{sub.lastNotifiedAt}</span>
                    ) : (
                      <span className="text-slate-400 italic">尚無推播紀錄</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleTriggerPush(sub.userId)}
                        disabled={sendingUserId === sub.userId}
                        className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors flex items-center gap-1"
                        title="立即推送測試訊息給此用戶"
                      >
                        <Send className={`w-3 h-3 ${sendingUserId === sub.userId ? 'animate-spin' : ''}`} />
                        <span>即時測試</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="編輯設定"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(sub.userId)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubs.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            查無相符的訂閱用戶。
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isAddingUser ? '新增 LINE 訂閱用戶' : `編輯用戶設定: ${formData.displayName}`}
              </h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsAddingUser(false);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">用戶暱稱 / 顯示名稱</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">LINE User ID (識別碼)</label>
                <input
                  type="text"
                  disabled={!isAddingUser}
                  value={formData.userId}
                  onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px] disabled:opacity-60"
                />
              </div>

              {/* Subscribed Counties Multi-Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>關注縣市 ({formData.subscribedCities.length})</span>
                  <div className="space-x-2 text-[11px] font-normal">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subscribedCities: [...ALL_CITIES] })}
                      className="text-sky-600 hover:underline"
                    >
                      全選
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subscribedCities: [] })}
                      className="text-slate-400 hover:underline"
                    >
                      清空
                    </button>
                  </div>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {ALL_CITIES.map(city => {
                    const isSelected = formData.subscribedCities.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => toggleCityInForm(city)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{city}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency Radio Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">通知提醒頻率</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, alertFrequency: 'realtime' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.alertFrequency === 'realtime'
                        ? 'border-rose-500 bg-rose-50/40 text-rose-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">🔴 即時異動推播</div>
                    <div className="text-[10px] text-slate-500 font-normal">一有發布異動立即發送</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, alertFrequency: 'daily_scheduled' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.alertFrequency === 'daily_scheduled'
                        ? 'border-sky-500 bg-sky-50/40 text-sky-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">⏰ 每日定時推播</div>
                    <div className="text-[10px] text-slate-500 font-normal">指定時間發送當日總覽</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, alertFrequency: 'alert_only' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.alertFrequency === 'alert_only'
                        ? 'border-amber-500 bg-amber-50/40 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">🚨 僅停班停課時通知</div>
                    <div className="text-[10px] text-slate-500 font-normal">正常上班課不打擾</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, alertFrequency: 'disabled' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.alertFrequency === 'disabled'
                        ? 'border-slate-500 bg-slate-100 text-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">🔕 暫停主動推播</div>
                    <div className="text-[10px] text-slate-500 font-normal">僅保留手動查詢</div>
                  </button>
                </div>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">每日定時推播時間 (HH:mm)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                  />
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduledTime: '06:30' })}
                      className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      06:30
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduledTime: '07:00' })}
                      className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      07:00
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduledTime: '20:00' })}
                      className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      20:00
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setIsAddingUser(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
