// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo";
import { createCable } from "@anycable/web";
import { start } from "@anycable/turbo-stream";
import { createNanoEvents } from "nanoevents";

export class LocalTransport {
  constructor(url, opts = {}) {
    if (typeof BroadcastChannel === "undefined") {
      throw new Error("No BroadcastChannel support");
    }

    this.streamToIdentifier = {};

    this.url = url;
    this.pingInterval = opts.pingInterval || 3000;
    this.fetchCredentials = opts.credentials || "same-origin";

    this.connected = false;
    this.emitter = createNanoEvents();
    this.emulatePing = this.emulatePing.bind(this);

    let fetchFn = opts.fetchImplementation;

    if (fetchFn) {
      this.fetch = fetchFn;
    } else if (typeof fetch !== "undefined") {
      this.fetch = (...args) => fetch(...args);
    } else {
      throw new Error("No fetch support");
    }

    this.channel = opts.channel || "action_cable";
    this.bc = new BroadcastChannel(this.channel);
    this.bc.onmessage = this.processBroadcast.bind(this);
  }

  displayName() {
    return "Local(" + this.url + ")";
  }

  async open() {
    try {
      let response = await this.fetch(this.url + "/open", {
        method: "POST",
        credentials: this.fetchCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        this.connected = true;
        this.emitter.emit("open");

        await this.processResponse(response);

        this._pingTimer = setInterval(this.emulatePing, this.pingInterval);
      } else {
        if (response.status === 401) {
          await this.processResponse(response);
        }

        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      this.emitter.emit("close", error);
      throw error;
    }
  }

  setURL(url) {
    this.url = url;
  }

  setParam(key, val) {
    let url = new URL(this.url);
    url.searchParams.set(key, val);
    let newURL = `${url.protocol}//${url.host}${url.pathname}?${url.searchParams}`;
    this.setURL(newURL);
  }

  send(data) {
    if (!this.connected) {
      throw Error("No connection");
    } else {
      this.sendCommand(data);
    }
  }

  async sendCommand(data) {
    const response = await this.fetch(this.url + "/message", {
      method: "POST",
      body: data,
      credentials: this.fetchCredentials,
      headers: {
        "Content-Type": "application/json",
        "X-Cable-State": JSON.stringify(this.connState),
      },
    });

    await this.processResponse(response);
  }

  async close() {
    if (this.connected) {
      this.onclose();
    }
  }

  on(event, callback) {
    return this.emitter.on(event, callback);
  }

  once(event, callback) {
    let unbind = this.emitter.on(event, (...args) => {
      unbind();
      callback(...args);
    });
    return unbind;
  }

  async processResponse(response) {
    const data = await response.json();

    if (data.state) {
      this.connState = data.state;
    }

    if (data.identifier) {
      const streams = data.streams || [];

      for (const stream of streams) {
        this.streamToIdentifier[stream] = data.identifier;
      }
    }

    const transmissions = data.transmissions || [];
    for (const msg of transmissions) {
      this.emitter.emit("data", msg);
    }
  }

  processBroadcast(event) {
    console.log("broadcast event", event);
    let data = event.data;

    if (data.data) {
      const identifier = this.streamToIdentifier[data.stream];

      if (identifier) {
        console.log(`broadcast message for ${identifier}`, data.data);

        this.emitter.emit(
          "data",
          JSON.stringify({ identifier, message: JSON.parse(data.data) }),
        );
      }
    }
  }

  onclose() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      delete this._pingTimer;
    }

    this.connected = false;
    this.emitter.emit("close");
  }

  emulatePing() {
    // This is a hack to emulater server-to-client pings
    // and make monitor work correcly with long-polling
    this.emitter.emit(
      "data",
      `{"type":"ping","source":"local transport emulation"}`,
    );
  }
}

// Check if actioncable meta tag contains local:// and use local transport then
const actionCableMeta = document.querySelector('meta[name="action-cable-url"]');
const actionCableUrl = actionCableMeta ? actionCableMeta.content : null;

let transport = undefined;

if (actionCableUrl && actionCableUrl.startsWith("local://")) {
  transport = new LocalTransport(actionCableUrl.replace("local://", ""));
}

const cable = createCable({ transport, logLevel: "debug" });
start(cable, { delayedUnsubscribe: true });
