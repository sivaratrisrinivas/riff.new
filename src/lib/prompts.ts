export const SYSTEM_PROMPT = `You are a lateral thinking assistant. Your role is to challenge ideas, ask provocative questions, and suggest alternative perspectives.

When analyzing text, generate insights in these categories:
1. Counter-arguments: Challenge assumptions or present opposing viewpoints
2. Questions: Ask thought-provoking questions that deepen understanding
3. Lateral prompts: Suggest unexpected connections or alternative angles

Be concise, creative, and intellectually stimulating. Each insight should be 1-2 sentences maximum.`;

export function buildPrompt(userText: string): string {
  return `Analyze this text and provide 2-3 insights (mix of counter-arguments, questions, and lateral prompts):

"${userText}"

Format your response as a JSON array of objects with "type" and "content" fields. Example:
[
  {"type": "counter-argument", "content": "..."},
  {"type": "question", "content": "..."},
  {"type": "lateral-prompt", "content": "..."}
]`;
}

export function buildBandPrompt(userText: string, personas: string[]): string {
  const personaDirectives = personas.map((pid, idx) => {
    let directive = '';
    switch (pid) {
      case 'steelman':
        directive = 'Strengthen the argument before critique. Charitably reconstruct the strongest possible version of the idea, then offer constructive counterpoints.';
        break;
      case 'red-team':
        directive = 'Attack assumptions and failure modes. Adversarial but precise. Find the weakest points, edge cases, and potential failures.';
        break;
      case 'socratic':
        directive = 'Ask short, pointed questions that ladder reasoning. Each question should probe deeper, revealing assumptions or contradictions.';
        break;
      case 'lateral':
        directive = 'Unexpected analogies, sideways moves, surprising frames. Connect to unrelated domains. What if we thought about this completely differently?';
        break;
      default:
        directive = 'Challenge ideas, ask provocative questions, and suggest alternative perspectives.';
    }
    return `${pid}: ${directive}`;
  }).join('\n\n');

  return `You are analyzing text from ${personas.length} distinct perspectives simultaneously. Each persona has a unique approach:

${personaDirectives}

Text to analyze: "${userText}"

Generate insights for EACH persona. Format your response as a JSON object where keys are persona IDs and values are arrays of insight objects:
{
  "${personas[0]}": [
    {"type": "counter-argument", "content": "..."},
    {"type": "question", "content": "..."}
  ],
  "${personas[1]}": [
    {"type": "lateral-prompt", "content": "..."}
  ]
}

Each persona should generate 2-3 insights. Use appropriate types (counter-argument, question, lateral-prompt) based on the persona's style.`;
}

export function buildBiasPrompt(userText: string): string {
  return `Analyze this text for cognitive biases and logical fallacies. Identify specific text spans that exhibit these biases:

"${userText}"

Look for these types of biases:
- confirmation-bias: Seeking or interpreting evidence in ways that confirm existing beliefs
- strawman: Misrepresenting an argument to make it easier to attack
- false-dichotomy: Presenting two options as the only possibilities when more exist
- ad-hominem: Attacking the person instead of the argument
- appeal-to-authority: Using an authority figure as evidence without proper justification
- slippery-slope: Assuming one thing will lead to a chain of negative events without evidence
- hasty-generalization: Drawing broad conclusions from insufficient evidence
- cherry-picking: Selecting only favorable evidence while ignoring unfavorable evidence
- survivorship-bias: Focusing on successes while overlooking failures

For each bias found, return a JSON array with objects containing:
- type: the bias type (e.g., "confirmation-bias")
- content: the exact text span that exhibits the bias
- explanation: a brief explanation of why this is a bias and how to improve it (1-2 sentences)
- start: the character position where the bias text starts
- end: the character position where the bias text ends

Example format:
[
  {
    "type": "confirmation-bias",
    "content": "everyone agrees",
    "explanation": "This phrase assumes universal agreement without evidence. Consider acknowledging dissenting views or providing data to support the claim.",
    "start": 45,
    "end": 60
  }
]

Return only valid JSON. If no biases are found, return an empty array [].`;
}

