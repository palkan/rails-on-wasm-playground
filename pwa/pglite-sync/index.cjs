"use strict";var C=Object.defineProperty;var A=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var K=Object.prototype.hasOwnProperty;var _=(a,t)=>{for(var s in t)C(a,s,{get:t[s],enumerable:!0})},D=(a,t,s,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of N(t))!K.call(a,r)&&r!==s&&C(a,r,{get:()=>t[r],enumerable:!(n=A(t,r))||n.enumerable});return a};var L=a=>D(C({},"__esModule",{value:!0}),a);var x={};_(x,{electricSync:()=>P});module.exports=L(x);var S=require("@electric-sql/client");async function R(a,t){let s=t?.debug??!1,n=t?.metadataSchema??"electric",r=[],c=new Map;return{namespaceObj:{syncShapeToTable:async e=>{if(c.has(e.table))throw new Error("Already syncing shape for table "+e.table);c.set(e.table);let i=null;e.shapeKey&&(i=await j({pg:a,metadataSchema:n,shapeKey:e.shapeKey}),s&&i&&console.log("resuming from shape state",i));let l=i===null&&e.useCopy,m=new AbortController;e.shape.signal&&e.shape.signal.addEventListener("abort",()=>m.abort(),{once:!0});let u=new S.ShapeStream({...e.shape,...i??{},signal:m.signal}),h=[],E=!1;return u.subscribe(async T=>{s&&console.log("sync messages received",T);for(let y of T){if((0,S.isChangeMessage)(y)){h.push(y);continue}if((0,S.isControlMessage)(y))switch(y.headers.control){case"must-refetch":s&&console.log("refetching shape"),E=!0,h=[];break;case"up-to-date":await a.transaction(async b=>{if(s&&console.log("up-to-date, committing all messages"),b.exec(`SET LOCAL ${n}.syncing = true;`),E&&(E=!1,await b.exec(`DELETE FROM ${e.table};`),e.shapeKey&&await F({pg:b,metadataSchema:n,shapeKey:e.shapeKey})),l){let f=[],O=[],$=!1;for(let M of h)!$&&M.headers.operation==="insert"?f.push(M):($=!0,O.push(M));f.length>0&&O.unshift(f.pop()),h=O,f.length>0&&(v({pg:b,table:e.table,schema:e.schema,messages:f,mapColumns:e.mapColumns,primaryKey:e.primaryKey,debug:s}),l=!1)}for(let f of h)await U({pg:b,table:e.table,schema:e.schema,message:f,mapColumns:e.mapColumns,primaryKey:e.primaryKey,debug:s});e.shapeKey&&h.length>0&&u.shapeId!==void 0&&await k({pg:b,metadataSchema:n,shapeKey:e.shapeKey,shapeId:u.shapeId,lastOffset:h[h.length-1].offset})}),h=[];break}}}),r.push({stream:u,aborter:m}),{unsubscribe:()=>{u.unsubscribeAll(),m.abort(),c.delete(e.table)},get isUpToDate(){return u.isUpToDate},get shapeId(){return u.shapeId},subscribeOnceToUpToDate:(T,y)=>u.subscribeOnceToUpToDate(T,y),unsubscribeAllUpToDateSubscribers:()=>{u.unsubscribeAllUpToDateSubscribers()}}}},close:async()=>{for(let{stream:e,aborter:i}of r)e.unsubscribeAll(),i.abort()},init:async()=>{await G({pg:a,metadataSchema:n})}}}function P(a){return{name:"ElectricSQL Sync",setup:async t=>{let{namespaceObj:s,close:n,init:r}=await R(t,a);return{namespaceObj:s,close:n,init:r}}}}function w(a,t){if(typeof a=="function")return a(t);{let s={};for(let[n,r]of Object.entries(a))s[n]=t.value[r];return s}}async function U({pg:a,table:t,schema:s="public",message:n,mapColumns:r,primaryKey:c,debug:g}){let p=r?w(r,n):n.value;switch(n.headers.operation){case"insert":{g&&console.log("inserting",p);let o=Object.keys(p);return await a.query(`
            INSERT INTO "${s}"."${t}"
            (${o.map(e=>'"'+e+'"').join(", ")})
            VALUES
            (${o.map((e,i)=>"$"+(i+1)).join(", ")})
          `,o.map(e=>p[e]))}case"update":{g&&console.log("updating",p);let o=Object.keys(p).filter(e=>!c.includes(e));return o.length===0?void 0:await a.query(`
            UPDATE "${s}"."${t}"
            SET ${o.map((e,i)=>'"'+e+'" = $'+(i+1)).join(", ")}
            WHERE ${c.map((e,i)=>'"'+e+'" = $'+(o.length+i+1)).join(" AND ")}
          `,[...o.map(e=>p[e]),...c.map(e=>p[e])])}case"delete":return g&&console.log("deleting",p),await a.query(`
            DELETE FROM "${s}"."${t}"
            WHERE ${c.map((o,e)=>'"'+o+'" = $'+(e+1)).join(" AND ")}
          `,[...c.map(o=>p[o])])}}async function v({pg:a,table:t,schema:s="public",messages:n,mapColumns:r,debug:c}){c&&console.log("applying messages with COPY");let g=n.map(i=>r?w(r,i):i.value),p=Object.keys(g[0]),o=g.map(i=>p.map(I=>{let l=i[I];return typeof l=="string"&&(l.includes(",")||l.includes('"')||l.includes(`
`))?`"${l.replace(/"/g,'""')}"`:l===null?"\\N":l}).join(",")).join(`
`),e=new Blob([o],{type:"text/csv"});await a.query(`
      COPY "${s}"."${t}" (${p.map(i=>`"${i}"`).join(", ")})
      FROM '/dev/blob'
      WITH (FORMAT csv, NULL '\\N')
    `,[],{blob:e}),c&&console.log(`Inserted ${n.length} rows using COPY`)}async function j({pg:a,metadataSchema:t,shapeKey:s}){let n=await a.query(`
    SELECT shape_id, last_offset
    FROM ${d(t)}
    WHERE shape_key = $1
  `,[s]);if(n.rows.length===0)return null;let{shape_id:r,last_offset:c}=n.rows[0];return{shapeId:r,offset:c}}async function k({pg:a,metadataSchema:t,shapeKey:s,shapeId:n,lastOffset:r}){await a.query(`
    INSERT INTO ${d(t)} (shape_key, shape_id, last_offset)
    VALUES ($1, $2, $3)
    ON CONFLICT(shape_key)
    DO UPDATE SET
      shape_id = EXCLUDED.shape_id,
      last_offset = EXCLUDED.last_offset;
  `,[s,n,r])}async function F({pg:a,metadataSchema:t,shapeKey:s}){await a.query(`DELETE FROM ${d(t)} WHERE shape_key = $1`,[s])}async function G({pg:a,metadataSchema:t}){await a.exec(`
    SET ${t}.syncing = false;
    CREATE SCHEMA IF NOT EXISTS "${t}";
    CREATE TABLE IF NOT EXISTS ${d(t)} (
      shape_key TEXT PRIMARY KEY,
      shape_id TEXT NOT NULL,
      last_offset TEXT NOT NULL
    );
    `)}function d(a){return`"${a}"."${q}"`}var q="shape_subscriptions_metadata";0&&(module.exports={electricSync});
//# sourceMappingURL=index.cjs.map