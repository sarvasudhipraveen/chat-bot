/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Globe, 
  Copy, 
  Check, 
  Menu, 
  Compass, 
  ArrowUp, 
  RotateCcw, 
  Sparkles, 
  Link2, 
  AlertCircle, 
  Download, 
  FileJson, 
  FileText,
  Share2,
  X,
  Volume2,
  VolumeX,
  BarChart2,
  Mic,
  MicOff,
  BookOpen
} from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatSession, SUGGESTIONS, Message, encodeSharedSession } from '../types';
import { PromptLibrary } from './PromptLibrary';

interface ChatWindowProps {
  session: ChatSession | null;
  onSendMessage: (content: string, searchEnabled: boolean) => void;
  isStreaming: boolean;
  onToggleSidebar: () => void;
  theme: 'dark' | 'light';
  onResetSession: () => void;
  getPersonaName: () => string;
  onOpenAnalytics: () => void;
  isSharedPreview?: boolean;
  onImportShared?: () => void;
  onDismissShared?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  session,
  onSendMessage,
  isStreaming,
  onToggleSidebar,
  theme,
  onResetSession,
  getPersonaName,
  onOpenAnalytics,
  isSharedPreview = false,
  onImportShared = () => {},
  onDismissShared = () => {},
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(session?.searchEnabled ?? false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not fully supported or enabled in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (!recognitionRef.current) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (transcript) {
            setInput(prev => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
            });
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event);
          if (event.error === 'not-allowed') {
            alert('Microphone permission is blocked or denied. Please check your browser or frame integration settings.');
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
      }
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsListening(false);
    }
  };

  // Stop listening when active session changes
  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, [session?.id]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleExportJSON = () => {
    if (!session) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export JSON:", err);
    } finally {
      setExportDropdownOpen(false);
    }
  };

  const handleExportText = () => {
    if (!session) return;
    try {
      let textContent = `Chat Title: ${session.title}\n`;
      textContent += `Model: ${session.model}\n`;
      textContent += `Date: ${new Date(session.timestamp).toLocaleString()}\n`;
      textContent += `=========================================\n\n`;

      session.messages.forEach((msg) => {
        const roleName = msg.role === 'user' ? 'YOU' : 'CHATGPT / ASSISTANT';
        const timeStr = new Date(msg.timestamp).toLocaleTimeString();
        textContent += `[${timeStr}] ${roleName}:\n${msg.content}\n\n`;
        if (msg.groundingChunks && msg.groundingChunks.length > 0) {
          textContent += `Sources:\n`;
          msg.groundingChunks.forEach(chunk => {
            if (chunk.web) {
              textContent += `- ${chunk.web.title}: ${chunk.web.uri}\n`;
            }
          });
          textContent += `\n`;
        }
        textContent += `-----------------------------------------\n\n`;
      });

      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(textContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_history.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export text:", err);
    } finally {
      setExportDropdownOpen(false);
    }
  };

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Stop any active speech upon changing session conversation context
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
  }, [session?.id]);

  const toggleSpeech = (messageId: string, content: string) => {
    if (!window.speechSynthesis) {
      alert("Text-to-Speech is not fully supported in this browser environment.");
      return;
    }

    if (playingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      
      // Clean up markdown/code highlights to maintain comfortable audio rendering
      const cleanText = content
        .replace(/```[\s\S]*?```/g, '[code fragment]')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*#_~\[\]()]+/g, '')
        .replace(/-\s+/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => {
        setPlayingMessageId(null);
      };
      utterance.onerror = () => {
        setPlayingMessageId(null);
      };
      
      setPlayingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const getMessageStats = (content: string) => {
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 200)); 
    return { chars, words, readingTime };
  };

  // Sync session's search state to local UI when active session changes
  useEffect(() => {
    if (session) {
      setLocalSearch(session.searchEnabled);
    }
  }, [session?.id]);

  // Handle textarea autogrow
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages?.length, isStreaming]);

  const handleSelectPrompt = (content: string, overwrite: boolean) => {
    if (overwrite) {
      setInput(content);
    } else {
      const trimmedInput = input.trim();
      setInput(trimmedInput ? `${trimmedInput}\n\n${content}` : content);
    }
    setLibraryOpen(false);
    // Auto focus back on the text container
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop listening on send:", err);
      }
      setIsListening(false);
    }

    onSendMessage(input.trim(), localSearch);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentModelName = 
    session?.model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' :
    session?.model === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' :
    'Praveen';

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200
      ${theme === 'dark' ? 'bg-[#212121] text-neutral-100' : 'bg-white text-neutral-800'}
    `}>
      {/* Top Header Bar */}
      <div className={`h-[56px] border-b flex items-center justify-between px-4 shrink-0
        ${theme === 'dark' ? 'border-neutral-800 bg-[#212121]' : 'border-neutral-200 bg-white'}
      `}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            id="btn-sidebar-trigger"
            className={`p-2 rounded-lg cursor-pointer transition-colors md:hidden
              ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'}
            `}
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-teal-400" />
            <span className="font-semibold text-xs select-none">
              {session ? `Chat (${currentModelName})` : 'ChatGPT Clone'}
            </span>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-semibold px-1.5 py-0.5 rounded uppercase">
              {getPersonaName()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Unconditional Usage/Insights button */}
          <button
            onClick={onOpenAnalytics}
            id="btn-header-analytics-trigger"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150
              ${theme === 'dark' 
                ? 'hover:bg-[#2f2f2f] text-teal-400' 
                : 'hover:bg-neutral-100 text-teal-600'
              }
            `}
            title="Open Chat Usage Insights Graph"
          >
            <BarChart2 size={14} className="text-teal-400" />
            <span className="hidden sm:inline">Usage Stats</span>
          </button>

          {session && session.messages.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Export Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  id="btn-export-chat"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150
                    ${theme === 'dark' 
                      ? 'hover:bg-[#2f2f2f] text-neutral-400 hover:text-white' 
                      : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }
                    ${exportDropdownOpen ? (theme === 'dark' ? 'bg-[#2f2f2f] text-white' : 'bg-neutral-100 text-neutral-900') : ''}
                  `}
                  title="Export conversation history"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                  <span className="text-[8px] opacity-70">▼</span>
                </button>

                {exportDropdownOpen && (
                  <>
                    {/* Overlay to close on outside click */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setExportDropdownOpen(false)} 
                    />
                    <div className={`absolute right-0 mt-1 w-44 rounded-lg shadow-xl border z-40 py-1 overflow-hidden transition-all duration-150
                      ${theme === 'dark'
                        ? 'bg-[#1e1e1e] border-neutral-800 text-neutral-200'
                        : 'bg-white border-neutral-200 text-neutral-700'
                      }
                    `}>
                      <div className="px-3 py-1.5 text-[9px] font-bold text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider">
                        Export Format
                      </div>
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors
                          ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'}
                        `}
                      >
                        <FileJson size={14} className="text-teal-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold">JSON backup</span>
                          <span className="text-[9px] text-neutral-500">Includes metadata & state</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportText}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors
                          ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'}
                        `}
                      >
                        <FileText size={14} className="text-indigo-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold">Plain text</span>
                          <span className="text-[9px] text-neutral-500">Perfect for reading</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onResetSession}
                id="btn-start-over"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150
                  ${theme === 'dark' ? 'hover:bg-[#2f2f2f] text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'}
                `}
                title="Restart conversation"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Start Over</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation viewport */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {!session || session.messages.length === 0 ? (
          /* Elegant Landing screen content layout */
          <div className="max-w-2xl mx-auto px-4 pt-16 pb-8 md:pt-24 flex flex-col items-center">
            <div className={`p-4 rounded-full shadow-lg mb-6 border transition-all duration-200
              ${theme === 'dark' 
                ? 'bg-neutral-900 border-neutral-800 text-teal-400 shadow-teal-500/5' 
                : 'bg-teal-50 border-teal-100 text-teal-600 shadow-teal-500/10'
              }
            `}>
              <Bot size={44} className="animate-pulse" />
            </div>
            
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-center md:mb-1 select-none">
              How can I help you today?
            </h1>
            <p className="text-[11px] text-neutral-500 text-center mb-8 select-none">
              A high-performance clone featuring real-time Search Grounding and customizable personas.
            </p>

            {/* AI Custom Instructions Warning if missing key */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-6">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(`${s.title} ${s.text}`)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-[1px] select-none text-xs cursor-pointer
                    ${theme === 'dark'
                      ? 'border-neutral-800 bg-[#252525] hover:border-neutral-700 text-neutral-200'
                      : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 text-neutral-700'
                    }
                  `}
                >
                  <span className="font-semibold text-xs mb-1 group-hover:text-teal-400">{s.title}</span>
                  <span className="text-[10.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 font-normal">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Actual Message Bubbles rendering */
          <div className={`divide-y divide-neutral-100 dark:divide-neutral-900/60`}>
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={`w-full py-6 px-4 md:px-8
                  ${message.role === 'user' 
                    ? (theme === 'dark' ? 'bg-[#212121]' : 'bg-white')
                    : (theme === 'dark' ? 'bg-[#2a2a2a]/40' : 'bg-neutral-50/70')
                  }
                `}
              >
                <div className="max-w-2xl mx-auto flex items-start gap-4">
                  {/* Sender Avatar badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border select-none text-[11px] font-bold
                    ${message.role === 'user'
                      ? 'bg-neutral-500 text-white border-neutral-600'
                      : 'bg-teal-500 text-white border-teal-600'
                    }
                  `}>
                    {message.role === 'user' ? 'YOU' : 'GPT'}
                  </div>

                  {/* Message body frame */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                        {message.role === 'assistant' && (() => {
                          const stats = getMessageStats(message.content);
                          return (
                            <span className="text-[9px] text-neutral-500 font-semibold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 select-none">
                              <BarChart2 size={10} className="text-teal-400" />
                              <span>{stats.words} words • {stats.chars} chars • {stats.readingTime} min read</span>
                            </span>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {message.role === 'assistant' && (
                          <>
                            {/* TTS Action Button */}
                            <button
                              onClick={() => toggleSpeech(message.id, message.content)}
                              className={`p-1 rounded cursor-pointer transition-colors duration-150 text-neutral-500 hover:text-neutral-300`}
                              title={playingMessageId === message.id ? "Stop voice player" : "Listen to this response"}
                            >
                              {playingMessageId === message.id ? (
                                <VolumeX size={14} className="text-rose-400 animate-pulse shrink-0" />
                              ) : (
                                <Volume2 size={14} className="text-neutral-500 hover:text-teal-400 shrink-0" />
                              )}
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopy(message.id, message.content)}
                              className={`p-1 rounded cursor-pointer transition-colors duration-150 text-neutral-500 hover:text-neutral-300`}
                              title="Copy message text"
                            >
                              {copiedId === message.id ? (
                                <Check size={14} className="text-teal-400 shrink-0" />
                              ) : (
                                <Copy size={14} className="text-neutral-500 hover:text-teal-400 shrink-0" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rich text Markdown frame wrapper */}
                    <div className="markdown-body">
                      {message.content.trim() ? (
                        <div className={`prose ${theme === 'light' ? 'theme-light' : ''} text-xs md:text-sm max-w-none break-words leading-relaxed`}>
                          <Markdown>{message.content}</Markdown>
                        </div>
                      ) : (
                        message.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 py-2.5 px-1 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-xl max-w-max animate-pulse">
                            <span className="text-[10px] text-teal-400 font-semibold px-2">Assistant is thinking</span>
                            <div className="flex items-center gap-1.5 pr-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Citations/Grounding chunks rendering */}
                    {message.role === 'assistant' && message.groundingChunks && message.groundingChunks.length > 0 && (
                      <div className="border-t border-dashed border-neutral-700/50 pt-2.5 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold mb-1.5">
                          <Compass size={13} className="text-teal-400" />
                          <span>Sources & Search Citations:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {message.groundingChunks.map((chunk, cIdx) => (
                            chunk.web && (
                              <a
                                key={cIdx}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] border cursor-pointer font-medium transition-colors hover:border-teal-400
                                  ${theme === 'dark'
                                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                                    : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
                                  }
                                `}
                              >
                                <Globe size={11} className="text-teal-400 shrink-0" />
                                <span className="truncate max-w-[160px]">{chunk.web.title}</span>
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing / stream visualizer indicator */}
            {isStreaming && session.messages[session.messages.length - 1]?.content.trim() !== '' && (
              <div className={`w-full py-6 px-4 md:px-8 bg-[#2a2a2a]/20`}>
                <div className="max-w-2xl mx-auto flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 border border-teal-600 animate-pulse">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1 space-y-1 mt-1">
                    <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                      Typing...
                    </span>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Persistent Input Form Box */}
      <div className={`p-4 border-t shrink-0
        ${theme === 'dark' ? 'border-neutral-800 bg-[#212121]' : 'border-neutral-200 bg-white'}
      `}>
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSend} className="relative z-10 flex flex-col gap-1.5">
            {/* Embedded interactive prompt library wrapper */}
            <PromptLibrary
              theme={theme}
              isOpen={libraryOpen}
              onClose={() => setLibraryOpen(false)}
              onSelectPrompt={handleSelectPrompt}
              currentInputText={input}
            />

            {/* Interactive Search toggle control panel & prompt suggestions pill */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                {/* Web Search grounding selector */}
                <button
                  type="button"
                  onClick={() => setLocalSearch(!localSearch)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all duration-150
                    ${localSearch
                      ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                      : 'border-neutral-700/40 bg-transparent text-neutral-400 hover:text-neutral-300'
                    }
                  `}
                  title="Search the web directly with Gemini for recent events or place specifications"
                >
                  <Globe size={13} className={localSearch ? 'text-teal-400 animate-spin-slow' : 'text-neutral-400'} />
                  <span>Web Search {localSearch ? 'ON' : 'OFF'}</span>
                </button>

                {/* Prompt Library selector */}
                <button
                  type="button"
                  id="btn-prompt-library-trigger"
                  onClick={() => setLibraryOpen(!libraryOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all duration-150
                    ${libraryOpen
                      ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                      : 'border-neutral-700/40 bg-transparent text-neutral-400 hover:text-neutral-400/85'
                    }
                  `}
                  title="Browse, use, or save system prompt templates"
                >
                  <BookOpen size={13} className={libraryOpen ? 'text-teal-400' : 'text-neutral-400'} />
                  <span>Prompt Library</span>
                </button>
              </div>

              <span className="text-[10px] text-neutral-500 pr-1 select-none">
                {input.length} / 4000 characters
              </span>
            </div>

            {/* Standard Textarea entry block */}
            <div className={`relative flex items-end rounded-xl border p-2 transition-all duration-150 focus-within:border-teal-500/40
              ${theme === 'dark' 
                ? 'border-neutral-700 bg-neutral-800 focus-within:bg-[#252525]' 
                : 'border-neutral-300 bg-neutral-50 focus-within:bg-white focus-within:shadow-md'
              }
            `}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message GPT..."
                maxLength={4000}
                className="flex-1 max-h-[200px] border-none outline-none resize-none font-sans text-xs bg-transparent py-1.5 px-2 leading-relaxed whitespace-pre-wrap placeholder-neutral-500 self-center"
              />

              <div className="flex items-center gap-2 self-center shrink-0 ml-1.5">
                {/* Speech recognition toggle */}
                <button
                  type="button"
                  onClick={startListening}
                  className={`p-2 rounded-lg border transition-all duration-155 cursor-pointer flex items-center justify-center
                    ${isListening
                      ? 'bg-rose-500 border-rose-450 text-white shadow animate-pulse hover:bg-rose-600'
                      : theme === 'dark'
                        ? 'bg-neutral-700/50 hover:bg-neutral-750 text-neutral-400 hover:text-teal-400 border-neutral-700'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-teal-600 border-neutral-200'
                    }
                  `}
                  title={isListening ? "Listening... click to turn off dictation" : "Dictate message via speech-to-text mic"}
                  id="btn-speech-trigger"
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className={`p-2 rounded-lg shrink-0 border transition-all duration-150 cursor-pointer
                    ${!input.trim() || isStreaming
                      ? (theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-600' : 'bg-neutral-100 border-neutral-200 text-neutral-400')
                      : 'bg-teal-500 border-teal-400 text-white shadow hover:bg-teal-600'
                    }
                  `}
                  title="Send message"
                  id="btn-send-message"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </form>

          {/* Footer warning text */}
          <p className="text-[10px] text-neutral-500 text-center mt-2.5 select-none leading-normal">
            Cloned layout for ChatGPT & Gemini. AI responses may contain inaccuracies; perform cross-verifications.
          </p>
        </div>
      </div>
    </div>
  );
};
