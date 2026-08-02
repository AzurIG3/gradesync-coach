import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ur";
const KEY = "study-planner-lang";

const en = {
  // nav
  navHome: "Home",
  navSubjects: "Subjects",
  navSchedule: "Schedule",
  navProgress: "Progress",
  navNotes: "Notes",
  // header
  hello: "Study Dashboard",
  // home
  nextExam: "Next exam",
  daysToGo: "days to go",
  noExamsYet: "No exams added yet.",
  addSubjectAction: "Add a subject",
  todaysTasks: "Today's tasks",
  noTasksToday: "No tasks for today yet.",
  makeMyPlan: "Make my plan",
  headsUp: "Heads up:",
  tomorrowTasks: "{n} task planned for tomorrow.",
  tomorrowTasksPlural: "{n} tasks planned for tomorrow.",
  startSession: "Start Study Session",
  startSessionHint: "25-minute focus + 5-minute break",
  streak: "🔥 {n}-day streak",
  // onboarding
  skip: "Skip",
  next: "Next",
  getStarted: "Get started",
  onbHomeTitle: "Your daily home",
  onbHomeBody: "See today's tasks, the next exam countdown, and start a focus session — all in one place.",
  onbSubjectsTitle: "Add your subjects",
  onbSubjectsBody: "Add each subject with its exam date and list of topics. Tap the circle to mark progress.",
  onbScheduleTitle: "Auto study plan",
  onbScheduleBody: "Pick how many hours a day you can study. We'll spread your topics evenly until each exam.",
  onbProgressTitle: "Track your progress",
  onbProgressBody: "Watch your progress grow as you complete topics. Small steps every day beat cramming.",
  // timer
  focusTimer: "Focus Timer",
  timerSubtitle: "Study in short focused blocks",
  studyingSubject: "Studying",
  noSubjectsForTimer: "No subjects yet.",
  addOne: "Add one",
  start: "Start",
  resume: "Resume",
  pause: "Pause",
  focusPhase: "Focus",
  breakPhase: "Break",
  ready: "Ready",
  durations: "Custom durations",
  focusMinutes: "Focus (minutes)",
  breakMinutes: "Break (minutes)",
  defaultsHint: "Default is 25 minutes focus + 5 minutes break.",
  // subjects
  subjectsTitle: "Subjects",
  subjectsSubtitle: "Add your exams and topics",
  noSubjectsYet: "No subjects yet",
  tapPlusToAdd: "Tap + to add your first subject",
  addSubject: "Add subject",
  subjectName: "Subject name",
  subjectNamePlaceholder: "e.g. Math",
  examDate: "Exam date",
  saveSubject: "Save subject",
  daysToExam: "{n} days to exam",
  dayToExam: "{n} day to exam",
  examPassed: "Exam passed",
  topics: "topics",
  topic: "topic",
  addTopicChapter: "Add topic / chapter",
  topicPlaceholder: "e.g. Algebra basics",
  tapPlusForTopics: "Tap + to add topics. Then tap the circle to mark progress.",
  notStarted: "Not started",
  inProgress: "In progress",
  completed: "Completed",
  deleteSubject: "Delete subject",
  deleteConfirm: "Delete {name} and all its topics?",
  cancel: "Cancel",
  del: "Delete",
  resources: "Resources",
  pctb: "Official Textbooks (PCTB)",
  elearn: "Video Lessons & Digital Textbook (eLearn Punjab)",
  linkBackupNote: 'If a link doesn\'t load, search "PCTB E-Books" or "eLearn Punjab" on Google as a backup.',
  exam: "Exam",
  // schedule
  scheduleTitle: "Schedule",
  scheduleSubtitle: "Your daily study plan",
  hoursPerDay: "Hours you can study per day",
  generateHint: "Tap \"Generate plan\" to spread your topics evenly until each exam.",
  generatePlan: "Generate plan",
  clear: "Clear",
  noSubjectsBuild: "Add subjects first to build your schedule.",
  goToSubjects: "Go to Subjects",
  noPlanYet: "No plan yet",
  noPlanHint: "Tap \"Generate plan\" to build your daily schedule.",
  today: "Today",
  doneOfTotal: "{done}/{total} done",
  // progress
  progressTitle: "Progress",
  progressSubtitle: "Keep going — every topic counts",
  overall: "Overall",
  topicsCompletedSummary: "{done} of {total} topics completed",
  nothingToShow: "Nothing to show yet",
  addToSeeProgress: "Add subjects and topics to see progress.",
  // settings
  settingsTitle: "Settings",
  settingsSubtitle: "Language, AI key and more",
  settings: "Settings",
  save: "Save",
  apiKeyLabel: "Your Own AI API Key (optional)",
  apiKeyPlaceholder: "Paste your own Gemini API key",
  apiKeyHelp:
    "Leave this empty to use the app's built-in AI key. If you add your own free Gemini key, it is saved only on this device and used for your questions.",
  apiKeySaved: "Saved",
  apiKeyHowTo: "How to get a free key",
  replayOnboarding: "Walkthrough",
  replayOnboardingHelp: "Watch the short 4-step intro again.",
  replayOnboardingAction: "Replay walkthrough",
};


