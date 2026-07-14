import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getSchoolById } from "@/services/school.service";
import {
  getInvoicesByIds,
  getInvoicesByClassAndMonth,
  getInvoicesByMonth,
  getInvoices,
} from "@/services/fee-invoice.service";
import { FeeInvoicePDFViewer } from "@/features/fees/fee-invoice-pdf-viewer";
import type { FeeInvoice } from "@/types/school.types";

interface PageProps {
  searchParams: Promise<{
    ids?: string;
    classId?: string;
    feeMonth?: string;
    allClasses?: string;
    search?: string;
  }>;
}

export default async function FeeInvoicePdfPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const session = await getSchoolSession();
  if (!session?.schoolId) notFound();

  let invoices: FeeInvoice[] = [];
  let school;

  try {
    school = await getSchoolById(session.schoolId);

    if (sp.ids) {
      const idList = sp.ids.split(",").filter(Boolean);
      invoices = await getInvoicesByIds(session.schoolId, idList);
    } else if (sp.allClasses === "1" && sp.feeMonth) {
      invoices = await getInvoicesByMonth(session.schoolId, sp.feeMonth);
    } else if (sp.classId && sp.feeMonth) {
      invoices = await getInvoicesByClassAndMonth(session.schoolId, sp.classId, sp.feeMonth);
    } else if (sp.search || sp.feeMonth) {
      const result = await getInvoices(session.schoolId, {
        search: sp.search || undefined,
        feeMonth: sp.feeMonth || undefined,
        limit: 10000,
      });
      invoices = result.data;
    } else {
      notFound();
    }
  } catch {
    notFound();
  }

  if (invoices.length === 0) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#525659",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No invoices found</p>
          <p className="text-sm text-white/60">
            Generate invoices first or check your filters.
          </p>
        </div>
      </div>
    );
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
      <FeeInvoicePDFViewer invoices={invoices} school={school} />
    </div>
  );
}
