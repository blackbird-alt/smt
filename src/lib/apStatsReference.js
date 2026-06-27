// Per-chapter curriculum reference compiled from AP Statistics and intro
// probability & statistics sources. Used to ground the AI tutor so its
// explanations and self-generated sample problems stay curriculum-accurate.
//
// Files live in src/content/reference/<chapter-slug>.md and are loaded at
// build time. If a chapter's file is missing, grounding simply omits it.
const files = import.meta.glob("../content/reference/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const REFERENCE = {};
for (const [path, content] of Object.entries(files)) {
  const slug = path
    .split("/")
    .pop()
    .replace(/\.md$/, "");
  REFERENCE[slug] = content;
}

// lessonId is the chapter slug, e.g. "chapter-3-probability".
export function getChapterReference(lessonId, maxChars = 2800) {
  if (!lessonId) return "";
  const text = REFERENCE[lessonId];
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
