// ── ID Card theme ─────────────────────────────────────────────────────────────
// accentColor — primary brand color (header gradient, name, badge, footer)
// goldColor   — secondary accent (header underline, tagline-free accent line,
//               designation text, photo ring)
// textColor   — body text color (row values)
// bgColor     — card background
export interface IdCardTheme {
  textColor: string;
  accentColor: string;
  goldColor: string;
  bgColor: string;
}

export const DEFAULT_ID_CARD_THEME: IdCardTheme = {
  textColor: "#1f2937",
  accentColor: "#243c8b",
  goldColor: "#c89a2b",
  bgColor: "#ffffff",
};
