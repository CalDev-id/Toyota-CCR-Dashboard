import type {
  ProductionAchievementCard,
  ProductionAchievementDashboard,
  ProductionAchievementProblem,
} from "@/features/production-achievement/types";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public/template_production_achievement.xlsx",
);

type CfbContainer = ReturnType<typeof XLSX.CFB.read>;

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getXml(container: CfbContainer, filePath: string) {
  const entry = XLSX.CFB.find(container, filePath);
  if (!entry?.content) throw new Error(`Missing workbook entry: ${filePath}`);
  return Buffer.from(entry.content).toString("utf8");
}

function setXml(container: CfbContainer, filePath: string, xml: string) {
  const entry = XLSX.CFB.find(container, filePath);
  if (!entry) throw new Error(`Missing workbook entry: ${filePath}`);
  entry.content = Buffer.from(xml, "utf8");
  entry.size = entry.content.length;
}

function rowPattern(row: number) {
  return new RegExp(`<row\\b[^>]*?\\br="${row}"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/row>)`);
}

function getRow(xml: string, row: number) {
  const value = xml.match(rowPattern(row))?.[0];
  if (!value) throw new Error(`Missing template row ${row}`);
  return value;
}

function replaceRow(xml: string, row: number, nextRow: string) {
  const pattern = rowPattern(row);
  if (pattern.test(xml)) return xml.replace(pattern, nextRow);
  return xml.replace("</sheetData>", `${nextRow}</sheetData>`);
}

function moveRow(templateRow: string, from: number, to: number) {
  return templateRow
    .replace(new RegExp(`r="${from}"`, "g"), `r="${to}"`)
    .replace(new RegExp(`([A-Z]+)${from}(?=["<])`, "g"), `$1${to}`);
}

function cellStyle(rowXml: string, address: string) {
  const match = rowXml.match(new RegExp(`<c\\b[^>]*\\br="${address}"[^>]*>`));
  return match?.[0].match(/\bs="(\d+)"/)?.[1];
}

function cellXml(
  rowXml: string,
  address: string,
  value: string | number | null,
  formula?: string,
) {
  const style = cellStyle(rowXml, address);
  const styleAttribute = style ? ` s="${style}"` : "";
  if (value === null) return `<c r="${address}"${styleAttribute}/>`;
  if (typeof value === "number") {
    const formulaXml = formula ? `<f>${xmlEscape(formula)}</f>` : "";
    return `<c r="${address}"${styleAttribute}>${formulaXml}<v>${Number.isFinite(value) ? value : 0}</v></c>`;
  }
  if (formula) {
    return `<c r="${address}"${styleAttribute} t="str"><f>${xmlEscape(formula)}</f><v>${xmlEscape(value)}</v></c>`;
  }
  return `<c r="${address}"${styleAttribute} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function setCell(
  rowXml: string,
  address: string,
  value: string | number | null,
  formula?: string,
) {
  const nextCell = cellXml(rowXml, address, value, formula);
  const pattern = new RegExp(`<c\\b[^>]*?\\br="${address}"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
  if (pattern.test(rowXml)) return rowXml.replace(pattern, nextCell);
  return rowXml.replace(/<\/row>$/, `${nextCell}</row>`);
}

function clearRow(rowXml: string) {
  const rowTag = rowXml.match(/^<row\b[^>]*>/)?.[0];
  return rowTag ? `${rowTag}</row>` : rowXml;
}

