/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  PanelLeftClose,
  Sparkles,
  Bot,
  Upload,
  BarChart2
} from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearSessions: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
  onImportSession: (session: ChatSession) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  onClearSessions,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenAnalytics,
  isOpen,
  onToggleSidebar,
  onImportSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleImportClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const parsed = JSON.parse(event.target.result);
          
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.messages)) {
            const importedSession: ChatSession = {
              id: parsed.id || 'session-' + Date.now(),
              title: parsed.title || 'Imported Chat',
              messages: parsed.messages.map((m: any) => ({
                id: m.id || 'msg-' + Math.random().toString(36).substr(2, 9),
                role: m.role || 'user',
                content: m.content || '',
                timestamp: m.timestamp || Date.now(),
                groundingChunks: m.groundingChunks
              })),
              model: parsed.model || 'gemini-3.5-flash',
              systemInstruction: parsed.systemInstruction || '',
              searchEnabled: !!parsed.searchEnabled,
              timestamp: parsed.timestamp || Date.now()
            };
            onImportSession(importedSession);
            alert(`"${importedSession.title}" backup session imported successfully!`);
          } else {
            alert('Invalid backup format. Make sure it is a valid exported Chat JSON.');
          }
        } catch (err) {
          alert('Failed to parse backup JSON. Check file integrity.');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

  // Grouping sessions by date
  const getGroupedSessions = () => {
    const filtered = sessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    };

    filtered.forEach(session => {
      const time = session.timestamp;
      if (time >= today) {
        groups['Today'].push(session);
      } else if (time >= yesterday) {
        groups['Yesterday'].push(session);
      } else if (time >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    // Sort every group's list of sessions by timestamp descending so the newest are on top
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.timestamp - a.timestamp);
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  };

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const groupedSessions = getGroupedSessions();

  return (
    <>
      {/* Sidebar background overlay on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      <div
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-[260px] border-r transition-all duration-300 select-none
          ${theme === 'dark' 
            ? 'bg-[#171717] border-neutral-800 text-neutral-200' 
            : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 overflow-hidden md:border-r-0'}
        `}
      >
        {/* New Chat & Close Toggle Area */}
        <div className="flex items-center justify-between p-3.5 gap-2">
          <button
            onClick={onCreateSession}
            id="btn-new-chat"
            className={`flex-1 flex items-center justify-between gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer
              ${theme === 'dark'
                ? 'border-neutral-700 bg-[#212121] hover:bg-[#2f2f2f] text-white hover:border-neutral-600'
                : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 hover:border-neutral-400'
              }
            `}
            title="Create a new conversation session"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot size={14} className={theme === 'dark' ? 'text-teal-400' : 'text-teal-600'} />
              <span className="truncate">New Chat</span>
            </div>
            <Plus size={14} className="shrink-0" />
          </button>

          <button
            onClick={handleImportClick}
            id="btn-import-chat-session"
            className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all duration-200
              ${theme === 'dark'
                ? 'border-neutral-700 bg-[#212121] hover:bg-[#2f2f2f] text-[#a3a3a3] hover:text-teal-400 hover:border-neutral-600'
                : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-teal-600 hover:border-neutral-400'
              }
            `}
            title="Import exported chat (.json) backup"
          >
            <Upload size={14} />
          </button>

          <button
            onClick={onToggleSidebar}
            id="btn-close-sidebar"
            className={`p-2 rounded-lg cursor-pointer transition-colors duration-150 shrink-0
              ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}
            `}
            title="Close sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Search filter input */}
        <div className="px-3 pb-2">
          <div className={`relative flex items-center rounded-lg border px-2.5 py-1.5 text-xs transition-colors duration-150
            ${theme === 'dark' 
              ? 'border-neutral-800 bg-[#212121] text-neutral-300 focus-within:border-neutral-700' 
              : 'border-neutral-300 bg-white text-neutral-700 focus-within:border-neutral-400'
            }
          `}>
            <Search size={14} className="text-neutral-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Chat History Scrollable List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-none">
          {groupedSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-500">
              {searchQuery ? 'No matching chats found' : 'No chat history'}
            </div>
          ) : (
            groupedSessions.map(([groupName, list]) => (
              <div key={groupName} className="space-y-1">
                <h3 className="px-3 text-[11px] font-semibold text-neutral-500 tracking-wider uppercase">
                  {groupName}
                </h3>
                <div className="space-y-[2px]">
                  {list.map(session => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer relative
                        ${session.id === activeSessionId
                          ? (theme === 'dark' ? 'bg-[#212121] text-white font-medium' : 'bg-neutral-200 text-neutral-900 font-medium')
                          : (theme === 'dark' ? 'hover:bg-[#212121]/50 text-neutral-300' : 'hover:bg-neutral-100/80 text-neutral-700')
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-4 flex-1">
                        <MessageSquare size={15} className="shrink-0 text-neutral-500 self-start mt-0.5" />
                        
                        {editingId === session.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(e as any, session.id);
                              if (e.key === 'Escape') handleCancelRename(e as any);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-none outline-none w-full text-sm font-normal py-[1px] text-teal-400 focus:ring-0"
                          />
                        ) : (
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate text-xs font-semibold leading-normal">
                              {session.title}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-medium leading-none mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                              {new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(session.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rename and Delete Actions */}
                      {editingId === session.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleSaveRename(e, session.id)}
                            className="p-0.5 rounded text-teal-500 hover:text-teal-400"
                            title="Confirm rename"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-0.5 rounded text-rose-500 hover:text-rose-400"
                            title="Cancel rename"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 shrink-0">
                          <button
                            onClick={(e) => handleStartRename(e, session)}
                            className="p-1 rounded hover:bg-neutral-700/30 text-neutral-500 hover:text-neutral-300"
                            title="Rename chat"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this conversation?')) {
                                onDeleteSession(session.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-neutral-700/30 text-neutral-500 hover:text-rose-500"
                            title="Delete chat"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Area with Preferences/Settings */}
        <div className={`p-3.5 border-t space-y-1.5 shrink-0
          ${theme === 'dark' ? 'border-neutral-800 bg-[#171717]' : 'border-neutral-200 bg-neutral-100'}
        `}>
          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            id="btn-toggle-theme"
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 text-left align-middle cursor-pointer
              ${theme === 'dark' ? 'hover:bg-[#212121] text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'}
            `}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={16} className="text-amber-400" />
                <span className="text-xs">Switch to Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} className="text-indigo-600" />
                <span className="text-xs">Switch to Dark Mode</span>
              </>
            )}
          </button>

          {/* Model settings panel */}
          <button
            onClick={onOpenSettings}
            id="btn-open-settings"
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 text-left align-middle cursor-pointer
              ${theme === 'dark' ? 'hover:bg-[#212121] text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'}
            `}
          >
            <Settings size={16} className="text-neutral-500" />
            <span className="text-xs">Custom Instructions & Model</span>
          </button>

          {/* Analytics View panel */}
          <button
            onClick={onOpenAnalytics}
            id="btn-open-analytics"
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 text-left align-middle cursor-pointer
              ${theme === 'dark' ? 'hover:bg-[#212121] text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'}
            `}
            title="View chat usage trends and response analytics"
          >
            <BarChart2 size={16} className="text-teal-400" />
            <span className="text-xs font-semibold">Usage & Analytics</span>
          </button>

          {/* Clear History */}
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear ALL conversations? This cannot be undone.')) {
                  onClearSessions();
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs rounded-lg transition-colors duration-150 text-left text-rose-500 hover:bg-rose-500/10 cursor-pointer`}
            >
              <Trash2 size={14} className="shrink-0" />
              <span>Clear chat history</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
