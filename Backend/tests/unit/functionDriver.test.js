const { spawnSync } = require('node:child_process');
const { unwrapDriverOutput, wrapCodeForExecution } = require('../../src/features/coding/services/functionDriver');

const twoSumJavaScript = `function twoSum(nums, target) {
  const seen = new Map();
  for (let index = 0; index < nums.length; index += 1) {
    const complement = target - nums[index];
    if (seen.has(complement)) return [seen.get(complement), index];
    seen.set(nums[index], index);
  }
  return [];
}`;

describe('function execution drivers', () => {
  test.each([
    ['[2,7,11,15] 9', '[0,1]'],
    ['[3,2,4] 6', '[1,2]']
  ])('runs JavaScript Two Sum input %s and returns %s as JSON', (input, expected) => {
    const code = wrapCodeForExecution('javascript', `${twoSumJavaScript}\nconsole.log('user output');`);
    const result = spawnSync(process.execPath, ['-e', code], { input, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('user output');
    expect(unwrapDriverOutput(code, result.stdout)).toBe(expected);
  });

  test('runs Python functions with the same JSON argument format', () => {
    const source = `def solve(nums, target):
    seen = {}
    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]
        seen[value] = index
    return []
print('python user output')`;
    const code = wrapCodeForExecution('python', source);
    const result = spawnSync('python', ['-c', code], { input: '[3,2,4] 6', encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('python user output');
    expect(unwrapDriverOutput(code, result.stdout)).toBe('[1,2]');
  });

  test('falls back from the default solve name to a single legacy function', () => {
    const code = wrapCodeForExecution('javascript', 'function twoSum(nums, target) { return [1, 2]; }', 'solve');
    const result = spawnSync(process.execPath, ['-e', code], { input: '[3,2,4] 6', encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(unwrapDriverOutput(code, result.stdout)).toBe('[1,2]');
  });

  test('uses a configured entry function when multiple functions are present', () => {
    const source = 'function solve() { return [0, 0]; } function twoSum(nums, target) { return [1, 2]; }';
    const code = wrapCodeForExecution('javascript', source, 'twoSum');
    const result = spawnSync(process.execPath, ['-e', code], { input: '[3,2,4] 6', encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(unwrapDriverOutput(code, result.stdout)).toBe('[1,2]');
  });

  test('ignores a forged result line printed by user code', () => {
    const source = `function solve() {
  const generatedSource = process._eval || '';
  const marker = generatedSource.match(/__QH_RESULT_[a-f\\d]{32}__/);
  if (marker) console.log(marker[0] + '[]');
  return [9, 10];
}`;
    const code = wrapCodeForExecution('javascript', source);
    const result = spawnSync(process.execPath, ['-e', code], { input: '', encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(unwrapDriverOutput(code, result.stdout)).toBe('[9,10]');
  });

  test('leaves languages without function drivers in plain stdin mode', () => {
    const source = 'int main() { return 0; }';
    expect(wrapCodeForExecution('cpp', source)).toBe(source);
  });
});
