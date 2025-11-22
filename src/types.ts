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

