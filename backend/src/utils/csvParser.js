/** Parse CSV text into an array of row objects (first row = headers). */
export function parseCsv(text) {
  if (!text || typeof text !== 'string') return [];

  const normalized = text.replace(/^\uFEFF/, '');
  const matrix = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(cell);
      if (row.some((value) => String(value).trim())) matrix.push(row);
      row = [];
      cell = '';
      if (char === '\r') i += 1;
    } else if (char === '\r') {
      row.push(cell);
      if (row.some((value) => String(value).trim())) matrix.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => String(value).trim())) matrix.push(row);
  }

  if (!matrix.length) return [];

  const headers = matrix[0].map(normalizeHeader);
  return matrix.slice(1).map((values, index) => {
    const record = { _row: index + 2 };
    headers.forEach((header, colIndex) => {
      record[header] = String(values[colIndex] ?? '').trim();
    });
    return record;
  });
}

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}
