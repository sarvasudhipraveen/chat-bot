import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Bookmark,
  Sparkles
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: 'Coding' | 'Writing' | 'Academic' | 'Business' | 'Custom';
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Code Bug Finder & Fixer',
    category: 'Coding',
    content: 'Analyze the following TypeScript/JavaScript code for edge cases, potential null or undefined pointers, memory leaks, or logical bugs. Provide a clean, optimized refactoring:\n\n```typescript\n// Paste code here\n```'
  },
  {
    id: 'tpl-2',
    title: 'Explain Like I\'m Five (ELI5)',
    category: 'Academic',
    content: 'Explain the following complex concept to an absolute beginner as if they are 5 years old. Use highly illustrative real-world metaphors, simple language, and avoid technical jargon:\n\nConcept: '
  },
  {
    id: 'tpl-3',
    title: 'Professional Email Polisher',
    category: 'Business',
    content: 'Rewrite the following raw thoughts into a highly polished, polite, clear, and assertive corporate email. Keep it concise and action-oriented:\n\nDraft: '
  },
  {
    id: 'tpl-4',
    title: 'Creative Story Elevater',
    category: 'Writing',
    content: 'Elevate this story snippet. Amplify the visual imagery, subtext, pacing, and emotional depth while maintaining a natural, high-performance literary tone:\n\nSnippet: '
  },
  {
    id: 'tpl-5',
    title: 'SQL Performance Optimizer',
    category: 'Coding',
    content: 'Analyze the following SQL query for performance bottlenecks, redundant joins, or scan errors. Recommend the correct indexes and provide an optimized query:\n\n```sql\n-- Query here\n```'
  },
  {
    id: 'tpl-6',
    title: 'Socratic Interview Prep',
    category: 'Business',
    content: 'Act as a Senior Principal Engineer/Technical Manager. Ask me a single tough behavioral or architectural question, wait for my response, and critique my answer with actionable guidance with a professional Socratic tone.'
  },
  {
    id: 'tpl-7',
    title: 'Article / Essay Outliner',
    category: 'Writing',
    content: 'Create a highly structured, logical section-by-section outline for an in-depth essay or article about the following topic. Include suggested key points and transitions:\n\nTopic: '
  }
];

