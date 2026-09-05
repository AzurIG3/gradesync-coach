import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArrowLeft, BookOpen, FileText, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { withPageBoundary } from "@/components/PageErrorBoundary";
import { daysLeft, noteActions, useTrashedNotes, TRASH_DAYS } from "@/lib/notes-store";
import { actions, useStore, TRASH_DAYS as SUBJECT_TRASH_DAYS } from "@/lib/store";

export const Route = createFileRoute("/trash")({
  component: withPageBoundary(TrashPage, "trash"),
  head: () => ({
    meta: [
      { title: "Recently Deleted — Matric Study Planner" },
      {
        name: "description",
        content:
          "Restore notes and subjects you deleted in the last 30 days, or remove them for good.",
      },
      { property: "og:title", content: "Recently Deleted — Matric Study Planner" },
      {
        property: "og:description",
        content: "Deleted notes and subjects stay here for 30 days so you can bring them back.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function daysLeftFor(deletedAt: string): number {
  const passed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, SUBJECT_TRASH_DAYS - passed);
}

function TrashPage() {
  const notes = useTrashedNotes((n) => n);
  const subjects = useStore((s) => s.deletedSubjects ?? []);
  const empty = notes.length === 0 && subjects.length === 0;

  return (
    <AppShell
      title="Recently deleted"
      subtitle={`Deleted items stay here for ${TRASH_DAYS} days, then they are gone for good.`}
    >
      <div className="space-y-4">
        <Button variant="ghost" className="h-10 px-2" asChild>
          <Link to="/settings">
            <ArrowLeft size={18} /> Back to settings
          </Link>
        </Button>

        {empty ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Archive size={22} />
            </span>
            <h2 className="text-base font-bold">Nothing deleted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything you delete will wait here for {TRASH_DAYS} days before it disappears.
            </p>
          </div>
        ) : null}

        {notes.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <FileText size={18} />
                </span>
                <h2 className="text-base font-bold">Notes ({notes.length})</h2>
              </div>
              <Button
                variant="ghost"
                className="h-9 px-2 text-xs text-destructive"
                onClick={() => noteActions.purgeAllDeleted()}
              >
                Empty
              </Button>
            </div>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysLeft(n)} day{daysLeft(n) === 1 ? "" : "s"} left
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 sm:flex-none"
                      onClick={() => noteActions.restore(n.id)}
                    >
                      <RotateCcw size={16} /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 flex-1 text-destructive sm:flex-none"
                      onClick={() => noteActions.purge(n.id)}
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {subjects.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <BookOpen size={18} />
                </span>
                <h2 className="text-base font-bold">Subjects ({subjects.length})</h2>
              </div>
              <Button
                variant="ghost"
                className="h-9 px-2 text-xs text-destructive"
                onClick={() => actions.purgeAllDeletedSubjects()}
              >
                Empty
              </Button>
            </div>
            <ul className="space-y-2">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.topics.length} chapters · {daysLeftFor(s.deletedAt)} day
                      {daysLeftFor(s.deletedAt) === 1 ? "" : "s"} left
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 sm:flex-none"
                      onClick={() => actions.restoreSubject(s.id)}
                    >
                      <RotateCcw size={16} /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 flex-1 text-destructive sm:flex-none"
                      onClick={() => actions.purgeSubject(s.id)}
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
