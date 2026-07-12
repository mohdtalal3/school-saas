import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Employee, School } from "@/types/school.types";

// ── Theme (user can change anytime) ──────────────────────────────────────────
// textColor — color of body text on the card
// accentColor — color of the top stripe / branding accent
// bgColor — background tint of the card body
export interface IdCardTheme {
  textColor: string;
  accentColor: string;
  bgColor: string;
}

export const DEFAULT_ID_CARD_THEME: IdCardTheme = {
  textColor: "#1f2937",
  accentColor: "#0b1d39",
  bgColor: "#ffffff",
};

export type IdCardOrientation = "portrait" | "landscape";

interface Props {
  employees: Employee[];
  school: School;
  orientation: IdCardOrientation;
  theme: IdCardTheme;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// CR80 standard ID card size = 85.6mm × 53.98mm (~3.375" × 2.125")
// Convert to points: 1mm ≈ 2.8346457pt
const MM_TO_PT = 2.8346457;
const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;

// A4 = 210 × 297 mm
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

// Margins (mm)
const MARGIN_MM = 10;
const GUTTER_MM = 6;

// Number of cards per page = 6 (2 cols × 3 rows OR 3 cols × 2 rows)
const COLS = 2;
const ROWS = 3;

// ── Page geometry based on orientation ───────────────────────────────────────

function getPageLayout(orientation: IdCardOrientation) {
  // We use a fixed A4 page, just choose landscape or portrait
  const isLandscape = orientation === "landscape";
  const pageW = isLandscape ? PAGE_H_MM : PAGE_W_MM;
  const pageH = isLandscape ? PAGE_W_MM : PAGE_H_MM;

  const usableW = pageW - MARGIN_MM * 2;
  const usableH = pageH - MARGIN_MM * 2;

  const cardW = (usableW - GUTTER_MM * (COLS - 1)) / COLS;
  const cardH = (usableH - GUTTER_MM * (ROWS - 1)) / ROWS;

  return {
    isLandscape,
    pageSize: (isLandscape ? [PAGE_H_MM, PAGE_W_MM] : [PAGE_W_MM, PAGE_H_MM]) as [
      number,
      number,
    ],
    pagePadding: MARGIN_MM * MM_TO_PT,
    pageWidthPt: pageW * MM_TO_PT,
    pageHeightPt: pageH * MM_TO_PT,
    cardWidthPt: cardW * MM_TO_PT,
    cardHeightPt: cardH * MM_TO_PT,
    gutterPt: GUTTER_MM * MM_TO_PT,
  };
}

// ── Styles (built dynamically per render so theme/orientation propagate) ─────

function buildStyles(layout: ReturnType<typeof getPageLayout>, theme: IdCardTheme) {
  const { cardWidthPt, cardHeightPt, gutterPt } = layout;
  const { textColor, accentColor, bgColor } = theme;

  return StyleSheet.create({
    page: {
      paddingTop: layout.pagePadding,
      paddingBottom: layout.pagePadding,
      paddingLeft: layout.pagePadding,
      paddingRight: layout.pagePadding,
      fontFamily: "Helvetica",
      color: textColor,
      backgroundColor: "#ffffff",
    },

    gridRow: {
      flexDirection: "row",
      marginBottom: gutterPt,
    },
    gridRowLast: {
      flexDirection: "row",
    },

    // The card frame
    card: {
      width: cardWidthPt,
      height: cardHeightPt,
      backgroundColor: bgColor,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 6,
      overflow: "hidden",
      flexDirection: "column",
      marginRight: gutterPt,
    },
    cardLast: {
      marginRight: 0,
    },

    // Top accent bar
    accentBar: {
      height: 5,
      backgroundColor: accentColor,
      width: "100%",
    },

    // Card body: column layout — header + main + footer
    cardBody: {
      flex: 1,
      padding: 6,
      flexDirection: "column",
    },

    // School name row at top
    schoolRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    logo: {
      width: 14,
      height: 14,
      objectFit: "contain",
      marginRight: 4,
    },
    logoPlaceholder: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: accentColor,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },
    logoInitial: {
      fontSize: 7,
      color: "#ffffff",
      fontFamily: "Helvetica-Bold",
    },
    schoolName: {
      flex: 1,
      fontSize: 7.5,
      fontFamily: "Helvetica-Bold",
      color: textColor,
      letterSpacing: 0.3,
    },
    idLabel: {
      fontSize: 6,
      color: textColor,
      opacity: 0.55,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 1,
    },

    // Main row: photo on left, info on right
    mainRow: {
      flexDirection: "row",
      flex: 1,
      marginTop: 2,
    },

    photoWrap: {
      width: cardHeightPt * 0.55, // roughly square
      height: cardHeightPt * 0.55,
      borderRadius: 4,
      backgroundColor: "#f3f4f6",
      borderWidth: 0.5,
      borderColor: "#e5e7eb",
      marginRight: 6,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    photo: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    photoInitial: {
      fontSize: 18,
      color: accentColor,
      fontFamily: "Helvetica-Bold",
    },

    infoCol: {
      flex: 1,
      justifyContent: "space-between",
    },

    name: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: textColor,
      marginBottom: 2,
    },
    designation: {
      fontSize: 8,
      color: textColor,
      opacity: 0.75,
      marginBottom: 4,
    },

    // Field rows
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 1.5,
    },
    fieldIcon: {
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      color: accentColor,
      width: 8,
    },
    fieldLabel: {
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      color: textColor,
      opacity: 0.6,
      letterSpacing: 0.4,
      width: 28,
      marginRight: 3,
    },
    fieldValue: {
      flex: 1,
      fontSize: 7,
      color: textColor,
    },

    // Footer: address + emp code
    footer: {
      borderTopWidth: 0.5,
      borderTopColor: "#e5e7eb",
      paddingTop: 3,
      marginTop: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    address: {
      flex: 1,
      fontSize: 5.5,
      color: textColor,
      opacity: 0.7,
      paddingRight: 4,
    },
    empCodeBadge: {
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      backgroundColor: accentColor,
      paddingVertical: 1.5,
      paddingHorizontal: 4,
      borderRadius: 2,
      letterSpacing: 0.3,
    },
  });
}

