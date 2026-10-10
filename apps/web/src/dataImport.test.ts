import { expect, test } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  parseCsv,
  mappedDataset,
  parseDataBytes,
  boundedWorkbook,
} from './dataImport';
import {
  illustrativeCsv,
  illustrativeMetadata,
  illustrativeWorkbook,
} from './dataImport.fixture';
const mapping = { country: 0, year: 1, value: 2 };
test('CSV handles BOM, quoted newlines/commas/escapes and preserves blank-row positions', () => {
  const table = parseCsv(
    '\uFEFFplace,yr,score,note\r\n"Vietnam",2020,1.25,"a,b\n""quoted"""\r\n\r\nVNM,2022,2,ok',
  );
  expect(table.rows[1]![3]).toBe('a,b\n"quoted"');
  expect(table.rows[2]).toEqual(['']);
  expect(
    mappedDataset(table, mapping, illustrativeMetadata, 'test-data').records,
  ).toEqual([
    { countryCode: 'VNM', year: 2020, value: 1.25 },
    { countryCode: 'VNM', year: 2022, value: 2 },
  ]);
  expect(() => parseCsv('a,b\n"unclosed')).toThrow('unterminated');
  expect(() => parseCsv('a,b\n"closed"bad,2')).toThrow('Malformed');
});
test('mapping rejects unknown/ambiguous countries, duplicates, blank values, invalid years and formulas with row context', () => {
  const parse = (text: string) =>
    mappedDataset(
      parseCsv(`place,yr,score\n${text}`),
      mapping,
      illustrativeMetadata,
      'test-data',
    );
  expect(parse('vietnam,2020,10').records[0]!.countryCode).toBe('VNM');
  expect(() => parse('Atlantis,2020,10')).toThrow('Row 2: unknown');
  expect(() => parse('VNM,2020,10\nVietnam,2020,20')).toThrow(
    'Row 3: duplicate',
  );
  expect(() => parse('VNM,2020,')).toThrow('value must be numeric');
  expect(() => parse('VNM,2020.5,10')).toThrow('year must be an integer');
  expect(() => parse('VNM,2020,=1+1')).toThrow('value must be numeric');
  expect(() => parse('VNM,2020,1e100')).toThrow('finite');
  expect(() =>
    mappedDataset(
      parseCsv(illustrativeCsv),
      { country: 0, year: 0, value: 2 },
      illustrativeMetadata,
    ),
  ).toThrow('distinct');
  expect(() => parseCsv(`a,b\n${'x'.repeat(1001)}`)).toThrow('1000 characters');
});
test('real ExcelJS workbook reads Unicode worksheets and numeric observations without executing formulas', async () => {
  const tables = await parseDataBytes(await illustrativeWorkbook(), 'xlsx');
  expect(tables.map((table) => table.name)).toEqual(['Notes', 'Dữ liệu']);
  expect(
    mappedDataset(tables[1]!, mapping, illustrativeMetadata, 'test-data')
      .records,
  ).toHaveLength(4);
  await expect(
    parseDataBytes(await illustrativeWorkbook(true), 'xlsx'),
  ).rejects.toThrow('Formula at row 2, column 3');
});
test('XLSX preflight rejects truncated ZIP, CRC changes, expanded bombs, unsafe paths and encoded extreme cells', async () => {
  const valid = await illustrativeWorkbook();
  expect(() => boundedWorkbook(valid.subarray(0, valid.length - 1))).toThrow(
    'directory',
  );
  const damaged = new Uint8Array(valid);
  const central = new DataView(damaged.buffer).getUint32(
    damaged.length - 6,
    true,
  );
  damaged[central + 16] = damaged[central + 16]! ^ 1;
  expect(() => boundedWorkbook(damaged)).toThrow('checksum');
  const archive = (entries: Record<string, Uint8Array>) =>
    zipSync({
      'xl/workbook.xml': strToU8(
        '<workbook><sheets><sheet sheetId="1" /></sheets></workbook>',
      ),
      ...entries,
    });
  expect(() =>
    boundedWorkbook(archive({ 'large.xml': new Uint8Array(5 * 1024 * 1024) })),
  ).toThrow('oversized');
  expect(() =>
    boundedWorkbook(archive({ '../bad.xml': strToU8('<x/>') })),
  ).toThrow('unsafe');
  expect(() =>
    boundedWorkbook(
      archive({
        'xl/worksheets/sheet1.xml': strToU8(
          '<worksheet><row r="&#49;000000"><c r="A1" /></row></worksheet>',
        ),
      }),
    ),
  ).toThrow('10000');
  expect(() =>
    boundedWorkbook(
      archive({
        'xl/worksheets/sheet1.xml': strToU8(
          `<worksheet>${'<row/>'.repeat(10002)}</worksheet>`,
        ),
      }),
    ),
  ).toThrow('10000');
  expect(() =>
    boundedWorkbook(archive({ 'xl/vbaProject.bin': new Uint8Array(1) })),
  ).toThrow('Macros');
  await expect(
    parseDataBytes(new Uint8Array(6 * 1024 * 1024), 'csv'),
  ).rejects.toThrow('5 MiB');
});
