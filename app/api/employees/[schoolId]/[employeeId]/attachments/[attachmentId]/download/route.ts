import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getAttachmentUrl } from "@/services/employee.service";
import { createSupabaseService } from "@/lib/supabase";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      schoolId: string;
      employeeId: string;
      attachmentId: string;
    }>;
  }
) {
  const { schoolId, employeeId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (session?.schoolId !== schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseService();

    // Fetch attachment metadata
    const { data: att, error: attError } = await supabase
      .from("employee_attachments")
      .select("storage_key, name, mime_type, employee_id")
      .eq("id", attachmentId)
      .eq("employee_id", employeeId)
      .maybeSingle() as { data: { storage_key: string; name: string; mime_type: string; employee_id: string } | null; error: unknown };

    if (attError || !att) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Redirect to public storage URL
    const url = getAttachmentUrl(supabase, att.storage_key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
