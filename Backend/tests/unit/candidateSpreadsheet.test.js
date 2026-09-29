const ExcelJS = require('exceljs');
const {
  CandidateSpreadsheetError,
  MAX_CANDIDATE_FILE_BYTES,
  MAX_CANDIDATE_ROWS,
  escapeSpreadsheetCell,
  parseCandidateWorkbook,
} = require('../../src/features/interviews/utils/candidateSpreadsheet');

const HEADERS = ['Email Address', 'Student Full Name', 'Phone Number'];

async function makeWorkbook(rows, headers = HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Candidates');
  worksheet.addRow(headers);
  for (const row of rows) worksheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('candidateSpreadsheet', () => {
  it('reads valid candidate rows as text and skips blank rows while preserving duplicates', async () => {
    const buffer = await makeWorkbook([
      ['same@example.com', 'Alex Candidate', 1234567890],
      [null, null, null],
      ['same@example.com', 'Alex Duplicate', 1234567891],
    ]);
    const parsed = await parseCandidateWorkbook(buffer, 'candidates.xlsx');

    expect(parsed.columnNames).toEqual(HEADERS);
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0]['Phone Number']).toBe('1234567890');
    expect(parsed.data[1]['Email Address']).toBe('same@example.com');
  });

  it('keeps date and number cell display values as text', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');
    worksheet.addRow(HEADERS);
    const row = worksheet.addRow(['date@example.com', 'Date Candidate', new Date('2025-05-06T00:00:00Z')]);
    row.getCell(3).numFmt = 'yyyy-mm-dd';
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseCandidateWorkbook(buffer, 'candidates.xlsx');

    expect(parsed.data[0]['Phone Number']).toBe('2025-05-06T00:00:00.000Z');
    expect(typeof parsed.data[0]['Phone Number']).toBe('string');
  });

  it('parses workbooks up to 5,000 candidate rows', async () => {
    const rows = Array.from({ length: MAX_CANDIDATE_ROWS }, (_, index) => [
      `candidate${index}@example.test`, `Candidate ${index}`, `555${String(index).padStart(7, '0')}`,
    ]);
    const parsed = await parseCandidateWorkbook(await makeWorkbook(rows), 'candidates.xlsx');

    expect(parsed.data).toHaveLength(MAX_CANDIDATE_ROWS);
  });

  it('rejects more than 5,000 candidate rows', async () => {
    const rows = Array.from({ length: MAX_CANDIDATE_ROWS + 1 }, (_, index) => [
      `candidate${index}@example.test`, `Candidate ${index}`, `555${String(index).padStart(7, '0')}`,
    ]);

    await expect(parseCandidateWorkbook(await makeWorkbook(rows), 'candidates.xlsx'))
      .rejects.toMatchObject({ statusCode: 413 });
  });

  it('rejects unsupported workbook extensions', async () => {
    const buffer = await makeWorkbook([['one@example.test', 'One', '5551234567']]);
    for (const fileName of ['candidates.xls', 'candidates.xlsm', 'candidates.csv']) {
      await expect(parseCandidateWorkbook(buffer, fileName))
        .rejects.toThrow('Only .xlsx files are allowed');
    }
  });

  it('rejects an executable renamed to .xlsx by checking ZIP magic bytes', async () => {
    await expect(parseCandidateWorkbook(Buffer.from('MZ fake executable'), 'upload.xlsx'))
      .rejects.toThrow('Invalid .xlsx file');
  });

  it('rejects a corrupted ZIP workbook', async () => {
    await expect(parseCandidateWorkbook(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]), 'broken.xlsx'))
      .rejects.toThrow('Invalid or corrupted .xlsx file');
  });

  it('rejects empty workbooks and preserves wrong headers for validation', async () => {
    const emptyWorkbook = new ExcelJS.Workbook();
    emptyWorkbook.addWorksheet('Empty').addRow(HEADERS);
    await expect(parseCandidateWorkbook(Buffer.from(await emptyWorkbook.xlsx.writeBuffer()), 'empty.xlsx'))
      .rejects.toThrow('Excel file is empty');

    const wrongHeaders = await parseCandidateWorkbook(
      await makeWorkbook([['value']], ['Unexpected']),
      'wrong-columns.xlsx',
    );
    expect(wrongHeaders.columnNames).toEqual(['Unexpected']);
  });

  it('uses cached formula results without evaluating formulas', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');
    worksheet.addRow(HEADERS);
    worksheet.addRow(['formula@example.com', 'Formula Candidate', { formula: '1+1', result: '5551234567' }]);
    const parsed = await parseCandidateWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), 'formula.xlsx');

    expect(parsed.data[0]['Phone Number']).toBe('5551234567');
  });

  it.each(['=cmd|calc', '+SUM(1,1)', '-1+1', '@SUM(1,1)', '  =cmd|calc'])(
    'prefixes formula-injection CSV cells: %s',
    (value) => expect(escapeSpreadsheetCell(value)).toBe(`'${value}`),
  );

  it('rejects files above the upload size limit', async () => {
    await expect(parseCandidateWorkbook(Buffer.alloc(MAX_CANDIDATE_FILE_BYTES + 1), 'large.xlsx'))
      .rejects.toMatchObject({ statusCode: 413 });
  });

  it('exposes safe parser error types', () => {
    expect(new CandidateSpreadsheetError('invalid').statusCode).toBe(400);
  });
});