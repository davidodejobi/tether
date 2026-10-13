import { render } from "preact";
import { App } from "./app";
import { captureInstallPrompt } from "./ui/offline/install";
import { registerSW } from "./ui/offline/sw";
import "./styles/global.css";

render(<App />, document.getElementById("app")!);

captureInstallPrompt();
registerSW(); // production builds only