// ── Card component ───────────────────────────────────────────────────────────

function IdCard({
  employee,
  school,
  styles,
}: {
  employee: Employee;
  school: School;
  styles: ReturnType<typeof buildStyles>;
}) {
  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />

      <View style={styles.cardBody}>
        {/* School header */}
        <View style={styles.schoolRow}>
          {school.logo_url ? (
            <Image src={school.logo_url} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoInitial}>
                {school.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.schoolName}>
            {school.name}
          </Text>
          <Text style={styles.idLabel}>ID CARD</Text>
        </View>

        {/* Photo + info */}
        <View style={styles.mainRow}>
          <View style={styles.photoWrap}>
            {employee.photo_url ? (
              <Image src={employee.photo_url} style={styles.photo} />
            ) : (
              <Text style={styles.photoInitial}>{initials}</Text>
            )}
          </View>

          <View style={styles.infoCol}>
            <View>
              <Text style={styles.name} numberOfLines={1}>
                {employee.name}
              </Text>
              <Text style={styles.designation} numberOfLines={1}>
                {employee.role}
              </Text>
            </View>

            {school.phone && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>SCHOOL</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {school.phone}
                </Text>
              </View>
            )}
            {employee.phone && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>PHONE</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {employee.phone}
                </Text>
              </View>
            )}
            {employee.email && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {employee.email}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.address} numberOfLines={1}>
            {school.address ?? ""}
          </Text>
          {employee.employee_code && (
            <Text style={styles.empCodeBadge}>{employee.employee_code}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Document ─────────────────────────────────────────────────────────────────

export function IdCardPDF({ employees, school, orientation, theme }: Props) {
  const layout = getPageLayout(orientation);
  const styles = buildStyles(layout, theme);

  // Split into pages of 6 cards each
  const PER_PAGE = 6;
  const pages: Employee[][] = [];
  for (let i = 0; i < employees.length; i += PER_PAGE) {
    pages.push(employees.slice(i, i + PER_PAGE));
  }

  return (
    <Document
      title={`Employee ID Cards – ${school.name}`}
      author={school.name}
      subject="Staff ID Cards"
    >
      {pages.map((pageEmployees, pageIdx) => {
        // Group into rows of 2 (cols are always 2 — only orientation of the PAGE changes)
        const rows: Employee[][] = [];
        for (let i = 0; i < pageEmployees.length; i += COLS) {
          rows.push(pageEmployees.slice(i, i + COLS));
        }

        return (
          <Page
            key={pageIdx}
            size={layout.pageSize}
            orientation={layout.isLandscape ? "landscape" : "portrait"}
            style={styles.page}
          >
            {rows.map((rowEmployees, rowIdx) => (
              <View
                key={rowIdx}
                style={rowIdx === rows.length - 1 ? styles.gridRowLast : styles.gridRow}
              >
                {rowEmployees.map((emp, colIdx) => (
                  <View
                    key={emp.id}
                    style={colIdx === COLS - 1 ? { marginRight: 0 } : undefined}
                  >
                    <IdCard employee={emp} school={school} styles={styles} />
                  </View>
                ))}
                {/* If odd count in row, render empty placeholder for spacing */}
                {rowEmployees.length < COLS && (
                  <View style={{ width: layout.cardWidthPt }} />
                )}
              </View>
            ))}
          </Page>
        );
      })}
    </Document>
  );
}