import { LocationProvider, Router, Route, lazy } from "preact-iso";
import { Home } from "./ui/screens/Home";
import { Settings } from "./ui/screens/Settings";
import { NotFound } from "./ui/screens/NotFound";
import { ProgressProvider } from "./ui/progress";
import { Gate } from "./ui/onboarding/Gate";

// The component kit exists only under `vite dev`; the DEV guard lets the production build drop the import.
const Kit = import.meta.env.DEV ? lazy(() => import("./ui/kit/Kit")) : null;

const kitRoute = Kit ? [<Route key="kit" path="/kit" component={Kit} />] : [];

// Home and Settings are the MVP navigation (docs/decisions.md). Flows join as roadmap steps land.
const gated = (Screen: () => preact.JSX.Element) => () => (
  <Gate>
    <Screen />
  </Gate>
);
const GatedHome = gated(Home);
const GatedSettings = gated(Settings);

export function App() {
  return (
    <ProgressProvider>
      <LocationProvider>
        <Router>
          <Route path="/" component={GatedHome} />
          <Route path="/settings" component={GatedSettings} />
          {kitRoute}
          <Route default component={NotFound} />
        </Router>
      </LocationProvider>
    </ProgressProvider>
  );
}
