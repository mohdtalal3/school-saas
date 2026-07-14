import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getStudents, getStudentById } from "@/services/student.service";
import { getSchoolById } from "@/services/school.service";
import { buildStudentIdCardsHtml } from "@/features/students/student-id-card-html";
import { DEFAULT_ID_CARD_THEME } from "@/features/employees/id-card-types";

export async function GET(req: Request) {
  try {
    const session = await getSchoolSession();
    if (!session?.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const classIdsParam = searchParams.get("classIds");
    const download = searchParams.get("download") === "1";

    const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;
    const classIds = classIdsParam ? classIdsParam.split(",").filter(Boolean) : null;

    let students;
    let school;

    if (ids) {
      // Select mode — fetch only chosen students
      const [selectedStudents, schoolResult] = await Promise.all([
        Promise.all(ids.map((id) => getStudentById(id, session.schoolId))),
        getSchoolById(session.schoolId),
      ]);
      students = selectedStudents;
      school = schoolResult;
    } else if (classIds) {
      // Class filter mode — fetch students from selected classes
      const [classStudents, schoolResult] = await Promise.all([
        Promise.all(
          classIds.map((cid) =>
            getStudents(session.schoolId, { limit: 10000, classId: cid, active: true })
          )
        ),
        getSchoolById(session.schoolId),
      ]);
      students = classStudents.flatMap((r) => r.data);
      school = schoolResult;
    } else {
      // All mode — fetch all active students
      const [studentResult, schoolResult] = await Promise.all([
        getStudents(session.schoolId, { limit: 10000, active: true }),
        getSchoolById(session.schoolId),
      ]);
      students = studentResult.data;
      school = schoolResult;
    }

    if (students.length === 0) {
      return NextResponse.json({ error: "No students to render" }, { status: 400 });
    }

    const theme = {
      textColor: searchParams.get("textColor") ?? DEFAULT_ID_CARD_THEME.textColor,
      accentColor: searchParams.get("accentColor") ?? DEFAULT_ID_CARD_THEME.accentColor,
      goldColor: searchParams.get("goldColor") ?? DEFAULT_ID_CARD_THEME.goldColor,
      bgColor: searchParams.get("bgColor") ?? DEFAULT_ID_CARD_THEME.bgColor,
    };

    const html = buildStudentIdCardsHtml(students, school, theme);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let pdfBuffer: Buffer;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      pdfBuffer = Buffer.from(pdf);
    } finally {
      await browser.close();
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${school.name.replace(/[^a-z0-9]+/gi, "-")}-student-id-cards.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Student ID card PDF generation failed:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
