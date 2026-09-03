import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";
import { error } from "@/lib/api-response";
import { employeeAttendanceSession } from "../../_utils";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  if (!(await employeeAttendanceSession(schoolId))) return NextResponse.json(error("Unauthorized"), { status: 401 });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Employee ID", "Employee Name", "Attendance Date", "Check-in Time", "Check-out Time", "Biometric ID"],
    ["EMP-2026-0001", "Example Employee", "2026-07-24", "07:58", "14:04", ""],
  ]);
  sheet["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  for (let column = 0; column < 6; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (cell) cell.s = { fill: { fgColor: { rgb: "6D4AFF" } }, font: { bold: true, color: { rgb: "FFFFFF" } } };
  }
  XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Import Instructions"],
    ["Use Employee ID (employee code) whenever possible. Biometric ID mappings are also supported."],
    ["Dates may use YYYY-MM-DD or DD/MM/YYYY. Times may use 24-hour or AM/PM format."],
    ["Multiple punch rows for the same employee/date are combined: earliest punch is check-in and latest is check-out."],
  ]);
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="employee-attendance-sample.xlsx"',
    },
  });
}
