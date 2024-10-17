import {
  initRailsVM,
  Progress,
  RackHandler,
} from "wasmify-rails";

import { setupPGliteDatabase, registerPGliteInterface } from "./pglite.js";

let db = null;

const initDB = async (progress) => {
  if (db) return db;

  progress?.updateStep("Initializing PGlite database...");
  db = await setupPGliteDatabase();
  progress?.updateStep("PGlite database created.");

  return db;
};

let vm = null;

class ActionCableBroadcaster {
  constructor() {
    this.bc = new BroadcastChannel("action_cable");
  }

  broadcast(stream, data) {
    console.log("[rails-web] Broadcasting to channel:", stream, data);
    this.bc.postMessage({ stream, data });
  }
}

const initVM = async (progress, opts = {}) => {
  if (vm) return vm;

  if (!db) {
    await initDB(progress);
  }

  registerPGliteInterface(self, db);

  self.actionCableBroadcaster = new ActionCableBroadcaster();

  let redirectConsole = true;

  vm = await initRailsVM("/app.wasm", {
    database: { adapter: "pglite" },
    progressCallback: (step) => {
      progress?.updateStep(step);
    },
    outputCallback: (output) => {
      if (!redirectConsole) return;
      progress?.notify(output);
    },
    ...opts,
  });

  // Ensure schema is loaded
  progress?.updateStep("Preparing database...");
  await vm.evalAsync("ActiveRecord::Tasks::DatabaseTasks.prepare_all");

  redirectConsole = false;

  return vm;
};

const resetVM = () => {
  vm = null;
};

const installApp = async () => {
  const progress = new Progress();
  await progress.attach(self);

  await initDB(progress);
  await initVM(progress);
};

self.addEventListener("activate", (event) => {
  console.log("[rails-web] Activate Service Worker");
});

self.addEventListener("install", (event) => {
  console.log("[rails-web] Install Service Worker");
  event.waitUntil(installApp().then(() => self.skipWaiting()));
});

const rackHandler = new RackHandler(initVM, { assumeSSL: true, async: true });

self.addEventListener("fetch", (event) => {
  const bootResources = ["/boot", "/boot.js", "/boot.html", "/rails.sw.js"];

  if (
    bootResources.find((r) => new URL(event.request.url).pathname.endsWith(r))
  ) {
    console.log(
      "[rails-web] Fetching boot files from network:",
      event.request.url,
    );
    event.respondWith(fetch(event.request.url));
    return;
  }

  const viteResources = ["node_modules", "@vite"];

  if (viteResources.find((r) => event.request.url.includes(r))) {
    console.log(
      "[rails-web] Fetching Vite files from network:",
      event.request.url,
    );
    event.respondWith(fetch(event.request.url));
    return;
  }

  return event.respondWith(rackHandler.handle(event.request));
});

self.addEventListener("message", async (event) => {
  console.log("[rails-web] Received worker message:", event.data);

  if (event.data.type === "reload-rails") {
    const progress = new Progress();
    await progress.attach(self);

    progress.updateStep("Reloading Rails application...");

    resetVM();
    await initVM(progress, { debug: event.data.debug });
  }
});
