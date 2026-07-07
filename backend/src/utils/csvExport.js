export const csvEscape = (value) => {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const rowsToCsv = (rows) =>
  rows.map((line) => line.map(csvEscape).join(',')).join('\n');

export const withBom = (csv) => `\uFEFF${csv}`;
