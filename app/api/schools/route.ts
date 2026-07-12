import { NextResponse } from "next/server";
import { z } from "zod";
import { getMasterSession } from "@/lib/auth/jwt";
import { createSchool } from "@/services/school.service";
import { success, error } from "@/lib/api-response";

const BodySchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  adminEmail: z.string().email("Valid admin email required"),
  adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
  adminName: z.string().min(2).optional(),
});

export async function GET() {
  try {
    const session = await getMasterSession();
    if (!session || session.role !== "master") {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }
    // Lazy import to avoid loading service when unauthorized
    const { getAllSchools } = await import("@/services/school.service");
    const schools = await getAllSchools();
    return NextResponse.json(success(schools));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch schools"),
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getMasterSession();
    if (!session || session.role !== "master") {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error(parsed.error.issues[0]?.message ?? "Invalid input"),
        { status: 400 }
      );
    }

    const school = await createSchool(parsed.data);
    return NextResponse.json(success(school), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create school"),
      { status: 500 }
    );
  }
}