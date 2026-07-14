"use client";

import dynamic from "next/dynamic";
import type { School, FeeInvoice } from "@/types/school.types";
import { FeeInvoicePDF } from "./fee-invoice-pdf";

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
  invoices: FeeInvoice[];
  school: School;
}

export function FeeInvoicePDFViewer({ invoices, school }: Props) {
  return (
    <PDFViewer
      width="100%"
      height="100%"
      showToolbar
      style={{ border: "none" }}
    >
      <FeeInvoicePDF invoices={invoices} school={school} />
    </PDFViewer>
  );
}
