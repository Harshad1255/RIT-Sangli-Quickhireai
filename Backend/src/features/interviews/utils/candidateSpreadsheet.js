const ExcelJS = require('exceljs');

const MAX_CANDIDATE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_CANDIDATE_ROWS = 5000;

class CandidateSpreadsheetError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CandidateSpreadsheetError';
    this.statusCode = statusCode;
  }
}

function cellAsText(cell) {
  const value = cell.value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) {
      return value.result == null ? '' : String(value.result);
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('hyperlink' in value && 'text' in value) {
      return String(value.text);
    }
  }

  return value == null ? '' : cell.text;
}

async function parseCandidateWorkbook(buffer, fileName) {
  if (!/\.xlsx$/i.test(fileName || '')) {
    throw new CandidateSpreadsheetError('Only .xlsx files are allowed');
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new CandidateSpreadsheetError('Excel file is empty');
  }
  if (buffer.length > MAX_CANDIDATE_FILE_BYTES) {
    throw new CandidateSpreadsheetError('Excel file exceeds the 10 MB limit', 413);
  }
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new CandidateSpreadsheetError('Invalid .xlsx file');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new CandidateSpreadsheetError('Invalid or corrupted .xlsx file');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount <= 1) {
    throw new CandidateSpreadsheetError('Excel file is empty');
  }
  if (worksheet.rowCount - 1 > MAX_CANDIDATE_ROWS) {
    throw new CandidateSpreadsheetError(`Excel file cannot contain more than ${MAX_CANDIDATE_ROWS} candidate rows`, 413);
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = cellAsText(cell).trim();
    if (header) headers.push({ header, columnNumber });
  });

  const data = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const record = {};
    for (const { header, columnNumber } of headers) {
      const value = cellAsText(row.getCell(columnNumber));
      if (value !== '') record[header] = value;
    }
    if (Object.keys(record).length > 0) data.push(record);
  }

  if (data.length === 0) {
    throw new CandidateSpreadsheetError('Excel file is empty');
  }

  return {
    columnNames: headers.map(({ header }) => header),
    data,
  };
}

function escapeSpreadsheetCell(value) {
  const text = String(value ?? '');
  return /^[\t\r\n ]*[=+@-]/.test(text) ? `'${text}` : text;
}

module.exports = {
  CandidateSpreadsheetError,
  MAX_CANDIDATE_FILE_BYTES,
  MAX_CANDIDATE_ROWS,
  escapeSpreadsheetCell,
  parseCandidateWorkbook,
};