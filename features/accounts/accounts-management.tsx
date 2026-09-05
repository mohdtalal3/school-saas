"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChartOfAccountsTab } from "./chart-of-accounts-tab";
import { TransactionFormTab } from "./transaction-form-tab";
import { StatementTab } from "./statement-tab";

interface AccountsManagementProps {
  schoolId: string;
}

export function AccountsManagement({ schoolId }: AccountsManagementProps) {
  const searchParams = useSearchParams();
  const accountsTab = searchParams.get("tab") ?? "chart";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {accountsTab === "chart" && <ChartOfAccountsTab schoolId={schoolId} />}
      {accountsTab === "income" && (
        <TransactionFormTab key="income" schoolId={schoolId} type="income" />
      )}
      {accountsTab === "expense" && (
        <TransactionFormTab key="expense" schoolId={schoolId} type="expense" />
      )}
      {accountsTab === "statement" && <StatementTab schoolId={schoolId} />}
    </motion.div>
  );
}
