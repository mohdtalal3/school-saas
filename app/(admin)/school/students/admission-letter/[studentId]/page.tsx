import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getStudentById } from "@/services/student.service";
import { getSchoolById } from "@/services/school.service";
import { AdmissionLetterPDFViewer } from "@/features/students/admission-letter-pdf-viewer";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default async function AdmissionLetterPage({ params }: PageProps) {
  const { studentId } = await params;
  const session = await getSchoolSession();
  if (!session?.schoolId) notFound();

  let student, school;
  try {
    [student, school] = await Promise.all([
      getStudentById(studentId, session.schoolId),
      getSchoolById(session.schoolId),
    ]);
  } catch {
    notFound();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#525659",
        zIndex: 9999,
      }}
    >
      <AdmissionLetterPDFViewer student={student} school={school} />
    </div>
  );
}
