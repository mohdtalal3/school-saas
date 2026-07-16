import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { School, FeeInvoice, InvoiceParticular } from "@/types/school.types";

// ── Black & white palette ─────────────────────────────────────────────────────
const BLACK = "#000000";
const DARK = "#000000";
const GRAY = "#000000";
const LIGHT_GRAY = "#000000";
const LINE = "#000000";
const WHITE = "#ffffff";

const s = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: DARK,
    backgroundColor: WHITE,
  },

  // 3 invoices per page, full width, stacked vertically
  body: {
    padding: "20 24 20 24",
    flexDirection: "column",
    gap: 16,
  },

  // ── Invoice card — full width ──
  invoiceCard: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: BLACK,
  },

  // ── Header (stacked: school info row, then invoice meta bar) ──
  header: {
    padding: "6 12",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logoWrap: { marginRight: 10 },
  logo: { width: 44, height: 44, objectFit: "contain" },
  logoPlaceholder: {
    width: 44, height: 44, backgroundColor: WHITE,
    borderWidth: 1, borderColor: BLACK,
    justifyContent: "center", alignItems: "center", borderRadius: 22,
  },
  logoInitial: { fontSize: 18, color: BLACK, fontFamily: "Helvetica-Bold" },
  schoolInfo: { flex: 1 },
  schoolName: {
    fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK,
    letterSpacing: 0.3, marginBottom: 1,
  },
  schoolTagline: { fontSize: 8.5, color: BLACK, marginBottom: 0.5 },
  schoolAddr: { fontSize: 8, color: BLACK },
  schoolPhone: { fontSize: 8, color: BLACK },

  // Invoice meta bar (below school info)
  metaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  metaLeft: { flexDirection: "row" },
  metaRight: { flexDirection: "row" },
  metaLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 3 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 12 },

  // ── Student bar ──
  studentBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "4 12",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  studentBar2: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  studentLeft: { flexDirection: "row", alignItems: "center" },
  studentRight: { flexDirection: "row", alignItems: "center" },
  fieldLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 4 },
  fieldValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BLACK },

  // ── Particulars table (4 columns: Particular, Charged, Paid, Remaining) ──
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    padding: "4 12",
  },
  thLabel: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase" },
  thNum: { width: 70, fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase", textAlign: "right" },

  tableRow: {
    flexDirection: "row",
    padding: "3 12",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  tdLabel: { flex: 1, fontSize: 9.5, color: BLACK },
  tdNum: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },
  tdNumPaid: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right" },
  tdNumRem: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },
  fixedTag: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: BLACK,
    marginLeft: 3,
  },

  // ── Subtotal row (gross charges) ──
  subtotalRow: {
    flexDirection: "row",
    padding: "3 12",
    borderTopWidth: 0.5,
    borderTopColor: BLACK,
  },
  subtotalLabel: { flex: 1, fontSize: 9.5, color: BLACK },
  subtotalAmount: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },
  subtotalEmpty: { width: 140 },

  // ── Discount row ──
  discountRow: {
    flexDirection: "row",
    padding: "3 12",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  discountLabel: { flex: 1, fontSize: 9.5, color: BLACK },
  discountAmount: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },

  // ── Net payable row ──
  totalRow: {
    flexDirection: "row",
    padding: "4 12",
    borderTopWidth: 1.5,
    borderTopColor: BLACK,
  },
  totalLabel: { flex: 1, fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase" },
  totalAmount: { width: 70, fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },
  totalEmpty: { width: 140 },

  // ── Payment summary rows ──
  summaryRow: {
    flexDirection: "row",
    padding: "3 12",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  summaryLabel: { flex: 1, fontSize: 9.5, color: BLACK },
  summaryAmount: { width: 70, fontSize: 9.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },
  summaryEmpty: { width: 140 },
  balanceRow: {
    flexDirection: "row",
    padding: "3 12",
  },
  balanceLabel: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK },
  balanceAmount: { width: 70, fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },
  balanceEmpty: { width: 140 },

  // ── Status badge ──
  statusBadge: {
    position: "absolute",
    top: 6,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: BLACK,
  },
  statusText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase" },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "4 12",
    borderTopWidth: 0.5,
    borderTopColor: BLACK,
  },
  footerLeft: { flex: 1 },
  footerItem: { fontSize: 9, color: BLACK, marginBottom: 0.5 },
  footerLabel: { fontFamily: "Helvetica-Bold", color: BLACK },
  footerBoldValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },
  stampBox: {
    width: 70, height: 30, borderWidth: 0.5, borderColor: BLACK,
    justifyContent: "center", alignItems: "center",
  },
  stampText: { fontSize: 7, color: BLACK, textAlign: "center" },

  // ── Watermark ──
  watermark: {
    position: "absolute", top: "50%", left: 0, right: 0,
    textAlign: "center", marginTop: -120, opacity: 0.04,
  },
  watermarkImg: {
    width: 250, height: 250, objectFit: "contain",
    marginLeft: "auto", marginRight: "auto",
  },
});

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtCurrency(amount: number, symbol: string): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  return `${isNegative ? "-" : ""}${symbol}${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function parseParticulars(p: InvoiceParticular[] | string | undefined): InvoiceParticular[] {
  if (!p) return [];
  if (typeof p === "string") {
    try { return JSON.parse(p); } catch { return []; }
  }
  return p;
}

// ── Single invoice component ──────────────────────────────────────────────────

function InvoiceCard({ invoice, school }: { invoice: FeeInvoice; school: School }) {
  const symbol = school.currency_symbol || "Rs.";
  const allParticulars = parseParticulars(invoice.particulars);

  // Discounts are already applied to charge amounts — no separate discount line items
  const netPayable = allParticulars.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = allParticulars.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0);
  const totalRemaining = netPayable - totalPaid;

  return (
    <View style={s.invoiceCard}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.logoWrap}>
            {school.logo_url ? (
              <Image src={school.logo_url} style={s.logo} />
            ) : (
              <View style={s.logoPlaceholder}>
                <Text style={s.logoInitial}>
                  {school.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={s.schoolInfo}>
            <Text style={s.schoolName}>{school.name.toUpperCase()}</Text>
            {school.tagline ? <Text style={s.schoolTagline}>{school.tagline}</Text> : null}
            {school.address ? <Text style={s.schoolAddr}>{school.address}</Text> : null}
            {school.phone ? <Text style={s.schoolPhone}>Ph: {school.phone}</Text> : null}
          </View>
        </View>
        <View style={s.metaBar}>
          <View style={s.metaLeft}>
            <Text style={s.metaLabel}>No:</Text>
            <Text style={s.metaValue}>{invoice.invoice_no}</Text>
          </View>
          <View style={s.metaRight}>
            <Text style={s.metaLabel}>Date:</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Student info */}
      <View style={s.studentBar}>
        <View style={s.studentLeft}>
          <Text style={s.fieldLabel}>Student:</Text>
          <Text style={s.fieldValue}>{invoice.student_name}</Text>
        </View>
        <View style={s.studentRight}>
          {invoice.class_name ? (
            <>
              <Text style={s.fieldLabel}>Class:</Text>
              <Text style={s.fieldValue}>{invoice.class_name}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={[s.studentBar, s.studentBar2]}>
        <View style={s.studentLeft}>
          {invoice.registration_no ? (
            <>
              <Text style={s.fieldLabel}>Reg:</Text>
              <Text style={s.fieldValue}>{invoice.registration_no}</Text>
            </>
          ) : null}
          {invoice.father_name ? (
            <>
              <Text style={s.fieldLabel}>  Father:</Text>
              <Text style={s.fieldValue}>{invoice.father_name}</Text>
            </>
          ) : null}
        </View>
        <View style={s.studentRight}>
          {invoice.mobile ? (
            <>
              <Text style={s.fieldLabel}>Mob:</Text>
              <Text style={s.fieldValue}>{invoice.mobile}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Particulars table — 4 columns: Particular, Charged, Paid, Remaining */}
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={s.thLabel}>Particular</Text>
          <Text style={s.thNum}>Charged</Text>
          <Text style={s.thNum}>Paid</Text>
          <Text style={s.thNum}>Remaining</Text>
        </View>
        {allParticulars.map((p, i) => {
          const paid = p.paid_amount ?? 0;
          const remaining = p.amount - paid;
          return (
            <View key={i} style={s.tableRow}>
              <Text style={s.tdLabel}>{p.label}</Text>
              <Text style={s.tdNum}>{fmtCurrency(p.amount, symbol)}</Text>
              <Text style={s.tdNumPaid}>{paid > 0 ? fmtCurrency(paid, symbol) : "—"}</Text>
              <Text style={s.tdNumRem}>{fmtCurrency(remaining, symbol)}</Text>
            </View>
          );
        })}
      </View>

      {/* Total Payable */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total Payable</Text>
        <Text style={s.totalEmpty}></Text>
        <Text style={s.totalAmount}>{fmtCurrency(netPayable, symbol)}</Text>
      </View>

      {/* Payment summary (only if payment exists) */}
      {totalPaid > 0 && (
        <>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Paid in this receipt</Text>
            <Text style={s.summaryEmpty}></Text>
            <Text style={s.summaryAmount}>{fmtCurrency(totalPaid, symbol)}</Text>
          </View>
          <View style={s.balanceRow}>
            <Text style={s.balanceLabel}>Remaining Balance</Text>
            <Text style={s.balanceEmpty}></Text>
            <Text style={s.balanceAmount}>{fmtCurrency(totalRemaining, symbol)}</Text>
          </View>
        </>
      )}

      {/* Status badge */}
      <View style={s.statusBadge}>
        <Text style={s.statusText}>{invoice.status}</Text>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Text style={s.footerItem}>
            <Text style={s.footerLabel}>Month:</Text> {invoice.fee_month}
          </Text>
          <Text style={s.footerItem}>
            <Text style={s.footerLabel}>Due Date:</Text> <Text style={s.footerBoldValue}>{fmtDate(invoice.due_date)}</Text>
          </Text>
          <Text style={s.footerItem}>
            <Text style={s.footerLabel}>Late Fine:</Text> <Text style={s.footerBoldValue}>{fmtCurrency(invoice.fine_after_due, symbol)}</Text>
          </Text>
        </View>
        <View style={s.stampBox}>
          <Text style={s.stampText}>Signature</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main document: 3 invoices per A4 page (stacked vertically) ───────────────

interface Props {
  invoices: FeeInvoice[];
  school: School;
}

export function FeeInvoicePDF({ invoices, school }: Props) {
  // Group invoices: 3 per page
  const pages: FeeInvoice[][] = [];
  for (let i = 0; i < invoices.length; i += 3) {
    pages.push(invoices.slice(i, i + 3));
  }

  return (
    <Document
      title="Fee Invoices"
      author={school.name}
      subject="Fee Invoices"
    >
      {pages.map((pageInvoices, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          {school.logo_url && (
            <View style={s.watermark} fixed>
              <Image src={school.logo_url} style={s.watermarkImg} />
            </View>
          )}
          <View style={s.body}>
            {pageInvoices.map((invoice, invIdx) => (
              <InvoiceCard key={invoice.id ?? invIdx} invoice={invoice} school={school} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
