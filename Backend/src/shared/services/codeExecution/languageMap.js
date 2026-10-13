const LANGUAGE_IDS = Object.freeze({
  c: 50,
  cpp: 54,
  go: 60,
  rust: 73,
  kotlin: 78,
  sql: 82,
  java: 62,
  javascript: 63,
  python: 71
});

const LANGUAGE_ALIASES = Object.freeze({
  c: 'c',
  go: 'go',
  rust: 'rust',
  kotlin: 'kotlin',
  sql: 'sql',
  sqlite: 'sql',
  python3: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python'
});

const normalizeLanguage = (language = '') => {
  const key = String(language).trim().toLowerCase().replace(/\s+/g, '');
  return LANGUAGE_ALIASES[key] || key;
};

module.exports = {
  LANGUAGE_IDS,
  LANGUAGE_ALIASES,
  normalizeLanguage
};
