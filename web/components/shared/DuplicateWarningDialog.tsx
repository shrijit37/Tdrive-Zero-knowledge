"use client";

import React from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";

export interface DuplicateInfo {
  file: File;
  existingFile: {
    file_id: string;
    filename: string;
    virtual_path: string;
  };
  vpath?: string;
}

interface DuplicateWarningDialogProps {
  duplicateInfo: DuplicateInfo | null;
  onOpenExisting: () => void;
  onUploadAnyway: () => void;
  onCancel: () => void;
  formatSize: (bytes: number) => string;
}

export function DuplicateWarningDialog({
  duplicateInfo,
  onOpenExisting,
  onUploadAnyway,
  onCancel,
  formatSize,
}: DuplicateWarningDialogProps) {
  return (
    <Dialog isOpen={!!duplicateInfo} onClose={onCancel}>
      <div className="p-5 space-y-4 text-left">
        <div className="flex items-center gap-2.5 text-status-warning">
          <div className="p-1.5 bg-status-warning/10 rounded-md">
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-base font-display font-bold tracking-tight text-foreground">Duplicate File</h3>
        </div>

        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            A file with identical content (SHA-256) already exists in your storage.
          </p>

          <div className="p-3 bg-surface-1 rounded-lg border border-border/50 space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">File to upload</span>
              <span className="font-semibold text-foreground break-all">{duplicateInfo?.file.name}</span>
              <span className="text-muted-foreground/50 ml-1 font-mono">({duplicateInfo ? formatSize(duplicateInfo.file.size) : ""})</span>
            </div>

            <div className="h-px bg-border/30" />

            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Existing file</span>
              <span className="font-semibold text-foreground break-all">{duplicateInfo?.existingFile.filename}</span>
              <div className="text-muted-foreground/60 mt-0.5 font-mono text-[10px]">
                {duplicateInfo?.existingFile.virtual_path}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Button
            variant="default"
            className="w-full h-9 flex items-center justify-center gap-2"
            onClick={onOpenExisting}
          >
            <span>Open Existing File</span>
            <ExternalLink size={13} />
          </Button>

          <Button
            variant="outline"
            className="w-full h-9"
            onClick={onUploadAnyway}
          >
            Upload Anyway
          </Button>

          <Button
            variant="ghost"
            className="w-full h-9 text-muted-foreground"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
