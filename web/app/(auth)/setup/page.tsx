"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { Button, Input, cn } from "@/components/ui";
import {
  ShieldCheck,
  Send,
  Database,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

type Step = "init" | "login" | "success";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("init");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [initForm, setInitForm] = React.useState({
    api_id: "",
    api_hash: "",
    master_password: "",
    confirm_password: "",
  });

  const [loginForm, setLoginForm] = React.useState({
    phone: "",
    code: "",
    phone_code_hash: "",
    password_2fa: "",
  });
  const [isCodeSent, setIsCodeSent] = React.useState(false);
  const [needs2FA, setNeeds2FA] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const resp = await api.get("/bootstrap/status");
        const status = resp.data.data;
        if (status.is_initialized) {
          if (status.is_logged_in) setStep("success");
          else setStep("login");
        }
      } catch (e) {}
    };
    checkStatus();
  }, []);

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initForm.master_password !== initForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/bootstrap/init", {
        api_id: parseInt(initForm.api_id),
        api_hash: initForm.api_hash,
        master_password: initForm.master_password,
      });
      toast.success("System initialized!");
      setStep("login");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Initialization failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post("/bootstrap/send-code", { phone: loginForm.phone });
      setLoginForm({ ...loginForm, phone_code_hash: resp.data.data });
      setIsCodeSent(true);
      toast.success("Verification code sent to Telegram");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post("/bootstrap/verify-code", {
        phone: loginForm.phone,
        code: loginForm.code,
        phone_code_hash: loginForm.phone_code_hash,
        password: loginForm.password_2fa || null,
      });
      if (resp.data.error?.code === "2FA_REQUIRED") {
        setNeeds2FA(true);
        toast.error("Two-factor authentication required");
      } else {
        toast.success("Login successful!");
        setStep("success");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = [
    { key: "init", icon: Database, label: "Configure" },
    { key: "login", icon: Send, label: "Connect" },
    { key: "success", icon: CheckCircle2, label: "Ready" },
  ] as const;

  const currentIdx = step === "init" ? 0 : step === "login" ? 1 : 2;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-10 px-4">
          {stepConfig.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={cn("flex flex-col items-center gap-2", i <= currentIdx ? "text-primary" : "text-muted-foreground/40")}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300",
                  i <= currentIdx
                    ? "border-primary/40 bg-primary/10"
                    : "border-border"
                )}>
                  <s.icon size={14} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
              </div>
              {i < stepConfig.length - 1 && (
                <div className={cn(
                  "h-px flex-1 mx-3 transition-colors duration-300",
                  i < currentIdx ? "bg-primary/30" : "bg-border/50"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Card */}
        <div className="bg-card border border-border/50 rounded-xl p-6 md:p-8 shadow-raised">
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5 text-destructive animate-slide-up">
              <AlertCircle size={16} />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {step === "init" && (
            <form onSubmit={handleInit} className="space-y-5 animate-fade-in">
              <div className="space-y-1 text-center mb-6">
                <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Welcome to TDrive</h1>
                <p className="text-muted-foreground text-sm">Set up your personal cloud node.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">API ID</label>
                  <Input
                    required
                    placeholder="123456"
                    value={initForm.api_id}
                    onChange={(e) => setInitForm({ ...initForm, api_id: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">API Hash</label>
                  <Input
                    required
                    placeholder="abc123..."
                    value={initForm.api_hash}
                    onChange={(e) => setInitForm({ ...initForm, api_hash: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-primary">Master Password</label>
                <Input
                  required
                  type="password"
                  placeholder="Set encryption password"
                  className="border-primary/20 focus:border-primary/50"
                  value={initForm.master_password}
                  onChange={(e) => setInitForm({ ...initForm, master_password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Confirm Password</label>
                <Input
                  required
                  type="password"
                  placeholder="Repeat password"
                  value={initForm.confirm_password}
                  onChange={(e) => setInitForm({ ...initForm, confirm_password: e.target.value })}
                />
              </div>

              <Button disabled={loading} className="w-full h-11 text-sm">
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Save Configuration"}
              </Button>
            </form>
          )}

          {step === "login" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Connect Telegram</h1>
                <p className="text-muted-foreground text-sm">Authorize TDrive to access your cloud channel.</p>
              </div>

              {!isCodeSent ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">Phone Number</label>
                    <Input
                      placeholder="+1 234 567 890"
                      className="text-sm font-semibold"
                      value={loginForm.phone}
                      onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                    />
                  </div>
                  <Button
                    onClick={handleSendCode}
                    disabled={loading}
                    className="w-full h-11 text-sm"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Send Verification Code"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">Verification Code</label>
                    <Input
                      required
                      placeholder="Enter code"
                      className="text-center font-mono text-base tracking-[0.3em] font-semibold"
                      value={loginForm.code}
                      onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                    />
                  </div>

                  {needs2FA && (
                    <div className="space-y-1.5 animate-slide-up">
                      <label className="text-[11px] font-medium text-status-warning">2FA Password</label>
                      <Input
                        required
                        type="password"
                        placeholder="Enter 2FA password"
                        className="border-status-warning/20 focus:border-status-warning/50"
                        value={loginForm.password_2fa}
                        onChange={(e) => setLoginForm({ ...loginForm, password_2fa: e.target.value })}
                      />
                    </div>
                  )}

                  <Button disabled={loading} className="w-full h-11 text-sm">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Complete Connection"}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsCodeSent(false)} className="w-full h-9 text-muted-foreground">
                    Use different phone number
                  </Button>
                </form>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-xl flex items-center justify-center mx-auto">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">TDrive is Ready</h1>
                <p className="text-muted-foreground text-sm">
                  Your agent is initialized and connected to Telegram.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-1 rounded-lg border border-border/50">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <p className="text-xs font-semibold text-status-success font-mono">Connected</p>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg border border-border/50">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Encryption</p>
                  <p className="text-xs font-semibold text-primary font-mono">AES-256-GCM</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-11 text-sm group"
              >
                <span>Launch Dashboard</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-muted-foreground/30 font-medium uppercase tracking-wider">
          TDrive v1.4.0 — Self-hosted · Encrypted
        </p>
      </div>
    </div>
  );
}
