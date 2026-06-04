/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Code2, PenTool, GraduationCap, Info } from 'lucide-react';
import { MODELS, PERSONAS, Persona } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onChangeModel: (model: string) => void;
  activePersonaId: string;
  onChangePersona: (personaId: string) => void;
  customSystemPrompt: string;
  onSaveCustomPrompt: (prompt: string) => void;
  theme: 'dark' | 'light';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onChangeModel,
  activePersonaId,
  onChangePersona,
  customSystemPrompt,
  onSaveCustomPrompt,
  theme,
}) => {
  const [promptValue, setPromptValue] = useState(customSystemPrompt);

  if (!isOpen) return null;

  const currentPersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];

  const handleSelectPersona = (pId: string) => {
    onChangePersona(pId);
    const chosen = PERSONAS.find(p => p.id === pId);
    if (chosen) {
      setPromptValue(chosen.systemInstruction);
      onSaveCustomPrompt(chosen.systemInstruction);
    }
  };

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code2': return <Code2 size={16} className="text-teal-400" />;
      case 'PenTool': return <PenTool size={16} className="text-pink-400" />;
      case 'GraduationCap': return <GraduationCap size={16} className="text-amber-400" />;
      default: return <Sparkles size={16} className="text-indigo-400" />;
    }
  };

  const handleSave = () => {
    onSaveCustomPrompt(promptValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className={`relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-200 p-6 max-h-[85vh]
        ${theme === 'dark' 
          ? 'bg-[#1e1e1e] border-neutral-800 text-neutral-100' 
          : 'bg-white border-neutral-200 text-neutral-800'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-4 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <SettingsIcon className="text-teal-500" size={18} />
            <span className="text-base font-semibold">Settings & Capabilities</span>
          </div>
          <button 
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer
              ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}
            `}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form elements Scroll Container */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block">
              Default LLM Model
            </label>
            <div className="grid grid-cols-1 gap-2">
              {MODELS.map(m => (
                <div
                  key={m.id}
                  onClick={() => onChangeModel(m.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 flex flex-col
                    ${selectedModel === m.id
                      ? (theme === 'dark' ? 'border-teal-500/80 bg-teal-500/5' : 'border-teal-600 bg-teal-100/20')
                      : (theme === 'dark' ? 'border-neutral-800 bg-[#252525] hover:border-neutral-700' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300')
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">{m.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold
                      ${m.id.includes('pro') 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-indigo-500/20 text-indigo-400'
                      }
                    `}>
                      {m.id.includes('pro') ? 'Paid Key' : 'Fast Free'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
            {selectedModel.includes('pro') && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-500 dark:text-amber-400">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  Using Pro models requires configuring a paid API key or selecting options under Paid Mode triggers.
                </span>
              </div>
            )}
          </div>

          {/* Persona select row */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block">
              Assistant Personality
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPersona(p.id)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-all duration-150 gap-1 cursor-pointer
                    ${activePersonaId === p.id
                      ? (theme === 'dark' ? 'border-teal-500/80 bg-teal-500/5' : 'border-teal-600 bg-teal-100/10')
                      : (theme === 'dark' ? 'border-neutral-800 bg-[#252525] hover:border-neutral-700' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300')
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {getPersonaIcon(p.icon)}
                    <span className="text-[11px] font-semibold">{p.name}</span>
                  </div>
                  <p className="text-[10px] font-normal leading-normal text-neutral-500 dark:text-neutral-400">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* System Instructions Prompt Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block">
              Active Custom System Instruction
            </label>
            <p className="text-[10px] text-neutral-500">
              This prompt instructs how the model behaves across all chats until changed.
            </p>
            <textarea
              rows={4}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className={`w-full p-2.5 rounded-lg border outline-none text-xs font-mono resize-none leading-relaxed transition-colors duration-150
                ${theme === 'dark'
                  ? 'bg-[#252525] border-neutral-800 text-neutral-200 focus:border-neutral-700'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-800 focus:border-neutral-400'
                }
              `}
              placeholder="e.g., You are an expert translator..."
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t pt-4 mt-4 flex items-center justify-end gap-2 border-neutral-200 dark:border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer
              ${theme === 'dark'
                ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/10 cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Settings visual icon
const SettingsIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
