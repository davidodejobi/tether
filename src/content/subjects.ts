/** UTME subjects other than Use of English, as listed on JAMB's IBASS e-syllabus. Only English has a course; the rest are a preference. */
export const SUBJECT_SOURCE = "Subjects from JAMB's IBASS e-syllabus";
export const MAX_EXTRA_SUBJECTS = 3;

const names = [
  "Agricultural Science", "Arabic", "Art", "Biology", "Chemistry", "Christian Religious Studies", "Commerce", "Computer Studies",
  "Economics", "French", "Geography", "Government", "Hausa", "History", "Home Economics", "Igbo", "Islamic Studies",
  "Literature-in-English", "Mathematics", "Music", "Physics", "Physical and Health Education", "Principles of Accounting", "Yoruba",
];

export const SUBJECTS = names.map((name) => ({ id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name }));

/** A learner without a saved list takes English only. */
export const subjectsOf = (l: { subjects?: string[] } | null): string[] => l?.subjects ?? ["english"];
export const extrasOf = (l: { subjects?: string[] } | null): string[] => subjectsOf(l).filter((id) => id !== "english");
export const withEnglish = (extras: string[]): string[] => ["english", ...extras];
