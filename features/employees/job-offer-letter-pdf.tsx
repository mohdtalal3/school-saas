import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import type { Employee, School } from "@/types/school.types";

// ── Premium palette ──────────────────────────────────────────────────────────
const NAVY = "#0b1d39"; // primary
const NAVY_DARK = "#050d1f"; // accent darker
const GOLD = "#c9a253"; // brand accent
const GOLD_LIGHT = "#e8d39e";
const INK = "#1f2937"; // body
const INK_SOFT = "#475569"; // body soft
const MUTED = "#94a3b8";
const LINE = "#e5e7eb";
const SOFT_BG = "#fafaf7"; // warm off-white
const TINT_BG = "#f5f3eb"; // light gold tint

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: "0 0 0 0",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    backgroundColor: "#ffffff",
  },

  // ── Top accent strip ─────────────────────────────────────────────────────────
  accentStrip: {
    height: 6,
    backgroundColor: NAVY,
    flexDirection: "row",
  },
  accentStripGold: { width: "30%", backgroundColor: GOLD },

  // ── Letter body container ────────────────────────────────────────────────────
  body: { padding: "36 54 60 54" },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  logoWrap: { marginRight: 16 },
  logo: { width: 68, height: 68, objectFit: "contain" },
  logoPlaceholder: {
    width: 68,
    height: 68,
    backgroundColor: SOFT_BG,
    borderWidth: 1,
    borderColor: GOLD_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 34,
  },
  logoInitial: { fontSize: 26, color: NAVY, fontFamily: "Helvetica-Bold" },
  schoolInfo: { flex: 1 },
  schoolName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 9.5,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 5,
  },
  contactRow: { flexDirection: "row", flexWrap: "wrap" },
  contactItem: { fontSize: 8.5, color: INK_SOFT, marginRight: 10 },
  contactLabel: { fontFamily: "Helvetica-Bold", color: NAVY },

  // ── Divider with gold rule ──────────────────────────────────────────────────
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: LINE },
  dividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginHorizontal: 8 },

  // ── Meta band ──────────────────────────────────────────────────────────────
  metaBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: TINT_BG,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: "8 14",
    marginBottom: 18,
  },
  metaCol: {},
  metaLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },

  // ── Title block ────────────────────────────────────────────────────────────
  titleBlock: { alignItems: "center", marginBottom: 22 },
  titleEyebrow: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 4,
    marginBottom: 4,
  },
  titleMain: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 3,
    marginBottom: 6,
  },
  titleUnderline: {
    width: 60,
    height: 2,
    backgroundColor: GOLD,
  },

  // ── Body copy ──────────────────────────────────────────────────────────────
  paragraph: { fontSize: 10.5, lineHeight: 1.6, marginBottom: 10, color: INK },
  paragraphStrong: { fontFamily: "Helvetica-Bold", color: NAVY },
  greeting: { fontSize: 11, marginBottom: 8, color: INK },

  // ── Section heading ────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionHeadTop: {
    // Used on the first section after a page break — adds breathing room
    // from the top of the page so the heading doesn't sit flush at the edge.
    marginTop: 56,
  },
  sectionHeadBar: { width: 3, height: 12, backgroundColor: GOLD, marginRight: 8 },
  sectionHeadText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── Particulars grid (2 columns) ──────────────────────────────────────────
  // Each gridRow is its own View so react-pdf either keeps it whole or pushes
  // it to the next page — it never breaks in the middle of a row.
  particularsGrid: {
    marginBottom: 18,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  gridCell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: SOFT_BG,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: LINE,
    overflow: "hidden",
  },
  gridCellLeft: {
    marginRight: 6,
  },
  gridCellLabel: {
    width: 92,
    padding: "7 8",
    backgroundColor: TINT_BG,
    borderRightWidth: 1,
    borderRightColor: GOLD_LIGHT,
    justifyContent: "center",
  },
  gridCellValue: {
    flex: 1,
    padding: "7 10",
    justifyContent: "center",
  },
  cellLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 0.6,
  },
  cellValue: { fontSize: 9.5, color: INK },
  cellValueHighlight: {
    fontSize: 9.5,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
  },

  // ── Terms list ─────────────────────────────────────────────────────────────
  listBlock: { marginBottom: 14 },
  listItem: { flexDirection: "row", marginBottom: 6 },
  listNumber: {
    width: 22,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
  },
  listText: { flex: 1, fontSize: 10, lineHeight: 1.6, color: INK },

  // ── Highlight callout ───────────────────────────────────────────────────────
  callout: {
    flexDirection: "row",
    backgroundColor: TINT_BG,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: "10 14",
    marginBottom: 14,
  },
  calloutIcon: {
    fontSize: 18,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginRight: 10,
  },
  calloutBody: { flex: 1 },
  calloutTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1,
    marginBottom: 2,
  },
  calloutText: { fontSize: 9.5, lineHeight: 1.5, color: INK_SOFT },

  // ── Acceptance & signatures ─────────────────────────────────────────────────
  acceptanceText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 6 },

  signaturesBlock: { flexDirection: "row", marginTop: 32 },
  sigBlock: { flex: 1 },
  sigBlockDivider: {
    borderTopWidth: 1.2,
    borderTopColor: NAVY,
    paddingTop: 6,
  },
  sigName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  sigRole: { fontSize: 8.5, color: MUTED, marginTop: 1 },

  // ── Bottom accent strip ─────────────────────────────────────────────────────
  bottomStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  bottomStripGold: { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD },
  bottomLeft: { fontSize: 7.5, color: "#ffffff", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  bottomRight: { fontSize: 7.5, color: GOLD_LIGHT, letterSpacing: 0.5 },

  // ── Watermark ───────────────────────────────────────────────────────────────
  watermark: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 80,
    color: "#f5f3eb",
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-30deg)",
    opacity: 0.5,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtCurrency(amount: number | null | undefined, symbol: string): string {
  if (amount == null) return "—";
  return `${symbol}${amount.toLocaleString()}`;
}

