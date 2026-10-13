import { LocationProvider, Router, Route } from "preact-iso";
import { Home } from "./ui/screens/Home";
import { Settings } from "./ui/screens/Settings";
import { NotFound } from "./ui/screens/NotFound";

// Home and Settings are the MVP navigation (docs/decisions.md). Flows join as roadmap steps land.
export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/settings" component={Settings} />
        <Route default component={NotFound} />
      </Router>
    </LocationProvider>
  );
}
