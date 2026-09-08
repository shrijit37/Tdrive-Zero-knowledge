"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { SystemStatus, StructuredResponse } from "@/types";
import { ShieldAlert, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui";

export function IntegrityBanner() {
  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<SystemStatus>>("/system/status");
      return resp.data.data;
    },
    refetchInterval: 30000,
  });

  const integrity = status?.integrity;

  if (!integrity || !integrity.safe_mode) return null;

  return (
    <div className={cn(
      "w-full px-4 py-1.5 flex items-center justify-center gap-2.5 text-[11px] font-semibold animate-slide-up",
      integrity.message.includes("CI Environment")
        ? "bg-status-info text-white"
        : "bg-destructive text-white"
    )}>
      {integrity.message.includes("CI Environment") ? (
        <Info size={13} className="shrink-0" />
      ) : (
        <ShieldAlert size={13} className="shrink-0 animate-pulse" />
      )}

      <span className="truncate">{integrity.message}</span>

      {(integrity.state === "LOCKED" || integrity.state === "SAFE_MODE") && !integrity.message.includes("CI") ? (
        <div className="hidden sm:flex items-center gap-2 border-l border-white/20 pl-2.5 ml-1">
           <code className="kbd !bg-white/10 !border-white/15 !text-white/80 !shadow-none text-[9px]">tdrive verify-instance</code>
        </div>
      ) : null}
    </div>
  );
}
