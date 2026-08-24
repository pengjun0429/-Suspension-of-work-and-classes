import React, { useState, useRef, useEffect } from 'react';
import { UserSubscription, LineChatMessage } from '../types';
import {
  Send,
  Sparkles,
  Smartphone,
  RotateCcw,
  Bot,
  User,
  Clock,
  Bell,
  MapPin,
  HelpCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface LineChatSimulatorProps {
  currentUser: UserSubscription;
  onUserUpdate: () => void;
}

export const LineChatSimulator: React.FC<LineChatSimulatorProps> = ({
  currentUser,
  onUserUpdate,
}) => {
  const [messages, setMessages] = useState<LineChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: `👋 您好！我是「LINE 停班停課自動推送機器人」。\n\n已為您同步行政院人事行政總處 (DGPA) 資料集 20457。\n您可以在此直接測試傳送任何指令，或點選下方快捷選單！`,
      timestamp: '剛剛',
      quickReplies: [
        { label: '🗺️ 查全台狀況', text: '查全台' },
        { label: '📍 查我訂閱的縣市', text: '查我訂閱' },
        { label: '⚙️ 我的設定', text: '我的設定' },
        { label: '🔴 切換即時推播', text: '即時推播' },
        { label: '⏰ 設定 07:00 推播', text: '設定時間 07:00' },
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string, postbackData?: string) => {
    const text = textToSend !== undefined ? textToSend : inputVal;
    if (!text.trim() && !postbackData) return;

    if (!postbackData) {
      const userMsg: LineChatMessage = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputVal('');
    }

    setIsTyping(true);

    try {
      const res = await fetch('/api/line/simulate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          text: text.trim(),
          postbackData,
        }),
      });

      const data = await res.json();
      if (data.success && data.messages) {
        const newBotMsgs: LineChatMessage[] = data.messages.map((m: any, idx: number) => {
          const quickReplies = m.quickReply?.items?.map((item: any) => ({
            label: item.action?.label || item.action?.text,
            text: item.action?.text,
          })) || [];

          if (m.type === 'text') {
            return {
              id: `bot_${Date.now()}_${idx}`,
              sender: 'bot',
              text: m.text,
              timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
              quickReplies,
            };
          } else if (m.type === 'flex') {
            return {
              id: `bot_${Date.now()}_${idx}`,
              sender: 'bot',
              flexMessage: m.contents,
              timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
              quickReplies,
            };
          }
          return {
            id: `bot_${Date.now()}_${idx}`,
            sender: 'bot',
            text: m.text || JSON.stringify(m),
            timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            quickReplies,
          };
        });

        setMessages(prev => [...prev, ...newBotMsgs]);
        onUserUpdate();
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: '❌ 機器人連線逾時，請確認伺服器運作正常。',
          timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg_welcome_reset',
        sender: 'bot',
        text: `對話已重置。您可以隨時輸入縣市名稱（如「台北」、「高雄」）或自訂推播時間與通知提醒頻率！`,
        timestamp: '剛剛',
        quickReplies: [
          { label: '🗺️ 查全台狀況', text: '查全台' },
          { label: '📍 查我訂閱', text: '查我訂閱' },
          { label: '⚙️ 我的設定', text: '我的設定' },
        ],
      },
    ]);
  };

  // Helper to render Flex Message components inside mobile mock
  const renderFlexContents = (contents: any) => {
    if (!contents) return null;

    const header = contents.header;
    const body = contents.body;
    const footer = contents.footer;

    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200 text-xs w-full max-w-[280px]">
        {/* Header */}
        {header && (
          <div
            className="p-3.5 text-white"
            style={{ backgroundColor: header.backgroundColor || '#0F172A' }}
          >
            {header.contents?.map((item: any, idx: number) => {
              if (item.type === 'box') {
                return (
                  <div key={idx} className="flex items-center justify-between">
                    {item.contents?.map((sub: any, sIdx: number) => (
                      <span
                        key={sIdx}
                        className={sub.weight === 'bold' ? 'font-bold' : ''}
                        style={{ color: sub.color || '#fff', fontSize: sub.size === 'lg' ? '14px' : '12px' }}
                      >
                        {sub.text}
                      </span>
                    ))}
                  </div>
                );
              }
              return (
                <div key={idx} className="text-[11px] opacity-80 mt-1" style={{ color: item.color }}>
                  {item.text}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        {body && (
          <div className="p-3.5 space-y-2.5 bg-white text-slate-800">
            {body.contents?.map((item: any, idx: number) => {
              if (item.type === 'text') {
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${item.weight === 'bold' ? 'font-bold' : ''}`}
                    style={{ color: item.color || '#1E293B' }}
                  >
                    {item.text}
                  </div>
                );
              }
              if (item.type === 'box') {
                const isHoriz = item.layout === 'horizontal';
                return (
                  <div
                    key={idx}
                    className={`rounded-lg p-2 text-xs ${isHoriz ? 'flex items-center justify-between gap-1' : 'space-y-1'}`}
                    style={{ backgroundColor: item.backgroundColor || '#F8FAFC' }}
                  >
                    {item.contents?.map((sub: any, sIdx: number) => {
                      if (sub.type === 'box') {
                        return (
                          <div
                            key={sIdx}
                            className="p-1.5 rounded flex-1 text-center"
                            style={{ backgroundColor: sub.backgroundColor || 'transparent' }}
                          >
                            {sub.contents?.map((nested: any, nIdx: number) => (
                              <div
                                key={nIdx}
                                className={nested.weight === 'bold' ? 'font-bold text-xs' : 'text-[10px]'}
                                style={{ color: nested.color }}
                              >
                                {nested.text}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      if (sub.type === 'button') {
                        return (
                          <button
                            key={sIdx}
                            onClick={() => {
                              if (sub.action?.data) {
                                handleSendMessage('', sub.action.data);
                              } else if (sub.action?.text) {
                                handleSendMessage(sub.action.text);
                              }
                            }}
                            className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-all ${
                              sub.style === 'primary' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            style={sub.color ? { backgroundColor: sub.color, color: '#fff' } : {}}
                          >
                            {sub.action?.label}
                          </button>
                        );
                      }
                      return (
                        <span
                          key={sIdx}
                          className={sub.weight === 'bold' ? 'font-bold' : ''}
                          style={{ color: sub.color }}
                        >
                          {sub.text}
                        </span>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-1.5">
            {footer.contents?.map((btn: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  if (btn.action?.data) {
                    handleSendMessage('', btn.action.data);
                  } else if (btn.action?.text) {
                    handleSendMessage(btn.action.text);
                  }
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  btn.style === 'primary'
                    ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                    : btn.style === 'secondary'
                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    : 'text-sky-600 hover:bg-sky-50'
                }`}
                style={btn.style === 'primary' && btn.color ? { backgroundColor: btn.color } : {}}
              >
                {btn.action?.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Find latest quick replies from last bot message
  const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0);
  const activeQuickReplies = lastBotMessage?.quickReplies || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Mobile Simulator Phone Container */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-[380px] bg-slate-900 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-800 relative border-4 border-slate-700">
          {/* Phone Speaker & Camera Notch */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-slate-700"></div>
            <div className="w-8 h-1 rounded-full bg-slate-700"></div>
          </div>

          {/* Screen Content */}
          <div className="bg-[#72899A] h-[640px] rounded-[34px] overflow-hidden flex flex-col relative pt-8">
            {/* LINE Chat Header */}
            <div className="bg-[#1E2B38] text-white px-4 py-2.5 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">停班停課即時通知 Bot</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>自動推播運作中</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClearChat}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-700/50 transition-colors"
                title="清空測試訊息"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              <div className="text-center my-1">
                <span className="bg-black/20 text-white/90 text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  今天 {new Date().toLocaleDateString('zh-TW')}
                </span>
              </div>

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0 mt-1 shadow-xs">
                      ⚡
                    </div>
                  )}

                  <div className={`max-w-[82%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.text && (
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-line ${
                          msg.sender === 'user'
                            ? 'bg-[#A9E87A] text-slate-900 rounded-tr-none font-medium'
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {msg.flexMessage && renderFlexContents(msg.flexMessage)}

                    <span className="text-[9px] text-white/70 px-1 mt-0.5">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-white/80 pl-8">
                  <div className="bg-white/80 text-slate-600 px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1 shadow-xs animate-pulse">
                    <Bot className="w-3 h-3 text-sky-600" />
                    <span>機器人正在查詢 DGPA 資料...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies Carousel */}
            {activeQuickReplies.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xs p-1.5 overflow-x-auto flex items-center gap-1.5 border-t border-white/10 scrollbar-none">
                {activeQuickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qr.text)}
                    className="bg-white/90 hover:bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs hover:scale-105 active:scale-95 transition-all"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="bg-[#243342] p-2 flex items-center gap-2 border-t border-slate-700">
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="輸入縣市（如台北市）或指令..."
                className="flex-1 bg-[#1A2633] text-white text-xs px-3 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder-slate-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim()}
                className={`p-2 rounded-full transition-all ${
                  inputVal.trim()
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Prompt Cheatsheet & User Preferences */}
      <div className="lg:col-span-5 space-y-4">
        {/* Current Simulated User Profile Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{currentUser.displayName}</h4>
                <p className="text-xs text-slate-400">目前測試模擬帳號</p>
              </div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              線上互動中
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-500" />
                關注縣市 ({currentUser.subscribedCities.length})
              </span>
              <span className="font-bold text-slate-800 line-clamp-2">
                {currentUser.subscribedCities.join('、') || '未設定'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3 text-rose-500" />
                提醒頻率
              </span>
              <span className="font-bold text-slate-800">
                {currentUser.alertFrequency === 'realtime'
                  ? '🔴 即時異動'
                  : currentUser.alertFrequency === 'daily_scheduled'
                  ? `⏰ 每日 ${currentUser.scheduledTime}`
                  : currentUser.alertFrequency === 'alert_only'
                  ? '🚨 僅停班課通知'
                  : '🔕 暫停通知'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Testing Actions & Cheat Sheet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h4 className="text-sm font-bold text-slate-900">點擊即測常用對話指令</h4>
          </div>

          {/* Category: Queries */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">即時停班課查詢</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSendMessage('查全台')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🗺️ 查全台狀況</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">取得 22 縣市總覽圖卡</div>
              </button>

              <button
                onClick={() => handleSendMessage('台北市')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>📍 查詢台北市</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">單一縣市卡片與快速訂閱</div>
              </button>

              <button
                onClick={() => handleSendMessage('高雄市')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🌊 查詢高雄市</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">南部地區即時狀態</div>
              </button>

              <button
                onClick={() => handleSendMessage('查我訂閱')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>📌 查我訂閱的縣市</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">過濾個人自訂地區</div>
              </button>
            </div>
          </div>

          {/* Category: Subscription & Notification settings */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">自訂訂閱縣市與提醒</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSendMessage('訂閱 臺北市 新北市 基隆市 桃園市')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>➕ 訂閱北北基桃</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">一鍵訂閱大台北生活圈</div>
              </button>

              <button
                onClick={() => handleSendMessage('訂閱 臺中市 彰化縣 南投縣')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>➕ 訂閱中彰投</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">中部地區生活圈</div>
              </button>

              <button
                onClick={() => handleSendMessage('設定時間 06:30')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>⏰ 設定 06:30 推播</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">晨間通勤前定時推播</div>
              </button>

              <button
                onClick={() => handleSendMessage('即時推播')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🔴 切換即時異動推播</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">一有停班課立刻主動發送</div>
              </button>

              <button
                onClick={() => handleSendMessage('僅停班課通知')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🚨 僅停班課通知</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">正常上班課不打擾</div>
              </button>

              <button
                onClick={() => handleSendMessage('我的設定')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>⚙️ 查看我的設定</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">完整偏好總覽與修改</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
