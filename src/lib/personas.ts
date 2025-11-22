import type { Persona } from '../types';

export const PERSONAS: Persona[] = [
  {
    id: 'steelman',
    name: 'Steelman',
    description: 'Charitable reconstruction',
    color: 'cyan',
    directive: 'Strengthen the argument before critique. Charitably reconstruct the strongest possible version of the idea, then offer constructive counterpoints.',
  },
  {
    id: 'red-team',
    name: 'Red Team',
    description: 'Assumption attacks',
    color: 'rose',
    directive: 'Attack assumptions and failure modes. Adversarial but precise. Find the weakest points, edge cases, and potential failures.',
  },
  {
    id: 'socratic',
    name: 'Socratic',
    description: 'Laddering questions',
    color: 'violet',
    directive: 'Ask short, pointed questions that ladder reasoning. Each question should probe deeper, revealing assumptions or contradictions.',
  },
  {
    id: 'lateral',
    name: 'Lateral',
    description: 'Analogies and sideways frames',
    color: 'purple',
    directive: 'Unexpected analogies, sideways moves, surprising frames. Connect to unrelated domains. What if we thought about this completely differently?',
  },
];

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find(p => p.id === id);
}

