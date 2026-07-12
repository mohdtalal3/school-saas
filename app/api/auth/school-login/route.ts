import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSchoolSession,
  setSchoolCookie,
} from "@/lib/auth/jwt";
import { verifyAdminPassword } from "@/services/auth.service";
import { success, error } from "@/lib/api-response";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error("Invalid email or password format"),
        { status: 400 }
      );
    }

    const admin = await verifyAdminPassword(
      parsed.data.email,
      parsed.data.password
    );

    const token = await createSchoolSession({
      role: "admin",
      schoolId: admin.school_id,
      adminId: admin.id,
      email: admin.email,
    });
    await setSchoolCookie(token);

    return NextResponse.json(
      success({
        role: "admin" as const,
        schoolId: admin.school_id,
        adminId: admin.id,
        email: admin.email,
      })
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    const status = message === "Invalid credentials" ? 401 : 500;
    return NextResponse.json(error(message), { status });
  }
}