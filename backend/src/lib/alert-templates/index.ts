import { registerMaterialRequestAlertTemplates } from "./material-request";

let initialized = false;

export function initAlertTemplates() {
  if (initialized) return;
  registerMaterialRequestAlertTemplates();
  initialized = true;
}
