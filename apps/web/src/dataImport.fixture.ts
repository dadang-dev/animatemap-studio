import Excel from 'exceljs';
export const illustrativeCsv =
  'place,yr,score\nVietnam,2020,10\nVNM,2022,90\nThailand,2020,20\nTHA,2022,80\n';
export const illustrativeMetadata = {
  name: 'Illustrative country index',
  unit: 'points',
  provenance: {
    source: 'AnimateMap synthetic test observations; not measured statistics',
    author: 'AnimateMap contributors',
    license: 'CC0-1.0',
    credit: 'Illustrative data · CC0',
  },
};
export async function illustrativeWorkbook(formula = false) {
  const workbook = new Excel.Workbook();
  workbook
    .addWorksheet('Notes')
    .addRow(['Illustrative test observations; not measured statistics']);
  const sheet = workbook.addWorksheet('Dữ liệu');
  sheet.addRows([
    ['place', 'yr', 'score'],
    ['Vietnam', 2020, 10],
    ['VNM', 2022, 90],
    ['Thailand', 2020, 20],
    ['THA', 2022, 80],
  ]);
  if (formula) sheet.getCell('C2').value = { formula: '5+5', result: 10 };
  // Also exercise the patched uuid v4 path in ExcelJS's conditional-format writer.
  sheet.addConditionalFormatting({
    ref: 'C2:C5',
    rules: [
      {
        type: 'dataBar',
        minLength: 0,
        maxLength: 100,
        showValue: true,
        cfvo: [{ type: 'min' }, { type: 'max' }],
        gradient: true,
        border: false,
        negativeBarColorSameAsPositive: true,
        negativeBarBorderColorSameAsPositive: true,
        axisPosition: 'auto',
        direction: 'leftToRight',
        priority: 1,
      },
    ],
  });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
