const LANGUAGE_IDS = Object.freeze({
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71
});

const LANGUAGE_ALIASES = Object.freeze({
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
