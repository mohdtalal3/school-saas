"use client";

import dynamic from "next/dynamic";
import type { StudentWithClass, School } from "@/types/school.types";

const PDFViewer = dynamic(
  () =>
    import("@react-pdf/renderer").then((m) => ({ default: m.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#525659]">
        <div className="text-sm text-white/60">Loading PDF viewer...</div>
      </div>
    ),
  }
);

interface Props {
  student: StudentWithClass;
  school: School;
}

export function AdmissionLetterPDFViewer({ student, school }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar
      style={{ border: "none" }}
    >
      <AdmissionLetterPDFLazy student={student} school={school} />
    </PDFViewer>
  );
}

import { AdmissionLetterPDF } from "./admission-letter-pdf";
function AdmissionLetterPDFLazy({ student, school }: Props) {
  return <AdmissionLetterPDF student={student} school={school} />;
}
