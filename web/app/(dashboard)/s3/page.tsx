"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui";
import {
  HardDrive,
  FolderOpen,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface S3Bucket {
  Name: string;
  ObjectCount: number;
  TotalSize: number;
}

interface S3Object {
  Key: string;
  Size: number;
  ETag: string;
  LastModified: string;
}

interface S3Health {
  status: string;
  backend: string;
  connected: boolean;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export default function S3Page() {
  const [selectedBucket, setSelectedBucket] = React.useState<string | null>(null);

  const { data: health } = useQuery<S3Health>({
    queryKey: ["s3", "health"],
    queryFn: async () => {
      const { data } = await api.get("/s3/health");
      return data;
    },
  });

  const { data: bucketsData, isLoading: loadingBuckets } = useQuery<{ Buckets: S3Bucket[] }>({
    queryKey: ["s3", "buckets"],
    queryFn: async () => {
      const { data } = await api.get("/s3");
      return data;
    },
  });

  const { data: objectsData, isLoading: loadingObjects } = useQuery<{ Contents: S3Object[] }>({
    queryKey: ["s3", "objects", selectedBucket],
    queryFn: async () => {
      const { data } = await api.get(`/s3/${selectedBucket}`);
      return data;
    },
    enabled: !!selectedBucket,
  });

  const buckets = bucketsData?.Buckets || [];
  const objects = objectsData?.Contents || [];
  const connected = health?.connected;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {selectedBucket && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedBucket(null)}>
            <ArrowLeft size={14} />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HardDrive size={20} className="text-amber-500" />
            {selectedBucket ? selectedBucket : "S3 Gateway"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedBucket
              ? "Objects in this bucket (stored on Telegram Saved Messages)"
              : "S3-compatible endpoint backed by Telegram storage"}
          </p>
        </div>
      </div>

      {/* Connection Info (when no bucket selected) */}
      {!selectedBucket && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Connection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <span className="text-muted-foreground text-xs">Endpoint</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted/50 px-2 py-1 rounded text-xs">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/s3
                </code>
                <CopyButton value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/s3`} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <p className={`mt-1 font-medium ${connected ? "text-emerald-500" : "text-red-500"}`}>
                {connected ? "● Connected" : "● Disconnected"}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-border/30">
            <h4 className="text-[10px] font-semibold text-muted-foreground/60 uppercase mb-2">
              Example (AWS CLI / rclone)
            </h4>
            <pre className="bg-muted/50 rounded-xl p-3 text-[11px] overflow-x-auto">
{`# AWS CLI
aws --endpoint-url http://YOUR_HOST/api/v1/s3 s3 ls my-bucket

# rclone config
[tdrive-s3]
type = s3
provider = Other
endpoint = http://YOUR_HOST/api/v1/s3`}
            </pre>
          </div>
        </div>
      )}

      {/* Bucket list */}
      {!selectedBucket && (
        <div className="space-y-3">
          {loadingBuckets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : buckets.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-8 text-center text-muted-foreground text-sm">
              No buckets yet. Upload objects via the S3 endpoint to create one.
            </div>
          ) : (
            buckets.map((b) => (
              <button
                key={b.Name}
                onClick={() => setSelectedBucket(b.Name)}
                className="w-full bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors text-left"
              >
                <FolderOpen size={20} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.Name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.ObjectCount} objects · {formatBytes(b.TotalSize)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Object list */}
      {selectedBucket && (
        <div className="space-y-2">
          {loadingObjects ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : objects.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-8 text-center text-muted-foreground text-sm">
              Bucket is empty.
            </div>
          ) : (
            objects.map((obj) => (
              <div
                key={obj.Key}
                className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3"
              >
                <FileText size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{obj.Key}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(obj.Size)} · {obj.LastModified}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
