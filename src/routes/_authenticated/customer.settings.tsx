import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell } from "@/components/shell/Chrome";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerPreferences } from "@/lib/customer-portal";

export const Route = createFileRoute("/_authenticated/customer/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — Easy Moving" },
      {
        name: "description",
        content: "Manage your profile, contact details, password and notification preferences.",
      },
    ],
  }),
  component: CustomerSettingsPage,
});

function CustomerSettingsPage() {
  const { prefs, save } = useCustomerPreferences();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setEmail(auth.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,phone")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone ?? "");
      }
    })();
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error } = await supabase.from("profiles").upsert(
        {
          id: auth.user.id,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      if (email && email !== auth.user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
        toast.info("Check your inbox to confirm the new email address.");
      }
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Could not save profile", { description: (e as Error).message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      toast.success("Password updated");
    } catch (e) {
      toast.error("Could not update password", { description: (e as Error).message });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Settings"
            title="Your account"
            subtitle="Profile, security and notification preferences"
            icon={<Settings className="h-5 w-5" />}
          />

          <div className="mt-6 space-y-4">
            <SectionShell title="Profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first">First name</Label>
                  <Input
                    id="first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="last">Last name</Label>
                  <Input
                    id="last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button
                className="mt-4 rounded-full"
                disabled={savingProfile}
                onClick={saveProfile}
              >
                {savingProfile ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <UserRound className="mr-1.5 h-4 w-4" />
                )}
                Save profile
              </Button>
            </SectionShell>

            <SectionShell title="Password">
              <div className="max-w-sm">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                  placeholder="At least 8 characters"
                />
              </div>
              <Button
                variant="secondary"
                className="mt-4 rounded-full"
                disabled={savingPassword}
                onClick={changePassword}
              >
                {savingPassword ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-1.5 h-4 w-4" />
                )}
                Update password
              </Button>
            </SectionShell>

            <SectionShell title="Notification preferences">
              <div className="space-y-4">
                <PrefRow
                  label="Move status updates by email"
                  checked={prefs.email_status_updates}
                  onChange={(v) => save({ ...prefs, email_status_updates: v })}
                />
                <PrefRow
                  label="New messages by email"
                  checked={prefs.email_messages}
                  onChange={(v) => save({ ...prefs, email_messages: v })}
                />
                <PrefRow
                  label="Text message alerts"
                  checked={prefs.sms_status_updates}
                  onChange={(v) => save({ ...prefs, sms_status_updates: v })}
                />
                <PrefRow
                  label="Moving tips and offers"
                  checked={prefs.email_marketing}
                  onChange={(v) => save({ ...prefs, email_marketing: v })}
                />
              </div>
            </SectionShell>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}

function PrefRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
