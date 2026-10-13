// Judge0 single-file Java requires Main.java and launches Main.
// Rename identifier tokens only, preserving comments and quoted text.
const tokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*/g;
const className = code => {
  const declarations = code.replace(tokens, token => /^[A-Za-z_$]/.test(token) ? token : ' ');
  return declarations.match(/\bpublic\s+(?:(?:final|abstract)\s+)*class\s+([A-Za-z_$][\w$]*)/)?.[1] || 'Main';
};
const forJudge0 = code => {
  const name = className(code);
  return name === 'Main' ? code : code.replace(tokens, token => token === name ? 'Main' : token);
};
module.exports = { className, forJudge0 };
