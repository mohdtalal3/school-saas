import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getDailyCollection } from "@/services/fee-report.service";
import { success, error } from "@/lib/api-response";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const classId = url.searchParams.get("classId") ?? undefined;

    if (!dateFrom || !dateTo || !DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
      return NextResponse.json(
        error("dateFrom and dateTo (YYYY-MM-DD) are required"),
        { status: 400 }
      );
    }
    if (dateFrom > dateTo) {
      return NextResponse.json(error("dateFrom cannot be after dateTo"), { status: 400 });
    }

    const data = await getDailyCollection(schoolId, dateFrom, dateTo, classId);
    return NextResponse.json(success(data));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch daily collection"),
      { status: 500 }
    );
  }
}
