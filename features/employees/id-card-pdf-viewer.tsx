"use client";

import dynamic from "next/dynamic";
import type { Employee, School } from "@/types/school.types";
import type { IdCardTheme, IdCardOrientation } from "./id-card-pdf";

const PDFViewer = dynamic(
  () =>
    import("@react-pdf/renderer").then((m) => ({ default: m.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#525659]">
        <div className="text-sm text-white/60">Loading ID cards...</div>
      </div>
    ),
  }
);

interface Props {
  employees: Employee[];
  school: School;
  orientation: IdCardOrientation;
  theme: IdCardTheme;
}

export function IdCardPDFViewer({ employees, school, orientation, theme }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar
      style={{ border: "none" }}
    >
      <IdCardPDFLazy
        employees={employees}
        school={school}
        orientation={orientation}
        theme={theme}
      />
    </PDFViewer>
  );
}

import { IdCardPDF } from "./id-card-pdf";
function IdCardPDFLazy(props: Props) {
  return <IdCardPDF {...props} />;
}
