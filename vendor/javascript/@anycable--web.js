import{BaseLogger as e,Monitor as t,DisconnectedError as n,DEFAULT_OPTIONS as o,backoffWithJitter as i,createCable as r,ActionCableConsumer as s}from"@anycable/core";export{Channel}from"@anycable/core";class Logger extends e{writeLogEntry(e,t,n){n?console[e](t,n):console[e](t)}}class Monitor extends t{watch(e){super.watch(e);this.initActivityListeners()}initActivityListeners(){if(typeof document!=="undefined"&&typeof window!=="undefined"&&document.addEventListener&&window.addEventListener){let visibility=()=>{document.hidden||this.reconnectNow()&&this.logger.debug("Trigger reconnect due to visibility change")};let connect=e=>{this.reconnectNow()&&this.logger.debug("Trigger reconnect",{event:e})};let disconnectFrozen=()=>this.disconnect(new n("page_frozen"));document.addEventListener("visibilitychange",visibility,false);window.addEventListener("focus",connect,false);window.addEventListener("online",connect,false);window.addEventListener("resume",connect,false);window.addEventListener("freeze",disconnectFrozen,false);this.unbind.push((()=>{document.removeEventListener("visibilitychange",visibility,false);window.removeEventListener("focus",connect,false);window.removeEventListener("online",connect,false);window.removeEventListener("resume",connect,false);window.removeEventListener("freeze",disconnectFrozen,false)}))}}disconnect(e){if(this.state!=="disconnected"&&this.state!=="closed"){this.logger.info("Disconnecting",{reason:e.message});this.cancelReconnect();this.stopPolling();this.state="pending_disconnect";this.target.disconnected(e)}}}const c=["cable","action-cable"];const a="/cable";const fetchMeta=(e,t)=>{for(let n of c){let o=e.head.querySelector(`meta[name='${n}-${t}']`);if(o)return o.getAttribute("content")}};const absoluteWSUrl=e=>{if(e.match(/wss?:\/\//))return e;if(typeof window!=="undefined"){let t=window.location.protocol.replace("http","ws");return`${t}//${window.location.host}${e}`}return e};const generateUrlFromDOM=()=>{if(typeof document!=="undefined"&&document.head){let e=fetchMeta(document,"url");if(e)return absoluteWSUrl(e)}return absoluteWSUrl(a)};const historyTimestampFromMeta=()=>{if(typeof document!=="undefined"&&document.head){let e=fetchMeta(document,"history-timestamp");if(e)return e|0}};function createCable(e,t){if(typeof e==="object"&&typeof t==="undefined"){t=e;e=void 0}e=e||generateUrlFromDOM();t=t||{};t.historyTimestamp||=historyTimestampFromMeta();t=Object.assign({},o,t);let{logLevel:n,logger:s,pingInterval:c,reconnectStrategy:a,maxMissingPings:d,maxReconnectAttempts:l}=t;s=t.logger=t.logger||new Logger(n);a=t.reconnectStrategy=t.reconnectStrategy||i(c);t.monitor!==false&&(t.monitor=t.monitor||new Monitor({pingInterval:c,reconnectStrategy:a,maxMissingPings:d,maxReconnectAttempts:l,logger:s}));return r(e,t)}function createConsumer(e,t){let n=createCable(e,t);return new s(n)}function fetchTokenFromHTML(e){let t=e?e.url:void 0;if(!t){if(typeof window==="undefined")throw Error("An URL to fetch the HTML with a token MUST be specified");t=window.location.href}return async e=>{let n=await fetch(t,{credentials:"same-origin",cache:"no-cache",headers:{Accept:"text/html, application/xhtml+xml","X-ANYCABLE-OPERATION":"token-refresh"}});if(!n.ok)throw Error("Failed to fetch a page to refresh a token: "+n.status);let o=await n.text();let i=(new DOMParser).parseFromString(o,"text/html");let r=fetchMeta(i,"url");if(!r)throw Error("Couldn't find a token on the page");e.setURL(r)}}export{createCable,createConsumer,fetchTokenFromHTML};

