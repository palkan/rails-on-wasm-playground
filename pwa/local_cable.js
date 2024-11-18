export class ActionCableBroadcaster {
  constructor() {
    this.bc = new BroadcastChannel("action_cable");
  }

  broadcast(stream, data) {
    console.log("[rails-web] Broadcasting to channel:", stream, data);
    this.bc.postMessage({ stream, data });
  }
}
