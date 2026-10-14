import { LocationProvider, Router, Route, lazy } from "preact-iso";
import { Home } from "./ui/screens/Home";
import { Settings } from "./ui/screens/Settings";
import { Practice } from "./ui/practice/Practice";
import { SoloEntryScreen } from "./ui/solo/SoloScreens";
import { RunScreen } from "./ui/runs/Run";
import { RecheckEntry } from "./ui/proof/RecheckEntry";
import { Result } from "./ui/results/Result";
import { Share } from "./ui/share/Share";
import { CourseOverview, CourseSection, CourseTopic } from "./ui/course/Course";
import { NotFound } from "./ui/screens/NotFound";
import { ProgressProvider } from "./ui/progress";
import { Gate } from "./ui/onboarding/Gate";
import { AppShell } from "./ui/shell/AppShell";

// The component kit exists only under `vite dev`; the DEV guard lets the production build drop the import.
const Kit = import.meta.env.DEV ? lazy(() => import("./ui/kit/Kit")) : null;

const kitRoute = Kit ? [<Route key="kit" path="/kit" component={Kit} />] : [];

// Home and Settings are the MVP navigation (docs/decisions.md). Flows join as roadmap steps land.
// Home, Practice and Settings sit in the app shell; solo and onboarding are focus layouts with no navigation (spec section 14).
const gated = (Screen: () => preact.JSX.Element, shell = false) => () => (
  <Gate>
    {shell ? <AppShell><Screen /></AppShell> : <Screen />}
  </Gate>
);
const GatedHome = gated(Home, true);
const GatedSettings = gated(Settings, true);
const GatedPractice = gated(Practice, true);
const GatedCourse = gated(CourseOverview, true);
const GatedCourseSection = ({ section }: { section?: string }) => <Gate><AppShell><CourseSection section={section} /></AppShell></Gate>;
const GatedCourseTopic = ({ section, topic }: { section?: string; topic?: string }) => <Gate><AppShell><CourseTopic section={section} topic={topic} /></AppShell></Gate>;
const GatedSoloEntry = gated(SoloEntryScreen);
// /run/solo and /run/recheck: focus layout, no shell (step 13 links to /run/recheck).
const GatedRun = ({ kind }: { kind?: string }) => <Gate><RunScreen kind={kind} /></Gate>;
const GatedRecheckEntry = gated(RecheckEntry);
const GatedResult = gated(Result);
const GatedShare = gated(Share);

export function App() {
  return (
    <ProgressProvider>
      <LocationProvider>
        <Router>
          <Route path="/" component={GatedHome} />
          <Route path="/practice" component={GatedPractice} />
          <Route path="/course" component={GatedCourse} />
          <Route path="/course/:section" component={GatedCourseSection} />
          <Route path="/course/:section/:topic" component={GatedCourseTopic} />
          <Route path="/solo-entry" component={GatedSoloEntry} />
          <Route path="/run/:kind" component={GatedRun} />
          <Route path="/recheck-entry" component={GatedRecheckEntry} />
          <Route path="/result/:runId" component={GatedResult} />
          <Route path="/share/:runId" component={GatedShare} />
          <Route path="/settings" component={GatedSettings} />
          {kitRoute}
          <Route default component={NotFound} />
        </Router>
      </LocationProvider>
    </ProgressProvider>
  );
}
