import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { success, error } from "@/lib/api-response";
import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

interface CsvRow {
  [key: string]: string;
}

function parseExcel(buffer: ArrayBuffer): { headers: string[]; rows: CsvRow[] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const ws = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  if (json.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(json[0]).map((h) => h.toLowerCase().trim());
  const rows: CsvRow[] = json.map((row) => {
    const normalized: CsvRow = {};
    for (const [key, val] of Object.entries(row)) {
      normalized[key.toLowerCase().trim()] =
        val === null || val === undefined ? "" : String(val).trim();
    }
    return normalized;
  });

  return { headers, rows };
}

function getVal(row: CsvRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = row[key.toLowerCase().trim()];
    if (val !== undefined && val !== "") return val.trim();
  }
  return undefined;
}

function parseDate(val: string | undefined): string | null {
  if (!val) return null;
  // Accept YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, day, month, year] = m;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
}

function parseGender(val: string | undefined): string | null {
  if (!val) return null;
  const v = val.trim();
  if (v === "0" || v.toLowerCase() === "male") return "male";
  if (v === "1" || v.toLowerCase() === "female") return "female";
  if (v.toLowerCase() === "other") return "other";
  return null;
}

function parseBool(val: string | undefined): boolean {
  if (!val) return false;
  const v = val.trim();
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function formatPhone(val: string | undefined): string | null {
  if (!val) return null;
  let v = val.trim();
  // If starts with 0, remove leading 0 and add +92
  if (v.startsWith("0")) {
    v = "+92" + v.slice(1);
  }
  // If starts with 92 without +, add +
  else if (v.startsWith("92") && !v.startsWith("+")) {
    v = "+" + v;
  }
  return v;
}

function formatRegNo(val: string | undefined, year: number, count: number): string {
  if (!val || !val.trim()) {
    return `STU-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  const raw = val.trim().toUpperCase();
  return raw.startsWith("STU-") ? raw : `STU-${raw}`;
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function parseInt(val: string | undefined): number {
  if (!val) return 0;
  const n = Number.parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const classId = formData.get("classId") as string | null;

    if (!file) {
      return NextResponse.json(error("No file provided"), { status: 400 });
    }
    if (!classId) {
      return NextResponse.json(error("Class selection is required"), { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows } = parseExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json(error("Excel file is empty or has no data rows"), { status: 400 });
    }

    const supabase: SupabaseClient = createSupabaseService();

    const inserted: { name: string; registration_no: string }[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, row 2 is first data

      const name = getVal(row, "name", "student_name");
      if (!name) {
        errors.push({ row: rowNum, error: "Name is required" });
        continue;
      }

      // Extract year from date_of_admission or default to current year
      const admitDate = parseDate(getVal(row, "date_of_admission", "admission_date"));
      const admitYear = admitDate ? new Date(admitDate).getFullYear() : new Date().getFullYear();
      const yy = String(admitYear);

      // Count existing students with same year prefix for unique numbering
      const { count: yearCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .like("registration_no", `STU-${yy}-%`);

      const registrationNo = formatRegNo(getVal(row, "registration_no", "reg_no"), admitYear, (yearCount ?? 0) + i);

      const insertData: Record<string, unknown> = {
        school_id: schoolId,
        class_id: classId,
        registration_no: registrationNo,
        name,
        date_of_admission:
          parseDate(getVal(row, "date_of_admission", "admission_date")) ??
          new Date().toISOString().split("T")[0],
        discount: parseNumber(getVal(row, "discount", "discount_in_fee")),
        mobile: formatPhone(getVal(row, "mobile", "phone")) ?? null,
        date_of_birth: parseDate(getVal(row, "date_of_birth", "dob")) ?? null,
        gender: parseGender(getVal(row, "gender")),
        identification_mark: getVal(row, "identification_mark") ?? null,
        blood_group: getVal(row, "blood_group") ?? null,
        disease: getVal(row, "disease") ?? null,
        birth_form_id: getVal(row, "birth_form_id") ?? null,
        additional_note: getVal(row, "additional_note") ?? null,
        is_orphan: parseBool(getVal(row, "is_orphan", "orphan")),
        is_osc: parseBool(getVal(row, "is_osc", "osc")),
        is_free: parseBool(getVal(row, "is_free", "free")),
        previous_balance: parseNumber(getVal(row, "previous_balance", "prev_balance")),
        annual_dues_discount: parseNumber(getVal(row, "annual_dues_discount")),
        previous_annual_due: parseNumber(getVal(row, "previous_annual_due")),
        religion: getVal(row, "religion") ?? "Islam",
        family: getVal(row, "family") ?? null,
        total_siblings: parseInt(getVal(row, "total_siblings", "siblings")),
        address: getVal(row, "address") ?? null,
        father_name: getVal(row, "father_name") ?? null,
        father_nic: getVal(row, "father_nic", "father_cnic") ?? null,
        father_profession: getVal(row, "father_profession") ?? null,
        is_active: true,
      };

      const { data, error: insertError } = await supabase
        .from("students")
        .insert(insertData as never)
        .select()
        .single();

      if (insertError) {
        errors.push({
          row: rowNum,
          error: insertError.message,
        });
      } else {
        inserted.push({
          name: (data as Record<string, unknown>).name as string,
          registration_no: (data as Record<string, unknown>).registration_no as string,
        });
      }
    }

    return NextResponse.json(
      success({
        imported: inserted.length,
        errors,
        students: inserted,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to import students"),
      { status: 500 }
    );
  }
}
