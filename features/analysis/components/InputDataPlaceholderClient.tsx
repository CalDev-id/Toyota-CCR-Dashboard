"use client";

import { useState } from "react";

type InputDataPlaceholderClientProps = {
  dataLabel: "Shipment" | "LSR";
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

export default function InputDataPlaceholderClient({ dataLabel }: InputDataPlaceholderClientProps) {
  const [month, setMonth] = useState(currentMonth);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-sm dark:border-[#273449] dark:bg-[#111827]">
        <div className="flex flex-col gap-4 border-b border-[#e4e7ec] px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#273449]">
          <div>
            <h1 className="font-semibold text-[#101828] dark:text-[#f8fafc]">Data {dataLabel}</h1>
            <p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">{formatMonth(month)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="grid gap-1 text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
              <span className="sr-only">Bulan</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-10 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm dark:border-[#384860] dark:bg-[#162033]"
              />
            </label>
            <button
              type="button"
              disabled
              title={`Format import ${dataLabel} belum tersedia`}
              className="h-10 cursor-not-allowed rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white opacity-60"
            >
              Import Data {dataLabel}
            </button>
            <button
              type="button"
              disabled
              title={`Data ${dataLabel} belum tersedia`}
              className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-transparent bg-[#12b76a] px-4 text-sm font-semibold text-white opacity-60"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Update
            </button>
          </div>
        </div>
        <div className="grid min-h-72 place-items-center px-5 py-10 text-center">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-[#344054] dark:text-[#d4dae5]">Data {dataLabel} belum tersedia</p>
            <p className="mt-1 text-sm text-[#667085] dark:text-[#a7b0c0]">
              Format tabel dan file import akan ditambahkan setelah data dari user tersedia.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
