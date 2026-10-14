// The English destination preview (spec section 14b): course, section and topic views around the reviewed moves.
// Every view is a plain list; Coming soon items are text, never links or buttons. Each available stage carries its own actions.
import type { ComponentChildren } from "preact";
import { allStages, availableIn, english, plannedIn, sectionById, source, topicById, type Section, type Topic } from "../../content/catalogue.ts";
import { countStages, groupLine, overviewLine } from "../../rules/course-counts.ts";
import { moveById, moveNumber } from "../../content/moves.ts";
import { recheckAvailable } from "../../rules/proof.ts";
import { focusMove, moveState } from "../home/view.ts";
import { withMove } from "../move.ts";
import { appNow } from "../proof/simulate";
import { useProgress } from "../progress";
import { NotFound } from "../screens/NotFound";
import { CourseProgress, useCounts } from "./CourseProgress";
import "../components/Button.css";
import "./course.css";

const WORD = { current: "Current", proved: "Proved", held: "Held", fading: "Fading", available: "Available", soon: "Coming soon" } as const;

function Crumbs({ section, topic }: { section?: Section; topic?: Topic }) {
  return (
    <nav class="cs-crumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li>{section ? <a href="/course">English course</a> : <span aria-current="page">English course</span>}</li>
        {section && <li>{topic ? <a href={`/course/${section.id}`}>{section.name}</a> : <span aria-current="page">{section.name}</span>}</li>}
        {topic && <li><span aria-current="page">{topic.name}</span></li>}
      </ol>
    </nav>
  );
}

const Page = ({ crumbs, children }: { crumbs: ComponentChildren; children: ComponentChildren }) => (
  <main class="page cs">{crumbs}{children}</main>
);

/** "Move 3: Collective nouns. Current." The focus move is Current until it has proof; the others are Available. */
function useStatus() {
  const { store } = useProgress();
  const p = store.progress;
  const focus = focusMove(p, appNow);
  return (moveId: string) => {
    const { state, due } = moveState(p, moveId, focus.moveId, appNow);
    return `Move ${moveNumber(moveById(moveId)!)}: ${moveById(moveId)!.title}. ${WORD[state]}${due ? ", due" : ""}.`;
  };
}
const usePosition = () => {
  const status = useStatus();
  const { store } = useProgress();
  return status(focusMove(store.progress, appNow).moveId);
};

const planned = (x: Section | Topic) => `${plannedIn(x)} planned stage${plannedIn(x) === 1 ? "" : "s"} · ${availableIn(x)} available`;

export function CourseOverview() {
  const here = usePosition();
  const counts = useCounts(allStages(english));
  return (
    <Page crumbs={<Crumbs />}>
      <h1>English course</h1>
      <p class="cs-sub">JAMB Use of English.</p>
      <p class="cs-sub">{overviewLine(counts)}</p>
      <CourseProgress link={false} />
      <dl class="cs-route">
        <div><dt>Start</dt><dd>Lexis and Structure, Concord, Strip the Disguise</dd></div>
        <div><dt>You are here</dt><dd>{here}</dd></div>
        <div><dt>Finish</dt><dd>Exam day (Coming soon)</dd></div>
      </dl>
      <h2>Sections</h2>
      <ol class="cs-list" aria-label="Sections">
        {english.sections.map((s) => (
          <li key={s.id} class="cs-item">
            <a class="cs-name" href={`/course/${s.id}`}>{s.letter}. {s.name}</a>
            <span class="cs-meta">{s.questions} questions in the exam</span>
            <span class="cs-meta">{planned(s)}</span>
          </li>
        ))}
      </ol>
      <p class="cs-source">Source: {source.name}, read {source.retrieved}. {source.version} Stage counts are Tether units, not exam weights.</p>
    </Page>
  );
}

export function CourseSection({ section: id }: { section?: string }) {
  const s = sectionById(id);
  const counts = useCounts(s ? allStages(s) : []);
  if (!s) return <NotFound />;
  return (
    <Page crumbs={<Crumbs section={s} />}>
      <h1>{s.name}</h1>
      <p class="cs-sub">Section {s.letter}: {s.questions} questions in the exam.</p>
      <p class="cs-sub">{groupLine(s.name, counts)}</p>
      <h2>Topics</h2>
      <ol class="cs-list" aria-label="Topics">
        {s.topics.map((t) => (
          <li key={t.id} class="cs-item">
            <a class="cs-name" href={`/course/${s.id}/${t.id}`}>{t.name}</a>
            {t.questions !== undefined && <span class="cs-meta">{t.questions} exam questions in this category</span>}
            <span class="cs-meta">{planned(t)}</span>
          </li>
        ))}
      </ol>
    </Page>
  );
}

export function CourseTopic({ section: sid, topic: tid }: { section?: string; topic?: string }) {
  const s = sectionById(sid);
  const t = s && topicById(s, tid);
  const here = usePosition();
  const counts = useCounts(t ? t.stages : []);
  const { store } = useProgress();
  const status = useStatus();
  if (!s || !t) return <NotFound />;
  return (
    <Page crumbs={<Crumbs section={s} topic={t} />}>
      <h1>{t.name}</h1>
      <p class="cs-sub">{groupLine(t.name, counts)}</p>
      <h2>Stages</h2>
      <ol class="cs-list" aria-label="Stages">
        {t.stages.map((g) => (
          <li key={g.id} class="cs-item">
            <span class="cs-name">{g.title}</span>
            <span class="cs-meta">Stage {g.position} of {g.of} planned</span>
            {g.moveId ? (
              <>
                <span class="cs-meta">{status(g.moveId)}</span>
                <span class="cs-meta">{countStages([g], { cycles: store.progress.cycles.values(), runs: store.progress.runs.values() }).completed ? "Completed" : "Not completed yet"}</span>
                <Actions moveId={g.moveId} />
              </>
            ) : (
              <span class="cs-tag">Coming soon</span>
            )}
          </li>
        ))}
      </ol>
    </Page>
  );
}

/** One available stage's actions, each carrying the move. Start recheck appears while a recheck is due or proof is Fading. */
function Actions({ moveId }: { moveId: string }) {
  const { store } = useProgress();
  const cycle = store.progress.cycles.get(moveId) ?? null;
  const recheck = recheckAvailable(cycle, appNow(cycle?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone));
  return (
    <div class="cs-actions">
      <a class="btn btn-primary cs-act" href={withMove("/practice", moveId)}>Practise Move {moveNumber(moveById(moveId)!)}</a>
      <a class="btn btn-secondary cs-act" href={withMove("/learn", moveId)}>Learn the move</a>
      <a class="btn btn-secondary cs-act" href={withMove("/solo-entry", moveId)}>Solo check</a>
      {recheck && <a class="btn btn-secondary cs-act" href={withMove("/recheck-entry", moveId)}>Start recheck</a>}
    </div>
  );
}