function fmtRules(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// ── Document ──────────────────────────────────────────────────────────────────

interface Props {
  employee: Employee;
  school: School;
}

export function JobOfferPDF({ employee, school }: Props) {
  const issuedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const refCode =
    employee.employee_code ?? employee.id.slice(0, 8).toUpperCase();
  const ruleLines = fmtRules(school.employee_rules);

  const gender = employee.gender
    ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)
    : null;

  // Build rows of 2 cells each; odd items get an empty second cell
  const tableRows: Array<{
    label: string;
    value: string | null | undefined;
    highlight?: boolean;
  }> = [
    { label: "Full Name", value: employee.name, highlight: true },
    { label: "Designation", value: employee.role, highlight: true },
    { label: "Father / Husband", value: employee.father_husband_name },
    { label: "Gender", value: gender },
    { label: "Religion", value: employee.religion },
    { label: "CNIC / ID", value: employee.cnic },
    { label: "Date of Birth", value: fmtDate(employee.date_of_birth) },
    { label: "Date of Joining", value: fmtDate(employee.date_of_joining), highlight: true },
    { label: "Education", value: employee.education },
    { label: "Experience", value: employee.experience },
    { label: "Phone", value: employee.phone },
    { label: "Email", value: employee.email },
    { label: "Address", value: employee.address },
    {
      label: "Monthly Compensation",
      value: fmtCurrency(employee.salary, school.currency_symbol),
      highlight: true,
    },
    { label: "Employee Code", value: employee.employee_code },
  ];

  const visibleRows = tableRows.filter((r) => r.value);

  // Pair rows into chunks of 2 for the 2-column grid
  const pairedRows: Array<[
    typeof tableRows[0] | null,
    typeof tableRows[0] | null,
  ]> = [];
  for (let i = 0; i < visibleRows.length; i += 2) {
    pairedRows.push([visibleRows[i] ?? null, visibleRows[i + 1] ?? null]);
  }

  return (
    <Document
      title={`Job Offer Letter – ${employee.name}`}
      author={school.name}
      subject="Job Offer Letter"
    >
      <Page size="A4" style={s.page}>
        {/* Faint watermark */}
        <Text style={s.watermark}>OFFER</Text>

        {/* Top accent strip */}
        <View style={s.accentStrip}>
          <View style={s.accentStripGold} />
        </View>

        <View style={s.body}>
          {/* ── Header ── */}
          <View style={s.header}>
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
              {school.tagline && <Text style={s.tagline}>{school.tagline}</Text>}
              <View style={s.contactRow}>
                {school.address && (
                  <Text style={s.contactItem}>
                    <Text style={s.contactLabel}>Address: </Text>
                    {school.address}
                  </Text>
                )}
                {school.phone && (
                  <Text style={s.contactItem}>
                    <Text style={s.contactLabel}>Phone: </Text>
                    {school.phone}
                  </Text>
                )}
                {school.email && (
                  <Text style={s.contactItem}>
                    <Text style={s.contactLabel}>Email: </Text>
                    {school.email}
                  </Text>
                )}
                {school.website && (
                  <Text style={s.contactItem}>
                    <Text style={s.contactLabel}>Web: </Text>
                    {school.website}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <View style={s.dividerDot} />
            <View style={s.dividerLine} />
          </View>

          {/* ── Meta band ── */}
          <View style={s.metaBand}>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>REFERENCE</Text>
              <Text style={s.metaValue}>{refCode}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>DATE OF ISSUE</Text>
              <Text style={s.metaValue}>{issuedDate}</Text>
            </View>
          </View>

          {/* ── Title ── */}
          <View style={s.titleBlock}>
            <Text style={s.titleEyebrow}>CONFIDENTIAL</Text>
            <Text style={s.titleMain}>JOB OFFER LETTER</Text>
            <View style={s.titleUnderline} />
          </View>

          {/* ── Salutation ── */}
          <Text style={s.greeting}>
            Dear <Text style={s.paragraphStrong}>{employee.name}</Text>,
          </Text>

          {/* ── Opening ── */}
          <Text style={s.paragraph}>
            On behalf of {school.name}, it is our distinct pleasure to extend
            to you this formal offer of employment for the position of{" "}
            <Text style={s.paragraphStrong}>{employee.role}</Text>. Following a
            careful review of your qualifications and experience, we are
            confident that you will make a meaningful contribution to our
            academic community.
          </Text>

          <Text style={s.paragraph}>
            This letter sets out the principal terms of your appointment. Please
            review it carefully and signify your acceptance by signing and
            returning a copy to the administration within seven (7) days.
          </Text>

          {/* ── Employee Particulars ── */}
          <View style={s.sectionHead}>
            <View style={s.sectionHeadBar} />
            <Text style={s.sectionHeadText}>Employee Particulars</Text>
          </View>

          <View style={s.particularsGrid}>
            {pairedRows.map((pair, rowIdx) => (
              <View key={rowIdx} style={s.gridRow}>
                {/* ── Left cell ── */}
                {pair[0] ? (
                  <View style={[s.gridCell, s.gridCellLeft]}>
                    <View style={s.gridCellLabel}>
                      <Text style={s.cellLabel}>
                        {pair[0].label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.gridCellValue}>
                      <Text
                        style={
                          pair[0].highlight
                            ? s.cellValueHighlight
                            : s.cellValue
                        }
                      >
                        {pair[0].value}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flex: 1, marginRight: 6 }} />
                )}

                {/* ── Right cell ── */}
                {pair[1] ? (
                  <View style={s.gridCell}>
                    <View style={s.gridCellLabel}>
                      <Text style={s.cellLabel}>
                        {pair[1].label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.gridCellValue}>
                      <Text
                        style={
                          pair[1].highlight
                            ? s.cellValueHighlight
                            : s.cellValue
                        }
                      >
                        {pair[1].value}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            ))}
          </View>

          {/* ── Terms of Employment (force new page) ── */}
          <View style={[s.sectionHead, s.sectionHeadTop]} break>
            <View style={s.sectionHeadBar} />
            <Text style={s.sectionHeadText}>Terms of Employment</Text>
          </View>

          <View style={s.listBlock}>
            <View style={s.listItem}>
              <Text style={s.listNumber}>01</Text>
              <Text style={s.listText}>
                You shall report to the Principal / Administration of the
                school and discharge all duties associated with the role of{" "}
                <Text style={s.paragraphStrong}>{employee.role}</Text>.
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>02</Text>
              <Text style={s.listText}>
                Your monthly compensation will be{" "}
                <Text style={s.paragraphStrong}>
                  {fmtCurrency(employee.salary, school.currency_symbol)}
                </Text>
                , payable in accordance with the school&apos;s payroll calendar
                and subject to applicable deductions and reviews per school
                policy.
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>03</Text>
              <Text style={s.listText}>
                Your appointment is effective from{" "}
                <Text style={s.paragraphStrong}>
                  {fmtDate(employee.date_of_joining)}
                </Text>
                .
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>04</Text>
              <Text style={s.listText}>
                Either party may terminate this employment by providing notice
                as stipulated by the school&apos;s HR policy or as required by
                applicable law.
              </Text>
            </View>
          </View>

          {/* ── Rules ── */}
          {ruleLines.length > 0 && (
            <>
              <View style={s.sectionHead}>
                <View style={s.sectionHeadBar} />
                <Text style={s.sectionHeadText}>Rules &amp; Regulations</Text>
              </View>
              <View style={s.listBlock}>
                {ruleLines.map((line, i) => (
                  <View key={i} style={s.listItem}>
                    <Text style={s.listNumber}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                    <Text style={s.listText}>
                      {line.replace(/^\d+[\.\)]\s*/, "")}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Acceptance callout ── */}
          <View style={s.callout}>
            <Text style={s.calloutIcon}>!</Text>
            <View style={s.calloutBody}>
              <Text style={s.calloutTitle}>ACCEPTANCE REQUIRED</Text>
              <Text style={s.calloutText}>
                Please confirm your acceptance of this offer by signing and
                returning a copy of this letter to the school administration
                within seven (7) days of receipt. Your signature below indicates
                your agreement with all terms outlined above.
              </Text>
            </View>
          </View>

          {/* ── Signatures ── */}
          <View style={s.signaturesBlock}>
            <View style={s.sigBlock}>
              <View style={s.sigBlockDivider}>
                <Text style={s.sigName}>For {school.name}</Text>
                <Text style={s.sigRole}>Principal / Administrator</Text>
              </View>
            </View>
            <View style={s.sigBlock}>
              <View style={s.sigBlockDivider}>
                <Text style={s.sigName}>{employee.name}</Text>
                <Text style={s.sigRole}>Employee Signature &amp; Date</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Bottom navy strip ── */}
        <View style={s.bottomStrip}>
          <View style={s.bottomStripGold} />
          <Text style={s.bottomLeft}>{school.name.toUpperCase()}</Text>
          <Text style={s.bottomRight}>
            REF: {refCode}  ·  ISSUED {issuedDate.toUpperCase()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
