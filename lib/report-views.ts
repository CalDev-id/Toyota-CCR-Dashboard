export function summaryViewName(baseName: string) {
  if (baseName === "v_assy_summary") {
    return baseName;
  }

  return `${baseName}${process.env.REPORT_SUMMARY_VIEW_SUFFIX ?? ""}`;
}