interface PromptLibraryProps {
  theme: 'dark' | 'light';
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (content: string, overwrite: boolean) => void;
  currentInputText: string;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  theme,
  isOpen,
  onClose,
  onSelectPrompt,
  currentInputText
}) => {
  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('chat_prompt_library_custom');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Coding' | 'Writing' | 'Academic' | 'Business' | 'Custom'>('All');
  
  // Custom Prompt creation form state
  const [isAdding, setIsAdding] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  // Sync custom prompts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chat_prompt_library_custom', JSON.stringify(customPrompts));
    } catch (e) {
      console.warn("Could not save custom prompts to storage:", e);
    }
  }, [customPrompts]);

  if (!isOpen) return null;

  const handleSavePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert("Please provide both a title and prompt contents.");
      return;
    }

    const newPrompt: PromptTemplate = {
      id: 'custom-' + Date.now(),
      title: formTitle.trim(),
      category: 'Custom',
      content: formContent.trim()
    };

    setCustomPrompts(prev => [newPrompt, ...prev]);
    setFormTitle('');
    setFormContent('');
    setIsAdding(false);
    setSelectedCategory('Custom');
    
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // Helper to load current input from ChatWindow as the prompt draft
  const handleUseCurrentAsDraft = () => {
    if (!currentInputText.trim()) {
      alert("Your draft textarea is currently empty. Type something in the input bar first, then try again.");
      return;
    }
    setFormContent(currentInputText.trim());
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this custom prompt from your library?")) {
      setCustomPrompts(prev => prev.filter(p => p.id !== id));
    }
  };

  const allPrompts = [...customPrompts, ...DEFAULT_TEMPLATES];

  const filteredPrompts = allPrompts.filter(prompt => {
    const matchesSearch = 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && prompt.category === selectedCategory;
  });

  return (
    <div className={`absolute left-0 right-0 bottom-full mb-2.5 rounded-2xl border shadow-xl overflow-hidden z-20 transition-all duration-200 animate-slide-up max-h-[460px] flex flex-col
      ${theme === 'dark'
        ? 'bg-[#1a1a1a] border-neutral-800 text-neutral-100 shadow-teal-950/20'
        : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/40'
      }
    `}>
      {/* Popover Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0
        ${theme === 'dark' ? 'border-neutral-800/80 bg-[#212121]' : 'border-neutral-100 bg-neutral-50'}
      `}>
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-teal-400" />
          <span className="font-bold text-xs">📚 Prompt Library</span>
          {justSaved && (
            <span className="text-[10px] bg-teal-500/15 text-teal-400 px-1.5 py-0.5 rounded animate-pulse font-semibold">
              Saved successfully!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer
              ${isAdding
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20'
              }
            `}
          >
            {isAdding ? 'Browse Prompts' : 'Create Custom'}
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-neutral-800/30 text-neutral-400 cursor-pointer`}
            title="Close Library"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {isAdding ? (
        /* Create New Prompt Frame */
        <form onSubmit={handleSavePrompt} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
              Prompt Title
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. My Custom Copywriter"
              className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-medium focus:ring-1 focus:ring-teal-500/30
                ${theme === 'dark'
                  ? 'bg-neutral-800 border-neutral-700 text-white focus:border-teal-500/40'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-800 focus:border-teal-500/40'
                }
              `}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                Prompt Instructions / Content
              </label>
              {currentInputText.trim() && (
                <button
                  type="button"
                  onClick={handleUseCurrentAsDraft}
                  className="text-[9.5px] font-semibold text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Import content already typed into the input bar"
                >
                  <Sparkles size={11} /> Use chat entry bar draft
                </button>
              )}
            </div>
            <textarea
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              placeholder="e.g. You are a meticulous editor. Analyze the vocabulary usage and..."
              className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-normal resize-none focus:ring-1 focus:ring-teal-500/30
                ${theme === 'dark'
                  ? 'bg-neutral-800 border-neutral-700 text-white focus:border-teal-500/40'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-800 focus:border-teal-500/40'
                }
              `}
            />
          </div>

          <div className="flex items-center gap-2 pt-1 justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-neutral-800/25 text-neutral-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-605 text-white cursor-pointer shadow-md shadow-teal-500/10"
            >
              Save to Library
            </button>
          </div>
        </form>
      ) : (
        /* Filters + Prompts Browse Grid */
        <>
          {/* Filtering bar */}
          <div className={`px-4 py-2 border-b flex p-2 gap-2 flex-col xs:flex-row justify-between items-stretch shrink-0
            ${theme === 'dark' ? 'border-neutral-800/60 bg-[#161616]' : 'border-neutral-100 bg-neutral-50/50'}
          `}>
            {/* Search Input bar */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border flex-1
              ${theme === 'dark'
                ? 'bg-neutral-800 border-neutral-700'
                : 'bg-white border-neutral-200'
              }
            `}>
              <Search size={12} className="text-neutral-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="bg-transparent border-none outline-none text-xs flex-1 text-inherit py-[2px] placeholder-neutral-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category selection bar */}
            <div className="flex gap-1 overflow-x-auto py-0.5 no-scrollbar scroll-smooth items-center select-none">
              {(['All', 'Coding', 'Writing', 'Academic', 'Business', 'Custom'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all whitespace-nowrap cursor-pointer
                    ${selectedCategory === cat
                      ? 'bg-teal-500 text-white'
                      : theme === 'dark'
                        ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Templates scroll container */}
          <div className="overflow-y-auto flex-1 p-3.5 space-y-2 max-h-[320px]">
            {filteredPrompts.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <Bookmark size={24} className="text-neutral-600 animate-pulse" />
                <span className="text-xs text-neutral-500 font-medium">No system prompts found matching current criteria.</span>
                <span className="text-[10px] text-neutral-600">Create custom templates to build your quick shortcut list.</span>
              </div>
            ) : (
              filteredPrompts.map(prompt => (
                <div
                  key={prompt.id}
                  className={`p-3 rounded-xl border group transition-all duration-150 relative text-left
                    ${theme === 'dark'
                      ? 'bg-neutral-800/40 border-neutral-800 hover:border-neutral-700 hover:bg-[#202020]'
                      : 'bg-neutral-50 border-neutral-100 hover:border-neutral-200 hover:bg-neutral-100/50'
                    }
                  `}
                >
                  {/* Category label pin & action delete button */}
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider
                      ${prompt.category === 'Custom'
                        ? 'bg-teal-405/20 text-teal-400 border border-teal-500/20'
                        : theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                      }
                    `}>
                      {prompt.category}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {prompt.category === 'Custom' && (
                        <button
                          onClick={(e) => handleDeleteCustom(prompt.id, e)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-450 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete prompt template"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold leading-snug mb-1 text-inherit">
                    {prompt.title}
                  </h4>
                  
                  <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-400 line-clamp-2 pr-2 break-words font-normal">
                    {prompt.content}
                  </p>

                  {/* Overlay Apply Options Bar */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectPrompt(prompt.content, true)}
                      className="px-2.5 py-1 rounded bg-teal-500 hover:bg-teal-605 text-white font-semibold text-[10px] cursor-pointer shadow-sm shadow-teal-500/5"
                    >
                      Use & Replace
                    </button>
                    <button
                      onClick={() => onSelectPrompt(prompt.content, false)}
                      className={`px-2.5 py-1 rounded font-semibold text-[10px] cursor-pointer transition-colors
                        ${theme === 'dark'
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }
                      `}
                    >
                      Append to entry
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
