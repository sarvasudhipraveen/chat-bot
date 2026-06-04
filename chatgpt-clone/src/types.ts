/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  systemInstruction?: string;
  searchEnabled: boolean;
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Default GPT Assistant',
    description: 'A helpful, versatile, and direct AI companion.',
    icon: 'Sparkles',
    systemInstruction: 'You are a helpful, empathetic, and highly versatile AI assistant. Provide concise, clear, and accurate responses. Format code snippets cleanly and use markdown effectively.'
  },
  {
    id: 'engineer',
    name: 'Software Engineer',
    description: 'Expert programmer, focusing on optimal solutions & clean code.',
    icon: 'Code2',
    systemInstruction: 'You are an expert senior software engineer. When helper code or scripts are requested, provide production-ready, clean, well-commented, and optimized code. Explain algorithmic complexities briefly but precisely.'
  },
  {
    id: 'writer',
    name: 'Creative Copywriter',
    description: 'Imaginative writer specializing in marketing, fiction, & wordplay.',
    icon: 'PenTool',
    systemInstruction: 'You are a warm, imaginative, and highly-skilled creative writer. Use engaging prose, storytelling devices, and sensory details where appropriate. Adapt your tone of voice to suit the specific context.'
  },
  {
    id: 'tutor',
    name: 'Socratic Tutor',
    description: 'Patient teacher who guides you to answers rather than just giving them.',
    icon: 'GraduationCap',
    systemInstruction: 'You are a highly patient Socratic tutor. Instead of directly giving out direct answers, help the user learn by breaking concepts down, asking guided follow-up questions, and offering metaphors to build core intuition. Be encouraging and nurturing.'
  }
];

export const MODELS = [
  { id: 'gemini-3.5-flash', name: 'Praveen', desc: 'Default fast model, ideal for general tasks & speed' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Heavy Duty)', desc: 'Ultra-powerful flagship model for complex coding, scientific reasoning & elaborate instructions' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Settings Required)', desc: 'Advanced reasoning, coding & complex analysis' }
];

export const SUGGESTIONS = [
  {
    title: 'Draft an email',
    text: 'asking for an extension on a project deadline with polite and professional phrasing'
  },
  {
    title: 'Explain a complex topic',
    text: 'like quantum computing in simple terms with everyday analogies'
  },
  {
    title: 'Brainstorm creative names',
    text: 'for a specialty workspace coffee shop blending books, tech, and espresso'
  },
  {
    title: 'Debug or write a script',
    text: 'to generate responsive SVG path animations in TypeScript'
  }
];

// UTF-8 base64 helper functions
export function encodeSharedSession(session: ChatSession): string {
  try {
    const minifiedSession = {
      title: session.title,
      model: session.model,
      searchEnabled: session.searchEnabled,
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        groundingChunks: m.groundingChunks
      })),
      timestamp: session.timestamp
    };
    const jsonStr = JSON.stringify(minifiedSession);
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (err) {
    console.error('Failed to encode shared session:', err);
    return '';
  }
}

export function decodeSharedSession(base64Str: string): ChatSession | null {
  try {
    const raw = atob(base64Str);
    const decoded = decodeURIComponent(Array.prototype.map.call(raw, (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const parsed = JSON.parse(decoded);
    return {
      id: 'shared-' + Date.now(),
      title: parsed.title || 'Shared Session',
      messages: parsed.messages || [],
      model: parsed.model || 'gemini-3.5-flash',
      searchEnabled: !!parsed.searchEnabled,
      timestamp: parsed.timestamp || Date.now()
    };
  } catch (err) {
    console.error('Failed to decode shared session:', err);
    return null;
  }
}

