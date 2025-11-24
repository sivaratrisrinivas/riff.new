export interface Insight {
  id: string;
  type: 'counter-argument' | 'question' | 'lateral-prompt';
  content: string;
  timestamp: number;
  personaId?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  color: string;
  directive: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Bias {
  id: string;
  type: string; // 'confirmation-bias', 'strawman', 'false-dichotomy', etc.
  content: string; // The flagged text
  explanation: string; // Why it's a bias + how to fix
  start: number; // Character position
  end: number;
}

