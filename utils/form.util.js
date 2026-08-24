const parseMaybeJson = (value, fallback) => {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const parseYear = (value) => {
  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) ? year : null;
};

module.exports = {
  parseMaybeJson,
  parseBoolean,
  parseYear,
};
