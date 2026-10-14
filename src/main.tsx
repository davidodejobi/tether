import { render } from "preact";
import { App } from "./app";
import { applyEarlyTheme } from "./platform/theme";
import { captureInstallPrompt } from "./ui/offline/install";
import { registerSW } from "./ui/offline/sw";
import "./styles/global.css";

applyEarlyTheme();
render(<App />, document.getElementById("app")!);

captureInstallPrompt();
registerSW(); // production builds only
