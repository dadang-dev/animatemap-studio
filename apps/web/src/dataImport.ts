import { Unzip, UnzipInflate, zipSync } from 'fflate';
import {
  countryCatalog,
  datasetSchema,
  crc32,
  type Dataset,
} from '@animatemap/project-schema';
import type { CellValue } from 'exceljs';

export type DataTable = { name: string; rows: (string | number | null)[][] };
export type ColumnMapping = { country: number; year: number; value: number };
const MAX_INPUT = 5 * 1024 * 1024;
const MAX_EXPANDED = 20 * 1024 * 1024;
export function parseCsv(input: string): DataTable {
  if (new TextEncoder().encode(input).length > MAX_INPUT)
    throw new Error('Data input exceeds 5 MiB');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const text = input.replace(/^\uFEFF/, '');
  const pushCell = () => {
    row.push(cell);
    cell = '';
    closed = false;
    if (row.length > 64) throw new Error('CSV exceeds 64 columns');
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
    if (rows.length > 10001) throw new Error('Data exceeds 10000 rows');
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === ',') pushCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      pushRow();
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (closed || char === '"')
      throw new Error(`Malformed CSV near row ${rows.length + 1}`);
    else cell += char;
    if (cell.length > 1000)
      throw new Error(
        `Cell exceeds 1000 characters near row ${rows.length + 1}`,
      );
  }
  if (quoted) throw new Error('CSV has an unterminated quoted cell');
  if (cell || row.length || closed) pushRow();
  if (rows.length < 2)
    throw new Error('Data requires a header and at least one observation');
  return { name: 'CSV', rows };
}
function numericEntities(value: string) {
  return value.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, digits: string) =>
    String.fromCodePoint(
      parseInt(digits.replace(/^x/i, ''), /^x/i.test(digits) ? 16 : 10),
    ),
  );
}
function xmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 's'));
  return match && numericEntities(match[2]!);
}
function zipManifest(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (
    let offset = bytes.length - 22;
    offset >= Math.max(0, bytes.length - 65557);
    offset--
  )
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length
    ) {
      end = offset;
      break;
    }
  if (end < 0) throw new Error('Incomplete XLSX ZIP directory');
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true),
    start = view.getUint32(end + 16, true);
  if (
    !count ||
    count > 200 ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count ||
    start + size !== end
  )
    throw new Error('Unsupported XLSX ZIP directory');
  const entries = new Map<string, { length: number; checksum: number }>();
  let offset = start,
    total = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error('Malformed XLSX ZIP directory');
    const flags = view.getUint16(offset + 8, true),
      method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true),
      length = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    if (
      flags & 1 ||
      (method !== 0 && method !== 8) ||
      view.getUint16(offset + 34, true) ||
      local + 30 > start ||
      compressed > MAX_INPUT ||
      length > 4 * 1024 * 1024 ||
      offset + 46 + nameLength + extra + comment > end
    )
      throw new Error('Unsupported/oversized XLSX ZIP entry');
    if (
      view.getUint32(local, true) !== 0x04034b50 ||
      local +
        30 +
        view.getUint16(local + 26, true) +
        view.getUint16(local + 28, true) +
        compressed >
        start
    )
      throw new Error('Malformed XLSX local ZIP entry');
    total += length;
    if (total > MAX_EXPANDED)
      throw new Error('Workbook exceeds 20 MiB expanded');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    if (entries.has(name)) throw new Error('Duplicate workbook ZIP entry');
    entries.set(name, { length, checksum: view.getUint32(offset + 16, true) });
    offset += 46 + nameLength + extra + comment;
  }
  if (offset !== end) throw new Error('Malformed XLSX ZIP directory length');
  return entries;
}
/** Inflate in small chunks and repack only verified bounded bytes before a workbook parser sees them. */
export function boundedWorkbook(bytes: Uint8Array) {
  if (bytes.length > MAX_INPUT) throw new Error('Data input exceeds 5 MiB');
  if (bytes[0] !== 80 || bytes[1] !== 75)
    throw new Error('Import an unencrypted XLSX workbook');
  const manifest = zipManifest(bytes);
  const files: Record<string, Uint8Array> = Object.create(null);
  const names = new Set<string>(),
    finished = new Set<string>();
  let total = 0,
    cellCount = 0;
  const unzip = new Unzip((file) => {
    const expected = manifest.get(file.name);
    if (!expected)
      throw new Error('XLSX local entry differs from ZIP directory');
    if (names.size >= 200 || names.has(file.name))
      throw new Error('Workbook has too many or duplicate ZIP entries');
    if (
      file.name.startsWith('/') ||
      file.name.includes('\\') ||
      file.name.split('/').includes('..')
    )
      throw new Error('Workbook contains an unsafe ZIP path');
    names.add(file.name);
    if (/vbaProject|externalLinks/i.test(file.name))
      throw new Error('Macros and external workbook links are unsupported');
    const parts: Uint8Array[] = [];
    let length = 0;
    file.ondata = (error, part, final) => {
      if (error) throw error;
      length += part.length;
      total += part.length;
      if (length > 4 * 1024 * 1024 || total > MAX_EXPANDED)
        throw new Error('Workbook exceeds 4 MiB per entry / 20 MiB expanded');
      parts.push(part);
      if (!final) return;
      finished.add(file.name);
      const value = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        value.set(part, offset);
        offset += part.length;
      }
      if (length !== expected.length || crc32(value) !== expected.checksum)
        throw new Error(`Workbook ZIP checksum/length mismatch: ${file.name}`);
      // Media is not relevant to tabular import and never reaches the parser.
      if (!/\.(xml|rels)$/.test(file.name)) return;
      const xml = new TextDecoder('utf-8', { fatal: true }).decode(value);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml))
        throw new Error('Workbook XML declarations are unsupported');
      if (/TargetMode\s*=\s*["']External["']/i.test(xml))
        throw new Error('External worksheet links are unsupported');
      if (/^xl\/worksheets\//.test(file.name)) {
        let rowCount = 0;
        for (const match of xml.matchAll(/<(?:\w+:)?row\b[^>]*>/g)) {
          if (++rowCount > 10001)
            throw new Error('Worksheet exceeds 10000 data rows');
          const reference = xmlAttribute(match[0], 'r');
          if (
            reference &&
            (!/^\d+$/.test(reference) ||
              Number(reference) < 1 ||
              Number(reference) > 10001)
          )
            throw new Error('Worksheet exceeds 10000 data rows');
        }
        for (const match of xml.matchAll(/<(?:\w+:)?c\b[^>]*>/g)) {
          if (++cellCount > 100000)
            throw new Error('Workbook exceeds 100000 populated cells');
          const reference = xmlAttribute(match[0], 'r');
          if (!reference) continue;
          const address = reference.match(/^([A-Z]+)([0-9]+)$/);
          const column = address?.[1]
            ?.split('')
            .reduce(
              (value, letter) => value * 26 + letter.charCodeAt(0) - 64,
              0,
            );
          if (
            !address ||
            !column ||
            column > 64 ||
            Number(address[2]) < 1 ||
            Number(address[2]) > 10001
          )
            throw new Error('Worksheet exceeds supported row/column bounds');
        }
      }
      if (file.name === 'xl/workbook.xml') {
        const sheets = [...xml.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)];
        if (sheets.length > 10)
          throw new Error('Workbook exceeds 10 worksheets');
        for (const match of sheets) {
          const id = xmlAttribute(match[0], 'sheetId');
          if (!id || !/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 100)
            throw new Error('Unsupported worksheet identifier');
        }
      }
      files[file.name] = value;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 1024)
    unzip.push(
      bytes.subarray(offset, offset + 1024),
      offset + 1024 >= bytes.length,
    );
  if (
    names.size !== finished.size ||
    names.size !== manifest.size ||
    !files['xl/workbook.xml']
  )
    throw new Error('Incomplete XLSX workbook');
  return zipSync(files, { level: 0 });
}
function cellValue(
  value: CellValue,
  row: number,
  column: number,
): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    if (typeof value === 'string' && value.length > 1000)
      throw new Error(
        `Cell exceeds 1000 characters at row ${row}, column ${column}`,
      );
    return value;
  }
  if (
    typeof value === 'object' &&
    ('formula' in value || 'sharedFormula' in value)
  )
    throw new Error(
      `Formula at row ${row}, column ${column}: paste numeric values before importing`,
    );
  if (typeof value === 'object' && 'richText' in value)
    return cellValue(
      value.richText.map((part) => part.text).join(''),
      row,
      column,
    );
  throw new Error(
    `Unsupported cell at row ${row}, column ${column}; use text countries and numeric years/values`,
  );
}
export async function parseDataBytes(
  bytes: Uint8Array,
  kind: 'csv' | 'xlsx',
): Promise<DataTable[]> {
  if (bytes.length > MAX_INPUT) throw new Error('Data input exceeds 5 MiB');
  if (kind === 'csv')
    return [parseCsv(new TextDecoder('utf-8', { fatal: true }).decode(bytes))];
  const safe = boundedWorkbook(bytes);
  const Excel = (await import('exceljs')).default;
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(new Uint8Array(safe).buffer, {
    ignoreNodes: [
      'cols',
      'mergeCells',
      'conditionalFormatting',
      'dataValidations',
      'drawing',
      'sheetProtection',
      'extLst',
    ],
  });
  const tables = workbook.worksheets
    .filter((sheet) => sheet.state === 'visible')
    .map((sheet) => {
      if (sheet.rowCount > 10001 || sheet.columnCount > 64)
        throw new Error('Worksheet exceeds supported data bounds');
      const rows: DataTable['rows'] = [];
      sheet.eachRow({ includeEmpty: true }, (row, index) => {
        const cells = Array.from({ length: sheet.columnCount }, (_, column) =>
          cellValue(row.getCell(column + 1).value, index, column + 1),
        );
        rows.push(cells);
      });
      return { name: sheet.name, rows };
    });
  if (!tables.length || tables.every((table) => table.rows.length < 2))
    throw new Error(
      'Workbook needs a visible worksheet with header and observations',
    );
  return tables;
}
export function suggestedMapping(table: DataTable): ColumnMapping {
  const headers = table.rows[0]!.map((value) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );
  return {
    country: Math.max(0, headers.indexOf('country')),
    year: Math.max(0, headers.indexOf('year')),
    value: Math.max(0, headers.indexOf('value')),
  };
}
export function mappedDataset(
  table: DataTable,
  mapping: ColumnMapping,
  metadata: Omit<Dataset, 'records' | 'id'>,
  id: string = crypto.randomUUID(),
): Dataset {
  const columns = Object.values(mapping);
  if (
    new Set(columns).size !== 3 ||
    columns.some(
      (column) =>
        !Number.isInteger(column) ||
        column < 0 ||
        column >= table.rows[0]!.length,
    )
  )
    throw new Error('Choose three distinct valid columns');
  const names = new Map<string, string[]>();
  for (const country of countryCatalog)
    for (const label of [country.code, country.name]) {
      const key = label.toLowerCase();
      const choices = names.get(key) ?? [];
      if (!choices.includes(country.code)) choices.push(country.code);
      names.set(key, choices);
    }
  const seen = new Set<string>();
  const records = table.rows.slice(1).flatMap((row, index) => {
    if (row.every((value) => value === null || String(value).trim() === ''))
      return [];
    const position = index + 2;
    const country = String(row[mapping.country] ?? '').trim();
    const matches = names.get(country.toLowerCase());
    if (matches?.length !== 1)
      throw new Error(
        `Row ${position}: unknown/ambiguous country "${country}"; use a bundled three-letter code`,
      );
    const numeric = (column: number, name: string) => {
      const value = row[column];
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === '' ||
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
          String(value).trim(),
        )
      )
        throw new Error(`Row ${position}: ${name} must be numeric`);
      return Number(value);
    };
    const year = numeric(mapping.year, 'year'),
      value = numeric(mapping.value, 'value');
    if (!Number.isInteger(year) || year < 1 || year > 9999)
      throw new Error(
        `Row ${position}: year must be an integer from 1 to 9999`,
      );
    if (!Number.isFinite(value) || Math.abs(value) > 1e15)
      throw new Error(`Row ${position}: value must be finite and within ±1e15`);
    const key = `${matches[0]}/${year}`;
    if (seen.has(key))
      throw new Error(`Row ${position}: duplicate country/year ${key}`);
    seen.add(key);
    return [{ countryCode: matches[0]!, year, value }];
  });
  return datasetSchema.parse({ ...metadata, id, records });
}
