/**
 * Pre-defined syllabus dataset (Punjab board / PCTB style) organised by class
 * level and subject. Used to auto-populate a subject's chapter checklist and
 * to auto-file uploaded notes under the closest chapter.
 *
 * Students can always add their own custom topics alongside these.
 */

export type ClassLevel = "matric" | "first_year" | "second_year";

export const CLASS_LEVELS: { id: ClassLevel; label: string; short: string; grades: string }[] = [
  { id: "matric", label: "Matric (Grade 9–10)", short: "Matric", grades: "9–10" },
  { id: "first_year", label: "1st Year (Class 11)", short: "1st Year", grades: "11" },
  { id: "second_year", label: "2nd Year (Class 12)", short: "2nd Year", grades: "12" },
];

/** eLearn Punjab only covers grades 6–10, so it's Matric-only. */
export function hasElearn(level: ClassLevel): boolean {
  return level === "matric";
}

export function classLevelLabel(level: ClassLevel): string {
  return CLASS_LEVELS.find((l) => l.id === level)?.label ?? CLASS_LEVELS[0].label;
}

type Dataset = Record<ClassLevel, Record<string, string[]>>;

export const SYLLABUS: Dataset = {
  matric: {
    mathematics: [
      "Matrices and Determinants",
      "Real and Complex Numbers",
      "Logarithms",
      "Algebraic Expressions and Formulas",
      "Factorization",
      "Algebraic Manipulation",
      "Linear Equations and Inequalities",
      "Linear Graphs and Their Application",
      "Introduction to Coordinate Geometry",
      "Quadratic Equations",
      "Theory of Quadratic Equations",
      "Variations",
      "Partial Fractions",
      "Sets and Functions",
      "Basic Statistics",
      "Introduction to Trigonometry",
      "Projection of a Side of a Triangle",
      "Chords and Arcs of a Circle",
      "Practical Geometry — Circles",
    ],
    physics: [
      "Physical Quantities and Measurement",
      "Kinematics",
      "Dynamics",
      "Turning Effect of Forces",
      "Gravitation",
      "Work and Energy",
      "Properties of Matter",
      "Thermal Properties of Matter",
      "Transfer of Heat",
      "Simple Harmonic Motion and Waves",
      "Sound",
      "Geometrical Optics",
      "Electrostatics",
      "Current Electricity",
      "Electromagnetism",
      "Basic Electronics",
      "Information and Communication Technology",
      "Radioactivity",
    ],
    chemistry: [
      "Fundamentals of Chemistry",
      "Structure of Atoms",
      "Periodic Table and Periodicity of Properties",
      "Structure of Molecules",
      "Physical States of Matter",
      "Solutions",
      "Electrochemistry",
      "Chemical Reactivity",
      "Chemical Equilibrium",
      "Acids, Bases and Salts",
      "Organic Chemistry",
      "Hydrocarbons",
      "Biochemistry",
      "The Atmosphere",
      "Water",
      "Chemical Industries",
    ],
    biology: [
      "Introduction to Biology",
      "Solving a Biological Problem",
      "Biodiversity",
      "Cells and Tissues",
      "Cell Cycle",
      "Enzymes",
      "Bioenergetics",
      "Nutrition",
      "Transport",
      "Gaseous Exchange",
      "Homeostasis",
      "Coordination and Control",
      "Support and Movement",
      "Reproduction",
      "Inheritance",
      "Man and His Environment",
      "Biotechnology",
      "Pharmacology",
    ],
    english: [
      "Grammar — Parts of Speech",
      "Tenses and Sentence Structure",
      "Active and Passive Voice",
      "Direct and Indirect Speech",
      "Translation (Urdu to English)",
      "Essay Writing",
      "Letters and Applications",
      "Story Writing",
      "Comprehension Passages",
      "Summary / Précis Writing",
      "Poems and Their Central Ideas",
      "Prose Lessons and Question Answers",
      "Idioms and Vocabulary",
    ],
    urdu: [
      "نظم",
      "غزل",
      "نثر (سبق)",
      "قواعد",
      "مضمون نویسی",
      "خط نویسی / درخواست",
      "کہانی نویسی",
      "تلخیص نگاری",
      "محاورات و ضرب الامثال",
      "ترجمہ",
    ],
    islamiat: [
      "ایمان و عقائد",
      "قرآنی آیات اور ترجمہ",
      "احادیث نبوی",
      "سیرت النبی ﷺ",
      "خلافت راشدہ",
      "عبادات",
      "اخلاقیات و معاشرت",
      "حقوق العباد",
    ],
    "pakistan studies": [
      "Ideological Basis of Pakistan",
      "The Pakistan Movement",
      "Land and Environment of Pakistan",
      "Constitutional Development",
      "Government of Pakistan",
      "Economic Development",
      "Population, Society and Culture",
      "Pakistan and the World",
      "Problems and Prospects",
    ],
    "computer science": [
      "Problem Solving",
      "Binary System and Data Representation",
      "Boolean Algebra and Logic Gates",
      "Data Communication",
      "Computer Networks",
      "Introduction to HTML",
      "Programming Fundamentals",
      "Program Implementation (C / Python basics)",
      "Databases",
      "Impact of Computing on Society",
    ],
  },

  first_year: {
    physics: [
      "Measurements",
      "Vectors and Equilibrium",
      "Motion and Force",
      "Work and Energy",
      "Circular Motion",
      "Fluid Dynamics",
      "Oscillations",
      "Waves",
      "Physical Optics",
      "Optical Instruments",
      "Heat and Thermodynamics",
    ],
    chemistry: [
      "Basic Concepts (Stoichiometry)",
      "Experimental Techniques in Chemistry",
      "Gases",
      "Liquids and Solids",
      "Atomic Structure",
      "Chemical Bonding",
      "Thermochemistry",
      "Chemical Equilibrium",
      "Solutions",
      "Electrochemistry",
      "Reaction Kinetics",
    ],
    biology: [
      "Introduction to Biology",
      "Biological Molecules",
      "Enzymes",
      "The Cell",
      "Variety of Life (Viruses & Prokaryotes)",
      "Kingdom Protista and Fungi",
      "Kingdom Plantae",
      "Kingdom Animalia",
      "Bioenergetics",
      "Nutrition",
      "Gaseous Exchange",
      "Transport",
    ],
    mathematics: [
      "Number Systems",
      "Sets, Functions and Groups",
      "Matrices and Determinants",
      "Quadratic Equations",
      "Partial Fractions",
      "Sequences and Series",
      "Permutation, Combination and Probability",
      "Mathematical Induction and Binomial Theorem",
      "Fundamentals of Trigonometry",
      "Trigonometric Identities",
      "Trigonometric Functions and Their Graphs",
      "Solution of Trigonometric Equations",
      "Inverse Trigonometric Functions",
    ],
    english: [
      "Prose — Book I Lessons",
      "Poems — Book III",
      "Plays and Short Stories",
      "Grammar and Usage",
      "Idioms and Phrases",
      "Paragraph and Essay Writing",
      "Letters, Applications and Dialogues",
      "Translation and Comprehension",
    ],
    urdu: [
      "نثر — سبق",
      "نظم و غزل",
      "قواعد و انشاء",
      "مضمون نویسی",
      "خط و درخواست",
      "تلخیص و تشریح",
    ],
    islamiat: [
      "قرآن حکیم",
      "حدیث نبوی",
      "سیرت طیبہ",
      "عقائد اسلامی",
      "عبادات و ارکان اسلام",
      "اسلامی معاشرت",
    ],
    "computer science": [
      "Basics of Information Technology",
      "Information Networks",
      "Data Communication",
      "Applications and Application Software",
      "Operating Systems",
      "Word Processing and Spreadsheets",
      "Fundamentals of the Internet",
      "Problem Solving and Algorithms",
    ],
  },

  second_year: {
    physics: [
      "Electrostatics",
      "Current Electricity",
      "Electromagnetism",
      "Electromagnetic Induction",
      "Alternating Current",
      "Physics of Solids",
      "Electronics",
      "Dawn of Modern Physics",
      "Atomic Spectra",
      "Nuclear Physics",
    ],
    chemistry: [
      "Periodic Classification of Elements",
      "s-Block Elements",
      "Group IIIA and IVA Elements",
      "Group VA and VIA Elements",
      "The Halogens and Noble Gases",
      "Transition Elements",
      "Fundamental Principles of Organic Chemistry",
      "Aliphatic Hydrocarbons",
      "Aromatic Hydrocarbons",
      "Alkyl Halides",
      "Alcohols, Phenols and Ethers",
      "Aldehydes and Ketones",
      "Carboxylic Acids",
      "Macromolecules",
      "Common Chemical Industries",
      "Environmental Chemistry",
    ],
    biology: [
      "Homeostasis",
      "Support and Movement",
      "Coordination and Control",
      "Reproduction",
      "Growth and Development",
      "Chromosomes and DNA",
      "Cell Cycle",
      "Variation and Genetics",
      "Biotechnology",
      "Evolution",
      "Ecosystem",
      "Some Major Ecosystems",
      "Man and His Environment",
    ],
    mathematics: [
      "Functions and Limits",
      "Differentiation",
      "Integration",
      "Introduction to Analytic Geometry",
      "Linear Inequalities and Linear Programming",
      "Conic Sections",
      "Vectors",
    ],
    english: [
      "Prose — Book III Lessons",
      "Poems — Book III",
      "Plays and Novel",
      "Grammar and Usage",
      "Essay Writing",
      "Letters, Applications and Stories",
      "Translation and Précis",
      "Comprehension and Idioms",
    ],
    urdu: [
      "نثر — سبق",
      "نظم و غزل",
      "قواعد و انشاء",
      "مضمون نویسی",
      "تلخیص و تشریح",
      "خط و درخواست",
    ],
    islamiat: [
      "قرآن و تفسیر",
      "حدیث و سنت",
      "سیرت النبی ﷺ",
      "اسلامی نظامِ حیات",
      "اخلاقیات",
      "اسلام اور جدید دور",
    ],
    "computer science": [
      "Data Basics and Database Design",
      "Database Management Systems",
      "MS Access / Database Handling",
      "Data Integrity and Normalization",
      "Introduction to C Language",
      "Input / Output and Operators",
      "Decision Constructs",
      "Loop Constructs",
      "Functions and Arrays",
      "Pointers and File Handling",
    ],
  },
};

