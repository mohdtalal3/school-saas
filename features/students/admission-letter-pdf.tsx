import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { StudentWithClass, School } from "@/types/school.types";

// ── Premium palette (matches job offer letter) ───────────────────────────────
const NAVY = "#243c8b";
const NAVY_DARK = "#1d2f73";
const GOLD = "#c89a2b";
const GOLD_LIGHT = "#e8d39e";
const INK = "#1f2937";
const INK_SOFT = "#475569";
const MUTED = "#94a3b8";
const LINE = "#e5e7eb";
const SOFT_BG = "#fafaf7";
const TINT_BG = "#f5f3eb";

const s = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    backgroundColor: "#ffffff",
  },

  accentStrip: { height: 6, backgroundColor: NAVY, flexDirection: "row" },
  accentStripGold: { width: "30%", backgroundColor: GOLD },

  body: { padding: "36 54 60 54" },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  logoWrap: { marginRight: 16 },
  logo: { width: 68, height: 68, objectFit: "contain" },
  logoPlaceholder: {
    width: 68, height: 68, backgroundColor: SOFT_BG,
    borderWidth: 1, borderColor: GOLD_LIGHT,
    justifyContent: "center", alignItems: "center", borderRadius: 34,
  },
  logoInitial: { fontSize: 26, color: NAVY, fontFamily: "Helvetica-Bold" },
  schoolInfo: { flex: 1 },
  schoolName: {
    fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY,
    letterSpacing: 0.5, marginBottom: 2,
  },
  tagline: { fontSize: 9.5, color: INK_SOFT, fontStyle: "italic", marginBottom: 5 },
  contactRow: { flexDirection: "row", flexWrap: "wrap" },
  contactItem: { fontSize: 8.5, color: INK_SOFT, marginRight: 10 },
  contactLabel: { fontFamily: "Helvetica-Bold", color: NAVY },

  divider: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: LINE },
  dividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginHorizontal: 8 },

  metaBand: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: TINT_BG, borderLeftWidth: 3, borderLeftColor: GOLD,
    padding: "8 14", marginBottom: 18,
  },
  metaCol: {},
  metaLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD,
    letterSpacing: 1, marginBottom: 2,
  },
  metaValue: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },

  titleBlock: { alignItems: "center", marginBottom: 22 },
  titleEyebrow: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD,
    letterSpacing: 4, marginBottom: 4,
  },
  titleMain: {
    fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY,
    letterSpacing: 3, marginBottom: 6,
  },
  titleUnderline: { width: 60, height: 2, backgroundColor: GOLD },

  paragraph: { fontSize: 10.5, lineHeight: 1.6, marginBottom: 10, color: INK },
  paragraphStrong: { fontFamily: "Helvetica-Bold", color: NAVY },
  greeting: { fontSize: 11, marginBottom: 8, color: INK },

  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 8 },
  sectionHeadTop: { marginTop: 56 },
  sectionHeadBar: { width: 3, height: 12, backgroundColor: GOLD, marginRight: 8 },
  sectionHeadText: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY,
    letterSpacing: 1.5, textTransform: "uppercase",
  },

  particularsGrid: { marginBottom: 18 },
  gridRow: { flexDirection: "row", marginBottom: 6 },
  gridCell: {
    flex: 1, flexDirection: "row", backgroundColor: SOFT_BG,
    borderRadius: 3, borderWidth: 1, borderColor: LINE, overflow: "hidden",
  },
  gridCellLeft: { marginRight: 6 },
  gridCellLabel: {
    width: 92, padding: "7 8", backgroundColor: TINT_BG,
    borderRightWidth: 1, borderRightColor: GOLD_LIGHT, justifyContent: "center",
  },
  gridCellValue: { flex: 1, padding: "7 10", justifyContent: "center" },
  cellLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.6,
  },
  cellValue: { fontSize: 9.5, color: INK },
  cellValueHighlight: { fontSize: 9.5, color: NAVY, fontFamily: "Helvetica-Bold" },

  listBlock: { marginBottom: 14 },
  listItem: { flexDirection: "row", marginBottom: 6 },
  listNumber: { width: 22, fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD },
  listText: { flex: 1, fontSize: 10, lineHeight: 1.6, color: INK },

  callout: {
    flexDirection: "row", backgroundColor: TINT_BG,
    borderLeftWidth: 3, borderLeftColor: GOLD, padding: "10 14", marginBottom: 14,
  },
  calloutIcon: { fontSize: 18, color: GOLD, fontFamily: "Helvetica-Bold", marginRight: 10 },
  calloutBody: { flex: 1 },
  calloutTitle: {
    fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY,
    letterSpacing: 1, marginBottom: 2,
  },
  calloutText: { fontSize: 9.5, lineHeight: 1.5, color: INK_SOFT },

  acceptanceText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 6 },

  signaturesBlock: { flexDirection: "row", marginTop: 32 },
  sigBlock: { flex: 1 },
  sigBlockDivider: { borderTopWidth: 1.2, borderTopColor: NAVY, paddingTop: 6 },
  sigName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  sigRole: { fontSize: 8.5, color: MUTED, marginTop: 1 },

  bottomStrip: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 28,
    backgroundColor: NAVY, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, justifyContent: "space-between",
  },
  bottomStripGold: { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD },
  bottomLeft: { fontSize: 7.5, color: "#ffffff", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  bottomRight: { fontSize: 7.5, color: GOLD_LIGHT, letterSpacing: 0.5 },

  watermark: {
    position: "absolute", top: "50%", left: 0, right: 0,
    textAlign: "center", marginTop: -150, opacity: 0.06,
  },
  watermarkImg: {
    width: 300, height: 300, objectFit: "contain",
    marginLeft: "auto", marginRight: "auto",
  },
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
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
  return text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
}

