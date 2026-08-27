import { useState } from "react";
import { Cloud, Loader2, LogOut, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function AccountSyncCard() {
  const { user, ready, syncing, sendMagicLink, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!ready) {
    return <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Checking account…</section>;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><Cloud size={18} /></span>
        <div>
          <h2 className="text-base font-bold">Account sync</h2>
          <p className="text-xs text-muted-foreground">Keep your study data available on every device.</p>
        </div>
      </div>

      {user ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="font-mono text-xs text-muted-foreground">SIGNED IN</p>
            <p className="mt-1 truncate text-sm font-semibold">{user.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">{syncing ? "Syncing your study data…" : "Your notes and progress are synced."}</p>
          </div>
          <Button variant="outline" className="w-full rounded-xl" disabled={syncing} onClick={() => void signOut()}>
            {syncing ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />} Sign out
          </Button>
        </div>
      ) : sent ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">Open the secure sign-in link on this device. Your existing data will be moved into your account the first time.</p>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          setSending(true);
          try {
            await sendMagicLink(email);
            setSent(true);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not send the sign-in link.");
          } finally {
            setSending(false);
          }
        }}>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11 rounded-xl pl-10" />
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={sending}>
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Email me a magic link
          </Button>
          <p className="text-xs text-muted-foreground">No password needed. You can keep using this device locally without signing in.</p>
        </form>
      )}
    </section>
  );
}