"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IdCardsClient } from "./id-cards-client";
import type { IdCardTheme } from "./id-card-types";

const DEFAULT_THEME: IdCardTheme = {
  textColor: "#1f2937",
  accentColor: "#243c8b",
  goldColor: "#c89a2b",
  bgColor: "#ffffff",
};

interface IdCardsTabProps {
  schoolId: string;
}

export function IdCardsTab({ schoolId }: IdCardsTabProps) {
  return (
    <IdCardsClient
      schoolId={schoolId}
      initialTheme={DEFAULT_THEME}
    />
  );
}