// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo";
import { createCable } from "@anycable/web";
import { start } from "@anycable/turbo-stream";

// Check if actioncable meta tag contains the URL
const actionCableMeta = document.querySelector('meta[name="action-cable-url"]');
const actionCableUrl = actionCableMeta ? actionCableMeta.content : null;

if (actionCableUrl && actionCableUrl.startsWith("null://")) {
  console.log("No Action Cable configured")
} else {
  const cable = createCable({ logLevel: "debug" });
  start(cable, { delayedUnsubscribe: true });
}
