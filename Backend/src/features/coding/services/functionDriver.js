const { randomBytes } = require('crypto');

const getTopLevelFunctionNames = (language, code) => {
  if (language === 'python' || language === 'py') {
    return [...code.matchAll(/^def\s+([A-Za-z_]\w*)\s*\(/gm)].map(match => match[1]);
  }

  const declarations = [
    /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/gm
  ];
  return declarations.flatMap(pattern => [...code.matchAll(pattern)].map(match => match[1]));
};

const getEntryFunction = (language, code, requestedName) => {
  const functions = [...new Set(getTopLevelFunctionNames(language, code))];
  const validRequestedName = requestedName && /^[A-Za-z_$][\w$]*$/.test(requestedName);
  if (validRequestedName && requestedName !== 'solve') return requestedName;
  if (validRequestedName && functions.includes(requestedName)) return requestedName;
  if (functions.includes('solve')) return 'solve';
  if (functions.length === 1) return functions[0];
  return validRequestedName ? requestedName : null;
};

const javascriptDriver = (code, entryFunction, marker) => {
  const source = JSON.stringify(code);
  return `
const __qhWriteResult = process.stdout.write.bind(process.stdout);
const __qhStringify = JSON.stringify.bind(JSON);
const __qhExit = process.exit.bind(process);
const __qhInput = require('fs').readFileSync(0, 'utf8');
const __qhMarker = ${JSON.stringify(marker)};
const __qhSplitArguments = (text) => {
  const tokens = [];
  let token = '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (const character of text.trim()) {
    if (quote) {
      token += character;
      if (escaped) escaped = false;
      else if (character === '\\\\') escaped = true;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
      token += character;
    } else if (character === '[' || character === '{' || character === '(') {
      depth += 1;
      token += character;
    } else if (character === ']' || character === '}' || character === ')') {
      depth -= 1;
      token += character;
    } else if (/\\s/.test(character) && depth === 0) {
      if (token) { tokens.push(token); token = ''; }
    } else {
      token += character;
    }
  }
  if (token) tokens.push(token);
  return tokens.map(value => JSON.parse(value));
};
(async () => {
  const __qhEntry = new Function(${source} + ${JSON.stringify(`\n; return typeof ${entryFunction} === "function" ? ${entryFunction} : null;`)})();
  if (typeof __qhEntry !== 'function') throw new Error('Entry function was not found.');
  const __qhArgs = __qhSplitArguments(__qhInput);
  const __qhResult = await __qhEntry(...__qhArgs);
  __qhWriteResult(__qhMarker + __qhStringify(__qhResult) + '\\n', () => __qhExit(0));
})().catch(error => {
  process.stderr.write(String(error && error.stack || error) + '\\n');
  process.exitCode = 1;
});
`;
};

const pythonDriver = (code, entryFunction, marker) => {
  const encodedSource = Buffer.from(code, 'utf8').toString('base64');
  return `
import base64 as __qh_base64
import json as __qh_json
import os as __qh_os
import sys as __qh_sys

__qh_write_result = __qh_sys.__stdout__.write
__qh_flush_result = __qh_sys.__stdout__.flush
__qh_exit = __qh_os._exit
__qh_dump_result = __qh_json.dumps
__qh_read_input = __qh_sys.stdin.read
__qh_marker = ${JSON.stringify(marker)}
__qh_source = __qh_base64.b64decode('${encodedSource}').decode('utf-8')

def __qh_split_arguments(text):
    tokens = []
    token = ''
    depth = 0
    quote = ''
    escaped = False
    for character in text.strip():
        if quote:
            token += character
            if escaped:
                escaped = False
            elif character == '\\\\':
                escaped = True
            elif character == quote:
                quote = ''
        elif character in ('"', "'"):
            quote = character
            token += character
        elif character in '[{(':
            depth += 1
            token += character
        elif character in ']})':
            depth -= 1
            token += character
        elif character.isspace() and depth == 0:
            if token:
                tokens.append(token)
                token = ''
        else:
            token += character
    if token:
        tokens.append(token)
    return [__qh_json.loads(value) for value in tokens]

__qh_namespace = {'__name__': '__main__'}
exec(compile(__qh_source, '<solution>', 'exec'), __qh_namespace)
__qh_entry = __qh_namespace.get('${entryFunction}')
if not callable(__qh_entry):
    raise RuntimeError('Entry function was not found.')
__qh_result = __qh_entry(*__qh_split_arguments(__qh_read_input()))
__qh_write_result(__qh_marker + __qh_dump_result(__qh_result, separators=(',', ':')) + '\\n')
__qh_flush_result()
__qh_exit(0)
`;
};

const wrapCodeForExecution = (language, code, entryFunction) => {
  const normalizedLanguage = String(language || '').toLowerCase();
  if (!['javascript', 'js', 'python', 'py'].includes(normalizedLanguage) || typeof code !== 'string') {
    return code;
  }

  const canonicalLanguage = ['python', 'py'].includes(normalizedLanguage) ? 'python' : 'javascript';
  const selectedEntry = getEntryFunction(canonicalLanguage, code, entryFunction);
  if (!selectedEntry) return code;

  const marker = `__QH_RESULT_${randomBytes(16).toString('hex')}__`;
  return canonicalLanguage === 'python'
    ? pythonDriver(code, selectedEntry, marker)
    : javascriptDriver(code, selectedEntry, marker);
};

const unwrapDriverOutput = (code, output) => {
  const marker = String(code || '').match(/__QH_RESULT_[a-f\d]{32}__/i)?.[0];
  if (!marker) return output;

  const resultLine = String(output || '').split(/\r?\n/).filter(line => line.startsWith(marker)).at(-1);
  return resultLine ? resultLine.slice(marker.length).trim() : output;
};

module.exports = { wrapCodeForExecution, unwrapDriverOutput };