const ALIASES: Record<string, string> = {
  math: "mathematics",
  maths: "mathematics",
  "math s": "mathematics",
  algebra: "mathematics",
  bio: "biology",
  chem: "chemistry",
  phy: "physics",
  "computer": "computer science",
  cs: "computer science",
  ict: "computer science",
  "pak studies": "pakistan studies",
  "pak study": "pakistan studies",
  pakstudies: "pakistan studies",
  islamiyat: "islamiat",
  "islamic studies": "islamiat",
  "ریاضی": "mathematics",
  "طبیعیات": "physics",
  "کیمیا": "chemistry",
  "حیاتیات": "biology",
  "اردو": "urdu",
  "انگریزی": "english",
  "اسلامیات": "islamiat",
  "مطالعہ پاکستان": "pakistan studies",
};

function normalize(name: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (ALIASES[n]) return ALIASES[n];
  for (const [k, v] of Object.entries(ALIASES)) {
    if (n.includes(k)) return v;
  }
  return n;
}

/** Best-effort lookup of the official chapter list for a subject at a level. */
export function syllabusFor(subjectName: string, level: ClassLevel): string[] {
  const table = SYLLABUS[level] ?? {};
  const key = normalize(subjectName);
  if (table[key]) return [...table[key]];
  const hit = Object.keys(table).find((k) => k.includes(key) || key.includes(k));
  return hit ? [...table[hit]] : [];
}

/** Every subject we have a syllabus for at this level (for the picker hints). */
export function syllabusSubjects(level: ClassLevel): string[] {
  return Object.keys(SYLLABUS[level] ?? {});
}

export const UNSORTED_CHAPTER = "Unsorted";
