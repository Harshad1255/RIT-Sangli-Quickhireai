const { randomBytes } = require('crypto');

const getTopLevelFunctionNames = (language, code) => {
  if (language === 'python' || language === 'py') {
    return [...code.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)].map(match => match[1]);
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
  if (validRequestedName && functions.includes(requestedName)) return requestedName;
  if (functions.includes('solve')) return 'solve';
  if (functions.length === 1) return functions[0];
  if (/class\s+Solution\b/.test(code) && /def\s+solve\b/.test(code)) return 'solve';
  return 'solve';
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
    } else if ((character === ',' || /\\s/.test(character)) && depth === 0) {
      const trimmed = token.trim();
      if (trimmed) { tokens.push(trimmed); token = ''; }
    } else {
      token += character;
    }
  }
  const lastTrimmed = token.trim();
  if (lastTrimmed) tokens.push(lastTrimmed);
  return tokens.map(value => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value.replace(/^['"]|['"]$/g, '');
    }
  });
};
(async () => {
  const __qhEntry = new Function(${source} + ${JSON.stringify(`
    if (typeof ${entryFunction} === "function") return ${entryFunction};
    if (typeof Solution === "function") {
      const sol = new Solution();
      if (typeof sol.${entryFunction} === "function") return sol.${entryFunction}.bind(sol);
    }
    return null;
  `)})();
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
        elif (character == ',' or character.isspace()) and depth == 0:
            trimmed = token.strip()
            if trimmed:
                tokens.append(trimmed)
                token = ''
        else:
            token += character
    if token.strip():
        tokens.append(token.strip())
    args = []
    for val in tokens:
        try:
            args.append(__qh_json.loads(val))
        except Exception:
            clean = val.strip()
            if (clean.startswith('"') and clean.endswith('"')) or (clean.startswith("'") and clean.endswith("'")):
                clean = clean[1:-1]
            args.append(clean)
    return args

__qh_namespace = {'__name__': '__main__'}
exec(compile(__qh_source, '<solution>', 'exec'), __qh_namespace)
__qh_entry = __qh_namespace.get('${entryFunction}')
if not callable(__qh_entry):
    __qh_sol = __qh_namespace.get('Solution')
    if __qh_sol and hasattr(__qh_sol, '${entryFunction}'):
        try:
            __qh_entry = getattr(__qh_sol(), '${entryFunction}')
        except Exception:
            pass
if not callable(__qh_entry):
    raise RuntimeError('Entry function was not found.')
__qh_result = __qh_entry(*__qh_split_arguments(__qh_read_input()))
__qh_write_result(__qh_marker + __qh_dump_result(__qh_result, separators=(',', ':')) + '\\n')
__qh_flush_result()
__qh_exit(0)
`;
};

const getCppDispatchCall = (code) => {
  const isClassSolution = /\bclass\s+Solution\b/.test(code);
  const caller = isClassSolution ? 'Solution().' : '';
  const match = code.match(/solve\s*\(\s*([^)]*)\s*\)/);
  const params = match ? match[1].toLowerCase() : '';

  if (params.includes('vector') && (params.includes('int') && params.indexOf('vector') !== params.lastIndexOf('int'))) {
    return `auto nums = __qh::parseVectorInt(input);\n  int target = __qh::parseIntAfterBracket(input);\n  auto res = ${caller}solve(nums, target);\n  __qh::printResult(res);`;
  }
  if (params.includes('vector')) {
    return `auto nums = __qh::parseVectorInt(input);\n  auto res = ${caller}solve(nums);\n  __qh::printResult(res);`;
  }
  if (params.split(',').length >= 2 && params.includes('string')) {
    return `auto p = __qh::parseTwoStrings(input);\n  auto res = ${caller}solve(p.first, p.second);\n  __qh::printResult(res);`;
  }
  if (params.includes('string')) {
    return `std::string s = __qh::cleanString(input);\n  auto res = ${caller}solve(s);\n  __qh::printResult(res);`;
  }
  if (params.includes('int')) {
    return `int n = __qh::parseSingleInt(input);\n  auto res = ${caller}solve(n);\n  __qh::printResult(res);`;
  }
  return `std::string s = __qh::cleanString(input);\n  auto res = ${caller}solve(s);\n  __qh::printResult(res);`;
};

const cppDriver = (code, marker) => {
  return `
${code}

// --- QuickHire AI C++ Execution Driver ---
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

namespace __qh {
  static inline std::string trim(const std::string& s) {
    size_t start = s.find_first_not_of(" \\t\\r\\n");
    if (start == std::string::npos) return "";
    size_t end = s.find_last_not_of(" \\t\\r\\n");
    return s.substr(start, end - start + 1);
  }

  static inline std::vector<int> parseVectorInt(const std::string& raw) {
    std::vector<int> res;
    size_t i = 0, n = raw.size();
    while (i < n && raw[i] != '[') i++;
    while (i < n && raw[i] != ']') {
      if ((raw[i] >= '0' && raw[i] <= '9') || raw[i] == '-') {
        int sign = 1;
        if (raw[i] == '-') { sign = -1; i++; }
        long long val = 0;
        while (i < n && raw[i] >= '0' && raw[i] <= '9') {
          val = val * 10 + (raw[i] - '0');
          i++;
        }
        res.push_back(sign * val);
      } else {
        i++;
      }
    }
    return res;
  }

  static inline int parseIntAfterBracket(const std::string& raw) {
    size_t pos = raw.rfind(']');
    std::string tail = (pos != std::string::npos) ? raw.substr(pos + 1) : raw;
    size_t comma = tail.find(',');
    std::string numStr = (comma != std::string::npos) ? tail.substr(comma + 1) : tail;
    std::stringstream ss(trim(numStr));
    int v = 0;
    ss >> v;
    return v;
  }

  static inline int parseSingleInt(const std::string& raw) {
    std::stringstream ss(trim(raw));
    int v = 0;
    ss >> v;
    return v;
  }

  static inline std::string cleanString(const std::string& raw) {
    std::string s = trim(raw);
    if (s.size() >= 2 && ((s.front() == '"' && s.back() == '"') || (s.front() == '\\'' && s.back() == '\\''))) {
      return s.substr(1, s.size() - 2);
    }
    return s;
  }

  static inline std::pair<std::string, std::string> parseTwoStrings(const std::string& raw) {
    std::string s = trim(raw);
    size_t comma = s.find(',');
    if (comma == std::string::npos) return { cleanString(s), "" };
    return { cleanString(s.substr(0, comma)), cleanString(s.substr(comma + 1)) };
  }

  template <typename T>
  static inline void printResult(const T& val) {
    std::cout << val;
  }

  template <>
  inline void printResult<bool>(const bool& val) {
    std::cout << (val ? "true" : "false");
  }

  template <>
  inline void printResult<std::vector<int>>(const std::vector<int>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
      if (i > 0) std::cout << ", ";
      std::cout << vec[i];
    }
    std::cout << "]";
  }
}

int main() {
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(NULL);
  std::string line, input;
  while (std::getline(std::cin, line)) {
    if (!input.empty()) input += "\\n";
    input += line;
  }
  std::string marker = "${marker}";
  std::cout << marker;

  ${getCppDispatchCall(code)}

  std::cout << "\\n";
  return 0;
}
`;
};

const getJavaDispatchCall = (code) => {
  const match = code.match(/solve\s*\(\s*([^)]*)\s*\)/);
  const params = match ? match[1].toLowerCase() : '';

  if (params.includes('[]') && params.includes('int') && params.indexOf('[]') !== params.lastIndexOf('int')) {
    return `int[] nums = parseArray(input);\n        int target = parseIntAfterBracket(input);\n        printResult(new Solution().solve(nums, target));`;
  }
  if (params.includes('[]')) {
    return `int[] nums = parseArray(input);\n        printResult(new Solution().solve(nums));`;
  }
  if (params.split(',').length >= 2 && params.includes('string')) {
    return `String[] p = parseTwoStrings(input);\n        printResult(new Solution().solve(p[0], p[1]));`;
  }
  if (params.includes('string')) {
    return `String s = cleanString(input);\n        printResult(new Solution().solve(s));`;
  }
  if (params.includes('int')) {
    return `int n = parseSingleInt(input);\n        printResult(new Solution().solve(n));`;
  }
  return `printResult(new Solution().solve(cleanString(input)));`;
};

const javaDriver = (code, marker) => {
  const normalizedUserCode = code.replace(/\bpublic\s+class\s+Solution\b/g, 'class Solution');
  return `
${normalizedUserCode}

public class Main {
    static String trim(String s) {
        return s == null ? "" : s.trim();
    }
    static int[] parseArray(String raw) {
        int l = raw.indexOf('[');
        int r = raw.lastIndexOf(']');
        if (l == -1 || r == -1 || r <= l) return new int[0];
        String inner = raw.substring(l + 1, r).trim();
        if (inner.isEmpty()) return new int[0];
        String[] parts = inner.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Integer.parseInt(parts[i].trim());
        }
        return res;
    }
    static int parseIntAfterBracket(String raw) {
        int r = raw.lastIndexOf(']');
        String tail = (r != -1) ? raw.substring(r + 1) : raw;
        int comma = tail.indexOf(',');
        String numStr = (comma != -1) ? tail.substring(comma + 1) : tail;
        return Integer.parseInt(numStr.trim());
    }
    static int parseSingleInt(String raw) {
        return Integer.parseInt(raw.trim());
    }
    static String cleanString(String raw) {
        String s = raw.trim();
        if (s.length() >= 2 && ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }
    static String[] parseTwoStrings(String raw) {
        String s = raw.trim();
        int comma = s.indexOf(',');
        if (comma == -1) return new String[]{ cleanString(s), "" };
        return new String[]{ cleanString(s.substring(0, comma)), cleanString(s.substring(comma + 1)) };
    }
    static void printResult(Object res) {
        if (res instanceof int[]) {
            int[] arr = (int[]) res;
            System.out.print(java.util.Arrays.toString(arr));
        } else if (res instanceof Boolean) {
            System.out.print(((Boolean) res) ? "true" : "false");
        } else {
            System.out.print(res);
        }
    }

    public static void main(String[] args) throws Exception {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (sc.hasNextLine()) {
            if (sb.length() > 0) sb.append("\\n");
            sb.append(sc.nextLine());
        }
        String input = sb.toString();
        String marker = "${marker}";
        System.out.print(marker);

        ${getJavaDispatchCall(code)}

        System.out.println();
    }
}
`;
};

const wrapCodeForExecution = (language, code, entryFunction) => {
  const normalizedLanguage = String(language || '').toLowerCase().trim();
  if (typeof code !== 'string') return code;

  // 1. Python
  if (['python', 'py', 'python3'].includes(normalizedLanguage)) {
    const selectedEntry = getEntryFunction('python', code, entryFunction);
    if (!selectedEntry) return code;
    const marker = `__QH_RESULT_${randomBytes(16).toString('hex')}__`;
    return pythonDriver(code, selectedEntry, marker);
  }

  // 2. JavaScript
  if (['javascript', 'js', 'node'].includes(normalizedLanguage)) {
    const selectedEntry = getEntryFunction('javascript', code, entryFunction);
    if (!selectedEntry) return code;
    const marker = `__QH_RESULT_${randomBytes(16).toString('hex')}__`;
    return javascriptDriver(code, selectedEntry, marker);
  }

  // 3. C++
  if (['cpp', 'c++', 'cxx'].includes(normalizedLanguage)) {
    // If the user already wrote their own main() function, run it directly without driver
    if (/\b(?:int|void)\s+main\s*\(/.test(code)) {
      return code;
    }
    const marker = `__QH_RESULT_${randomBytes(16).toString('hex')}__`;
    return cppDriver(code, marker);
  }

  // 4. Java
  if (['java'].includes(normalizedLanguage)) {
    // If the user already wrote public static void main, run it directly without driver
    if (/\bpublic\s+static\s+void\s+main\b/.test(code)) {
      return code;
    }
    const marker = `__QH_RESULT_${randomBytes(16).toString('hex')}__`;
    return javaDriver(code, marker);
  }

  return code;
};

const unwrapDriverOutput = (code, output) => {
  const marker = String(code || '').match(/__QH_RESULT_[a-f\d]{32}__/i)?.[0];
  if (!marker) return output;

  const resultLine = String(output || '').split(/\r?\n/).filter(line => line.startsWith(marker)).at(-1);
  return resultLine ? resultLine.slice(marker.length).trim() : output;
};

module.exports = { wrapCodeForExecution, unwrapDriverOutput };