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

/*
 * OTHERS carries a service name, not just a count, so it is wider than the
 * other document columns — but only wide enough for the usual short labels
 * ("CLEARANCE - 2"). Anything longer wraps instead of stretching the sheet.
 */
const OTHERS_WIDTH = 14;

function addCampusHeader(
  sheet: ExcelJS.Worksheet,
  columnCount: number,
  rowNumber: number = 1
) {
  sheet.mergeCells(rowNumber, 1, rowNumber, columnCount);

  const cell = sheet.getCell(rowNumber, 1);
  cell.value = ` ${CAMPUS_HEADER} `;
  cell.font = {
    bold: true,
    size: 12,
    color: { argb: 'FFFFFFFF' },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: 'left',
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: ORANGE },
  };

  for (let col = 1; col <= columnCount; col++) {
    sheet.getCell(rowNumber, col).border = thin;
  }

  sheet.getRow(rowNumber).height = 22;
}

function addArtaHeader(sheet: ExcelJS.Worksheet, columnCount: number) {
  sheet.mergeCells(1, 1, 1, columnCount);
  sheet.mergeCells(3, 1, 3, columnCount);

  const titleCell = sheet.getCell(1, 1);
  titleCell.value = {
    richText: [
      {
        text: 'Government Office Name: ',
        font: { bold: true },
      },
      {
        text: 'Bicol University Polangui.',
        font: { bold: true, underline: true },
      },
    ],
  };
  titleCell.alignment = {
    vertical: 'middle',
    horizontal: 'left',
  };

  const noteCell = sheet.getCell(3, 1);
  noteCell.value = {
    richText: [
      {
        text: 'Note: ',
        font: { bold: true },
      },
      {
        text: 'Clients included in this list have completed its availed service.',
      },
    ],
  };
  noteCell.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    wrapText: true,
  };

  sheet.getRow(1).height = 22;
  sheet.getRow(3).height = 22;
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

/* The service a row availed outside the named columns, e.g. "LOA - 1". */
function othersCell(r: BupReportRow) {
  const label = r.othersLabel?.trim();

  return label && r.OTHERS > 0 ? `${label} - ${r.OTHERS}` : '';
}

/*
 * Every other service across the period, each with its own total, so the
 * column reconciles with the rows above it. Labels are free text, so they
 * are grouped case-insensitively under the first spelling seen.
 */
function buildOthersTotal(rows: BupReportRow[]) {
  const counts = new Map<string, { label: string; count: number }>();

  rows.forEach((r) => {
    const label = r.othersLabel?.trim();

    if (!label || r.OTHERS <= 0) return;

    const key = label.toLowerCase();
    const entry = counts.get(key);

    if (entry) {
      entry.count += r.OTHERS;
    } else {
      counts.set(key, { label, count: r.OTHERS });
    }
  });

  return Array.from(counts.values())
    .map(({ label, count }) => `${label} - ${count}`)
    .join('\n');
}

