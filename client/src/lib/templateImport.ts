export const TEMPLATE_PLACEHOLDERS = ['contractNumber', 'date', 'schoolLegalName', 'schoolInn', 'schoolAddress', 'director', 'parentName', 'parentPhone', 'studentFullName', 'studentBirthDate', 'className', 'monthlyFee', 'monthlyFeeWords', 'startDate', 'endDate'];

const MAX_BYTES = 2 * 1024 * 1024;

export class TemplateImportError extends Error {}

/** Numbered short lines ("1. Subject of the contract") become "## " section headings. */
export function normalizeTemplateText(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, ''));
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const isHeading = !t.startsWith('## ') && /^(\d+[.)]|[IVX]+\.)\s+\S/.test(t) && t.length <= 80 && !/[.;,:]$/.test(t);
    out.push(isHeading ? `## ${t}` : t);
  }
  // paragraphs are single lines in the template format: drop blank separators
  return out.filter((l, i) => !(l === '' && (i === 0 || i === out.length - 1))).filter((l) => l !== '').join('\n');
}

export function unknownPlaceholders(body: string): string[] {
  const found = new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!));
  return [...found].filter((k) => !TEMPLATE_PLACEHOLDERS.includes(k));
}

export async function importTemplateFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new TemplateImportError('too-large');
  const name = file.name.toLowerCase();
  let raw: string;
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    raw = await file.text();
  } else if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    raw = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  } else {
    throw new TemplateImportError('unsupported');
  }
  const text = normalizeTemplateText(raw);
  if (text.length < 20) throw new TemplateImportError('empty');
  return text;
}
