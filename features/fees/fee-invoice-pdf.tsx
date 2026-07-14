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

  // 2x2 grid layout for 4 invoices per page
  body: {
    padding: "18 16 18 16",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    rowGap: 24,
  },

  // ── Invoice card — ~half width ──
  invoiceCard: {
    width: "48.5%",
    borderWidth: 1.5,
    borderColor: BLACK,
    marginBottom: 6,
  },

  // ── Header (stacked: school info row, then invoice meta bar) ──
  header: {
    padding: "5 8",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  logoWrap: { marginRight: 8 },
  logo: { width: 36, height: 36, objectFit: "contain" },
  logoPlaceholder: {
    width: 36, height: 36, backgroundColor: WHITE,
    borderWidth: 1, borderColor: BLACK,
    justifyContent: "center", alignItems: "center", borderRadius: 18,
  },
  logoInitial: { fontSize: 15, color: BLACK, fontFamily: "Helvetica-Bold" },
  schoolInfo: { flex: 1 },
  schoolName: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK,
    letterSpacing: 0.2, marginBottom: 0.5,
  },
  schoolTagline: { fontSize: 7, color: BLACK, marginBottom: 0.5 },
  schoolAddr: { fontSize: 6.5, color: BLACK },
  schoolPhone: { fontSize: 6.5, color: BLACK },

  // Invoice meta bar (below school info)
  metaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  metaLeft: { flexDirection: "row" },
  metaRight: { flexDirection: "row" },
  metaLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 2 },
  metaValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 10 },

  // ── Student bar ──
  studentBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "3 8",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  studentBar2: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  studentLeft: { flexDirection: "row", alignItems: "center" },
  studentRight: { flexDirection: "row", alignItems: "center" },
  fieldLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, marginRight: 3 },
  fieldValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  // ── Particulars table ──
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    padding: "3 8",
  },
  thLabel: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase" },
  thAmount: { width: 85, fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase", textAlign: "right" },

  tableRow: {
    flexDirection: "row",
    padding: "2 8",
    borderBottomWidth: 0.5,
    borderBottomColor: BLACK,
  },
  tdLabel: { flex: 1, fontSize: 8.5, color: BLACK },
  tdAmount: { width: 85, fontSize: 8.5, color: BLACK, textAlign: "right", fontFamily: "Helvetica-Bold" },
  fixedTag: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: BLACK,
    marginLeft: 3,
  },

  // ── Total row ──
  totalRow: {
    flexDirection: "row",
    padding: "3 8",
    borderTopWidth: 1.5,
    borderTopColor: BLACK,
  },
  totalLabel: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK, textTransform: "uppercase" },
  totalAmount: { width: 85, fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "3 8",
    borderTopWidth: 0.5,
    borderTopColor: BLACK,
  },
  footerLeft: { flex: 1 },
  footerItem: { fontSize: 7.5, color: BLACK, marginBottom: 0.5 },
  footerLabel: { fontFamily: "Helvetica-Bold", color: BLACK },
  footerBoldValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK },
  stampBox: {
    width: 60, height: 26, borderWidth: 0.5, borderColor: BLACK,
    justifyContent: "center", alignItems: "center",
  },
  stampText: { fontSize: 6, color: BLACK, textAlign: "center" },

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
  const particulars = parseParticulars(invoice.particulars);

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

      {/* Particulars */}
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={s.thLabel}>Particulars</Text>
          <Text style={s.thAmount}>Amount</Text>
        </View>
        {particulars.map((p, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdLabel}>
              {p.label}
            </Text>
            <Text style={s.tdAmount}>{fmtCurrency(p.amount, symbol)}</Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total Payable</Text>
        <Text style={s.totalAmount}>{fmtCurrency(invoice.total_amount, symbol)}</Text>
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

// ── Main document: 4 invoices per A4 page (2x2 grid) ──────────────────────────

interface Props {
  invoices: FeeInvoice[];
  school: School;
}

export function FeeInvoicePDF({ invoices, school }: Props) {
  // Group invoices: 4 per page
  const pages: FeeInvoice[][] = [];
  for (let i = 0; i < invoices.length; i += 4) {
    pages.push(invoices.slice(i, i + 4));
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