interface Props {
  student: StudentWithClass;
  school: School;
}

export function AdmissionLetterPDF({ student, school }: Props) {
  const issuedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const refCode = student.registration_no ?? student.id.slice(0, 8).toUpperCase();
  const ruleLines = fmtRules(school.student_rules);

  const gender = student.gender
    ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1)
    : null;

  const monthlyFee = student.class_fee != null
    ? student.class_fee - (student.discount ?? 0)
    : null;

  const tableRows: Array<{
    label: string;
    value: string | null | undefined;
    highlight?: boolean;
  }> = [
    { label: "Full Name", value: student.name, highlight: true },
    { label: "Class", value: student.class_name, highlight: true },
    { label: "Registration No", value: student.registration_no, highlight: true },
    { label: "Father / Guardian", value: student.father_name },
    { label: "Father CNIC", value: student.father_nic },
    { label: "Father Profession", value: student.father_profession },
    { label: "Gender", value: gender },
    { label: "Date of Birth", value: fmtDate(student.date_of_birth) },
    { label: "Blood Group", value: student.blood_group },
    { label: "Religion", value: student.religion },
    { label: "Mobile", value: student.mobile },
    { label: "Date of Admission", value: fmtDate(student.date_of_admission), highlight: true },
    { label: "Address", value: student.address },
    {
      label: "Monthly Fee",
      value: fmtCurrency(student.class_fee, school.currency_symbol),
      highlight: true,
    },
    {
      label: "Discount",
      value: student.discount > 0
        ? fmtCurrency(student.discount, school.currency_symbol)
        : "—",
    },
    {
      label: "Net Fee Payable",
      value: fmtCurrency(monthlyFee, school.currency_symbol),
      highlight: true,
    },
  ];

  const visibleRows = tableRows.filter((r) => r.value && r.value !== "—");

  const pairedRows: Array<[typeof tableRows[0] | null, typeof tableRows[0] | null]> = [];
  for (let i = 0; i < visibleRows.length; i += 2) {
    pairedRows.push([visibleRows[i] ?? null, visibleRows[i + 1] ?? null]);
  }

  return (
    <Document
      title={`Admission Letter – ${student.name}`}
      author={school.name}
      subject="Student Admission Letter"
    >
      <Page size="A4" style={s.page}>
        {school.logo_url && (
          <View style={s.watermark} fixed>
            <Image src={school.logo_url} style={s.watermarkImg} />
          </View>
        )}

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
              <Text style={s.metaLabel}>REGISTRATION</Text>
              <Text style={s.metaValue}>{refCode}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>DATE OF ISSUE</Text>
              <Text style={s.metaValue}>{issuedDate}</Text>
            </View>
          </View>

          {/* ── Title ── */}
          <View style={s.titleBlock}>
            <Text style={s.titleEyebrow}>OFFICIAL</Text>
            <Text style={s.titleMain}>ADMISSION LETTER</Text>
            <View style={s.titleUnderline} />
          </View>

          {/* ── Salutation ── */}
          <Text style={s.greeting}>
            Dear <Text style={s.paragraphStrong}>{student.father_name ?? "Parent / Guardian"}</Text>,
          </Text>

          {/* ── Opening ── */}
          <Text style={s.paragraph}>
            On behalf of {school.name}, it is our distinct pleasure to confirm
            the admission of <Text style={s.paragraphStrong}>{student.name}</Text>
            {student.class_name ? (
              <> to <Text style={s.paragraphStrong}>{student.class_name}</Text></>
            ) : null}
            . Following a review of the application and supporting documents, we
            are delighted to welcome your child to our academic community.
          </Text>

          <Text style={s.paragraph}>
            This letter serves as formal confirmation of enrollment. Please
            review the particulars below and retain this document for your
            records.
          </Text>

          {/* ── Student Particulars ── */}
          <View style={s.sectionHead}>
            <View style={s.sectionHeadBar} />
            <Text style={s.sectionHeadText}>Student Particulars</Text>
          </View>

          <View style={s.particularsGrid}>
            {pairedRows.map((pair, rowIdx) => (
              <View key={rowIdx} style={s.gridRow}>
                {pair[0] ? (
                  <View style={[s.gridCell, s.gridCellLeft]}>
                    <View style={s.gridCellLabel}>
                      <Text style={s.cellLabel}>{pair[0].label.toUpperCase()}</Text>
                    </View>
                    <View style={s.gridCellValue}>
                      <Text style={pair[0].highlight ? s.cellValueHighlight : s.cellValue}>
                        {pair[0].value}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flex: 1, marginRight: 6 }} />
                )}
                {pair[1] ? (
                  <View style={s.gridCell}>
                    <View style={s.gridCellLabel}>
                      <Text style={s.cellLabel}>{pair[1].label.toUpperCase()}</Text>
                    </View>
                    <View style={s.gridCellValue}>
                      <Text style={pair[1].highlight ? s.cellValueHighlight : s.cellValue}>
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

          {/* ── Terms of Enrollment (force new page) ── */}
          <View style={[s.sectionHead, s.sectionHeadTop]} break>
            <View style={s.sectionHeadBar} />
            <Text style={s.sectionHeadText}>Terms of Enrollment</Text>
          </View>

          <View style={s.listBlock}>
            <View style={s.listItem}>
              <Text style={s.listNumber}>01</Text>
              <Text style={s.listText}>
                The student is enrolled in{" "}
                <Text style={s.paragraphStrong}>{student.class_name ?? "the school"}</Text>
                {" "}effective from{" "}
                <Text style={s.paragraphStrong}>
                  {fmtDate(student.date_of_admission)}
                </Text>
                .
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>02</Text>
              <Text style={s.listText}>
                The monthly tuition fee is{" "}
                <Text style={s.paragraphStrong}>
                  {fmtCurrency(student.class_fee, school.currency_symbol)}
                </Text>
                {student.discount > 0 ? (
                  <>
                    , with a discount of{" "}
                    <Text style={s.paragraphStrong}>
                      {fmtCurrency(student.discount, school.currency_symbol)}
                    </Text>
                    , resulting in a net payable of{" "}
                    <Text style={s.paragraphStrong}>
                      {fmtCurrency(monthlyFee, school.currency_symbol)}
                    </Text>
                  </>
                ) : null}
                . Fees are payable in accordance with the school&apos;s fee
                schedule.
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>03</Text>
              <Text style={s.listText}>
                The student must adhere to all school rules, attendance
                requirements, and codes of conduct as stipulated by the
                institution.
              </Text>
            </View>
            <View style={s.listItem}>
              <Text style={s.listNumber}>04</Text>
              <Text style={s.listText}>
                Either party may terminate this enrollment by providing notice
                as stipulated by the school&apos;s admission policy.
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
              <Text style={s.calloutTitle}>ACKNOWLEDGEMENT REQUIRED</Text>
              <Text style={s.calloutText}>
                Please sign and return a copy of this letter to the school
                administration to confirm your acceptance of the enrollment
                terms. Your signature indicates agreement with all terms
                outlined above.
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
                <Text style={s.sigName}>{student.father_name ?? "Parent / Guardian"}</Text>
                <Text style={s.sigRole}>Parent / Guardian Signature &amp; Date</Text>
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
