import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { success, error } from "@/lib/api-response";
import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;

    const supabase: SupabaseClient = createSupabaseService();

    let query = supabase
      .from("students")
      .select(
        `id, name, registration_no, father_name, father_nic, class_id, gender, date_of_birth, mobile, is_active, is_free, discount, previous_balance,
         classes!left ( id, name, fee )`
      )
      .eq("school_id", schoolId)
      .not("father_nic", "is", null)
      .neq("father_nic", "");

    if (search?.trim()) {
      const q = search.trim();
      query = query.or(
        `father_nic.ilike.%${q}%,father_name.ilike.%${q}%,name.ilike.%${q}%`
      );
    }

    const { data, error: dbError } = await query;

    if (dbError) throw new Error(`Failed to fetch families: ${dbError.message}`);

    // Group students by father_nic
    const familyMap = new Map<
      string,
      {
        father_nic: string;
        father_name: string | null;
        students: {
          id: string;
          name: string;
          registration_no: string | null;
          class_name: string | null;
          gender: string | null;
          date_of_birth: string | null;
          mobile: string | null;
          is_active: boolean;
          is_free: boolean;
          discount: number;
          previous_balance: number;
          monthly_fee: number;
          net_fee: number;
        }[];
      }
    >();

    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const nic = r.father_nic as string;
      if (!nic) continue;

      if (!familyMap.has(nic)) {
        familyMap.set(nic, {
          father_nic: nic,
          father_name: (r.father_name as string) ?? null,
          students: [],
        });
      }

      const cls = r.classes as Record<string, unknown> | null;
      const monthlyFee = (cls?.fee as number) ?? 0;
      const discount = (r.discount as number) ?? 0;
      const isFree = (r.is_free as boolean) ?? false;
      const netFee = isFree ? 0 : Math.max(0, monthlyFee - discount);
      familyMap.get(nic)!.students.push({
        id: r.id as string,
        name: r.name as string,
        registration_no: (r.registration_no as string) ?? null,
        class_name: (cls?.name as string) ?? null,
        gender: (r.gender as string) ?? null,
        date_of_birth: (r.date_of_birth as string) ?? null,
        mobile: (r.mobile as string) ?? null,
        is_active: (r.is_active as boolean) ?? true,
        is_free: isFree,
        discount,
        previous_balance: (r.previous_balance as number) ?? 0,
        monthly_fee: monthlyFee,
        net_fee: netFee,
      });
    }

    // Only return families with more than 1 student
    const families = Array.from(familyMap.values())
      .filter((f) => f.students.length > 1)
      .sort((a, b) => b.students.length - a.students.length);

    return NextResponse.json(success({ families, total: families.length }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch families"),
      { status: 500 }
    );
  }
}
