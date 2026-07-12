import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getEmployeeById } from "@/services/employee.service";
import { getSchoolById } from "@/services/school.service";
import { JobOfferPDFViewer } from "@/features/employees/job-offer-pdf-viewer";

interface PageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function JobOfferLetterPage({ params }: PageProps) {
  const { employeeId } = await params;
  const session = await getSchoolSession();
  if (!session?.schoolId) notFound();

  let employee, school;
  try {
    [employee, school] = await Promise.all([
      getEmployeeById(employeeId, session.schoolId),
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
      <JobOfferPDFViewer employee={employee} school={school} />
    </div>
  );
}
