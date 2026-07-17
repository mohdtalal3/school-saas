"use client";

import { Coffee, Pencil, Plus } from "lucide-react";
import type { ClassPeriod, ClassWeekday, TimetableEntry } from "@/types/school.types";

interface TimetableGridProps {
  days: ClassWeekday[];
  periods: ClassPeriod[];
  entries: TimetableEntry[];
  editable?: boolean;
  onCellClick?: (period: ClassPeriod, entry?: TimetableEntry) => void;
  rowKey?: (period: ClassPeriod) => string | number;
  rowLabel?: (period: ClassPeriod) => string;
  rowMeta?: (period: ClassPeriod) => string;
  secondaryText?: (entry: TimetableEntry) => string;
  emptyCellText?: string;
}

export function TimetableGrid({
  days,
  periods,
  entries,
  editable = false,
  onCellClick,
  rowKey = (period) => period.position,
  rowLabel = (period) => period.label,
  rowMeta = (period) => `Position ${period.position}`,
  secondaryText = (entry) => entry.teacher?.name ?? "Teacher not selected",
  emptyCellText = "Not assigned",
}: TimetableGridProps) {
  const workingDays = days
    .filter((row) => !row.weekday?.is_weekend)
    .sort((a, b) => (a.weekday?.sort_order ?? 0) - (b.weekday?.sort_order ?? 0));
  const keys = Array.from(new Set(periods.map(rowKey)));
  const rows = keys
    .map((key) => ({ key, period: periods.find((period) => rowKey(period) === key)! }))
    .sort((a, b) => a.period.start_time.localeCompare(b.period.start_time) || a.period.position - b.period.position);

  return <div className="overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[850px] table-fixed text-sm">
      <thead className="bg-muted/60"><tr><th className="w-36 px-3 py-3 text-left">Period</th>{workingDays.map((row) => <th key={row.id} className="px-3 py-3 text-left">{row.weekday?.name}</th>)}</tr></thead>
      <tbody>{rows.map(({ key, period: representative }) => <tr key={String(key)} className="border-t align-top">
        <td className="bg-muted/20 px-3 py-4 font-medium">{rowLabel(representative)}<span className="mt-1 block text-xs font-normal text-muted-foreground">{rowMeta(representative)}</span></td>
        {workingDays.map((day) => {
          const period = periods.find((candidate) => candidate.weekday_id === day.weekday_id && rowKey(candidate) === key);
          if (!period) return <td key={day.id} className="px-2 py-3 text-center text-xs text-muted-foreground">No time</td>;
          const entry = entries.find((candidate) => candidate.class_period_id === period.id);
          const content = <><span className="block text-xs text-muted-foreground">{period.start_time.slice(0, 5)} – {period.end_time.slice(0, 5)}</span>{entry ? entry.is_break ? <span className="mt-3 flex items-center gap-2 font-medium text-amber-700"><Coffee className="h-4 w-4" />Break</span> : <><span className="mt-2 block font-semibold">{entry.class_subject?.subject?.name}</span><span className="block text-xs text-muted-foreground">{secondaryText(entry)}</span>{editable && <Pencil className="mt-2 h-3.5 w-3.5 text-muted-foreground" />}</> : <span className="mt-3 flex items-center justify-center gap-1 text-muted-foreground">{editable && <Plus className="h-4 w-4" />}{emptyCellText}</span>}</>;
          return <td key={day.id} className="px-2 py-3">{editable ? <button type="button" onClick={() => onCellClick?.(period, entry)} className="min-h-24 w-full rounded-lg border border-dashed p-3 text-left transition-colors hover:border-primary hover:bg-primary/5">{content}</button> : <div className="min-h-24 rounded-lg border bg-background p-3 text-left">{content}</div>}</td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}
