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

    // Only promote active students
    const { data, error: dbError } = await supabase
      .from("students")
      .update({ class_id: targetClassId })
      .in("id", studentIds)
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .select("id, name");

    if (dbError) {
      return NextResponse.json(
        error(`Failed to promote students: ${dbError.message}`),
        { status: 500 }
      );
    }

    const promoted = (data ?? []) as { id: string; name: string }[];

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
