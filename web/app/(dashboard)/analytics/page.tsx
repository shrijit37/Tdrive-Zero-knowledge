"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Database,
  Files,
  Trash2,
  HardDrive,
  BarChart3,
  TrendingUp,
  Folder,
  File as FileIcon,
  ChevronRight,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import {
  StructuredResponse,
  StorageOverview,
  FileTypeStats,
  FileItem,
  FolderAnalytics,
  GrowthMetrics,
} from "@/types";
import { cn } from "@/components/ui";
import { formatLocalTime } from "@/lib/utils";

const CHART_COLORS = ["#6CB4EE", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#64748B"];

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<StorageOverview>>("/analytics/overview");
      return resp.data.data;
    },
  });

  const { data: fileTypes } = useQuery({
    queryKey: ["analytics-file-types"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<FileTypeStats[]>>("/analytics/file-types");
      return resp.data.data;
    },
  });

  const { data: largestFiles } = useQuery({
    queryKey: ["analytics-largest-files"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<FileItem[]>>("/analytics/largest-files");
      return resp.data.data;
    },
  });

  const { data: largestFolders } = useQuery({
    queryKey: ["analytics-largest-folders"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<FolderAnalytics[]>>("/analytics/largest-folders");
      return resp.data.data;
    },
  });

  const { data: growth } = useQuery({
    queryKey: ["analytics-growth"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<GrowthMetrics>>("/analytics/growth");
      return resp.data.data;
    },
  });

  const { data: recentlyUploaded } = useQuery({
    queryKey: ["analytics-recent"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<FileItem[]>>("/analytics/recent");
      return resp.data.data;
    },
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const chartData = fileTypes?.map((t) => ({
    name: t.category,
    value: t.size,
  })) || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-none pb-16 md:pb-6">
      {/* Header */}
      <header className="px-5 pt-6 pb-5 md:px-8 md:pt-8 md:pb-6 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">
            Storage Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Insights across your encrypted cloud.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground bg-surface-1 px-3 py-1.5 rounded-md border border-border/50">
          <div className="accent-dot bg-status-success animate-pulse" />
          <span>System synced</span>
        </div>
      </header>

      <div className="px-5 md:px-8 space-y-5 md:space-y-6">
        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
          <StatCard
            label="Total Files"
            value={overview?.total_files.toLocaleString() || "0"}
            icon={Files}
            color="blue"
          />
          <StatCard
            label="Active Space"
            value={formatSize(overview?.total_size || 0)}
            icon={HardDrive}
            color="green"
          />
          <StatCard
            label="Trash Bin"
            value={formatSize(overview?.trash_size || 0)}
            icon={Trash2}
            color="rose"
          />
          <StatCard
            label="Cloud Limit"
            value="Unlimited"
            icon={Database}
            color="amber"
          />
        </section>

        {/* Intelligence Section */}
        <section className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
            {/* Chart + Legend */}
            <div className="lg:col-span-7 p-5 md:p-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">File Distribution</h2>
                <BarChart3 size={15} className="text-muted-foreground/40" />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="w-full md:w-1/2 aspect-square max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatSize(Number(value || 0))}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "#141416",
                          color: "#F7F8F8",
                          fontSize: "11px",
                          fontWeight: 600,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full md:w-1/2 space-y-3">
                  {fileTypes?.map((stat, i) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">{stat.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">{stat.percentage.toFixed(0)}%</span>
                        <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{formatSize(stat.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Growth + Tip */}
            <div className="lg:col-span-5 bg-surface-1/50 p-5 md:p-7 flex flex-col justify-between gap-8">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-5">Storage Growth</h2>
                <div className="space-y-4">
                  <GrowthRow label="Daily" value={growth?.today || 0} formatSize={formatSize} percentage={15} />
                  <GrowthRow label="Weekly" value={growth?.last_7_days || 0} formatSize={formatSize} percentage={45} />
                  <GrowthRow label="Monthly" value={growth?.last_30_days || 0} formatSize={formatSize} percentage={80} accent />
                </div>
              </div>

              <div className="p-4 bg-card rounded-lg border border-border/50 relative overflow-hidden group">
                <div className="absolute top-2 right-2 text-primary/5 group-hover:text-primary/10 transition-colors">
                  <Sparkles size={32} />
                </div>
                <div className="flex items-center gap-1.5 mb-2 text-primary">
                  <TrendingUp size={12} strokeWidth={2.5} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Efficiency Tip</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                  {overview && overview.trash_size > 1024 ** 3
                    ? "Your trash holds over 1GB. Emptying it will keep your database index lean."
                    : "Storage optimized. Review files periodically to maintain performance."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Uploaded */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground/50" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recently Uploaded</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {recentlyUploaded?.slice(0, 16).map((file) => (
              <div
                key={file.file_id}
                className="group relative aspect-square bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-150 cursor-pointer"
              >
                {file.thumbnail ? (
                  <img
                    src={`data:image/jpeg;base64,${file.thumbnail}`}
                    alt={file.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-1">
                    <FileIcon size={16} className="text-muted-foreground/30 group-hover:text-primary/30 transition-colors" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-[9px] font-semibold text-white truncate">{file.filename}</p>
                  <p className="text-[8px] text-white/50 font-mono">{formatSize(file.size)}</p>
                </div>
              </div>
            ))}
            {!recentlyUploaded?.length && (
              <div className="col-span-full py-8 bg-card border border-dashed border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">No recent activity</p>
              </div>
            )}
          </div>
        </section>

        {/* Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          {/* Largest Files */}
          <div className="bg-card border border-border/50 rounded-xl flex flex-col h-[380px]">
            <div className="px-5 py-3.5 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Largest Files</h2>
              <HardDrive size={14} className="text-muted-foreground/30" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {largestFiles?.length ? (
                largestFiles.map((file) => (
                  <div key={file.file_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-1 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      {file.thumbnail ? (
                        <img
                          src={`data:image/jpeg;base64,${file.thumbnail}`}
                          className="w-7 h-7 rounded object-cover shrink-0 border border-border/50"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-primary/10 rounded flex items-center justify-center shrink-0">
                          <FileIcon size={12} className="text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-[12px] font-semibold truncate text-foreground">{file.filename}</h4>
                        <p className="text-[9px] text-muted-foreground/50 font-mono truncate">{file.virtual_path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-foreground font-mono tabular-nums">
                        {formatSize(file.size)}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-surface-2 text-muted-foreground/40 hover:text-primary transition-colors">
                          <Download size={12} />
                        </button>
                        <button className="p-1 rounded hover:bg-surface-2 text-muted-foreground/40 hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* Largest Folders */}
          <div className="bg-card border border-border/50 rounded-xl flex flex-col h-[380px]">
            <div className="px-5 py-3.5 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Space By Folder</h2>
              <Folder size={14} className="text-muted-foreground/30" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {largestFolders?.length ? (
                largestFolders.map((folder) => (
                  <div key={folder.path} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-1 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-status-warning/10 rounded flex items-center justify-center shrink-0">
                        <Folder size={12} className="text-status-warning" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[12px] font-semibold truncate text-foreground">{folder.path === "/" ? "Root Storage" : folder.path}</h4>
                        <p className="text-[9px] text-muted-foreground/50 font-mono">{folder.total_files} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-foreground font-mono tabular-nums">{formatSize(folder.total_size)}</span>
                      <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-primary bg-primary/10",
    green: "text-status-success bg-status-success/10",
    rose: "text-destructive bg-destructive/10",
    amber: "text-status-warning bg-status-warning/10",
  };

  return (
    <div className="bg-card border border-border/50 rounded-lg p-3.5 flex items-center gap-3 transition-colors hover:bg-surface-1">
      <div className={cn("p-1.5 rounded-md shrink-0", colors[color])}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground truncate mb-0.5">{label}</p>
        <h3 className="text-sm font-display font-bold text-foreground truncate tabular-nums leading-none">
          {value}
        </h3>
      </div>
    </div>
  );
}

function GrowthRow({ label, value, formatSize, percentage, accent }: { label: string; value: number; formatSize: any; percentage: number; accent?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono tabular-nums", accent ? "text-primary" : "text-muted-foreground")}>
          +{formatSize(value)}
        </span>
      </div>
      <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-700 ease-out rounded-full", accent ? "bg-primary" : "bg-muted-foreground/30")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center gap-2 opacity-30">
      <HardDrive size={28} className="text-muted-foreground" strokeWidth={1} />
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No records found</p>
    </div>
  );
}
