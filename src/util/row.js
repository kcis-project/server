const JSON_FIELDS = ['EXPERIENCES', 'EDUCATION', 'AWARDS', 'CERTS', 'ETC'];

function toHexId(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value.toUpperCase();
  if (Buffer.isBuffer(value)) return value.toString('hex').toUpperCase();
  return String(value);
}

function parseJsonField(value) {
  if (value == null || value === '') return [];
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function serializeRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase();
    if (k === 'ID') {
      out.id = toHexId(v);
    } else if (JSON_FIELDS.includes(k)) {
      out[key] = parseJsonField(v);
    } else if (k === 'IS_CURRENT') {
      out.is_current = v === 1 || v === '1' || v === true;
    } else if (v instanceof Date) {
      out[key] = v.toISOString();
    } else {
      out[key] = v;
    }
  }
  return out;
}

function serializeRows(rows) {
  return rows.map(serializeRow);
}

function hexToBuffer(hex) {
  if (!hex) return null;
  const clean = String(hex).replace(/-/g, '');
  return Buffer.from(clean, 'hex');
}

module.exports = { serializeRow, serializeRows, hexToBuffer };
