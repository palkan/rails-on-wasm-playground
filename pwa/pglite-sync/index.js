import{ShapeStream as $,isChangeMessage as w,isControlMessage as A}from"@electric-sql/client";async function N(a,t){let s=t?.debug??!1,n=t?.metadataSchema??"electric",i=[],c=new Map;return{namespaceObj:{syncShapeToTable:async e=>{if(c.has(e.table))throw new Error("Already syncing shape for table "+e.table);c.set(e.table);let r=null;e.shapeKey&&(r=await D({pg:a,metadataSchema:n,shapeKey:e.shapeKey}),s&&r&&console.log("resuming from shape state",r));let l=r===null&&e.useCopy,S=new AbortController;e.shape.signal&&e.shape.signal.addEventListener("abort",()=>S.abort(),{once:!0});let u=new $({...e.shape,...r??{},signal:S.signal}),h=[],d=!1;return u.subscribe(async m=>{s&&console.log("sync messages received",m);for(let y of m){if(w(y)){h.push(y);continue}if(A(y))switch(y.headers.control){case"must-refetch":s&&console.log("refetching shape"),d=!0,h=[];break;case"up-to-date":await a.transaction(async b=>{if(s&&console.log("up-to-date, committing all messages"),b.exec(`SET LOCAL ${n}.syncing = true;`),d&&(d=!1,await b.exec(`DELETE FROM ${e.table};`),e.shapeKey&&await R({pg:b,metadataSchema:n,shapeKey:e.shapeKey})),l){let f=[],E=[],C=!1;for(let O of h)!C&&O.headers.operation==="insert"?f.push(O):(C=!0,E.push(O));f.length>0&&E.unshift(f.pop()),h=E,f.length>0&&(_({pg:b,table:e.table,schema:e.schema,messages:f,mapColumns:e.mapColumns,primaryKey:e.primaryKey,debug:s}),l=!1)}for(let f of h)await K({pg:b,table:e.table,schema:e.schema,message:f,mapColumns:e.mapColumns,primaryKey:e.primaryKey,debug:s});e.shapeKey&&h.length>0&&u.shapeId!==void 0&&await L({pg:b,metadataSchema:n,shapeKey:e.shapeKey,shapeId:u.shapeId,lastOffset:h[h.length-1].offset})}),h=[];break}}}),i.push({stream:u,aborter:S}),{unsubscribe:()=>{u.unsubscribeAll(),S.abort(),c.delete(e.table)},get isUpToDate(){return u.isUpToDate},get shapeId(){return u.shapeId},subscribeOnceToUpToDate:(m,y)=>u.subscribeOnceToUpToDate(m,y),unsubscribeAllUpToDateSubscribers:()=>{u.unsubscribeAllUpToDateSubscribers()}}}},close:async()=>{for(let{stream:e,aborter:r}of i)e.unsubscribeAll(),r.abort()},init:async()=>{await P({pg:a,metadataSchema:n})}}}function F(a){return{name:"ElectricSQL Sync",setup:async t=>{let{namespaceObj:s,close:n,init:i}=await N(t,a);return{namespaceObj:s,close:n,init:i}}}}function I(a,t){if(typeof a=="function")return a(t);{let s={};for(let[n,i]of Object.entries(a))s[n]=t.value[i];return s}}async function K({pg:a,table:t,schema:s="public",message:n,mapColumns:i,primaryKey:c,debug:g}){let p=i?I(i,n):n.value;switch(n.headers.operation){case"insert":{g&&console.log("inserting",p);let o=Object.keys(p);return await a.query(`
            INSERT INTO "${s}"."${t}"
            (${o.map(e=>'"'+e+'"').join(", ")})
            VALUES
            (${o.map((e,r)=>"$"+(r+1)).join(", ")})
          `,o.map(e=>p[e]))}case"update":{g&&console.log("updating",p);let o=Object.keys(p).filter(e=>!c.includes(e));return o.length===0?void 0:await a.query(`
            UPDATE "${s}"."${t}"
            SET ${o.map((e,r)=>'"'+e+'" = $'+(r+1)).join(", ")}
            WHERE ${c.map((e,r)=>'"'+e+'" = $'+(o.length+r+1)).join(" AND ")}
          `,[...o.map(e=>p[e]),...c.map(e=>p[e])])}case"delete":return g&&console.log("deleting",p),await a.query(`
            DELETE FROM "${s}"."${t}"
            WHERE ${c.map((o,e)=>'"'+o+'" = $'+(e+1)).join(" AND ")}
          `,[...c.map(o=>p[o])])}}async function _({pg:a,table:t,schema:s="public",messages:n,mapColumns:i,debug:c}){c&&console.log("applying messages with COPY");let g=n.map(r=>i?I(i,r):r.value),p=Object.keys(g[0]),o=g.map(r=>p.map(M=>{let l=r[M];return typeof l=="string"&&(l.includes(",")||l.includes('"')||l.includes(`
`))?`"${l.replace(/"/g,'""')}"`:l===null?"\\N":l}).join(",")).join(`
`),e=new Blob([o],{type:"text/csv"});await a.query(`
      COPY "${s}"."${t}" (${p.map(r=>`"${r}"`).join(", ")})
      FROM '/dev/blob'
      WITH (FORMAT csv, NULL '\\N')
    `,[],{blob:e}),c&&console.log(`Inserted ${n.length} rows using COPY`)}async function D({pg:a,metadataSchema:t,shapeKey:s}){let n=await a.query(`
    SELECT shape_id, last_offset
    FROM ${T(t)}
    WHERE shape_key = $1
  `,[s]);if(n.rows.length===0)return null;let{shape_id:i,last_offset:c}=n.rows[0];return{shapeId:i,offset:c}}async function L({pg:a,metadataSchema:t,shapeKey:s,shapeId:n,lastOffset:i}){await a.query(`
    INSERT INTO ${T(t)} (shape_key, shape_id, last_offset)
    VALUES ($1, $2, $3)
    ON CONFLICT(shape_key)
    DO UPDATE SET
      shape_id = EXCLUDED.shape_id,
      last_offset = EXCLUDED.last_offset;
  `,[s,n,i])}async function R({pg:a,metadataSchema:t,shapeKey:s}){await a.query(`DELETE FROM ${T(t)} WHERE shape_key = $1`,[s])}async function P({pg:a,metadataSchema:t}){await a.exec(`
    SET ${t}.syncing = false;
    CREATE SCHEMA IF NOT EXISTS "${t}";
    CREATE TABLE IF NOT EXISTS ${T(t)} (
      shape_key TEXT PRIMARY KEY,
      shape_id TEXT NOT NULL,
      last_offset TEXT NOT NULL
    );
    `)}function T(a){return`"${a}"."${U}"`}var U="shape_subscriptions_metadata";export{F as electricSync};
//# sourceMappingURL=index.js.map