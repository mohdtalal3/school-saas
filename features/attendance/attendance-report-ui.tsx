"use client";

import { CalendarRange, CheckCircle2, Clock3, DoorOpen, Percent, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttendanceStats } from "@/types/school.types";

export function AttendanceDateRange({ startDate, endDate, onStartDateChange, onEndDateChange, maxDate }: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  maxDate: string;
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-1.5"><Label htmlFor="attendance-start-date">From</Label><Input id="attendance-start-date" type="date" value={startDate} max={endDate || maxDate} onChange={(event) => onStartDateChange(event.target.value)} /></div>
    <div className="space-y-1.5"><Label htmlFor="attendance-end-date">To</Label><Input id="attendance-end-date" type="date" value={endDate} min={startDate} max={maxDate} onChange={(event) => onEndDateChange(event.target.value)} /></div>
  </div>;
}

export function AttendanceStatsCards({ stats }: { stats: AttendanceStats }) {
  const cards = [
    { label: "Present", value: stats.present, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Absent", value: stats.absent, icon: UserX, color: "text-red-600" },
    { label: "Late", value: stats.late, icon: Clock3, color: "text-amber-600" },
    { label: "Leave", value: stats.leave, icon: DoorOpen, color: "text-blue-600" },
    { label: "Marked Days", value: stats.marked, icon: CalendarRange, color: "text-violet-600" },
    { label: "Attendance", value: `${stats.attendanceRate}%`, icon: Percent, color: "text-primary" },
  ];
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map((item) => { const Icon = item.icon; return <Card key={item.label}><CardContent className="flex items-center gap-3 p-4"><Icon className={`h-5 w-5 ${item.color}`} /><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-xl font-semibold">{item.value}</p></div></CardContent></Card>; })}</div>;
}
