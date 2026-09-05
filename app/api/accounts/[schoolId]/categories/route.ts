import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolSession } from "@/lib/auth/jwt";
import {
  getAccountCategories,
  createAccountCategory,
} from "@/services/accounts.service";
import { success, error, AppError } from "@/lib/api-response";
import { CATEGORY_SORT_FIELDS } from "@/lib/accounts";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["income", "expense"]),
  description: z.string().max(500).nullable().optional(),
});

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
    const typeParam = url.searchParams.get("type");
    const type = typeParam === "income" || typeParam === "expense" ? typeParam : undefined;
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "inactive" || statusParam === "all"
        ? statusParam
        : "all";
    const sortByParam = url.searchParams.get("sortBy");
    const sortBy = (CATEGORY_SORT_FIELDS as readonly string[]).includes(sortByParam ?? "")
      ? (sortByParam as "name" | "created_at" | "updated_at")
      : "name";
    const sortDirParam = url.searchParams.get("sortDir");
    const sortDir = sortDirParam === "desc" ? "desc" : "asc";

    const result = await getAccountCategories(schoolId, {
      type,
      search: url.searchParams.get("search") ?? undefined,
      status,
      sortBy,
      sortDir,
    });
    return NextResponse.json(success(result));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to fetch categories"),
      { status: 500 }
    );
  }
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

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(error("Invalid category payload"), { status: 400 });
    }

    const category = await createAccountCategory(schoolId, parsed.data);
    return NextResponse.json(success(category), { status: 201 });
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to create category"),
      { status }
    );
  }
}

