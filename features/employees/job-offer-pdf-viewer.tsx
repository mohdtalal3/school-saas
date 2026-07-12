"use client";

import dynamic from "next/dynamic";
import type { Employee, School } from "@/types/school.types";

// PDFViewer uses browser-only APIs (window, Blob, URL) so it must NEVER
// run on the server — not even during SSR. dynamic + ssr:false ensures
// it is only imported and rendered in the browser.
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
  employee: Employee;
  school: School;
}

export function JobOfferPDFViewer({ employee, school }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar
      style={{ border: "none" }}
    >
      {/* Lazy import the PDF document so it's also browser-only */}
      <JobOfferPDFLazy employee={employee} school={school} />
    </PDFViewer>
  );
}

// Extracted to a separate lazy component so the dynamic import above
// can reference it — it will only be loaded in the browser too.
import { JobOfferPDF } from "./job-offer-letter-pdf";
function JobOfferPDFLazy({ employee, school }: Props) {
  return <JobOfferPDF employee={employee} school={school} />;
}
