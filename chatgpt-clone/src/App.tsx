/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ChatSession, Message, PERSONAS, MODELS } from './types';
import { PanelLeft, Sparkles, Bot, AlertCircle } from 'lucide-react';

export default function App() {
  // Load initial settings and history from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_active_session_id');
      return stored || null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_theme');
      return (stored as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_model');
      return stored || 'gemini-3.5-flash';
    } catch {
      return 'gemini-3.5-flash';
    }
  });

  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_persona');
      return stored || 'default';
    } catch {
      return 'default';
    }
  });

  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gpt_clone_custom_prompt');
      if (stored) return stored;
      const def = PERSONAS.find(p => p.id === 'default');
      return def ? def.systemInstruction : '';
    } catch {
      return '';
    }
  });

  // UI display toggles
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state variables to localStorage
  useEffect(() => {
    localStorage.setItem('gpt_clone_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('gpt_clone_active_session_id', activeSessionId);
    } else {
      localStorage.removeItem('gpt_clone_active_session_id');
    }
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('gpt_clone_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gpt_clone_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('gpt_clone_persona', activePersonaId);
  }, [activePersonaId]);

  useEffect(() => {
    localStorage.setItem('gpt_clone_custom_prompt', customSystemPrompt);
  }, [customSystemPrompt]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Handler functions
  const handleCreateSession = (): ChatSession => {
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New Chat Session',
      messages: [],
      model: selectedModel,
      systemInstruction: customSystemPrompt,
      searchEnabled: false,
      timestamp: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setErrorMessage(null);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const handleClearSessions = () => {
    setSessions([]);
    setActiveSessionId(null);
    setErrorMessage(null);
  };

  const handleSendMessage = async (content: string, searchEnabled: boolean) => {
    if (isStreaming) return;
    setErrorMessage(null);

    let currentSession = activeSession;
    if (!currentSession) {
      // Create session on-demand if missing
      currentSession = handleCreateSession();
    }

    const firstUserMessage = currentSession.messages.length === 0;

    // Set auto title from first prompt if generic
    const targetTitle = firstUserMessage 
      ? (content.length > 30 ? content.slice(0, 30) + '...' : content)
      : currentSession.title;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    const assistantMsgId = 'msg-assistant-' + Date.now();
    const placeholderAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      groundingChunks: []
    };

    // Update session state before firing endpoint
    const updatedMessages = [...currentSession.messages, userMsg];
    
    // Optimistically update sessions with User and Empty Assistant message placeholders
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSession!.id) {
          return {
            ...s,
            title: targetTitle,
            searchEnabled,
            timestamp: Date.now(),
            messages: [...updatedMessages, placeholderAssistantMsg]
          };
        }
        return s;
      });
      // Sort sessions by timestamp descending so the most recently active chat is always on top
      return updated.sort((a, b) => b.timestamp - a.timestamp);
    });

    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentSession.model,
          messages: updatedMessages,
          systemInstruction: customSystemPrompt,
          searchEnabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("Unable to establish a readable stream framework");
      }

      let accumulatedText = "";
      let accumulatedGrounding: any[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // retain incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          const rawData = trimmed.slice(6).trim();
          if (rawData === '[DONE]') continue;

          let payload: any;
          try {
            payload = JSON.parse(rawData);
          } catch (e) {
            console.warn("SSE json fragment parse issue:", e);
            continue;
          }

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.text) {
            accumulatedText += payload.text;
          }
          if (payload.groundingChunks?.length > 0) {
            // Ensure we deduplicate grounding chunks cleanly
            payload.groundingChunks.forEach((item: any) => {
              if (item.web && !accumulatedGrounding.some(g => g.web?.uri === item.web.uri)) {
                accumulatedGrounding.push(item);
              }
            });
          }

          // Real-time progressive UI output stream
          setSessions(prev => prev.map(s => {
            if (s.id === currentSession!.id) {
              return {
                ...s,
                messages: s.messages.map(m => {
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      content: accumulatedText,
                      groundingChunks: accumulatedGrounding.length > 0 ? accumulatedGrounding : undefined
                    };
                  }
                  return m;
                })
              };
            }
            return s;
          }));
        }
      }
    } catch (err: any) {
      console.error("Stream connection failed:", err);
      setErrorMessage(err.message || "An unpreventable error happened with Gemini API.");
      
      // Fallback message update inside thread showing error
      setSessions(prev => prev.map(s => {
        if (s.id === currentSession!.id) {
          return {
            ...s,
            messages: s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  content: `### ⚠️ Connection Issue\n\n${err.message || 'The application failed to communicate with the model server. Please verify your GEMINI_API_KEY settings.'}`
                };
              }
              return m;
            })
          };
        }
        return s;
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleResetSession = () => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
      setErrorMessage(null);
    }
  };

  const handleImportSession = (importedSession: ChatSession) => {
    setSessions(prev => {
      const exists = prev.some(s => s.id === importedSession.id);
      if (exists) {
        return prev.map(s => s.id === importedSession.id ? importedSession : s);
      } else {
        return [importedSession, ...prev];
      }
    });
    setActiveSessionId(importedSession.id);
  };

  const getPersonaName = () => {
    const p = PERSONAS.find(items => items.id === activePersonaId);
    return p ? p.name : 'Default';
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-xs md:text-sm select-none
      ${theme === 'dark' ? 'bg-[#212121] text-neutral-100 dark' : 'bg-white text-neutral-800'}
    `}>
      {/* Persistent Sidebar Frame */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearSessions={handleClearSessions}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onImportSession={handleImportSession}
      />

      {/* Floating Collapsed Sidebar Trigger (for desktop, if sidebar minimized) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          id="btn-open-sidebar-floating"
          className={`hidden md:flex fixed top-4 left-4 z-30 p-2 rounded-lg cursor-pointer transition-colors shadow-sm border
            ${theme === 'dark'
              ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300'
              : 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-600'
            }
          `}
          title="Open sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}

      {/* Main Conversation Canvas Container */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300
        ${sidebarOpen ? 'md:pl-[260px]' : 'pl-0'}
      `}>
        {/* Connection general warnings block */}
        {errorMessage && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-rose-500 select-normal">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span className="text-[11px] leading-relaxed font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-neutral-500 hover:text-rose-400 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        <ChatWindow
          session={activeSession}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          onResetSession={handleResetSession}
          getPersonaName={getPersonaName}
          onOpenAnalytics={() => setAnalyticsOpen(true)}
        />
      </div>

      {/* Settings management modal panel */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        selectedModel={selectedModel}
        onChangeModel={setSelectedModel}
        activePersonaId={activePersonaId}
        onChangePersona={setActivePersonaId}
        customSystemPrompt={customSystemPrompt}
        onSaveCustomPrompt={setCustomSystemPrompt}
        theme={theme}
      />

      {/* Dynamic Usage Trends Analytics Panel Modal Backdrop */}
      <AnalyticsModal 
        isOpen={analyticsOpen} 
        onClose={() => setAnalyticsOpen(false)} 
        sessions={sessions} 
        theme={theme} 
      />
    </div>
  );
}
