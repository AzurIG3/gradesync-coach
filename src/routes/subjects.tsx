import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, daysBetween, subjectProgress, todayISO, useStore, type Subject } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Trash2, ChevronRight, Circle, CircleDashed, CircleCheck, BookOpen, Video, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { CLASS_LEVELS, classLevelLabel, hasElearn, syllabusSubjects, UNSORTED_CHAPTER, type ClassLevel } from "@/lib/syllabus";
import { CheatSheet } from "@/components/notes/CheatSheet";
import { useNotes } from "@/lib/notes-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects & Exams — Study Planner" },
      { name: "description", content: "Add your subjects, set exam dates, and track topics." },
      { property: "og:title", content: "Subjects & Exams — Study Planner" },
      { property: "og:description", content: "Add your subjects, set exam dates, and track topics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/subjects" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/subjects" }],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { t } = useT();
  const subjects = useStore((s) => s.subjects);
  const today = todayISO();

  return (
    <AppShell
      title={t("subjectsTitle")}
      subtitle={t("subjectsSubtitle")}
      action={<AddSubjectButton />}
    >
      {subjects.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary text-2xl">📚</div>
          <p className="font-semibold">{t("noSubjectsYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("tapPlusToAdd")}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {subjects.map((sub) => {
            const daysLeft = daysBetween(today, sub.examDate);
            const pct = subjectProgress(sub);
            return (
              <li key={sub.id}>
                <SubjectSheet subject={sub}>
                  <button className="w-full text-left">
                    <Card className="p-4 shadow-sm transition-transform active:scale-[0.99]">
                      <div className="flex items-center gap-3">
                        <span className="h-11 w-11 shrink-0 rounded-2xl" style={{ backgroundColor: sub.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-lg font-bold">{sub.name}</div>
                            <ChevronRight size={20} className="shrink-0 text-muted-foreground" />
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {daysLeft >= 0
                              ? t(daysLeft === 1 ? "dayToExam" : "daysToExam", { n: daysLeft })
                              : t("examPassed")}
                            {" · "}
                            {sub.topics.length} {sub.topics.length === 1 ? t("topic") : t("topics")}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
                      </div>
                    </Card>
                  </button>
                </SubjectSheet>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function AddSubjectButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [level, setLevel] = useState<ClassLevel>("matric");
  const presets = useMemo(() => syllabusSubjects(level), [level]);

  const submit = () => {
    if (!name.trim() || !date) return;
    actions.addSubject(name.trim(), date, level);
    setName(""); setDate(""); setLevel("matric"); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" aria-label="Add subject" className="h-12 w-12 rounded-full p-0 shadow-md">
          <Plus size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("addSubject")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Class level</Label>
            <div className="grid grid-cols-3 gap-2">
              {CLASS_LEVELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setLevel(c.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center text-xs font-bold transition",
                    level === c.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {c.short}
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-70">{c.grades}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              We'll auto-fill the official chapter list for this level where we have it.
            </p>
          </div>
          <div>
            <Label htmlFor="s-name" className="mb-1.5 block">{t("subjectName")}</Label>
            <Input id="s-name" placeholder={t("subjectNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
            {presets.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => setName(pName)}
                    className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                  >
                    {pName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="s-date" className="mb-1.5 block">{t("examDate")}</Label>
            <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
          </div>
        </div>
        <DialogFooter>
          <Button className="h-12 w-full text-base" onClick={submit} disabled={!name.trim() || !date}>
            {t("saveSubject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isScienceOrMath(name: string) {
  const n = name.toLowerCase();
  return ["math", "mathematics", "science", "biology", "chemistry", "physics", "ریاضی", "سائنس", "طبیعیات", "کیمیا", "حیاتیات"].some((k) =>
    n.includes(k),
  );
}

function SubjectSheet({ subject, children }: { subject: Subject; children: React.ReactNode }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const sub = useStore((s) => s.subjects.find((x) => x.id === subject.id));
  const allNotes = useNotes((s) => s);
  const subjectNotes = useMemo(
    () => allNotes.filter((n) => n.subjectId === subject.id),
    [allNotes, subject.id],
  );
  const notesByChapter = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const n of subjectNotes) {
      const key = n.chapter?.trim() || UNSORTED_CHAPTER;
      map.set(key, [...(map.get(key) ?? []), n.title]);
    }
    return map;
  }, [subjectNotes]);
  if (!sub) return <>{children}</>;

  const addTopic = () => {
    if (!topicName.trim()) return;
    actions.addTopic(sub.id, topicName.trim());
    setTopicName("");
  };

  const cycle = (topicId: string, current: "not_started" | "in_progress" | "completed") => {
    const next = current === "not_started" ? "in_progress" : current === "in_progress" ? "completed" : "not_started";
    actions.setTopicStatus(sub.id, topicId, next);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl" style={{ backgroundColor: sub.color }} />
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">{sub.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {t("exam")}: {sub.examDate} · {classLevelLabel(sub.classLevel ?? "matric")}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4">
          <Label className="mb-1.5 block">{t("addTopicChapter")}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t("topicPlaceholder")}
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()}
              className="h-12"
            />
            <Button className="h-12 shrink-0" onClick={addTopic}>
              <Plus size={20} />
            </Button>
          </div>
          {sub.topics.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{t("tapPlusForTopics")}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 rounded-full text-xs text-muted-foreground"
            onClick={() => actions.syncSyllabus(sub.id)}
          >
            <RefreshCw size={13} /> Load official chapters
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {sub.topics.map((tp) => (
            <li key={tp.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <button onClick={() => cycle(tp.id, tp.status)} className="shrink-0" aria-label="Change status">
                {tp.status === "completed" ? (
                  <CircleCheck size={28} className="text-success" />
                ) : tp.status === "in_progress" ? (
                  <CircleDashed size={28} className="text-warning" />
                ) : (
                  <Circle size={28} className="text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-medium ${tp.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                  {tp.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tp.status === "not_started" ? t("notStarted") : tp.status === "in_progress" ? t("inProgress") : t("completed")}
                  {(notesByChapter.get(tp.name)?.length ?? 0) > 0 ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-primary">
                      <FileText size={11} /> {notesByChapter.get(tp.name)!.length} note
                      {notesByChapter.get(tp.name)!.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => actions.deleteTopic(sub.id, tp.id)}
                className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete topic"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">{t("resources")}</p>
          <div className="space-y-2">
            <Button asChild variant="outline" className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal py-3">
              <a href="https://pctb.punjab.gov.pk/download_books" target="_blank" rel="noopener noreferrer">
                <BookOpen size={20} className="text-primary" />
                <span className="flex-1 text-left">{t("pctb")}</span>
                <ExternalLink size={16} className="text-muted-foreground" />
              </a>
            </Button>
            {isScienceOrMath(sub.name) && hasElearn(sub.classLevel ?? "matric") && (
              <Button asChild variant="outline" className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal py-3">
                <a href="https://elearn.punjab.gov.pk/" target="_blank" rel="noopener noreferrer">
                  <Video size={20} className="text-primary" />
                  <span className="flex-1 text-left">{t("elearn")}</span>
                  <ExternalLink size={16} className="text-muted-foreground" />
                </a>
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("linkBackupNote")}</p>
        </div>

        {(notesByChapter.get(UNSORTED_CHAPTER)?.length ?? 0) > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Unsorted notes</p>
            <ul className="space-y-1.5">
              {notesByChapter.get(UNSORTED_CHAPTER)!.map((title, i) => (
                <li key={i} className="rounded-xl border border-dashed border-border px-3 py-2 text-xs">
                  {title}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Open a note to file it under a chapter.
            </p>
          </div>
        ) : null}

        <CheatSheet
          subjectName={sub.name}
          notes={subjectNotes.map((n) => ({ title: n.title, content: n.content }))}
        />

        <div className="mt-6 border-t pt-4">
          {!confirmDel ? (
            <Button variant="outline" className="h-12 w-full text-destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 size={18} /> {t("deleteSubject")}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">{t("deleteConfirm", { name: sub.name })}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12 flex-1" onClick={() => setConfirmDel(false)}>{t("cancel")}</Button>
                <Button
                  variant="destructive"
                  className="h-12 flex-1"
                  onClick={() => { actions.deleteSubject(sub.id); setOpen(false); }}
                >
                  {t("del")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
