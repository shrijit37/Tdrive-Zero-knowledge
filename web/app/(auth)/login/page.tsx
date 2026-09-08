"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Lock,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";

const loginSchema = z.object({
  password: z.string().min(1, "Master Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const response = await api.post("/auth/login", values);
      const { access_token, csrf_token } = response.data.data;

      localStorage.setItem("tdrive_session_token", access_token);
      localStorage.setItem("tdrive_csrf_token", csrf_token);

      toast.success("Identity Verified");
      router.push("/files");
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Verification Failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-surface-ground p-10 text-foreground relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-15%] w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10">
            <span className="font-display font-bold text-sm text-primary">T</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">TDrive</span>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 space-y-5">
          <h1 className="text-[2.75rem] font-display font-bold leading-[1.1] tracking-tight text-foreground">
            Your data.<br />
            <span className="text-primary">Your keys.</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
            Zero-knowledge encrypted storage powered by Telegram.
            Privacy is the architecture, not a feature.
          </p>

          <div className="flex items-center gap-6 pt-3">
            <div>
              <p className="text-xl font-display font-bold text-foreground tabular-nums">AES-256</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Encryption</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">Unlimited</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Storage</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary/70" />
          <span>Local decryption only — keys never leave this machine</span>
        </div>
      </div>

      {/* Login Form Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-20 relative bg-background">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-10 flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <span className="font-display font-bold text-lg text-primary">T</span>
          </div>
          <h2 className="font-display font-bold text-xl tracking-tight text-foreground">TDrive</h2>
        </div>

        <div className="w-full max-w-sm space-y-6 animate-slide-up relative z-10">
          <div className="space-y-1.5">
            <h3 className="text-2xl font-display font-bold tracking-tight text-foreground">Unlock Drive</h3>
            <p className="text-muted-foreground text-sm">
              Enter your master password to decrypt your session.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Master Password</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-150">
                          <Lock size={15} />
                        </div>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          className="w-full h-11 bg-surface-1 border border-border rounded-lg pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring/20 focus:border-primary/50 transition-all duration-150 font-mono placeholder:text-muted-foreground/30"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 rounded-lg text-sm font-semibold group overflow-hidden relative"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Access Files
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                  </span>
                )}
              </Button>
            </form>
          </Form>

          {/* Info Card */}
          <div className="p-3 bg-surface-1 rounded-lg border border-border/50 flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded-md text-primary shrink-0 mt-0.5">
              <ShieldCheck size={14} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your data is encrypted locally and stored on Telegram servers.
              Only <strong className="text-foreground font-medium">you</strong> hold the decryption keys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-[11px] text-muted-foreground/50">
          TDrive v1.4.0 — Self-hosted · Encrypted · Open Source
        </footer>
      </div>
    </div>
  );
}
