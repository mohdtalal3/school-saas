import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { success, error } from "@/lib/api-response";
import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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

    const body = await req.json();
    const { studentIds, targetClassId } = body as {
      studentIds: string[];
      targetClassId: string;
    };

    if (!targetClassId) {
      return NextResponse.json(error("Target class is required"), { status: 400 });
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(error("No students selected"), { status: 400 });
    }

    const supabase: SupabaseClient = createSupabaseService();

    // Fetch target class annual_dues
    const { data: targetClass } = await supabase
      .from("classes")
      .select("annual_dues")
      .eq("id", targetClassId)
      .single();

    const newClassAnnualDues = (targetClass as Record<string, unknown>)?.annual_dues as number ?? 0;

    // Only promote active students — set previous_annual_due from new class annual_dues minus their discount
    const { data: students, error: fetchError } = await supabase
      .from("students")
      .select("id, annual_dues_discount")
      .in("id", studentIds)
      .eq("school_id", schoolId)
      .eq("is_active", true);

    if (fetchError) {
      return NextResponse.json(
        error(`Failed to fetch students: ${fetchError.message}`),
        { status: 500 }
      );
    }

    const activeStudents = (students ?? []) as { id: string; annual_dues_discount: number }[];

    // Update each student's class_id and previous_annual_due
    const promoted: { id: string; name: string }[] = [];
    for (const student of activeStudents) {
      const newAnnualDue = Math.max(0, newClassAnnualDues - (student.annual_dues_discount ?? 0));
      const { data: updated, error: updateError } = await supabase
        .from("students")
        .update({ class_id: targetClassId, previous_annual_due: newAnnualDue, annual_dues_original: newAnnualDue })
        .eq("id", student.id)
        .eq("school_id", schoolId)
        .select("id, name")
        .single();

      if (!updateError && updated) {
        promoted.push(updated as { id: string; name: string });
      }
    }

    return NextResponse.json(
      success({
        promoted: promoted.length,
        skipped: studentIds.length - promoted.length,
        students: promoted,
      })
    );
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to promote students"),
      { status: 500 }
    );
  }
}
