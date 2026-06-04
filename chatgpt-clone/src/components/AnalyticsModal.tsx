import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  X, 
  TrendingUp, 
  MessageSquare, 
  Cpu, 
  Clock, 
  Bookmark, 
  Sparkles,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { ChatSession, Message } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  theme: 'dark' | 'light';
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  theme
}) => {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Compute stats on-demand whenever sessions change
  const stats = useMemo(() => {
    // 1. Generate last 7 days range
    const now = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return d;
    });

    let totalMessages = 0;
    let totalUserMessages = 0;
    let totalAssistantMessages = 0;
    let totalWords = 0;
    
    // Model preference tracking
    const modelPreference: { [key: string]: number } = {};

    sessions.forEach(session => {
      // Trace active model weight
      const model = session.model || 'gemini-3.5-flash';
      modelPreference[model] = (modelPreference[model] || 0) + session.messages.length;

      session.messages.forEach(msg => {
        totalMessages++;
        if (msg.role === 'user') {
          totalUserMessages++;
        } else {
          totalAssistantMessages++;
        }
        // Count rough words for analytics metrics
        if (msg.content) {
          totalWords += msg.content.trim().split(/\s+/).length;
        }
      });
    });

    // 2. Map messages to day buckets
    const chartData = last7Days.map(day => {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      let userMsgs = 0;
      let assistantMsgs = 0;

      sessions.forEach(session => {
        session.messages.forEach(msg => {
          if (msg.timestamp >= dayStart && msg.timestamp < dayEnd) {
            if (msg.role === 'user') {
              userMsgs++;
            } else {
              assistantMsgs++;
            }
          }
        });
      });

      return {
        dateLabel: day.toLocaleDateString(undefined, { weekday: 'short' }),
        fullDate: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        user: userMsgs,
        assistant: assistantMsgs,
        total: userMsgs + assistantMsgs
      };
    });

    // 3. Find max total on any day to scale chart heights correctly
    const maxTotal = Math.max(...chartData.map(item => item.total), 5); // Default min scale threshold

    // 4. Identify most active model
    let favoriteModel = 'Praveen';
    let favoriteModelCount = 0;
    Object.entries(modelPreference).forEach(([modelId, count]) => {
      if (count > favoriteModelCount) {
        favoriteModelCount = count;
        if (modelId === 'gemini-3.5-flash') favoriteModel = 'Praveen';
        else if (modelId === 'gemini-2.5-pro') favoriteModel = 'Gemini 2.5 Pro';
        else if (modelId === 'gemini-3.1-pro-preview') favoriteModel = 'Gemini 3.1 Pro';
        else favoriteModel = modelId;
      }
    });

    // 5. Avg responses per chat
    const avgResponses = sessions.length > 0
      ? (totalAssistantMessages / sessions.length).toFixed(1)
      : '0.0';

    return {
      chartData,
      maxTotal,
      totalSessions: sessions.length,
      totalMessages,
      totalUserMessages,
      totalAssistantMessages,
      avgResponses,
      favoriteModel,
      avgWordsPerMessage: totalMessages > 0 ? Math.round(totalWords / totalMessages) : 0
    };
  }, [sessions]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      id="analytics-modal-overlay"
    >
      {/* Dark overlay backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-205"
        onClick={onClose}
      />

      {/* Main card box container */}
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 transform scale-100 animate-slide-up
        ${theme === 'dark' 
          ? 'bg-[#1e1e1e] border-neutral-800 text-neutral-100 shadow-teal-950/20' 
          : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/50'
        }
      `}>
        {/* Header toolbar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${theme === 'dark' ? 'border-neutral-800 bg-[#252525]' : 'border-neutral-100 bg-neutral-50'}
        `}>
          <div className="flex items-center gap-2.5">
            <BarChart2 className="text-teal-400" size={18} />
            <div>
              <h2 className="font-bold text-sm tracking-tight text-inherit">Chat Usage Insights</h2>
              <p className="text-[10px] text-neutral-400 font-medium">Daily messaging activity metrics & analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-neutral-800/15 text-neutral-400 hover:text-inherit cursor-pointer transition-colors`}
            title="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content body pane */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-none">
          {/* Main Key-Value KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className={`p-3.5 rounded-xl border transition-all hover:scale-[1.01]
              ${theme === 'dark' ? 'bg-neutral-800/30 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'}
            `}>
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <MessageSquare size={12} className="text-teal-400" />
                <span>Total Messages</span>
              </div>
              <div className="text-xl font-black leading-none">{stats.totalMessages}</div>
              <p className="text-[9.5px] text-neutral-500 mt-1">{stats.totalUserMessages} prompt hits</p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all hover:scale-[1.01]
              ${theme === 'dark' ? 'bg-neutral-800/30 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'}
            `}>
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Bookmark size={12} className="text-indigo-400" />
                <span>Total Chats</span>
              </div>
              <div className="text-xl font-black leading-none">{stats.totalSessions}</div>
              <p className="text-[9.5px] text-neutral-500 mt-1">Durable threads</p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all hover:scale-[1.01]
              ${theme === 'dark' ? 'bg-neutral-800/30 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'}
            `}>
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Cpu size={12} className="text-amber-400" />
                <span>Top Model</span>
              </div>
              <div className="text-sm font-extrabold leading-none truncate mt-0.5" title={stats.favoriteModel}>
                {stats.favoriteModel}
              </div>
              <p className="text-[9.5px] text-neutral-500 mt-1.5">Most active engine</p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all hover:scale-[1.01]
              ${theme === 'dark' ? 'bg-neutral-800/30 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'}
            `}>
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <TrendingUp size={12} className="text-emerald-400" />
                <span>Conversational Depth</span>
              </div>
              <div className="text-xl font-black leading-none">{stats.avgResponses}</div>
              <p className="text-[9.5px] text-neutral-500 mt-1">Replies per thread</p>
            </div>
          </div>

          {/* Bar Chart Panel */}
          <div className={`p-5 rounded-xl border relative
            ${theme === 'dark' ? 'bg-[#1b1b1b]/80 border-neutral-800/80' : 'bg-neutral-50/40 border-neutral-100'}
          `}>
            <div className="flex items-center justify-between mb-5 select-none">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-teal-400" />
                <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-neutral-400">Activity Level (Last 7 Days)</h3>
              </div>
              {stats.totalMessages > 0 && (
                <div className="text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/15">
                  Live interaction recording
                </div>
              )}
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="relative w-full h-56 flex flex-col justify-end">
              {/* Grid Background Y-Ticks */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 text-neutral-600">
                <div className="w-full border-b border-dashed border-neutral-800/40 dark:border-neutral-800/70 relative">
                  <span className="absolute -top-2 left-0 text-[8px] font-bold bg-[#1e1e1e] dark:bg-[#1a1a1a] px-1 rounded">
                    {stats.maxTotal} msg
                  </span>
                </div>
                <div className="w-full border-b border-dashed border-neutral-800/40 dark:border-neutral-800/70 relative">
                  <span className="absolute -top-2 left-0 text-[8px] font-bold bg-[#1e1e1e] dark:bg-[#1a1a1a] px-1 rounded">
                    {Math.round(stats.maxTotal / 2)} msg
                  </span>
                </div>
                <div className="w-full border-b border-neutral-800/30 dark:border-neutral-800/50" />
              </div>

              {/* Bars Row Rendering */}
              <div className="flex justify-around items-end h-full z-10 pb-1.5 relative px-2.5">
                {stats.chartData.map((item, index) => {
                  // Count heights
                  const userRatio = item.total > 0 ? (item.user / stats.maxTotal) : 0;
                  const assistantRatio = item.total > 0 ? (item.assistant / stats.maxTotal) : 0;
                  
                  // Total bar height scale relative to maxTotal (up to 150px)
                  const heightLimit = 135;
                  const userHeight = userRatio * heightLimit;
                  const assistantHeight = assistantRatio * heightLimit;
                  const totalHeight = userHeight + assistantHeight;

                  const isHovered = hoveredBarIndex === index;

                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center flex-1 group transition-all duration-150 cursor-pointer"
                      style={{ maxWidth: '44px' }}
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      <div className="relative w-full flex flex-col justify-end items-center h-44">
                        {/* Hover Tooltip display popover */}
                        {isHovered && (
                          <div className={`absolute bottom-full mb-2 p-2.5 rounded-lg border shadow-lg text-[10px] font-medium z-30 transition-all pointer-events-none text-left leading-normal whitespace-nowrap min-w-[120px] animate-fade-in
                            ${theme === 'dark' 
                              ? 'bg-neutral-900 border-neutral-700 text-neutral-100' 
                              : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300'
                            }
                          `}>
                            <p className="font-extrabold text-[10.5px] border-b pb-1 mb-1 border-neutral-700/50 flex justify-between items-center">
                              <span>{item.fullDate}</span>
                              <span className="text-teal-400 font-black">{item.total}</span>
                            </p>
                            <p className="flex justify-between gap-4 items-center">
                              <span className="text-neutral-400">👤 User Prompts:</span> 
                              <span className="font-bold">{item.user}</span>
                            </p>
                            <p className="flex justify-between gap-4 items-center mt-0.5">
                              <span className="text-neutral-400">🤖 Replies:</span> 
                              <span className="font-bold">{item.assistant}</span>
                            </p>
                          </div>
                        )}

                        {/* Stacked bar structure */}
                        {item.total > 0 ? (
                          <div 
                            className="w-5 md:w-6.5 rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 relative border border-transparent"
                            style={{ 
                              height: `${Math.max(totalHeight, 4)}px`,
                              boxShadow: isHovered ? '0 0 12px rgba(20, 184, 166, 0.35)' : 'none'
                            }}
                          >
                            {/* User portion of bar (top) */}
                            <div 
                              className="w-full bg-[#14b8a6] dark:bg-teal-500 hover:bg-teal-400 transition-colors"
                              style={{ height: `${userHeight}px` }}
                              title={`${item.user} User messages`}
                            />
                            {/* Assistant portion of bar (bottom) */}
                            <div 
                              className="w-full bg-[#2dd4bf] dark:bg-teal-400/50 hover:bg-teal-400/75 transition-colors"
                              style={{ height: `${assistantHeight}px` }}
                              title={`${item.assistant} Assistant messages`}
                            />
                          </div>
                        ) : (
                          /* Empty column stand-in */
                          <div 
                            className="w-5 md:w-6.5 h-1.5 rounded bg-neutral-800/40 dark:bg-neutral-800/60 hover:bg-neutral-700 transition-colors mb-0.5"
                            title="No activity recorded"
                          />
                        )}
                      </div>

                      {/* Day Label */}
                      <span className={`text-[9.5px] font-bold mt-2 select-none uppercase tracking-wider
                        ${isHovered 
                          ? 'text-teal-400 scale-105' 
                          : 'text-neutral-500'
                        }
                      `}>
                        {item.dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub legend guide */}
            <div className="flex gap-4 items-center justify-center mt-3 text-[10px] text-neutral-400 border-t border-neutral-800/20 dark:border-neutral-800/40 pt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500 inline-block" />
                <span>User Prompts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-400/50 inline-block border border-teal-400/20" />
                <span>Robot Replies</span>
              </div>
              <div className="text-xs text-neutral-500 ml-4 font-normal">
                (Hover bars for day totals)
              </div>
            </div>
          </div>

          {/* Descriptive Analytical Summary text panel */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3
            ${theme === 'dark' ? 'bg-[#292929]/30 border-neutral-800/60' : 'bg-neutral-50/50 border-neutral-100'}
          `}>
            <Sparkles size={16} className="text-teal-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-wider mb-1 text-inherit">Weekly Activity Assessment</h4>
              {stats.totalMessages === 0 ? (
                <p className="text-neutral-400">
                  You haven't typed any messages in the current history session. Type prompt queries in Praveen, use web groundings, or use custom persona drafts to generate realtime statistics and view live charts right here!
                </p>
              ) : (
                <p className="text-neutral-400 font-normal">
                  You have logged <strong className="text-teal-400 font-bold">{stats.totalUserMessages} requests</strong> during this period, generating <strong className="text-teal-400 font-bold">{stats.totalAssistantMessages} detailed responses</strong>. The average response size has run about <strong className="text-inherit font-bold">{stats.avgWordsPerMessage} words</strong>. Keep exploring prompts using models like <strong>{stats.favoriteModel}</strong> with Web search toggle features enabled to maintain active statistics!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal footer control bar */}
        <div className={`px-6 py-4.5 border-t flex justify-end gap-2.5
          ${theme === 'dark' ? 'border-neutral-800 bg-[#252525]' : 'border-neutral-200 bg-neutral-50'}
        `}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-605 text-white shadow-md shadow-teal-500/10 cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