function normalizePercent(value: number | null) {
  if (value === null) return null;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatExportedAt(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function status(card: ProductionAchievementCard) {
  const actual = normalizePercent(card.oee);
  const target = normalizePercent(card.oeeTarget);
  return actual !== null && target !== null && actual >= target
    ? "ON TARGET"
    : "BELOW TARGET";
}

function problemOrder(type: ProductionAchievementProblem["type"]) {
  return type === "AV" ? 0 : type === "PE" ? 1 : 2;
}

function sortedProblems(cards: ProductionAchievementCard[]) {
  return cards
    .flatMap((card, lineIndex) =>
      card.problems.map((problem) => ({ ...problem, line: card.label, lineIndex })),
    )
    .sort(
      (a, b) =>
        problemOrder(a.type) - problemOrder(b.type) ||
        a.lineIndex - b.lineIndex ||
        b.value - a.value ||
        a.label.localeCompare(b.label),
    );
}

function updateDimension(xml: string, lastColumn: string, lastRow: number) {
  return xml.replace(/<dimension ref="[^"]+"\/>/, `<dimension ref="A1:${lastColumn}${lastRow}"/>`);
}

function updateProblemMerges(xml: string, problemCount: number) {
  const block = xml.match(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/)?.[0];
  if (!block) return xml;
  const retained = [...block.matchAll(/<mergeCell ref="([^"]+)"\/>/g)]
    .map((match) => match[1])
    .filter((range) => {
      const rows = [...range.matchAll(/\d+/g)].map((match) => Number(match[0]));
      return rows.every((row) => row < 29);
    });
  const problemMerges = Array.from({ length: problemCount }, (_, index) => {
    const row = 29 + index;
    return [`A${row}:C${row}`, `D${row}:K${row}`, `L${row}:M${row}`, `N${row}:O${row}`];
  }).flat();
  const merges = [...retained, ...problemMerges];
  const next = `<mergeCells count="${merges.length}">${merges
    .map((range) => `<mergeCell ref="${range}"/>`)
    .join("")}</mergeCells>`;
  return xml.replace(block, next);
}

function removeMergesFromRow(xml: string, firstRow: number) {
  const block = xml.match(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/)?.[0];
  if (!block) return xml;
  const retained = [...block.matchAll(/<mergeCell ref="([^"]+)"\/>/g)]
    .map((match) => match[1])
    .filter((range) => {
      const rows = [...range.matchAll(/\d+/g)].map((match) => Number(match[0]));
      return rows.every((row) => row < firstRow);
    });
  const next = `<mergeCells count="${retained.length}">${retained
    .map((range) => `<mergeCell ref="${range}"/>`)
    .join("")}</mergeCells>`;
  return xml.replace(block, next);
}

function populateDataSheet(
  xml: string,
  dashboard: ProductionAchievementDashboard,
  problems: ReturnType<typeof sortedProblems>,
) {
  let next = xml;
  const metadata = getRow(next, 3);
  let metadataRow = setCell(metadata, "B3", formatReportDate(dashboard.date));
  metadataRow = setCell(metadataRow, "D3", dashboard.shift === "NIGHT" ? "Night" : "Day");
  metadataRow = setCell(metadataRow, "F3", formatExportedAt(new Date()));
  next = replaceRow(next, 3, metadataRow);

  dashboard.cards.forEach((card, index) => {
    const rowNumber = 7 + index;
    let row = getRow(next, rowNumber);
    const achievement = card.prodPlan ? card.prodAct / card.prodPlan : 0;
    const cardStatus = status(card);
    row = setCell(row, `A${rowNumber}`, card.label);
    row = setCell(row, `B${rowNumber}`, card.prodPlan);
    row = setCell(row, `C${rowNumber}`, card.prodAct);
    row = setCell(row, `D${rowNumber}`, card.balance, `C${rowNumber}-B${rowNumber}`);
    row = setCell(row, `E${rowNumber}`, achievement, `IFERROR(C${rowNumber}/B${rowNumber},0)`);
    row = setCell(row, `F${rowNumber}`, normalizePercent(card.oee));
    row = setCell(row, `G${rowNumber}`, normalizePercent(card.oeeTarget));
    row = setCell(row, `H${rowNumber}`, numberValue(card.ttAct));
    row = setCell(row, `I${rowNumber}`, numberValue(card.ttPlan));
    row = setCell(row, `J${rowNumber}`, card.otAct);
    row = setCell(row, `K${rowNumber}`, card.otPlan);
    row = setCell(row, `L${rowNumber}`, card.stopTime);
    row = setCell(row, `M${rowNumber}`, cardStatus, `IF(F${rowNumber}>=G${rowNumber},"ON TARGET","BELOW TARGET")`);
    next = replaceRow(next, rowNumber, row);
  });

  const variantRows: Record<ProductionAchievementCard["key"], number[]> = {
    assy: [16, 17],
    cylblock: [18, 19],
    cylhead: [20, 21],
    crankshaft: [22, 23],
    camshaft: [24, 25],
  };
  for (const card of dashboard.cards) {
    variantRows[card.key].forEach((rowNumber, index) => {
      const variant = card.variants[index];
      let row = getRow(next, rowNumber);
      row = setCell(row, `A${rowNumber}`, variant ? card.label : null);
      row = setCell(row, `B${rowNumber}`, variant?.name ?? null);
      row = setCell(row, `C${rowNumber}`, variant?.prodPlan ?? null);
      row = setCell(row, `D${rowNumber}`, variant?.prodAct ?? null);
      row = setCell(row, `E${rowNumber}`, variant?.balance ?? null, `D${rowNumber}-C${rowNumber}`);
      row = setCell(
        row,
        `F${rowNumber}`,
        variant?.prodPlan ? variant.prodAct / variant.prodPlan : 0,
        `IFERROR(D${rowNumber}/C${rowNumber},0)`,
      );
      next = replaceRow(next, rowNumber, row);
    });
  }

  const templateProblemRow = getRow(next, 30);
  const rowsToClear = Math.max(9, problems.length);
  for (let index = 0; index < rowsToClear; index += 1) {
    const rowNumber = 30 + index;
    let row = moveRow(templateProblemRow, 30, rowNumber);
    const problem = problems[index];
    if (problem) {
      row = setCell(row, `A${rowNumber}`, problem.type ?? "");
      row = setCell(row, `B${rowNumber}`, problem.line);
      row = setCell(row, `C${rowNumber}`, problem.label);
      row = setCell(row, `D${rowNumber}`, problem.value);
      row = setCell(row, `E${rowNumber}`, "");
    } else {
      row = clearRow(row);
    }
    next = replaceRow(next, rowNumber, row);
  }

  const lastRow = Math.max(1000, 29 + problems.length);
  next = removeMergesFromRow(next, 30);
  next = updateDimension(next, "M", lastRow);
  return next;
}

function populateReportProblems(
  xml: string,
  problems: ReturnType<typeof sortedProblems>,
) {
  let next = xml;
  const templateProblemRow = getRow(next, 29);
  const rowsToClear = Math.max(9, problems.length);
  for (let index = 0; index < rowsToClear; index += 1) {
    const rowNumber = 29 + index;
    let row = moveRow(templateProblemRow, 29, rowNumber);
    const problem = problems[index];
    if (problem) {
      const dataRow = 30 + index;
      row = setCell(row, `A${rowNumber}`, problem.line, `Data!B${dataRow}`);
      row = setCell(row, `D${rowNumber}`, problem.label, `Data!C${dataRow}`);
      row = setCell(row, `L${rowNumber}`, problem.value, `Data!D${dataRow}`);
      row = setCell(row, `N${rowNumber}`, problem.type ?? "", `Data!A${dataRow}`);
    } else {
      row = clearRow(row);
    }
    next = replaceRow(next, rowNumber, row);
  }
  next = updateProblemMerges(next, problems.length);
  const lastRow = Math.max(996, 28 + problems.length);
  next = updateDimension(next, "O", lastRow);
  return next;
}

function setTableRange(xml: string, range: string) {
  return xml.replace(/\bref="[^"]+"/, `ref="${range}"`);
}

function enableRecalculation(xml: string) {
  const calc = '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>';
  if (/<calcPr\b[^>]*\/>/.test(xml)) return xml.replace(/<calcPr\b[^>]*\/>/, calc);
  return xml.replace("</workbook>", `${calc}</workbook>`);
}

export async function createProductionAchievementWorkbook(
  dashboard: ProductionAchievementDashboard,
) {
  const template = await fs.readFile(TEMPLATE_PATH);
  const container = XLSX.CFB.read(template, { type: "buffer" });
  const problems = sortedProblems(dashboard.cards);

  const reportXml = populateReportProblems(
    getXml(container, "/xl/worksheets/sheet1.xml"),
    problems,
  );
  const dataXml = populateDataSheet(
    getXml(container, "/xl/worksheets/sheet2.xml"),
    dashboard,
    problems,
  );
  setXml(container, "/xl/worksheets/sheet1.xml", reportXml);
  setXml(container, "/xl/worksheets/sheet2.xml", dataXml);
  setXml(
    container,
    "/xl/tables/table3.xml",
    setTableRange(
      getXml(container, "/xl/tables/table3.xml"),
      `A29:E${Math.max(29, 29 + problems.length)}`,
    ),
  );
  setXml(
    container,
    "/xl/workbook.xml",
    enableRecalculation(getXml(container, "/xl/workbook.xml")),
  );

  return XLSX.CFB.write(container, {
    type: "buffer",
    fileType: "zip",
    compression: true,
  });
}

function variantFor(card: ProductionAchievementCard, variantName: "1TR" | "2TR") {
  const aliases = card.key === "camshaft"
    ? variantName === "1TR" ? ["1TR", "IN"] : ["2TR", "EX"]
    : [variantName];
  return card.variants.find((variant) =>
    aliases.includes(variant.name.trim().toUpperCase()),
  );
}

function cleanProblems(cards: ProductionAchievementCard[]) {
  return cards
    .flatMap((card, lineIndex) =>
      card.problems.map((problem) => ({ ...problem, line: card.label, lineIndex })),
    )
    .sort(
      (a, b) =>
        a.lineIndex - b.lineIndex ||
        problemOrder(a.type) - problemOrder(b.type) ||
        b.value - a.value ||
        a.label.localeCompare(b.label),
    );
}

export function createProductionAchievementDataWorkbook(
  dashboard: ProductionAchievementDashboard,
) {
  const summaryHeaders = [
    "Report Date", "Shift", "Line",
    "1TR Plan", "1TR Actual", "1TR Balance",
    "2TR Plan", "2TR Actual", "2TR Balance",
    "Total Plan", "Total Actual", "Total Balance",
    "OEE Actual (%)", "OEE Target (%)",
    "TT Actual", "TT Plan", "OT Actual (min)", "OT Plan (min)",
    "Stop Time (min)", "Status",
  ];
  const summaryRows = dashboard.cards.map((card) => {
    const oneTr = variantFor(card, "1TR");
    const twoTr = variantFor(card, "2TR");
    return [
      dashboard.date,
      dashboard.shift === "NIGHT" ? "Night" : "Day",
      card.label,
      oneTr?.prodPlan ?? null,
      oneTr?.prodAct ?? null,
      oneTr?.balance ?? null,
      twoTr?.prodPlan ?? null,
      twoTr?.prodAct ?? null,
      twoTr?.balance ?? null,
      card.prodPlan,
      card.prodAct,
      card.balance,
      normalizePercent(card.oee) === null ? null : normalizePercent(card.oee)! * 100,
      normalizePercent(card.oeeTarget) === null ? null : normalizePercent(card.oeeTarget)! * 100,
      card.ttAct,
      card.ttPlan,
      card.otAct,
      card.otPlan,
      card.stopTime,
      status(card),
    ];
  });

  const problemHeaders = [
    "Report Date", "Shift", "Line", "Problem", "Category", "Duration (min)",
  ];
  const problemRows = cleanProblems(dashboard.cards).map((problem) => [
    dashboard.date,
    dashboard.shift === "NIGHT" ? "Night" : "Day",
    problem.line,
    problem.label,
    problem.type ?? "",
    problem.value,
  ]);

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  const problemsSheet = XLSX.utils.aoa_to_sheet([problemHeaders, ...problemRows]);
  summarySheet["!autofilter"] = { ref: `A1:T${summaryRows.length + 1}` };
  problemsSheet["!autofilter"] = { ref: `A1:F${Math.max(1, problemRows.length + 1)}` };
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, problemsSheet, "Problems");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
}

type MonthlySummary = {
  line: string;
  oneTrPlan: number;
  oneTrActual: number;
  twoTrPlan: number;
  twoTrActual: number;
  totalPlan: number;
  totalActual: number;
  oeeActualWeight: number;
  oeeTargetWeight: number;
  oeeWeight: number;
  ttActualWeight: number;
  ttPlanWeight: number;
  ttWeight: number;
  otPlan: number;
  otActual: number;
  stopTime: number;
};

function emptyMonthlySummary(line: string): MonthlySummary {
  return {
    line,
    oneTrPlan: 0,
    oneTrActual: 0,
    twoTrPlan: 0,
    twoTrActual: 0,
    totalPlan: 0,
    totalActual: 0,
    oeeActualWeight: 0,
    oeeTargetWeight: 0,
    oeeWeight: 0,
    ttActualWeight: 0,
    ttPlanWeight: 0,
    ttWeight: 0,
    otPlan: 0,
    otActual: 0,
    stopTime: 0,
  };
}

function monthlySummaryRow(summary: MonthlySummary) {
  const weight = summary.oeeWeight;
  const ttWeight = summary.ttWeight;
  const oeeActual = weight ? (summary.oeeActualWeight / weight) * 100 : null;
  const oeeTarget = weight ? (summary.oeeTargetWeight / weight) * 100 : null;
  return [
    summary.line,
    summary.oneTrPlan,
    summary.oneTrActual,
    summary.oneTrActual - summary.oneTrPlan,
    summary.twoTrPlan,
    summary.twoTrActual,
    summary.twoTrActual - summary.twoTrPlan,
    summary.totalPlan,
    summary.totalActual,
    summary.totalActual - summary.totalPlan,
    oeeTarget,
    oeeActual,
    ttWeight ? summary.ttPlanWeight / ttWeight : null,
    ttWeight ? summary.ttActualWeight / ttWeight : null,
    summary.otPlan,
    summary.otActual,
    summary.stopTime,
    oeeActual !== null && oeeTarget !== null && oeeActual >= oeeTarget ? "O" : "X",
  ];
}

const monthlyStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="8">
    <font><sz val="11"/><color rgb="FF101828"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF101828"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF027A48"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFB42318"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="20"/><color rgb="FF101828"/><name val="Aptos Display"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF101828"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF344054"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEB0A1E"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAECF0"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="5">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="thin"><color rgb="FFD0D5DD"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="medium"><color rgb="FFEB0A1E"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border>
    <border><left/><right/><top/><bottom style="medium"><color rgb="FFEB0A1E"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="medium"><color rgb="FF101828"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="8" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="8" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium9"/>
</styleSheet>`;

function applyCellStyle(xml: string, address: string, style: number) {
  const pattern = new RegExp(`<c r="${address}"([^>]*)>`);
  if (pattern.test(xml)) {
    return xml.replace(pattern, (_, attributes: string) =>
      `<c r="${address}"${attributes.replace(/\s+s="\d+"/, "")} s="${style}">`,
    );
  }

  const row = address.match(/\d+$/)?.[0];
  if (!row) return xml;
  const cell = `<c r="${address}" s="${style}"/>`;
  const rowPattern = new RegExp(`(<row r="${row}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
  if (rowPattern.test(xml)) return xml.replace(rowPattern, `$1$2${cell}$3`);
  return xml.replace(new RegExp(`<row r="${row}"([^>]*)\\/>`), `<row r="${row}"$1>${cell}</row>`);
}

function applyRowStyle(xml: string, row: number, lastColumn: string, style: number) {
  const columns = XLSX.utils.decode_range(`A1:${lastColumn}1`).e.c;
  return Array.from({ length: columns + 1 }, (_, column) =>
    XLSX.utils.encode_cell({ r: row - 1, c: column }),
  ).reduce((next, address) => applyCellStyle(next, address, style), xml);
}

function setRowHeight(xml: string, row: number, height: number) {
  const pattern = new RegExp(`<row r="${row}"([^>]*)>`);
  return xml.replace(pattern, (_, attributes: string) =>
    `<row r="${row}"${attributes.replace(/\s+(?:ht|customHeight)="[^"]*"/g, "")} ht="${height}" customHeight="1">`,
  );
}

function applyMonthlyStyles(
  workbook: Buffer,
  detailShifts: string[],
  detailStatuses: string[],
  summaryStatuses: string[],
) {
  const container = XLSX.CFB.read(workbook, { type: "buffer" });
  let sheetXml = getXml(container, "/xl/worksheets/sheet1.xml");
  const summaryTitleRow = 4;
  const summaryHeaderRow = 5;
  const summaryDataStartRow = 6;
  const breakdownTitleRow = summaryDataStartRow + summaryStatuses.length + 1;
  const breakdownHeaderRow = breakdownTitleRow + 1;
  const breakdownDataStartRow = breakdownHeaderRow + 1;
  sheetXml = applyCellStyle(sheetXml, "A1", 2);
  sheetXml = applyRowStyle(sheetXml, summaryTitleRow, "R", 3);
  sheetXml = setRowHeight(sheetXml, summaryTitleRow, 24);
  sheetXml = applyRowStyle(sheetXml, summaryHeaderRow, "R", 1);
  detailShifts.forEach((shift, index) => {
    sheetXml = applyRowStyle(sheetXml, breakdownDataStartRow + index, "T", shift === "DAY" ? 6 : 7);
  });
  detailStatuses.forEach((value, index) => {
    sheetXml = applyCellStyle(sheetXml, `T${breakdownDataStartRow + index}`, value === "O" ? 4 : 5);
  });
  summaryStatuses.forEach((_, index) => {
    const row = summaryDataStartRow + index;
    sheetXml = applyRowStyle(sheetXml, row, "R", index === summaryStatuses.length - 1 ? 8 : index % 2 === 0 ? 6 : 7);
  });
  summaryStatuses.forEach((value, index) => {
    sheetXml = applyCellStyle(
      sheetXml,
      `R${summaryDataStartRow + index}`,
      value === "O" ? 4 : 5,
    );
  });
  sheetXml = setRowHeight(sheetXml, summaryDataStartRow + summaryStatuses.length - 1, 24);
  sheetXml = applyRowStyle(sheetXml, breakdownTitleRow, "T", 3);
  sheetXml = setRowHeight(sheetXml, breakdownTitleRow, 24);
  sheetXml = applyRowStyle(sheetXml, breakdownHeaderRow, "T", 1);
  const merges = `<mergeCells count="4"><mergeCell ref="A1:T1"/><mergeCell ref="A2:T2"/><mergeCell ref="A${summaryTitleRow}:R${summaryTitleRow}"/><mergeCell ref="A${breakdownTitleRow}:T${breakdownTitleRow}"/></mergeCells>`;
  sheetXml = /<autoFilter\b[^>]*\/>/.test(sheetXml)
    ? sheetXml.replace(/(<autoFilter\b[^>]*\/>)/, `$1${merges}`)
    : sheetXml.replace("</sheetData>", `</sheetData>${merges}`);
  setXml(container, "/xl/worksheets/sheet1.xml", sheetXml);
  setXml(container, "/xl/styles.xml", monthlyStylesXml);
  return XLSX.CFB.write(container, {
    type: "buffer",
    fileType: "zip",
    compression: true,
  });
}

export function createProductionAchievementMonthlyWorkbook(
  dashboards: ProductionAchievementDashboard[],
) {
  const detailHeaders = [
    "Date", "Shift", "Line",
    "1TR Plan", "1TR Actual", "1TR Balance",
    "2TR Plan", "2TR Actual", "2TR Balance",
    "Total Plan", "Total Actual", "Total Balance",
    "OEE Target (%)", "OEE Actual (%)",
    "TT Plan", "TT Actual", "OT Plan (min)", "OT Actual (min)",
    "Stop Time (min)", "Status",
  ];
  const summaries = new Map<string, MonthlySummary>();
  const detailStatuses: string[] = [];
  const detailShifts: string[] = [];
  const detailRows = dashboards.flatMap((dashboard) => dashboard.cards.map((card) => {
    const oneTr = variantFor(card, "1TR");
    const twoTr = variantFor(card, "2TR");
    const oeeActual = normalizePercent(card.oee);
    const oeeTarget = normalizePercent(card.oeeTarget);
    const ttActual = numberValue(card.ttAct);
    const ttPlan = numberValue(card.ttPlan);
    const weight = card.prodPlan > 0 ? card.prodPlan : 0;
    const summary = summaries.get(card.label) ?? emptyMonthlySummary(card.label);
    summary.oneTrPlan += oneTr?.prodPlan ?? 0;
    summary.oneTrActual += oneTr?.prodAct ?? 0;
    summary.twoTrPlan += twoTr?.prodPlan ?? 0;
    summary.twoTrActual += twoTr?.prodAct ?? 0;
    summary.totalPlan += card.prodPlan;
    summary.totalActual += card.prodAct;
    if (oeeActual !== null && oeeTarget !== null && weight > 0) {
      summary.oeeActualWeight += oeeActual * weight;
      summary.oeeTargetWeight += oeeTarget * weight;
      summary.oeeWeight += weight;
    }
    if (ttActual !== null && ttPlan !== null && weight > 0) {
      summary.ttActualWeight += ttActual * weight;
      summary.ttPlanWeight += ttPlan * weight;
      summary.ttWeight += weight;
    }
    summary.otPlan += card.otPlan;
    summary.otActual += card.otAct;
    summary.stopTime += card.stopTime;
    summaries.set(card.label, summary);

    const cardStatus = status(card) === "ON TARGET" ? "O" : "X";
    detailStatuses.push(cardStatus);
    detailShifts.push(dashboard.shift);
    return [
      dashboard.date,
      dashboard.shift === "NIGHT" ? "Night" : "Day",
      card.label,
      oneTr?.prodPlan ?? null,
      oneTr?.prodAct ?? null,
      oneTr?.balance ?? null,
      twoTr?.prodPlan ?? null,
      twoTr?.prodAct ?? null,
      twoTr?.balance ?? null,
      card.prodPlan,
      card.prodAct,
      card.balance,
      oeeTarget === null ? null : oeeTarget * 100,
      oeeActual === null ? null : oeeActual * 100,
      ttPlan,
      ttActual,
      card.otPlan,
      card.otAct,
      card.stopTime,
      cardStatus,
    ];
  }));

  const summaryHeaders = detailHeaders.slice(2);
  const summaryRows = Array.from(summaries.values()).map(monthlySummaryRow);
  const grandTotal = emptyMonthlySummary("Total/Average");
  for (const summary of summaries.values()) {
    for (const key of Object.keys(grandTotal) as Array<keyof MonthlySummary>) {
      if (key !== "line") grandTotal[key] += summary[key] as number;
    }
  }
  summaryRows.push(monthlySummaryRow(grandTotal));

  const sheet = XLSX.utils.aoa_to_sheet([
    ["PRODUCTION ACHIEVEMENT"],
    [`Period: ${formatReportDate(dashboards[0]?.date ?? "")} - ${formatReportDate(dashboards.at(-1)?.date ?? "")}`],
    [],
    ["PRODUCTION SUMMARY"],
    summaryHeaders,
    ...summaryRows,
    [],
    ["PRODUCTION BREAKDOWN"],
    detailHeaders,
    ...detailRows,
  ]);
  const breakdownHeaderRow = summaryRows.length + 8;
  sheet["!autofilter"] = { ref: `A${breakdownHeaderRow}:T${breakdownHeaderRow + detailRows.length}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Monthly Summary");
  const summaryStatuses = summaryRows.map((row) => String(row.at(-1) ?? ""));
  const output = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
  return applyMonthlyStyles(output, detailShifts, detailStatuses, summaryStatuses);
}
