"use client";

import React from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { Button, cn, Input } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { X, AlertCircle, HelpCircle, Info } from "lucide-react";

export function DialogProvider() {
  const { dialog, closeDialog } = useNotificationStore();
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    if (dialog?.type === "prompt") {
      setInputValue(dialog.defaultValue || "");
    }
  }, [dialog]);

  const handleConfirm = () => {
    if (dialog?.type === "prompt") {
      closeDialog(inputValue);
    } else {
      closeDialog(true);
    }
  };

  const handleCancel = () => {
    if (!dialog) return;
    closeDialog(dialog.type === "prompt" ? null : false);
  };

  const getIcon = () => {
    switch (dialog?.type) {
      case "confirm": return <HelpCircle className="text-primary" size={20} />;
      case "alert": return <AlertCircle className="text-destructive" size={20} />;
      default: return <Info className="text-primary" size={20} />;
    }
  };

  return (
    <Dialog
      isOpen={!!dialog?.isOpen}
      onClose={handleCancel}
      className="max-h-[90vh]"
    >
      <div className="p-5 space-y-5 overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-surface-2 rounded-lg shrink-0">
            {getIcon()}
          </div>
          <div className="space-y-1.5 min-w-0">
            <h3 className="text-base font-display font-bold tracking-tight text-foreground leading-snug">{dialog?.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {dialog?.message}
            </p>
          </div>
        </div>

        {dialog?.type === "prompt" && (
          <div className="animate-slide-up">
            <Input
              autoFocus
              placeholder={dialog.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="h-10 text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {dialog?.type !== "alert" && (
            <Button
              variant="ghost"
              className="h-8 px-4 text-sm text-muted-foreground"
              onClick={handleCancel}
            >
              {dialog?.cancelLabel}
            </Button>
          )}
          <Button
            variant="default"
            className={cn(
              "h-8 px-5 text-sm",
              dialog?.type === "confirm" && dialog.title.toLowerCase().includes("delete") && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            onClick={handleConfirm}
          >
            {dialog?.confirmLabel}
          </Button>
        </div>
      </div>

      <button
        onClick={handleCancel}
        className="absolute top-3 right-3 p-1.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-surface-2 rounded-md transition-colors duration-150"
      >
        <X size={16} />
      </button>
    </Dialog>
  );
}
