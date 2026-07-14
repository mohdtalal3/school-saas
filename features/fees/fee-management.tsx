"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FeeParticularsTab } from "./fee-particulars-tab";
import { FeeInvoiceGeneratorTab } from "./fee-invoice-generator-tab";

interface FeeManagementProps {
  schoolId: string;
}

export function FeeManagement({ schoolId }: FeeManagementProps) {
  const searchParams = useSearchParams();
  const feeTab = searchParams.get("tab") ?? "particulars";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Fee Particulars tab */}
      {feeTab === "particulars" && (
        <FeeParticularsTab schoolId={schoolId} />
      )}

      {/* Invoice Generator tab */}
      {feeTab === "invoices" && (
        <FeeInvoiceGeneratorTab schoolId={schoolId} />
      )}
    </motion.div>
  );
}
