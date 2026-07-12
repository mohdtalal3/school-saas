import type { Employee, School } from "@/types/school.types";
import type { IdCardTheme } from "./id-card-types";

// ── CR80 standard ID card size, used in PORTRAIT orientation ──────────────────
// CR80 = 85.6mm × 53.98mm (landscape). In portrait: 53.98mm wide × 85.6mm tall.
const CARD_W_MM = 53.98;
const CARD_H_MM = 85.6;

// Reference design (provided by the user) was authored at 340px card width.
// Every measurement below is scaled from that reference so the proportions
// match exactly, just mapped onto the real physical card size.
const SCALE = CARD_W_MM / 340;
const px = (n: number) => `${(n * SCALE).toFixed(3)}mm`;

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PAGE_MARGIN_MM = 10;
const GAP_MM = 6;

const COLS = Math.max(
  1,
  Math.floor((PAGE_W_MM - PAGE_MARGIN_MM * 2 + GAP_MM) / (CARD_W_MM + GAP_MM))
);
const ROWS = Math.max(
  1,
  Math.floor((PAGE_H_MM - PAGE_MARGIN_MM * 2 + GAP_MM) / (CARD_H_MM + GAP_MM))
);
const PER_PAGE = COLS * ROWS;

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function darken(hex: string, amount = 0.22): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  const dim = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${dim(r)}, ${dim(g)}, ${dim(b)})`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function cardHtml(employee: Employee, school: School, theme: IdCardTheme): string {
  const { textColor, accentColor, goldColor, bgColor } = theme;
  const accentDark = darken(accentColor);
  const initials = getInitials(employee.name);

  const logoInner = school.logo_url
    ? `<img src="${escapeHtml(school.logo_url)}" alt="" />`
    : `<div class="logo-initial">${escapeHtml(school.name.charAt(0).toUpperCase())}</div>`;

  const watermark = school.logo_url
    ? `<div class="watermark"><img src="${escapeHtml(school.logo_url)}" alt="" /></div>`
    : "";

  const photoInner = employee.photo_url
    ? `<img src="${escapeHtml(employee.photo_url)}" alt="" />`
    : `<div class="photo-initial">${escapeHtml(initials)}</div>`;

  const tagline = school.tagline
    ? `<div class="tag">${escapeHtml(school.tagline.toUpperCase())}</div>`
    : "";

  const rows: { label: string; value: string }[] = [
    { label: "Employee ID", value: escapeHtml(employee.employee_code) || "—" },
    { label: "Designation", value: escapeHtml(employee.role) },
    { label: "Phone", value: escapeHtml(employee.phone) || "—" },
    { label: "Joining Date", value: formatDate(employee.date_of_joining) },
  ];

  const rowsHtml = rows
    .map(
      (r) =>
        `<div class="row"><span class="label">${r.label}</span><span class="value">${r.value}</span></div>`
    )
    .join("");

  return `
  <div class="card" style="--accent:${accentColor};--accent-dark:${accentDark};--gold:${goldColor};--text:${textColor};--bg:${bgColor};">
    <div class="header">
      <div class="logo">${logoInner}</div>
      <div class="header-badge">STAFF ID</div>
    </div>
    ${watermark}
    <div class="content">
      <div class="school">${escapeHtml(school.name)}</div>
      ${tagline}
      <div class="photo">${photoInner}</div>
      <div class="name">${escapeHtml(employee.name)}</div>
      <div class="info">${rowsHtml}</div>
    </div>
    <div class="footer">
      ${school.phone ? `<div class="contact">&#9742; ${escapeHtml(school.phone)}</div>` : ""}
      ${school.address ? `<div class="address">${escapeHtml(school.address)}</div>` : ""}
    </div>
  </div>`;
}

export function buildIdCardsHtml(
  employees: Employee[],
  school: School,
  theme: IdCardTheme
): string {
  const pages: Employee[][] = [];
  for (let i = 0; i < employees.length; i += PER_PAGE) {
    pages.push(employees.slice(i, i + PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const pagesHtml = pages
    .map(
      (pageEmployees) =>
        `<div class="page">${pageEmployees
          .map((emp) => cardHtml(emp, school, theme))
          .join("")}</div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(school.name)} — Staff ID Cards</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Poppins', Helvetica, Arial, sans-serif; }
  @page { size: A4; margin: 0; }
  html, body { background:#fff; }

  .page {
    width: ${PAGE_W_MM}mm;
    height: ${PAGE_H_MM}mm;
    padding: ${PAGE_MARGIN_MM}mm;
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: ${GAP_MM}mm;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  .card {
    width: ${CARD_W_MM}mm;
    height: ${CARD_H_MM}mm;
    background: var(--bg);
    border-radius: ${px(28)};
    overflow: hidden;
    position: relative;
    box-shadow: 0 ${px(4)} ${px(10)} rgba(0,0,0,.15);
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
  }

  .header {
    flex: 0 0 auto;
    height: ${px(62)};
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    position: relative;
  }
  .header::after {
    content: "";
    position: absolute;
    left: 0; bottom: 0;
    width: 100%;
    height: ${px(4)};
    background: var(--gold);
  }
  .logo {
    position: absolute;
    left: 50%;
    bottom: ${px(-28)};
    transform: translateX(-50%);
    width: ${px(60)};
    height: ${px(60)};
    background: #fff;
    border-radius: 50%;
    padding: ${px(3)};
    box-shadow: 0 ${px(6)} ${px(16)} rgba(0,0,0,.2);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .logo img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
  .logo-initial {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    font-size: ${px(24)};
  }

  .watermark {
    position: absolute;
    left: 50%;
    top: ${px(105)};
    transform: translateX(-50%);
    opacity: .05;
    z-index: 0;
    pointer-events: none;
  }
  .watermark img { width: ${px(200)}; }

  .content {
    flex: 1 1 auto;
    overflow: hidden;
    padding: ${px(40)} ${px(18)} ${px(10)};
    position: relative;
    z-index: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .school { color: var(--accent); font-size: ${px(22)}; font-weight: 800; line-height: 1.15; }
  .tag { color: #666; font-size: ${px(10)}; margin-top: ${px(3)}; letter-spacing: 0.3px; }

  .header-badge {
    position: absolute;
    top: 50%;
    right: ${px(10)};
    transform: translateY(-50%);
    background: var(--gold);
    color: #fff;
    padding: ${px(4)} ${px(10)};
    border-radius: ${px(20)};
    font-size: ${px(10)};
    font-weight: 700;
    letter-spacing: 0.5px;
    z-index: 11;
  }

  .photo {
    width: ${px(95)};
    height: ${px(95)};
    margin: 0 auto ${px(12)};
    border-radius: 50%;
    overflow: hidden;
    border: ${px(3)} solid var(--gold);
    box-shadow: 0 ${px(6)} ${px(14)} rgba(0,0,0,.15);
    flex: 0 0 auto;
  }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .photo-initial {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: #f1f5f9;
    color: var(--accent);
    font-weight: 700;
    font-size: ${px(34)};
  }

  .name { color: var(--accent); font-size: ${px(19)}; font-weight: 700; line-height: 1.2; }
  .desig { color: var(--gold); font-weight: 600; font-size: ${px(13)}; margin-top: ${px(2)}; margin-bottom: ${px(10)}; }

  .info { margin-top: ${px(2)}; width: 100%; text-align: left; }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: ${px(6)};
    padding: ${px(7)} 0;
    border-bottom: 0.3px solid #ececec;
    font-size: ${px(11)};
  }
  .row .label { font-weight: 600; color: #666; white-space: nowrap; }
  .row .value {
    color: var(--text);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer {
    flex: 0 0 auto;
    background: var(--accent);
    color: #fff;
    text-align: center;
    padding: ${px(10)} ${px(8)};
  }
  .contact { font-weight: 600; font-size: ${px(13)}; }
  .address { font-size: ${px(10)}; margin-top: ${px(3)}; opacity: .9; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}
