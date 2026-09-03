"use client";

import { escapeHtml } from "@/features/attendance/attendance-utils";

export type EmployeeReportColumn<T> = { key: string; label: string; value: (row: T) => string | number };

export function printEmployeeReport<T>(input: { schoolName: string; logoUrl?: string | null; title: string; meta: string; summary: string; columns: EmployeeReportColumn<T>[]; rows: T[] }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("Please allow popups to print");
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(input.title)}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}.head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #6d4aff;padding-bottom:12px}.head img{width:52px;height:52px;object-fit:contain}h1{font-size:20px;margin:0}.school{font-weight:700;color:#2b1766}.meta,.generated{font-size:11px;color:#6b7280}.summary{margin:14px 0;padding:10px;border:1px solid #ddd;background:#fafafa;font-size:11px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#2b1766;color:#fff;padding:7px;text-align:left}td{padding:7px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#fafafa}.generated{text-align:right;margin-top:12px}@media print{body{padding:8px}}</style></head><body><div class="head">${input.logoUrl ? `<img src="${escapeHtml(input.logoUrl)}">` : ""}<div><div class="school">${escapeHtml(input.schoolName)}</div><h1>${escapeHtml(input.title)}</h1><div class="meta">${escapeHtml(input.meta)}</div></div></div><div class="summary">${escapeHtml(input.summary)}</div><table><thead><tr>${input.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${input.rows.map((row) => `<tr>${input.columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table><div class="generated">Generated ${escapeHtml(new Date().toLocaleString())}</div></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

export function exportEmployeeReportExcel<T>(input: { schoolName: string; title: string; meta: string; filename: string; sheetName: string; columns: EmployeeReportColumn<T>[]; rows: T[]; totals?: Array<string | number> }) {
  const XLSX = require("xlsx-js-style");
  const headerRow = 4;
  const data: Array<Array<string | number>> = [
    [input.schoolName],
    [input.title],
    [input.meta],
    [],
    input.columns.map((column) => column.label),
    ...input.rows.map((row) => input.columns.map((column) => column.value(row))),
  ];
  if (input.totals) data.push([], input.totals);
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!merges"] = [0, 1, 2].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: Math.max(0, input.columns.length - 1) } }));
  [0, 1].forEach((row) => { const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]; if (cell) cell.s = { font: { bold: true, sz: row === 0 ? 16 : 13, color: { rgb: row === 0 ? "2B1766" : "6D4AFF" } } }; });
  input.columns.forEach((_column, column) => { const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: column })]; if (cell) cell.s = { fill: { fgColor: { rgb: "2B1766" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center" } }; });
  sheet["!cols"] = input.columns.map((column) => ({ wch: Math.max(14, column.label.length + 3) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, input.sheetName.slice(0, 31));
  XLSX.writeFile(workbook, input.filename);
}

export async function copyEmployeeReport<T>(columns: EmployeeReportColumn<T>[], rows: T[]) {
  const text = [columns.map((column) => column.label).join("\t"), ...rows.map((row) => columns.map((column) => column.value(row)).join("\t"))].join("\n");
  await navigator.clipboard.writeText(text);
}
