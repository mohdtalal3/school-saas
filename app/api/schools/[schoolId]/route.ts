import { NextResponse } from "next/server";
import { getMasterSession, getSchoolSession } from "@/lib/auth/jwt";
import { getSchoolById, updateSchool, deleteSchool } from "@/services/school.service";
import { success, error, NotFoundError, ForbiddenError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const master = await getMasterSession();
    const school = await getSchoolSession();
    if (
      !master &&
      !(school?.role === "admin" && school.schoolId === schoolId)
    ) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const data = await getSchoolById(schoolId);
    return NextResponse.json(success(data));
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json(error(e.message), { status: 404 });
    }
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch school"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const school = await getSchoolSession();
    if (!(school?.role === "admin" && school.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    const body = await req.json();
    const data = await updateSchool(schoolId, body);
    return NextResponse.json(success(data));
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json(error(e.message), { status: 403 });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json(error(e.message), { status: 404 });
    }
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Update failed"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  try {
    const master = await getMasterSession();
    if (!master) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    await deleteSchool(schoolId);
    return NextResponse.json(success({ ok: true }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Delete failed"),
      { status: 500 }
    );
  }
}