import express from 'express';
import ExcelJS from 'exceljs';
import { getAll } from '../data/store.js';

const router = express.Router();
const BRAND_GREEN = '2F5D3A';
const LIGHT_GREEN = 'EAF2E6';
const WARNING_FILL = 'FFF2CC';

const activityLabels = {
  watered: 'Watered',
  sprayed: 'Sprayed',
  planted: 'Planted',
  harvested: 'Harvested',
  other: 'Other',
};

function asDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
}

function styleTable(sheet, endColumn, rowCount) {
  const endRow = Math.max(1, rowCount);
  sheet.autoFilter = `A1:${endColumn}${endRow}`;
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_GREEN}` } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  for (let rowNumber = 2; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowNumber % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_GREEN}` } };
  }
}

// GET /api/export/field-records.xlsx
router.get('/field-records.xlsx', async (req, res) => {
  try {
    const [activities, diagnoses] = await Promise.all([getAll('activities'), getAll('diagnoses')]);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Agro-Botsa';
    workbook.created = new Date();
    workbook.properties.title = 'Agro-Botsa field records';

    const summary = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
    summary.mergeCells('A1:D1');
    summary.getCell('A1').value = 'Agro-Botsa Field Records';
    summary.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_GREEN}` } };
    summary.getCell('A1').alignment = { vertical: 'middle' };
    summary.getRow(1).height = 32;
    summary.mergeCells('A2:D2');
    summary.getCell('A2').value = `Generated ${new Date().toLocaleString('en-GB')}`;
    summary.getCell('A2').font = { italic: true, color: { argb: 'FF617066' } };
    [['Metric', 'Value'], ['Activities recorded', activities.length], ['Diagnoses recorded', diagnoses.length], ['Diagnoses needing review', diagnoses.filter((item) => item.lowConfidence).length]].forEach((values, index) => {
      summary.getRow(index + 4).values = values;
    });
    for (let rowNumber = 4; rowNumber <= 7; rowNumber += 1) {
      for (let columnNumber = 1; columnNumber <= 2; columnNumber += 1) {
        const cell = summary.getRow(rowNumber).getCell(columnNumber);
        cell.border = { top: { style: 'thin', color: { argb: 'FFD8E1D4' } }, left: { style: 'thin', color: { argb: 'FFD8E1D4' } }, bottom: { style: 'thin', color: { argb: 'FFD8E1D4' } }, right: { style: 'thin', color: { argb: 'FFD8E1D4' } } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${rowNumber === 4 ? BRAND_GREEN : LIGHT_GREEN}` } };
        if (rowNumber === 4) cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }
    summary.getColumn('A').width = 30;
    summary.getColumn('B').width = 16;
    summary.getColumn('C').width = 16;
    summary.getColumn('D').width = 16;

    const activitySheet = workbook.addWorksheet('Activity Log', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
    activitySheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Activity', key: 'activity', width: 16 },
      { header: 'Crop', key: 'crop', width: 20 },
      { header: 'Notes', key: 'notes', width: 64 },
      { header: 'Recorded at', key: 'recordedAt', width: 21 },
    ];
    activities.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((item) => {
      activitySheet.addRow({ date: asDate(item.activityDate), activity: activityLabels[item.type] || item.type, crop: item.crop || '', notes: item.notes || '', recordedAt: new Date(item.createdAt) });
    });
    styleTable(activitySheet, 'E', activities.length + 1);
    activitySheet.getColumn('date').numFmt = 'yyyy-mm-dd';
    activitySheet.getColumn('recordedAt').numFmt = 'yyyy-mm-dd hh:mm';
    activitySheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    activitySheet.eachRow((row) => { row.alignment = { vertical: 'top' }; });

    const diagnosisSheet = workbook.addWorksheet('Diagnosis History', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
    diagnosisSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Diagnosis', key: 'disease', width: 28 },
      { header: 'Confidence', key: 'confidence', width: 14 },
      { header: 'Assessment', key: 'assessment', width: 24 },
      { header: 'Treatment guidance', key: 'recommendation', width: 68 },
      { header: 'Photo saved', key: 'photoSaved', width: 14 },
    ];
    diagnoses.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((item) => {
      diagnosisSheet.addRow({ date: new Date(item.createdAt), disease: item.disease, confidence: item.confidence || 0, assessment: item.lowConfidence ? 'Needs a closer look' : 'Likely diagnosis', recommendation: item.recommendation || '', photoSaved: item.photoUrl ? 'Yes' : 'No' });
    });
    styleTable(diagnosisSheet, 'F', diagnoses.length + 1);
    diagnosisSheet.getColumn('date').numFmt = 'yyyy-mm-dd';
    diagnosisSheet.getColumn('confidence').numFmt = '0%';
    diagnosisSheet.getColumn('recommendation').alignment = { wrapText: true, vertical: 'top' };
    diagnosisSheet.getColumn('assessment').alignment = { wrapText: true, vertical: 'top' };
    diagnosisSheet.eachRow((row) => { row.alignment = { vertical: 'top' }; });
    if (diagnoses.length) {
      diagnosisSheet.addConditionalFormatting({
        ref: `D2:D${diagnoses.length + 1}`,
        rules: [{ type: 'containsText', operator: 'containsText', text: 'Needs a closer look', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${WARNING_FILL}` } }, font: { color: { argb: 'FF7F6000' } } } }],
      });
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="agro-botsa-field-records.xlsx"',
    });
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export failed:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Could not create the Excel workbook' });
  }
});

export default router;
