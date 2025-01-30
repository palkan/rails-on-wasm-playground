import {
  initRailsVM,
  Progress,
  RackHandler,
  registerPGliteWasmInterface,
  registerSQLiteWasmInterface,
} from "wasmify-rails";

// import { setupPGliteDatabase, setupElectricSync } from "./pglite.js";
import { setupSQLiteDatabase } from "./database.js";

let db = null;

const initDB = async (progress) => {
  if (db) return db;

  // progress?.updateStep("Initializing PGlite database...");
  // db = await setupPGliteDatabase();
  // progress?.updateStep("PGlite database created.");
  //
  progress?.updateStep("Initializing SQLite database...");
  db = await setupSQLiteDatabase();
  progress?.updateStep("SQLite database created.");

  return db;
};

let vm = null;

export const initVM = async (progress, opts = {}) => {
  if (vm) return vm;

  if (!db) {
    await initDB(progress);
  }

  // registerPGliteWasmInterface(self, db);
  registerSQLiteWasmInterface(self, db);

  let redirectConsole = true;

  const env = [];

  vm = await initRailsVM("/app.wasm", {
    database: { adapter: "sqlite3_wasm" },
    async: false,
    skipInitialize: true,
    progressCallback: (step) => {
      progress?.updateStep(step);
    },
    outputCallback: (output) => {
      if (!redirectConsole) return;
      progress?.notify(output);
    },
    env: [
      "RUBY_THREAD_VM_STACK_SIZE=50000000"
    ],
    ...opts,
  });

  // setTimeout(() => {
  //   vm.evalAsync("puts Rails.application.initialize!");
  //   vm.evalAsync("puts 'initialized: ' + Rails.application.initialized?");
  // }, 100);

  // initialize as a separate step
  // progress?.updateStep("Initializing Rails application...");
  // vm.eval("Rails.application.initialize!")
  // progress?.updateStep("Rails application initialized.");

  // Ensure schema is loaded
  // progress?.updateStep("Preparing database...");
  // await vm.evalAsync("ActiveRecord::Tasks::DatabaseTasks.prepare_all");

  // progress?.updateStep("Enable electric-sql...");
  // await setupElectricSync(db, "http://localhost:3131");

  // redirectConsole = false;

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

  if (event.data.type === "rpc") {
    const command = event.data.command;

    const progress = new Progress();
    await progress.attach(self);

    progress.updateStep("Running command: " + command);
    await vm.evalAsync(command)
    progress.updateStep("Running command: " + command + " ✅");
  }
});
