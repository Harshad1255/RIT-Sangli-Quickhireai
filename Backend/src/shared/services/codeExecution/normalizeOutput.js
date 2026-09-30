const normalizeOutput = (output) => {
  return String(output || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
};

module.exports = { normalizeOutput };
