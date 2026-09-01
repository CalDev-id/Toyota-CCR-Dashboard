import "server-only";

import type { LinestopLineSummary } from "@/features/linestop-report/server/linestop-report";
import * as XLSX from "xlsx";

type Cfb = ReturnType<typeof XLSX.CFB.read>;
export const linestopWorkbookContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="20"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><sz val="10"/><name val="Arial"/></font><font><i/><sz val="11"/><color rgb="FF667085"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium9"/></styleSheet>`;

function getXml(book: Cfb, path: string) { const entry = XLSX.CFB.find(book, path); if (!entry?.content) throw new Error(`Missing workbook entry: ${path}`); return Buffer.from(entry.content).toString("utf8"); }
function setXml(book: Cfb, path: string, value: string) { const entry = XLSX.CFB.find(book, path); if (!entry) throw new Error(`Missing workbook entry: ${path}`); entry.content = Buffer.from(value); entry.size = entry.content.length; }
function addXml(book: Cfb, path: string, value: string) { XLSX.CFB.utils.cfb_add(book, path, Buffer.from(value)); }
function monthLabel(month: string) { const [year, number] = month.split("-"); return `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(number) - 1]} ${year}`; }

function setStyle(xml: string, address: string, style: number) {
  const cell = new RegExp(`(<c r="${address}")([^>]*)(/?>)`);
  if (cell.test(xml)) return xml.replace(cell, (_, start: string, attributes: string, end: string) => `${start}${attributes.replace(/\s+s="\d+"/, "")} s="${style}"${end}`);
  const row = Number(address.match(/\d+$/)?.[0]);
  const inserted = `<c r="${address}" s="${style}"/>`;
  return xml.replace(new RegExp(`(<row r="${row}"[^>]*>)([\\s\\S]*?)(</row>)`), (_, start: string, cells: string, end: string) => `${start}${cells}${inserted}${end}`);
}

function chartTitle(text: string, darkBackground = false) {
  const textStyle = darkBackground
    ? '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:highlight><a:srgbClr val="000000"/></a:highlight>'
    : "";
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr b="1">${textStyle}<a:latin typeface="Arial"/></a:rPr><a:t>${text}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title>`;
}

function chartXml(index: number, first: number, last: number, title: string) {
  const categoryAxisId = 1000 + index * 2;
  const valueAxisId = 1001 + index * 2;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart>${chartTitle(`PARETO PROBLEM ${title}`)}<c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Minutes</c:v></c:tx><c:cat><c:strRef><c:f>'Linestop Report'!$B$${first}:$B$${last}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>'Linestop Report'!$C$${first}:$C$${last}</c:f></c:numRef></c:val></c:ser><c:dLbls><c:showVal val="1"/></c:dLbls><c:axId val="${categoryAxisId}"/><c:axId val="${valueAxisId}"/></c:barChart><c:catAx><c:axId val="${categoryAxisId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/>${chartTitle("PROBLEM", true)}<c:crossAx val="${valueAxisId}"/><c:crosses val="autoZero"/></c:catAx><c:valAx><c:axId val="${valueAxisId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:majorGridlines/>${chartTitle("MINUTES", true)}<c:crossAx val="${categoryAxisId}"/><c:crosses val="autoZero"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`;
}

function styleWorkbook(buffer: Buffer, sections: Array<{ title: number; header: number; first: number; last: number; chartLast: number; summary: number; chartTitle: string; hasData: boolean }>) {
  const book = XLSX.CFB.read(buffer, { type: "buffer" });
  let sheet = getXml(book, "/xl/worksheets/sheet1.xml");
  ([ ["A1", 1], ["A2", 2], ["A3", 6] ] as Array<[string, number]>).forEach(([cell, style]) => { sheet = setStyle(sheet, cell, style); });
  sections.forEach((section) => {
    ["A", "B", "C"].forEach((column) => { sheet = setStyle(sheet, `${column}${section.title}`, 7); sheet = setStyle(sheet, `${column}${section.header}`, 7); });
    for (let row = section.first; row <= section.last; row += 1) ["A", "B", "C"].forEach((column) => { sheet = setStyle(sheet, `${column}${row}`, 3); });
    for (let row = section.summary; row <= section.summary + 2; row += 1) ["B", "C"].forEach((column) => { sheet = setStyle(sheet, `${column}${row}`, 9); });
  });
  setXml(book, "/xl/worksheets/sheet1.xml", sheet);
  setXml(book, "/xl/styles.xml", styles);
  const charts = sections.filter((section) => section.hasData);
  if (charts.length) {
    const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${charts.map((section, index) => `<xdr:twoCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${section.title - 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>11</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${section.summary + 2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 1}" name="Pareto Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${index + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join("")}</xdr:wsDr>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
    const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${charts.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${index + 1}.xml"/>`).join("")}</Relationships>`;
    const types = getXml(book, "/[Content_Types].xml").replace("</Types>", `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>${charts.map((_, index) => `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("")}</Types>`);
    sheet = getXml(book, "/xl/worksheets/sheet1.xml").replace("</worksheet>", `<drawing r:id="rId1"/></worksheet>`);
    setXml(book, "/xl/worksheets/sheet1.xml", sheet); setXml(book, "/[Content_Types].xml", types);
    addXml(book, "/xl/worksheets/_rels/sheet1.xml.rels", rels); addXml(book, "/xl/drawings/drawing1.xml", drawing); addXml(book, "/xl/drawings/_rels/drawing1.xml.rels", drawingRels);
    charts.forEach((section, index) => addXml(book, `/xl/charts/chart${index + 1}.xml`, chartXml(index + 1, section.first, section.chartLast, section.chartTitle)));
  }
  return XLSX.CFB.write(book, { type: "buffer", fileType: "zip", compression: true });
}

export function createLinestopWorkbook(summaries: LinestopLineSummary[], month: string) {
  const printed = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date());
  const rows: Array<Array<string | number>> = [["LINESTOP REPORT"], [`Periode: ${monthLabel(month)}`], [`Waktu Cetak: ${printed}`], []];
  const merges = ["A1:C1", "A2:C2", "A3:C3"];
  const sections: Array<{ title: number; header: number; first: number; last: number; chartLast: number; summary: number; chartTitle: string; hasData: boolean }> = [];
  summaries.forEach((line) => {
    const top = line.rows.slice(0, 10); const total = line.rows.reduce((sum, row) => sum + row.minutes, 0);
    const title = rows.length + 1; rows.push([line.label], ["NO.", "PROBLEM", "WAKTU (MENIT)"]);
    const first = rows.length + 1;
    rows.push(...Array.from({ length: 10 }, (_, index) => {
      const row = top[index];
      return [index + 1, row?.machineName ?? "", row?.minutes ?? ""];
    }));
    const last = rows.length; rows.push([]); const summary = rows.length + 1;
    rows.push(["", "Grand Total (minute)", total], ["", "(hour)", total / 60], ["", "(units)", line.taktTime ? Math.round(total / line.taktTime) : "-"]); rows.push([]);
    merges.push(`A${title}:C${title}`);
    sections.push({ title, header: title + 1, first, last, chartLast: first + top.length - 1, summary, chartTitle: line.label.toUpperCase(), hasData: top.length > 0 });
  });
  const sheet = XLSX.utils.aoa_to_sheet(rows); sheet["!merges"] = merges.map(XLSX.utils.decode_range); sheet["!cols"] = [{ wch: 8 }, { wch: 42 }, { wch: 18 }, { wch: 3 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Linestop Report");
  return styleWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }), sections);
}
