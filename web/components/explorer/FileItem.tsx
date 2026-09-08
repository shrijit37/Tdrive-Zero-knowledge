"use client";

import React from "react";
import { createPortal } from "react-dom";
import { FileItem as FileType } from "@/types";
import { 
  File, 
  Download, 
  Trash, 
  Loader2, 
  MoreVertical, 
  Info,
  Folder,
  X,
  FileImage,
  FileText,
  FileArchive,
  Edit2,
  RotateCcw,
  CheckCircle2,
  Circle,
  Star,
  FolderOpen
} from "lucide-react";
import { api } from "@/lib/axios";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useUIStore } from "@/store/useUIStore";
import { useSelectionStore } from "@/store/useSelectionStore";
import { useStarFile } from "@/hooks/api/useFiles";
import { cn, Button } from "@/components/ui";
import { formatLocalTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface FileItemProps {
  file: FileType;
  viewMode: "grid" | "list";
  currentPath: string;
  isTrashView?: boolean;
  onPreview?: (file: FileType) => void;
  onMove?: (file: FileType) => void;
}

export function FileItem({ file, viewMode, currentPath, isTrashView = false, onPreview, onMove }: FileItemProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [showMobileActions, setShowMobileMenu] = React.useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm, prompt, addNotification } = useNotificationStore();
  const { density } = useUIStore();
  const { selectedIds, toggleSelection, isSelectionMode } = useSelectionStore();
  const starMutation = useStarFile();

  const isSelected = selectedIds.includes(file.file_id);

  // --- Long Press Logic for Mobile ---
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const startLongPress = () => {
    timerRef.current = setTimeout(() => {
      setShowMobileMenu(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const cancelLongPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // --- Mutations ---

  const trashMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/files/${file.file_id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Moved to Trash");
      addNotification({ 
        type: "info", 
        title: "File Trashed", 
        message: `"${file.filename}" was moved to the trash bin.` 
      });
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      setShowMobileMenu(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/trash/${file.file_id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("File restored");
      addNotification({ 
        type: "success", 
        title: "File Restored", 
        message: `"${file.filename}" is back in its original folder.` 
      });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      setShowMobileMenu(false);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/trash/${file.file_id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Permanently deleted");
      addNotification({ 
        type: "warning", 
        title: "Permanent Deletion", 
        message: `"${file.filename}" was completely removed from Telegram.` 
      });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      setShowMobileMenu(false);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await api.patch(`/files/${file.file_id}?new_name=${encodeURIComponent(newName)}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Renamed");
      queryClient.invalidateQueries({ queryKey: ["files", currentPath] });
      setShowMobileMenu(false);
    },
  });

  // --- Handlers ---

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (file.is_folder || isTrashView) return;
    setIsDownloading(true);
    try {
      const response = await api.post(`/files/${file.file_id}/ticket`);
      const { ticket } = response.data.data;
      window.location.href = `${api.defaults.baseURL}/download/${ticket}`;
      setShowMobileMenu(false);
    } catch (error) {
      toast.error("Download unavailable");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isTrashView) {
      const isConfirmed = await confirm({
        title: "Delete Permanently?",
        message: `Are you sure you want to permanently delete "${file.filename}"? This action is irreversible.`,
        confirmLabel: "Delete Forever"
      });
      if (isConfirmed) permanentDeleteMutation.mutate();
    } else {
      const isConfirmed = await confirm({
        title: "Move to Trash?",
        message: `Do you want to move "${file.filename}" to the Trash Bin?`,
        confirmLabel: "Move to Trash"
      });
      if (isConfirmed) trashMutation.mutate();
    }
  };

  const handleRename = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newName = await prompt({
      title: "Rename Item",
      message: `Enter a new name for "${file.filename}":`,
      defaultValue: file.filename,
      placeholder: "New filename..."
    });
    
    if (newName && newName.trim() && newName !== file.filename) {
      renameMutation.mutate(newName.trim());
    }
  };

  const handleToggleStar = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isTrashView) return;
    starMutation.mutate({ fileId: file.file_id, starred: !file.is_starred });
  };

  const handleItemClick = (e: React.MouseEvent) => {
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
       e.preventDefault();
       toggleSelection(file.file_id);
       return;
    }

    if (file.is_folder) {
      const cleanPath = currentPath === "/" ? "" : currentPath;
      router.push(`/files${cleanPath}/${file.filename}`);
      return;
    }

    toggleSelection(file.file_id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode) return;
    if (!file.is_folder && !isTrashView) {
      onPreview?.(file);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(file.file_id);
  };

  const formatSize = (bytes: number) => {
    if (file.is_folder) return "--";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    if (file.is_folder) return <Folder className="text-amber-500 fill-amber-500/20" size={viewMode === "grid" ? 32 : 18} />;
    const ext = file.filename.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return <FileImage className="text-blue-500" size={viewMode === "grid" ? 28 : 18} />;
    if (["zip", "rar", "7z", "tar"].includes(ext || "")) return <FileArchive className="text-purple-500" size={viewMode === "grid" ? 28 : 18} />;
    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) return <FileText className="text-red-500" size={viewMode === "grid" ? 28 : 18} />;
    return <File className="text-muted-foreground" size={viewMode === "grid" ? 28 : 18} />;
  };

  const isCompact = density === "compact";

  if (viewMode === "grid") {
    return (
      <div 
        onClick={handleItemClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className={cn(
          "group relative bg-card border transition-all cursor-pointer select-none overflow-hidden",
          isCompact ? "p-2 rounded-xl" : "p-3 rounded-lg",
          isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border",
          isTrashView && "opacity-80 grayscale-[0.3]"
        )}
      >
        <div 
          onClick={handleCheckboxClick}
          className={cn(
            "absolute top-2 left-2 z-10 p-0.5 rounded-full transition-all duration-200",
            isSelected ? "bg-primary text-white opacity-100" : "bg-black/20 text-white opacity-0 group-hover:opacity-100 md:hover:bg-primary"
          )}
        >
          {isSelected ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        </div>

        <div className={cn(
          "flex items-center justify-center bg-surface-1 rounded-lg mb-2 overflow-hidden",
          isCompact ? "aspect-square" : "aspect-video"
        )}>
          {file.thumbnail ? (
            <img 
              src={`data:image/jpeg;base64,${file.thumbnail}`} 
              alt={file.filename}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-primary/40 group-hover:text-primary transition-colors">
              {getFileIcon()}
            </div>
          )}
        </div>
        
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold truncate pr-5 tracking-tight">{file.filename}</p>
          <div className="flex items-center text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
            <span>{formatSize(file.size)}</span>
          </div>
        </div>

        <button 
          onClick={handleToggleStar}
          disabled={starMutation.isPending}
          className={cn(
            "absolute top-1.5 right-7 p-1.5 transition-all",
            file.is_starred ? "text-amber-500 opacity-100" : "text-muted-foreground/40 hover:text-amber-500 opacity-0 group-hover:opacity-100"
          )}
        >
          <Star size={14} fill={file.is_starred ? "currentColor" : "none"} />
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); setShowMobileMenu(true); }}
          className="absolute top-1.5 right-1.5 p-1.5 text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={14} />
        </button>

        <ActionMenu 
          isOpen={showMobileActions} 
          onClose={() => setShowMobileMenu(false)}
          file={file}
          isTrashView={isTrashView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRename={handleRename}
          onRestore={() => restoreMutation.mutate()}
          onStar={handleToggleStar}
          onMove={onMove ? () => onMove(file) : undefined}
          isDownloading={isDownloading}
          isDeleting={isTrashView ? permanentDeleteMutation.isPending : trashMutation.isPending}
          isRenaming={renameMutation.isPending}
          isStarring={starMutation.isPending}
          formatSize={formatSize}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={handleItemClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      className={cn(
        "group flex flex-col md:grid md:grid-cols-12 md:items-center gap-1 md:gap-3 border transition-all cursor-pointer relative select-none",
        isCompact ? "p-2 md:py-1.5" : "p-3 md:py-2",
        isSelected ? "bg-primary/5 border-primary md:rounded-xl ring-1 ring-primary/10" : "bg-card border-transparent md:hover:bg-surface-1 md:rounded-xl",
        isTrashView && "opacity-75"
      )}
    >
      <div className="col-span-6 flex items-center min-w-0">
        <div 
          onClick={handleCheckboxClick}
          className={cn(
            "mr-2 shrink-0 transition-all",
            isSelected ? "text-primary opacity-100" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </div>

        <div className={cn(
          "bg-surface-2 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
          isCompact ? "w-7 h-7" : "w-8 h-8"
        )}>
          {file.thumbnail ? (
            <img src={`data:image/jpeg;base64,${file.thumbnail}`} className="w-full h-full object-cover" alt="" />
          ) : getFileIcon()}
        </div>
        <span className="ml-3 text-xs md:text-sm font-bold truncate tracking-tight text-foreground">
          {file.filename}
        </span>
      </div>

      <div className="hidden md:block col-span-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        {formatSize(file.size)}
      </div>

      <div className="hidden md:block col-span-3 text-[10px] text-muted-foreground/60 font-medium">
        {isTrashView && file.deleted_at 
          ? `Deleted ${formatLocalTime(file.deleted_at)}`
          : formatLocalTime(file.created_at)}
      </div>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
        {!isSelectionMode && (
          <div className="hidden md:flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isTrashView && (
              <button 
                onClick={handleToggleStar}
                disabled={starMutation.isPending}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  file.is_starred ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"
                )}
                title={file.is_starred ? "Remove from Starred" : "Add to Starred"}
              >
                <Star size={14} fill={file.is_starred ? "currentColor" : "none"} />
              </button>
            )}
            {isTrashView ? (
              <button 
                  onClick={(e) => { e.stopPropagation(); restoreMutation.mutate(); }}
                  className="p-1.5 hover:bg-surface-2 rounded-full text-muted-foreground/40 hover:text-primary transition-colors shadow-sm"
                  title="Restore"
                >
                  <RotateCcw size={14} />
                </button>
            ) : (
              <>
                {!file.is_folder && (
                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-1.5 hover:bg-surface-2 rounded-full text-muted-foreground/40 hover:text-primary transition-colors shadow-sm"
                  >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                )}
                <button
                  onClick={handleRename}
                  className="p-1.5 hover:bg-surface-2 rounded-full text-muted-foreground/40 hover:text-primary transition-colors shadow-sm"
                >
                  <Edit2 size={14} />
                </button>
              </>
            )}
            <button 
              onClick={handleDelete}
              className="p-1.5 hover:bg-surface-2 rounded-full text-muted-foreground/40 hover:text-destructive transition-colors shadow-sm"
            >
              <Trash size={14} />
            </button>
          </div>
        )}

        <button 
          onClick={(e) => { e.stopPropagation(); setShowMobileMenu(true); }}
          className="md:hidden p-2 text-muted-foreground/40 active:text-foreground active:bg-surface-2 rounded-full"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="md:hidden flex items-center space-x-2 text-[10px] text-muted-foreground/60 pl-12 font-medium uppercase tracking-wider">
        <span>{formatSize(file.size)}</span>
        <span>•</span>
        <span>{isTrashView && file.deleted_at ? `Deleted ${formatLocalTime(file.deleted_at)}` : formatLocalTime(file.created_at)}</span>
        {file.is_folder && <span className="text-amber-500 ml-auto pr-6">Folder</span>}
      </div>

      <ActionMenu 
        isOpen={showMobileActions} 
        onClose={() => setShowMobileMenu(false)}
        file={file}
        isTrashView={isTrashView}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onRename={handleRename}
        onRestore={() => restoreMutation.mutate()}
        onStar={handleToggleStar}
        onMove={onMove ? () => onMove(file) : undefined}
        isDownloading={isDownloading}
        isDeleting={isTrashView ? permanentDeleteMutation.isPending : trashMutation.isPending}
        isRenaming={renameMutation.isPending}
        isStarring={starMutation.isPending}
        formatSize={formatSize}
      />
    </div>
  );
}

function ActionMenu({ 
  isOpen, 
  onClose, 
  file, 
  isTrashView,
  onDownload, 
  onDelete, 
  onRename,
  onRestore,
  onStar,
  onMove,
  isDownloading, 
  isDeleting,
  isRenaming,
  isStarring,
  formatSize
}: any) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[800] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card w-full md:max-w-sm rounded-t-xl md:rounded-[1.5rem] shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center min-w-0 pr-4">
            <div className="w-10 h-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
               {file.thumbnail ? (
                 <img src={`data:image/jpeg;base64,${file.thumbnail}`} className="w-full h-full object-cover" alt="" />
               ) : (file.is_folder ? <Folder size={20} /> : <File size={20} />)}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold truncate tracking-tight">{file.filename}</p>
              <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{formatSize(file.size)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-full transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-2 space-y-0.5">
          {isTrashView ? (
             <button 
                onClick={onRestore}
                className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all active:scale-95"
              >
                <div className="text-primary p-2 bg-primary/10 rounded-lg"><RotateCcw size={18} /></div>
                <span className="text-xs font-bold">Restore to My Files</span>
              </button>
          ) : (
            <>
              <button 
                onClick={onStar}
                disabled={isStarring}
                className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all active:scale-95"
              >
                <div className={cn("p-2 rounded-lg", file.is_starred ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-surface-2")}>
                  <Star size={18} fill={file.is_starred ? "currentColor" : "none"} />
                </div>
                <span className="text-xs font-bold">{file.is_starred ? "Remove from Favorites" : "Add to Favorites"}</span>
                {isStarring && <Loader2 size={14} className="animate-spin ml-auto" />}
              </button>

              {!file.is_folder && (
                <button 
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all active:scale-95"
                >
                  <div className="text-primary p-2 bg-primary/10 rounded-lg"><Download size={18} /></div>
                  <span className="text-xs font-bold">Download File</span>
                  {isDownloading && <Loader2 size={14} className="animate-spin ml-auto" />}
                </button>
              )}

              <button 
                onClick={onRename}
                disabled={isRenaming}
                className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all active:scale-95"
              >
                <div className="text-muted-foreground p-2 bg-surface-2 rounded-lg"><Edit2 size={18} /></div>
                <span className="text-xs font-bold">Rename</span>
                {isRenaming && <Loader2 size={14} className="animate-spin ml-auto" />}
              </button>

              <button 
                onClick={() => {
                  onMove?.();
                  onClose();
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all active:scale-95"
              >
                <div className="text-muted-foreground p-2 bg-surface-2 rounded-lg"><FolderOpen size={18} /></div>
                <span className="text-xs font-bold">Move</span>
              </button>

              <button className="w-full flex items-center space-x-3 p-3 hover:bg-surface-2 rounded-xl transition-all">
                <div className="text-muted-foreground p-2 bg-surface-2 rounded-lg"><Info size={18} /></div>
                <div className="text-left">
                  <span className="block text-xs font-bold">Metadata Info</span>
                  <span className="block text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{file.is_folder ? "Folder" : file.status}</span>
                </div>
              </button>
            </>
          )}

          <div className="h-px border-border my-1.5 mx-3" />

          <button 
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full flex items-center space-x-3 p-3 hover:bg-destructive/5 text-destructive rounded-xl transition-all active:scale-95"
          >
            <div className="p-2 bg-destructive/10 rounded-lg"><Trash size={18} /></div>
            <span className="text-xs font-semibold">{isTrashView ? "Delete permanently" : "Move to Trash"}</span>
            {isDeleting && <Loader2 size={14} className="animate-spin ml-auto" />}
          </button>
        </div>

        <div className="p-4 md:hidden pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button variant="outline" className="w-full rounded-xl h-11 font-semibold text-[10px] uppercase tracking-wider border-border" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
