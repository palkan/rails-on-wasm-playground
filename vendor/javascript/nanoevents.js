let createNanoEvents=()=>({events:{},emit(e,...t){let s=this.events[e]||[];for(let e=0,n=s.length;e<n;e++)s[e](...t)},on(e,t){this.events[e]?.push(t)||(this.events[e]=[t]);return()=>{this.events[e]=this.events[e]?.filter((e=>t!==e))}}});export{createNanoEvents};

