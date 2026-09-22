export type StaffModifierInstruction = {
  kind: 'remove' | 'swap' | 'add' | 'change';
  label: 'REMOVE' | 'SWAP' | 'ADD' | 'CHANGE';
  detail: string;
};

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

export function staffModifierInstruction(name: string): StaffModifierInstruction {
  const value = name.trim();
  const rules: { pattern: RegExp; kind: StaffModifierInstruction['kind']; label: StaffModifierInstruction['label'] }[] = [
    { pattern: /^(?:no|without|remove)\s+/i, kind: 'remove', label: 'REMOVE' },
    { pattern: /^(?:vegan\s+)?swap\s*:\s*/i, kind: 'swap', label: 'SWAP' },
    { pattern: /^swap\s+/i, kind: 'swap', label: 'SWAP' },
    { pattern: /^(?:add|extra)\s+/i, kind: 'add', label: 'ADD' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(value)) {
      return { kind: rule.kind, label: rule.label, detail: sentenceCase(value.replace(rule.pattern, '')) };
    }
  }

  return { kind: 'change', label: 'CHANGE', detail: sentenceCase(value) };
}
