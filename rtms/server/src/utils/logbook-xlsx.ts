import ExcelJS from 'exceljs';
import type {
  ArtaReportRow,
  BupReportRow,
  NameDateTime,
} from '@rtams/shared';

const CAMPUS_HEADER = 'COLLEGE/CAMPUS: BICOL UNIVERSITY POLANGUI';
const ORANGE = 'FFF79646';
const HEADER_GRAY = 'FFF2F2F2';

const thin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const DOC_COLUMNS = ['COR', 'COG', 'GMC', 'AUTH', 'OTR', 'OTHERS'] as const;

function addCampusHeader(sheet: ExcelJS.Worksheet, columnCount: number) {
  sheet.mergeCells(1, 1, 1, columnCount);

  const cell = sheet.getCell(1, 1);
  cell.value = CAMPUS_HEADER;
  cell.font = { bold: true, size: 12 };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };

  for (let col = 1; col <= columnCount; col++) {
    sheet.getCell(1, col).border = thin;
  }

  sheet.getRow(1).height = 22;
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GRAY } };
  cell.border = thin;
}

function styleBodyRow(row: ExcelJS.Row, columnCount: number) {
  for (let col = 1; col <= columnCount; col++) {
    const cell = row.getCell(col);
    cell.border = thin;
    cell.alignment = { vertical: 'middle', wrapText: true, ...cell.alignment };
  }
}

function nameWithDate(value: NameDateTime) {
  return value.dateTime ? `${value.name}\n${value.dateTime}` : value.name;
}

export async function buildArtaWorkbook(rows: ArtaReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ARTA Logbook');

  const headers = [
    'External Client Name',
    'Requested Documents/Services',
    'University Email Address',
    'Contact Number',
    'Date of Transaction',
  ];

  sheet.columns = [
    { width: 32 },
    { width: 34 },
    { width: 34 },
    { width: 18 },
    { width: 20 },
  ];

  addCampusHeader(sheet, headers.length);

  const headerRow = sheet.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });
  headerRow.height = 30;

  for (const r of rows) {
    const row = sheet.addRow([
      r.clientName,
      r.requestedDocuments,
      r.email,
      r.contactNumber,
      r.transactionDate,
    ]);
    styleBodyRow(row, headers.length);
  }

  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildBupWorkbook(rows: BupReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BUP Logbook');

  // A..D, E..J (documents), K..O
  const leading = ['Date', 'Name', 'Sex (M/F)', 'Course & Year Level'];
  const trailing = [
    'Received/Prepared By',
    'Reviewed/Signed By',
    'Duration of Process',
    'Released To/Claimed By',
    'Signature',
  ];
  const docStart = leading.length + 1;
  const docEnd = leading.length + DOC_COLUMNS.length;
  const columnCount = docEnd + trailing.length;
  const signatureCol = columnCount;

  sheet.columns = [
    { width: 12 },
    { width: 30 },
    { width: 8 },
    { width: 16 },
    ...DOC_COLUMNS.map(() => ({ width: 8 })),
    { width: 24 },
    { width: 24 },
    { width: 14 },
    { width: 24 },
    { width: 22 },
  ];

  addCampusHeader(sheet, columnCount);

  // Two-row header: documents get a group title with sub-columns.
  const top = sheet.getRow(2);
  const sub = sheet.getRow(3);

  leading.forEach((h, i) => {
    top.getCell(i + 1).value = h;
    sheet.mergeCells(2, i + 1, 3, i + 1);
  });

  top.getCell(docStart).value = 'Requested Documents/Services';
  sheet.mergeCells(2, docStart, 2, docEnd);
  DOC_COLUMNS.forEach((d, i) => {
    sub.getCell(docStart + i).value = d;
  });

  trailing.forEach((h, i) => {
    const col = docEnd + 1 + i;
    top.getCell(col).value = h;
    sheet.mergeCells(2, col, 3, col);
  });

  for (let col = 1; col <= columnCount; col++) {
    styleHeaderCell(top.getCell(col));
    styleHeaderCell(sub.getCell(col));
  }
  top.height = 22;
  sub.height = 18;

  const totals = Object.fromEntries(DOC_COLUMNS.map((d) => [d, 0])) as Record<
    (typeof DOC_COLUMNS)[number],
    number
  >;

  for (const r of rows) {
    const row = sheet.addRow([
      r.date,
      r.name,
      r.sex,
      r.courseYear,
      ...DOC_COLUMNS.map((d) => r[d] || ''),
      nameWithDate(r.preparedBy),
      nameWithDate(r.reviewedBy),
      r.duration,
      nameWithDate(r.releasedTo),
      '',
    ]);

    row.height = 42;
    styleBodyRow(row, columnCount);

    for (let col = docStart; col <= docEnd; col++) {
      row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    if (r.othersLabel) {
      row.getCell(docEnd).note = r.othersLabel;
    }

    DOC_COLUMNS.forEach((d) => {
      totals[d] += r[d];
    });

    // Signatures are transparent PNGs from the tablet canvas.
    if (r.signature?.startsWith('data:image/png;base64,')) {
      const imageId = workbook.addImage({
        base64: r.signature,
        extension: 'png',
      });

      sheet.addImage(imageId, {
        tl: { col: signatureCol - 1 + 0.05, row: row.number - 1 + 0.05 },
        ext: { width: 150, height: 50 },
        editAs: 'oneCell',
      });
    }
  }

  const totalRow = sheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    ...DOC_COLUMNS.map((d) => totals[d]),
  ]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, leading.length);
  styleBodyRow(totalRow, columnCount);
  totalRow.font = { bold: true };
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
  for (let col = docStart; col <= docEnd; col++) {
    totalRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
  }

  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
