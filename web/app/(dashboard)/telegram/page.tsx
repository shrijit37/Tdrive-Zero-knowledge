"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTelegramHealth,
  useTelegramScan,
  useTestUpload,
  useTestStream,
  type TelegramHealth,
} from "@/hooks/api/useTelegram";
import { Button } from "@/components/ui";
import {
  Signal,
  SignalZero,
  SignalHigh,
  SignalLow,
  Database,
  HardDrive,
  Film,
  Server,
  Search,
  RefreshCw,
  ArrowUpCircle,
  Download,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString();
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className={`text-${color}`} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function StorageBreakdownBar({ health }: { health: TelegramHealth }) {
  const s = health.storage;
  if (!s) return null;
  const total = s.total_size_bytes || 1;
  const items = [
    {
      label: "Drive",
      count: s.drive_chunks,
      pct: (s.drive_chunks / (s.total_messages || 1)) * 100,
      color: "bg-blue-500",
    },
    {
      label: "Stream",
      count: s.stream_chunks,
      pct: (s.stream_chunks / (s.total_messages || 1)) * 100,
      color: "bg-emerald-500",
    },
    {
      label: "S3",
      count: s.s3_chunks,
      pct: (s.s3_chunks / (s.total_messages || 1)) * 100,
      color: "bg-amber-500",
    },
    {
      label: "Other",
      count: s.unknown,
      pct: (s.unknown / (s.total_messages || 1)) * 100,
      color: "bg-gray-400",
    },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Storage Breakdown
      </h3>
      <div className="w-full h-6 rounded-full bg-muted/30 flex overflow-hidden gap-0.5">
        {items.map((item) =>
          item.pct > 0 ? (
            <div
              key={item.label}
              className={`${item.color} h-full transition-all`}
              style={{ width: `${Math.max(item.pct, 0.5)}%` }}
              title={`${item.label}: ${item.count} messages`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${item.color}`} />
            <span>
              {item.label}: {item.count} chunks
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TelegramPage() {
  const { data: health, isLoading, refetch } = useTelegramHealth();
  const scanMutation = useTelegramScan();
  const uploadMutation = useTestUpload();
  const streamMutation = useTestStream();
  const [testMsgId, setTestMsgId] = React.useState("");

  const handleScan = async () => {
    const result = await scanMutation.mutateAsync();
    toast.success(
      `Scan complete: ${result.recovered_chunks} chunks recovered, ${result.errors} errors`
    );
  };

  const handleTestUpload = async () => {
    const result = await uploadMutation.mutateAsync();
    toast.success(`Test upload OK: msg_id=${result.msg_id}, ${result.bytes} bytes`);
  };

  const handleTestStream = async () => {
    if (!testMsgId) {
      toast.error("Enter a message ID to test");
      return;
    }
    try {
      const result = await streamMutation.mutateAsync(parseInt(testMsgId));
      toast.success(
        `Stream OK: ${formatBytes(result.size)} (${result.mime})`
      );
    } catch (e: any) {
      toast.error(`Stream failed: ${e?.message || "unknown"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Failed to load Telegram health
      </div>
    );
  }

  const connected = health.connected;
  const acc = health.account;
  const conn = health.connection;
  const sto = health.storage;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            {connected ? (
              <SignalHigh size={20} className="text-emerald-500" />
            ) : (
              <SignalZero size={20} className="text-red-500" />
            )}
            Telegram Health
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Saved Messages as storage backend · MTProto direct connection
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5"
        >
          <RefreshCw size={12} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Connection"
          value={connected ? "Operational" : "Disconnected"}
          icon={connected ? CheckCircle2 : XCircle}
          color={connected ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard
          label="Total Messages"
          value={formatNumber(sto?.total_messages)}
          icon={Database}
          color="text-blue-500"
        />
        <StatCard
          label="Storage Used"
          value={formatBytes(sto?.total_size_bytes)}
          icon={HardDrive}
          color="text-purple-500"
        />
        <StatCard
          label="Latency"
          value={conn?.latency_ms != null ? `~${conn.latency_ms}ms` : "—"}
          icon={Zap}
          color="text-amber-500"
        />
      </div>

      {/* Storage Breakdown */}
      {sto && <StorageBreakdownBar health={health} />}

      {/* Account */}
      {acc && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Account
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">
                {acc.first_name} {acc.last_name || ""}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Username</span>
              <p className="font-medium">@{acc.username || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium">
                {acc.phone
                  ? `${acc.phone.slice(0, 3)}***`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Premium</span>
              <p className="font-medium">{acc.premium ? "✅ Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium">
                {acc.bot ? "Bot" : "User Account"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Diagnostics
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanMutation.isPending}
            className="gap-1.5"
          >
            {scanMutation.isPending ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <Search size={12} />
            )}
            {scanMutation.isPending ? "Scanning…" : "Scan Saved Messages"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestUpload}
            disabled={uploadMutation.isPending}
            className="gap-1.5"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <ArrowUpCircle size={12} />
            )}
            {uploadMutation.isPending ? "Uploading…" : "Test Upload"}
          </Button>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="msg_id"
              value={testMsgId}
              onChange={(e) => setTestMsgId(e.target.value)}
              className="w-28 px-3 py-1.5 text-sm border border-border/50 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/50"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestStream}
              disabled={streamMutation.isPending}
              className="gap-1.5"
            >
              {streamMutation.isPending ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <Download size={12} />
              )}
              {streamMutation.isPending ? "Testing…" : "Test Stream"}
            </Button>
          </div>
        </div>

        {/* Scan results */}
        {scanMutation.isSuccess && (
          <div className="mt-2 p-3 rounded-xl bg-muted/30 text-xs font-mono space-y-1">
            <p>
              Scanned: {scanMutation.data.scanned} messages
            </p>
            <p>
              Recovered chunks: {scanMutation.data.recovered_chunks}
            </p>
            <p>Errors: {scanMutation.data.errors}</p>
          </div>
        )}
      </div>
    </div>
  );
}
