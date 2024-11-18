// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo";
import { createCable } from "@anycable/web";
import { start } from "@anycable/turbo-stream";
import { LocalTransport } from "local_cable";

// Check if actioncable meta tag contains the URL
const actionCableMeta = document.querySelector('meta[name="action-cable-url"]');
const actionCableUrl = actionCableMeta ? actionCableMeta.content : null;

if (actionCableUrl && actionCableUrl.startsWith("null://")) {
  console.log("No Action Cable configured")
} else {
  let opts = { logLevel: "debug" };

  if (actionCableUrl?.startsWith("local://")) {
    opts.transport = new LocalTransport(actionCableUrl.replace("local://", ""));
  }

  const cable = createCable(opts);
  start(cable, { delayedUnsubscribe: true });
}
