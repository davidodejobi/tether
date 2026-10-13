import { LocationProvider, Router, Route, lazy } from "preact-iso";
import { Home } from "./ui/screens/Home";
import { Settings } from "./ui/screens/Settings";
import { Practice } from "./ui/practice/Practice";
import { Solo, SoloEntryScreen } from "./ui/solo/SoloScreens";
import { RecheckEntry } from "./ui/proof/RecheckEntry";
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
const GatedSoloEntry = gated(SoloEntryScreen);
const GatedSolo = gated(Solo);
const GatedRecheckEntry = gated(RecheckEntry);

export function App() {
  return (
    <ProgressProvider>
      <LocationProvider>
        <Router>
          <Route path="/" component={GatedHome} />
          <Route path="/practice" component={GatedPractice} />
          <Route path="/solo-entry" component={GatedSoloEntry} />
          <Route path="/solo" component={GatedSolo} />
          <Route path="/recheck-entry" component={GatedRecheckEntry} />
          <Route path="/settings" component={GatedSettings} />
          {kitRoute}
          <Route default component={NotFound} />
        </Router>
      </LocationProvider>
    </ProgressProvider>
  );
}
