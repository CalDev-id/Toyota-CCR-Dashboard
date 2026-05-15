import {
  findExistingBatches,
  getPlanningColumns,
  insertPlanningRows,
  replaceExistingBatches,
  requirePlanningPart,
} from "@/lib/planning-server";
import * as XLSX from "xlsx";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ part: string }> },
) {
  try {
    const { part: partParam } = await params;
    const part = requirePlanningPart(partParam);
    const formData = await request.formData();
    const file = formData.get("file");
    const overwrite = formData.get("overwrite") === "true";

    if (!(file instanceof File)) {
      throw new Error("Excel file is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Excel file must contain at least one sheet");
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: "" },
    );

    if (rows.length === 0) {
      throw new Error("Excel sheet does not contain rows");
    }

    const columns = await getPlanningColumns(part);
    const conflicts = await findExistingBatches(part, columns, rows);

    if (conflicts.length > 0 && !overwrite) {
      return Response.json(
        {
          error: "Import conflicts with existing date, shift, and group data",
          conflicts,
        },
        { status: 409 },
      );
    }

    if (overwrite) {
      await replaceExistingBatches(part, columns, rows);
    }

    const inserted = await insertPlanningRows(part, columns, rows);

    return Response.json({ data: { inserted, overwritten: overwrite, conflicts } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to import planning data",
      },
      { status: 400 },
    );
  }
}

