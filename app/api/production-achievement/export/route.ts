import {
  createProductionAchievementDataWorkbook,
  createProductionAchievementMonthlyWorkbook,
  createProductionAchievementWorkbook,
} from "@/features/production-achievement/server/achievement-export";
import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

function getJakartaDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function getMonthlyShifts(referenceDate: string | null) {
  const today = getJakartaDateKey();
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(referenceDate ?? "")
    ? referenceDate!
    : today;
  const [year, month] = selectedDate.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const isCurrentMonth = year === todayYear && month === todayMonth;
  const lastDay = isCurrentMonth
    ? todayDay
    : new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return [
      { date, shift: "DAY" },
      { date, shift: "NIGHT" },
    ];
  }).flat();
}

async function mapWithConcurrency<T, Result>(
  values: T[],
  limit: number,
  callback: (value: T) => Promise<Result>,
) {
  const results = new Array<Result>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await callback(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUserRole())) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format === "monthly") {
      const dashboards = await mapWithConcurrency(
        getMonthlyShifts(url.searchParams.get("date")),
        2,
        ({ date, shift }) => getProductionAchievementDashboard({ date, shift }),
      );
      const workbook = createProductionAchievementMonthlyWorkbook(dashboards);
      const today = getJakartaDateKey();
      return new Response(new Uint8Array(workbook), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="production-achievement-monthly_${today}.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    const dashboard = await getProductionAchievementDashboard({
      date: url.searchParams.get("date"),
      shift: url.searchParams.get("shift"),
    }, {
      includeAllProblems: true,
    });
    const normalizedFormat = format === "data" ? "data" : "report";
    const workbook = normalizedFormat === "data"
      ? createProductionAchievementDataWorkbook(dashboard)
      : await createProductionAchievementWorkbook(dashboard);
    const filename = normalizedFormat === "data"
      ? `production-achievement-data_${dashboard.date}_${dashboard.shift}.xlsx`
      : `production-achievement_${dashboard.date}_${dashboard.shift}.xlsx`;

    return new Response(new Uint8Array(workbook), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export production achievement data",
      },
      { status: 500 },
    );
  }
}