type Key = keyof typeof en;

const ur: Partial<Record<Key, string>> = {
  navHome: "ہوم",
  navSubjects: "مضامین",
  navSchedule: "شیڈول",
  navProgress: "پیش رفت",
  navNotes: "نوٹس",
  hello: "مطالعہ ڈیش بورڈ",
  nextExam: "اگلا امتحان",
  daysToGo: "دن باقی",
  noExamsYet: "ابھی کوئی امتحان درج نہیں۔",
  addSubjectAction: "مضمون شامل کریں",
  todaysTasks: "آج کے کام",
  noTasksToday: "آج کے لیے ابھی کوئی کام نہیں۔",
  makeMyPlan: "میرا پلان بنائیں",
  headsUp: "دھیان دیں:",
  tomorrowTasks: "کل کے لیے {n} کام طے ہے۔",
  tomorrowTasksPlural: "کل کے لیے {n} کام طے ہیں۔",
  startSession: "پڑھائی کا سیشن شروع کریں",
  startSessionHint: "25 منٹ توجہ + 5 منٹ وقفہ",
  streak: "🔥 {n} دن کی سیریز",
  skip: "چھوڑیں",
  next: "آگے",
  getStarted: "شروع کریں",
  onbHomeTitle: "آپ کا روزانہ ہوم",
  onbHomeBody: "آج کے کام، اگلے امتحان کی گنتی اور فوکس سیشن — سب ایک جگہ۔",
  onbSubjectsTitle: "اپنے مضامین شامل کریں",
  onbSubjectsBody: "ہر مضمون کو امتحان کی تاریخ اور ابواب کے ساتھ درج کریں۔ ترقی نشان زد کرنے کے لیے دائرے پر ٹیپ کریں۔",
  onbScheduleTitle: "خودکار مطالعہ پلان",
  onbScheduleBody: "روزانہ کتنے گھنٹے پڑھ سکتے ہیں چنیں۔ ہم آپ کے ابواب امتحان تک برابر تقسیم کر دیں گے۔",
  onbProgressTitle: "اپنی ترقی دیکھیں",
  onbProgressBody: "جیسے جیسے آپ ابواب مکمل کرتے ہیں، ترقی بڑھتی جاتی ہے۔ روزانہ چھوٹے قدم بہتر ہیں۔",
  focusTimer: "فوکس ٹائمر",
  timerSubtitle: "چھوٹے فوکس بلاکس میں پڑھائی کریں",
  studyingSubject: "زیرِ مطالعہ",
  noSubjectsForTimer: "ابھی کوئی مضمون نہیں۔",
  addOne: "شامل کریں",
  start: "شروع",
  resume: "دوبارہ",
  pause: "روکیں",
  focusPhase: "فوکس",
  breakPhase: "وقفہ",
  ready: "تیار",
  durations: "اپنی مرضی کی مدت",
  focusMinutes: "فوکس (منٹ)",
  breakMinutes: "وقفہ (منٹ)",
  defaultsHint: "ڈیفالٹ 25 منٹ فوکس + 5 منٹ وقفہ۔",
  subjectsTitle: "مضامین",
  subjectsSubtitle: "اپنے امتحان اور ابواب شامل کریں",
  noSubjectsYet: "ابھی کوئی مضمون نہیں",
  tapPlusToAdd: "پہلا مضمون شامل کرنے کے لیے + دبائیں",
  addSubject: "مضمون شامل کریں",
  subjectName: "مضمون کا نام",
  subjectNamePlaceholder: "مثلاً ریاضی",
  examDate: "امتحان کی تاریخ",
  saveSubject: "محفوظ کریں",
  daysToExam: "امتحان میں {n} دن",
  dayToExam: "امتحان میں {n} دن",
  examPassed: "امتحان گزر چکا",
  topics: "ابواب",
  topic: "باب",
  addTopicChapter: "باب / سبق شامل کریں",
  topicPlaceholder: "مثلاً الجبرا کی بنیادیں",
  tapPlusForTopics: "ابواب شامل کرنے کے لیے + دبائیں۔ پھر ترقی نشان زد کرنے کے لیے دائرے پر ٹیپ کریں۔",
  notStarted: "شروع نہیں",
  inProgress: "جاری",
  completed: "مکمل",
  deleteSubject: "مضمون حذف کریں",
  deleteConfirm: "{name} اور اس کے تمام ابواب حذف کر دیں؟",
  cancel: "منسوخ",
  del: "حذف",
  resources: "وسائل",
  pctb: "سرکاری نصابی کتب (PCTB)",
  elearn: "ویڈیو اسباق اور ڈیجیٹل کتاب (eLearn Punjab)",
  linkBackupNote: "اگر لنک نہ کھلے تو گوگل پر 'PCTB E-Books' یا 'eLearn Punjab' تلاش کریں۔",
  exam: "امتحان",
  scheduleTitle: "شیڈول",
  scheduleSubtitle: "آپ کا روزانہ پلان",
  hoursPerDay: "روزانہ کتنے گھنٹے پڑھ سکتے ہیں",
  generateHint: "ابواب کو امتحان تک تقسیم کرنے کے لیے 'پلان بنائیں' دبائیں۔",
  generatePlan: "پلان بنائیں",
  clear: "صاف کریں",
  noSubjectsBuild: "پلان بنانے کے لیے پہلے مضامین شامل کریں۔",
  goToSubjects: "مضامین پر جائیں",
  noPlanYet: "ابھی کوئی پلان نہیں",
  noPlanHint: "روزانہ پلان بنانے کے لیے 'پلان بنائیں' دبائیں۔",
  today: "آج",
  doneOfTotal: "{done}/{total} مکمل",
  progressTitle: "پیش رفت",
  progressSubtitle: "چلتے رہیں — ہر باب اہم ہے",
  overall: "کُل",
  topicsCompletedSummary: "{total} میں سے {done} ابواب مکمل",
  nothingToShow: "ابھی دکھانے کو کچھ نہیں",
  addToSeeProgress: "پیش رفت دیکھنے کے لیے مضامین اور ابواب شامل کریں۔",
  settingsTitle: "سیٹنگز",
  settingsSubtitle: "زبان، اے آئی کی، وغیرہ",
  settings: "سیٹنگز",
  save: "محفوظ کریں",
  apiKeyLabel: "اپنی اے آئی API کی (اختیاری)",
  apiKeyPlaceholder: "اپنی Gemini API کی یہاں لگائیں",
  apiKeyHelp:
    "خالی چھوڑ دیں تو ایپ کی اپنی اے آئی کی استعمال ہوگی۔ اپنی مفت Gemini کی صرف اسی ڈیوائس پر محفوظ ہوتی ہے۔",
  apiKeySaved: "محفوظ ہو گیا",
  apiKeyHowTo: "مفت کی کیسے حاصل کریں",
  replayOnboarding: "تعارف",
  replayOnboardingHelp: "مختصر 4 مرحلوں کا تعارف دوبارہ دیکھیں۔",
  replayOnboardingAction: "تعارف دوبارہ دیکھیں",
};


const dict = { en, ur };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const LangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k as string,
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "ur") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    setLangState(l);
  };

  const t = (k: Key, vars?: Record<string, string | number>) => {
    let s = (dict[lang][k] ?? en[k] ?? (k as string)) as string;
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  };

  const dir: "ltr" | "rtl" = lang === "ur" ? "rtl" : "ltr";

  return <LangCtx.Provider value={{ lang, setLang, t, dir }}>{children}</LangCtx.Provider>;
}

export function useT() {
  return useContext(LangCtx);
}