export async function buildArtaWorkbook(rows: ArtaReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ARTA Logbook');

  const headers = [
    '#',
    'External Client Name',
    'Service Availed',
    'Client Contact',
    'Client Contact Info (Email Address)',
    'Day of Service Completion',
    'Signature',
  ];

  sheet.columns = [
    { width: 6 },
    { width: 32 },
    { width: 34 },
    { width: 18 },
    { width: 42 },
    { width: 28 },
    { width: 22 },
  ];

  addArtaHeader(sheet, headers.length);

  // Leave one blank row after the ARTA information header.
  const headerRow = sheet.getRow(5);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });
  headerRow.height = 30;

  rows.forEach((r, i) => {
    const row = sheet.addRow([
      i + 1,
      r.clientName,
      r.requestedDocuments,
      r.contactNumber || 'NONE',
      r.email,
      r.transactionDate,
      '',
    ]);

    // Tall enough for the signature image below.
    row.height = 42;
    styleBodyRow(row, headers.length);
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

    // Signatures are transparent PNGs from the tablet canvas.
    if (r.signature?.startsWith('data:image/png;base64,')) {
      const imageId = workbook.addImage({
        base64: r.signature,
        extension: 'png',
      });

      sheet.addImage(imageId, {
        tl: { col: 6.05, row: row.number - 1 + 0.05 },
        ext: { width: 150, height: 50 },
        editAs: 'oneCell',
      });
    }
  });

  sheet.views = [{ state: 'frozen', ySplit: 5 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildBupWorkbook(rows: BupReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BUP Logbook');

  // A..E, F..K (documents), L..P
  const leading = ['No.', 'Date', 'Name', 'Sex (M/F)', 'Course & Year Level'];
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
    { width: 6 },
    { width: 12 },
    { width: 30 },
    { width: 8 },
    { width: 16 },
    ...DOC_COLUMNS.map((d) => ({
      width: d === 'OTHERS' ? OTHERS_WIDTH : 8,
    })),
    { width: 24 },
    { width: 24 },
    { width: 14 },
    { width: 24 },
    { width: 22 },
  ];

  sheet.insertRow(1, []);
  addCampusHeader(sheet, columnCount, 2);

  // Two-row header: documents get a group title with sub-columns.
  const top = sheet.getRow(4);
  const sub = sheet.getRow(5);

  leading.forEach((h, i) => {
    top.getCell(i + 1).value = h;
    sheet.mergeCells(4, i + 1, 5, i + 1);
  });

  top.getCell(docStart).value = 'Requested Documents/Services';
  sheet.mergeCells(4, docStart, 4, docEnd);
  DOC_COLUMNS.forEach((d, i) => {
    sub.getCell(docStart + i).value = d;
  });

  trailing.forEach((h, i) => {
    const col = docEnd + 1 + i;
    top.getCell(col).value = h;
    sheet.mergeCells(4, col, 5, col);
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

  const othersTotal = buildOthersTotal(rows);

  rows.forEach((r, i) => {
    const row = sheet.addRow([
      i + 1,
      r.date,
      r.name,
      r.sex,
      r.courseYear,
      ...DOC_COLUMNS.map((d) => (d === 'OTHERS' ? othersCell(r) : r[d] || '')),
      nameWithDate(r.preparedBy),
      nameWithDate(r.reviewedBy),
      r.duration,
      nameWithDate(r.releasedTo),
      '',
    ]);

    row.height = 42;
    styleBodyRow(row, columnCount);

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    for (let col = docStart; col <= docEnd; col++) {
      row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
    }
    row.getCell(docEnd + 3).alignment = { vertical: 'middle', horizontal: 'center' };

    // OTHERS reads as text, so it is left-aligned like the TOTAL row's.
    row.getCell(docEnd).alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true,
    };

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
  });

  // The label spans the leading columns, so pad the rest of them.
  const totalRow = sheet.addRow([
    'TOTAL',
    ...leading.slice(1).map(() => ''),
    ...DOC_COLUMNS.map((d) => (d === 'OTHERS' ? othersTotal : totals[d])),
  ]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, leading.length);
  styleBodyRow(totalRow, columnCount);
  totalRow.font = { bold: true };
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };

  for (let col = docStart; col <= docEnd; col++) {
    totalRow.getCell(col).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  }

  totalRow.getCell(docEnd).alignment = {
    vertical: 'middle',
    horizontal: 'left',
    wrapText: true,
  };

  /*
   * One line per service, plus the lines a label too long for the column
   * wraps onto, so nothing in the breakdown is cut off.
   */
  const othersLines = othersTotal
    ? othersTotal
        .split('\n')
        .reduce(
          (lines, entry) => lines + Math.ceil(entry.length / OTHERS_WIDTH),
          0
        )
    : 1;

  totalRow.height = Math.max(30, 18 * othersLines);

  sheet.views = [{ state: 'frozen', ySplit: 5 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
