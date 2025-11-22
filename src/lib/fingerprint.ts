export function fingerprint(text: string, personas: string[]): string {
  const sortedPersonas = [...personas].sort().join(',');
  const combined = `${text}::${sortedPersonas}`;
  return Bun.hash(combined).toString();
}

