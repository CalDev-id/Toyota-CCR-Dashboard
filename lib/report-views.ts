export function summaryViewName(baseName: string) {
  return `${baseName}${process.env.REPORT_SUMMARY_VIEW_SUFFIX ?? ""}`;
}
