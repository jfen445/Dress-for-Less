import{q as Ie,s as we,r as x,t as J,v as Y,w as Q,g as A,x as _e,u as pe,y as L,j as o,L as H,z as U,E as be,F as je,G as fe,H as Se,I as ke,J as Ce,K as z,M as Re,N as G,O as Te,S as Ee,Q as De,m as ze,R as Le,T as Me,k as Oe,U as Ne,V as Ve,W as he,X as Ae,Y as E,Z as B,$ as W,a0 as K,a1 as N,a2 as me,a3 as Be,a4 as q,a5 as R,a6 as te,l as V,a7 as xe,B as We,a8 as $e,P as Ge,h as Ke,p as Fe,a9 as ne,aa as ae,ab as He,ac as Ue,ad as re,ae as X,af as qe,ag as Je,ah as Ye,ai as ye,aj as Qe,ak as Xe,al as Ze,am as et,an as M,ao as tt,ap as nt,aq as at,ar as rt,as as st,at as ot}from"./sanity-89e23d3b.js";function it(){return Ie(function(e,n){var t,s=!1;e.subscribe(we(n,function(c){var f=t;t=c,s&&n.next([f,c]),s=!0}))})}const lt=[];function ct(e){const{children:n,flatIndex:t,index:s,params:c,payload:f,siblingIndex:i}=e,{navigate:l,navigateIntent:a,resolvePathFromState:r}=J(),d=Y(),{panes:u,expand:P}=ze(),h=x.useMemo(()=>(d==null?void 0:d.panes)||lt,[d==null?void 0:d.panes]),y=x.useMemo(()=>u==null?void 0:u[u.length-2],[u]),g=s-1,j=x.useCallback(m=>{const p=h[g]||[],I=p[i],k=m(p,I),T=[...h.slice(0,g),k,...h.slice(g+1)];return{...d||{},panes:T}},[g,h,d,i]),v=x.useCallback(m=>{const p=j(m);return setTimeout(()=>l(p),0),p},[j,l]),w=x.useCallback(m=>{const p=j((I,k)=>[...I.slice(0,i),{...k,params:m},...I.slice(i+1)]);return r(p)},[j,r,i]),S=x.useCallback(m=>{v((p,I)=>[...p.slice(0,i),{...I,payload:m},...p.slice(i+1)])},[v,i]),_=x.useCallback(m=>{v((p,I)=>[...p.slice(0,i),{...I,params:m},...p.slice(i+1)])},[v,i]),b=x.useCallback(m=>{let{id:p,parentRefPath:I,type:k,template:T}=m;l({panes:[...h.slice(0,g+1),[{id:p,params:{template:T.id,parentRefPath:Le(I),type:k},payload:T.params}]]})},[g,l,h]),C=x.useMemo(()=>({index:t,groupIndex:g,siblingIndex:i,payload:f,params:c,hasGroupSiblings:h[g]?h[g].length>1:!1,groupLength:h[g]?h[g].length:0,routerPanesState:h,ChildLink:Me,BackLink:t?Oe:void 0,ReferenceChildLink:Ne,handleEditReference:b,ParameterizedLink:Ve,replaceCurrent:function(){let m=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};v(()=>[{id:m.id||"",payload:m.payload,params:m.params||{}}])},closeCurrent:()=>{v((m,p)=>m.length>1?m.filter(I=>I!==p):m)},closeCurrentAndAfter:function(){(arguments.length>0&&arguments[0]!==void 0?arguments[0]:!0)&&y&&P(y.element),l({panes:[...h.slice(0,g)]},{replace:!0})},duplicateCurrent:m=>{v((p,I)=>{const k={...I,payload:(m==null?void 0:m.payload)||I.payload,params:(m==null?void 0:m.params)||I.params};return[...p.slice(0,i),k,...p.slice(i)]})},setView:m=>{const p=he(c,"view");return _(m?{...p,view:m}:p)},setParams:_,setPayload:S,createPathWithParams:w,navigateIntent:a}),[t,g,i,f,c,h,b,_,S,w,a,v,y,l,P]);return o.jsx(Ae.Provider,{value:C,children:n})}class D extends Error{constructor(n){let{message:t,context:s,helpId:c,cause:f}=n;super(t),this.context=s,this.helpId=c,this.cause=f}}const se=new WeakMap;function $(e){const n=se.get(e);if(n)return n;const t=rt();return se.set(e,t),t}const ut=e=>!!e&&typeof(e==null?void 0:e.then)=="function",dt=e=>Q(e)?typeof e.serialize=="function":!1,pt=e=>(n,t,s)=>{try{return e(n,t,s)}catch(c){throw c instanceof D?c:new D({message:typeof(c==null?void 0:c.message)=="string"?c.message:"",context:t,cause:c})}},ft=e=>function(){return e(...arguments).pipe(st(1),ot())};function ge(e){const n=pt(ft(e((t,s,c)=>{if(!t)throw new D({message:"Pane returned no child",context:s,helpId:"structure-item-returned-no-child"});return ut(t)||Ze(t)?et(t).pipe(X(f=>n(f,s,c))):dt(t)?n(t.serialize(s),s,c):typeof t=="function"?n(t(s.id,s),s,c):M(t)})));return n}const oe=new WeakMap;function ve(e,n){const t=oe.get(e)||new Map;if(t){const f=t.get(n);if(f)return f}const s=e[n];if(typeof s!="function")throw new Error("Expected property `".concat(n,"` to be a function but got ").concat(typeof s," instead."));const c=s.bind(e);return t.set(n,c),oe.set(e,t),c}async function ht(e){const n=new Map,s=ge(a=>(r,d,u)=>{const P=r&&"".concat($(r),"-").concat(d.path.join("__")),h=P&&n.get(P);if(h)return h;const y=a(r,d,u);return P&&n.set(P,y),y}),c=[[{id:"__edit__".concat(e.params.id),params:{...he(e.params,["id"]),type:e.params.type},payload:e.payload}]];async function f(a){let{currentId:r,flatIndex:d,intent:u,params:P,parent:h,path:y,payload:g,unresolvedPane:j,levelIndex:v,structureContext:w}=a;var S;if(!j)return[];const{id:_,type:b,...C}=P,p=await ye(s(j,{id:r,splitIndex:0,parent:h,path:y,index:d,params:{},payload:void 0,structureContext:w},d));return p.type==="document"&&p.id===_?[{panes:[...y.slice(0,y.length-1).map(I=>[{id:I}]),[{id:_,params:C,payload:g}]],depthIndex:y.length,levelIndex:v}]:(S=p.canHandleIntent)!=null&&S.call(p,u,P,{pane:p,index:d})||p.type==="documentList"&&p.schemaTypeName===b&&p.options.filter==="_type == $type"?[{panes:[...y.map(I=>[{id:I}]),[{id:P.id,params:C,payload:g}]],depthIndex:y.length,levelIndex:v}]:p.type==="list"&&p.child&&p.items?(await Promise.all(p.items.map((I,k)=>I.type==="divider"?Promise.resolve([]):f({currentId:I._id||I.id,flatIndex:d+1,intent:u,params:P,parent:p,path:[...y,I.id],payload:g,unresolvedPane:typeof p.child=="function"?ve(p,"child"):p.child,levelIndex:k,structureContext:w})))).flat():[]}const l=(await f({currentId:"root",flatIndex:0,levelIndex:0,intent:e.intent,params:e.params,parent:null,path:[],payload:e.payload,unresolvedPane:e.rootPaneNode,structureContext:e.structureContext})).sort((a,r)=>a.depthIndex===r.depthIndex?a.levelIndex-r.levelIndex:a.depthIndex-r.depthIndex)[0];return l?l.panes:c}const mt=(e,n)=>{const t=e.replace(/^__edit__/,""),{params:s,payload:c,structureContext:{resolveDocumentNode:f}}=n,{type:i,template:l}=s;if(!i)throw new Error("Document type for document with ID ".concat(t," was not provided in the router params."));let a=f({schemaType:i,documentId:t}).id("editor");return l&&(a=a.initialValueTemplate(l,c)),a.serialize()};function xt(e){var n,t;return"contextHash(".concat(JSON.stringify({id:e.id,parentId:parent&&$(parent),path:e.path,index:e.index,splitIndex:e.splitIndex,serializeOptionsIndex:(n=e.serializeOptions)==null?void 0:n.index,serializeOptionsPath:(t=e.serializeOptions)==null?void 0:t.path}),")")}const ie=e=>{const n={type:e.type,id:e.routerPaneSibling.id,params:e.routerPaneSibling.params||{},payload:e.routerPaneSibling.payload||null,flatIndex:e.flatIndex,groupIndex:e.groupIndex,siblingIndex:e.siblingIndex,path:e.path,paneNode:e.type==="resolvedMeta"?$(e.paneNode):null};return"metaHash(".concat(JSON.stringify(n),")")};function O(e){let{unresolvedPane:n,flattenedRouterPanes:t,parent:s,path:c,resolvePane:f,structureContext:i}=e;const[l,...a]=t,r=a[0],d={id:l.routerPaneSibling.id,splitIndex:l.siblingIndex,parent:s,path:[...c,l.routerPaneSibling.id],index:l.flatIndex,params:l.routerPaneSibling.params||{},payload:l.routerPaneSibling.payload,structureContext:i};try{return f(n,d,l.flatIndex).pipe(X(u=>{const P={type:"resolvedMeta",...l,paneNode:u,path:d.path},h=a.map((g,j)=>({type:"loading",path:[...d.path,...a.slice(j).map((S,_)=>"[".concat(g.flatIndex+_,"]"))],paneNode:null,...g}));if(!a.length)return M([P]);let y;return r!=null&&r.routerPaneSibling.id.startsWith("__edit__")?y=O({unresolvedPane:mt,flattenedRouterPanes:a,parent:s,path:d.path,resolvePane:f,structureContext:i}):l.groupIndex===(r==null?void 0:r.groupIndex)?y=O({unresolvedPane:n,flattenedRouterPanes:a,parent:s,path:c,resolvePane:f,structureContext:i}):y=O({unresolvedPane:typeof u.child=="function"?ve(u,"child"):u.child,flattenedRouterPanes:a,parent:u,path:d.path,resolvePane:f,structureContext:i}),tt(M([P,...h]),y.pipe(E(g=>[P,...g])))}))}catch(u){if(u instanceof D&&(u.context&&console.warn("Pane resolution error at index ".concat(u.context.index).concat(u.context.splitIndex>0?" for split pane index ".concat(u.context.splitIndex):"",": ").concat(u.message).concat(u.helpId?" - see ".concat(xe(u.helpId)):""),u),u.helpId==="structure-item-returned-no-child"))return M([]);throw u}}function yt(e){let{routerPanesStream:n,rootPaneNode:t,initialCacheState:s={cacheKeysByFlatIndex:[],flattenedRouterPanes:[],resolvedPaneCache:new Map,resolvePane:()=>nt},structureContext:c}=e;return n.pipe(E(i=>[[{id:"root"}],...i]),E(i=>i.flatMap((a,r)=>a.map((d,u)=>({routerPaneSibling:d,groupIndex:r,siblingIndex:u}))).map((a,r)=>({...a,flatIndex:r}))),Ue([]),it(),E(i=>{let[l,a]=i;for(let r=0;r<a.length;r++){const d=l[r],u=a[r];if(!U(d,u))return{flattenedRouterPanes:a,diffIndex:r}}return{flattenedRouterPanes:a,diffIndex:a.length}}),re((i,l)=>{const{cacheKeysByFlatIndex:a,resolvedPaneCache:r}=i,{flattenedRouterPanes:d,diffIndex:u}=l,P=a.slice(0,u+1),h=a.slice(u+1),y=new Set(P.flatMap(v=>Array.from(v))),g=h.flatMap(v=>Array.from(v)).filter(v=>!y.has(v));for(const v of g)r.delete(v);return{flattenedRouterPanes:d,cacheKeysByFlatIndex:a,resolvedPaneCache:r,resolvePane:ge(v=>(w,S,_)=>{const b=w&&"".concat($(w),"-").concat(xt(S)),C=b&&r.get(b);if(C)return C;const m=v(w,S,_);if(!b)return m;const p=a[_]||new Set;return p.add(b),a[_]=p,r.set(b,m),m})}},s),X(i=>{let{flattenedRouterPanes:l,resolvePane:a}=i;return O({unresolvedPane:t,flattenedRouterPanes:l,parent:null,path:[],resolvePane:a,structureContext:c})})).pipe(re((i,l)=>l.map((a,r)=>{const d=i[r];return!d||a.type!=="loading"?a:d.routerPaneSibling.id===a.routerPaneSibling.id?d:a}),[]),qe((i,l)=>{if(i.length!==l.length)return!1;for(let a=0;a<l.length;a++){const r=i[a],d=l[a];if(ie(r)!==ie(d))return!1}return!0}))}function gt(){const e=x.useMemo(()=>new Je(1),[]),n=x.useMemo(()=>e.asObservable().pipe(E(s=>(s==null?void 0:s.panes)||[])),[e]),{state:t}=J();return x.useEffect(()=>{e.next(t)},[t,e]),n}function vt(){const[e,n]=x.useState();if(e)throw e;const{structureContext:t,rootPaneNode:s}=A(),[c,f]=x.useState({paneDataItems:[],resolvedPanes:[],routerPanes:[]}),i=gt();return x.useEffect(()=>{const a=yt({rootPaneNode:s,routerPanesStream:i,structureContext:t}).pipe(E(r=>{const d=r.reduce((h,y)=>{const g=h[y.groupIndex]||[];return g[y.siblingIndex]=y.routerPaneSibling,h[y.groupIndex]=g,h},[]),u=d.length,P=r.map(h=>{var y;const{groupIndex:g,flatIndex:j,siblingIndex:v,routerPaneSibling:w,path:S}=h,_=w.id,b=d[g+1];return{active:g===u-2,childItemId:(y=b==null?void 0:b[0].id)!=null?y:null,index:j,itemId:w.id,groupIndex:g,key:"".concat(h.type==="loading"?"unknown":h.paneNode.id,"-").concat(_,"-").concat(v),pane:h.type==="loading"?z:h.paneNode,params:w.params||{},path:S.join(";"),payload:w.payload,selected:j===r.length-1,siblingIndex:v}});return{paneDataItems:P,routerPanes:d,resolvedPanes:P.map(h=>h.pane)}})).subscribe({next:r=>f(r),error:r=>n(r)});return()=>a.unsubscribe()},[s,i,t]),c}async function Pt(e,n,t){if(n&&t)return{id:n,type:t};if(!n&&t)return{id:Ye(),type:t};if(n&&!t){const s=await ye(e.resolveTypeForDocument(n));return{id:n,type:s}}throw new D({message:"Neither document `id` or `type` was provided when trying to resolve intent."})}const It={},wt=x.memo(function(){const{navigate:n}=J(),t=Y(x.useCallback(a=>{const r=typeof a.intent=="string"?a.intent:void 0;return r?{intent:r,params:Q(a.params)?a.params:It,payload:a.payload}:void 0},[])),{rootPaneNode:s,structureContext:c}=A(),f=_e(),[i,l]=x.useState(null);if(i)throw i;return x.useEffect(()=>{if(t){const{intent:a,params:r,payload:d}=t;let u=!1;async function P(){const{id:h,type:y}=await Pt(f,typeof r.id=="string"?r.id:void 0,typeof r.type=="string"?r.type:void 0);if(u)return;const g=await ht({intent:a,params:{...r,id:h,type:y},payload:d,rootPaneNode:s,structureContext:c});u||n({panes:g},{replace:!0})}return P().catch(l),()=>{u=!0}}},[f,t,n,s,c]),null});var le=Object.freeze,_t=Object.defineProperty,bt=(e,n)=>le(_t(e,"raw",{value:le(n||e.slice())})),ce;const jt=pe.span(ce||(ce=bt([`
  &:not(:last-child)::after {
    content: ' ➝ ';
    opacity: 0.5;
  }
`])));function St(e){return e.replace(/\(\.\.\.\)\./g,`(...)
  .`).replace(/__WEBPACK_IMPORTED_MODULE_\d+_+/g,"").replace(/___default\./g,".").replace(new RegExp(" \\(https?:\\/\\/".concat(window.location.host),"g")," (")}function kt(e){let{error:n}=e;if(!(n instanceof D))throw n;const{cause:t}=n,{t:s}=B(W),c=(t==null?void 0:t.stack)||n.stack,f=c&&!(t instanceof K)&&!n.message.includes("Module build failed:"),i=t instanceof K?t.path:[],l=t instanceof K&&t.helpId||n.helpId,a=x.useCallback(()=>{window.location.reload()},[]);return o.jsx(N,{height:"fill",overflow:"auto",padding:4,sizing:"border",tone:"critical",children:o.jsxs(me,{children:[o.jsx(Be,{as:"h2",children:s("structure-error.header.text")}),o.jsxs(N,{marginTop:4,padding:4,radius:2,overflow:"auto",shadow:1,tone:"inherit",children:[i.length>0&&o.jsxs(q,{space:2,children:[o.jsx(R,{size:1,weight:"medium",children:s("structure-error.structure-path.label")}),o.jsx(te,{children:i.slice(1).map((r,d)=>o.jsx(jt,{children:r},"".concat(r,"-").concat(d)))})]}),o.jsxs(q,{marginTop:4,space:2,children:[o.jsx(R,{size:1,weight:"medium",children:s("structure-error.error.label")}),o.jsx(te,{children:f?St(c):n.message})]}),l&&o.jsx(V,{marginTop:4,children:o.jsx(R,{children:o.jsx("a",{href:xe(l),rel:"noopener noreferrer",target:"_blank",children:s("structure-error.docs-link.text")})})}),o.jsx(V,{marginTop:4,children:o.jsx(We,{text:s("structure-error.reload-button.text"),icon:$e,tone:"primary",onClick:a})})]})]})})}function Ct(e){const{isSelected:n,pane:t,paneKey:s}=e,c=Q(t)&&t.type||null,{t:f}=B(W);return o.jsxs(Ge,{id:s,selected:n,children:[o.jsx(Ke,{title:f("panes.unknown-pane-type.title")}),o.jsx(Fe,{children:o.jsx(V,{padding:4,children:typeof c=="string"?o.jsx(R,{as:"p",muted:!0,children:o.jsx(ne,{t:f,i18nKey:"panes.unknown-pane-type.unknown-type.text",values:{type:c}})}):o.jsx(R,{as:"p",muted:!0,children:o.jsx(ne,{t:f,i18nKey:"panes.unknown-pane-type.missing-type.text"})})})})]})}const Rt={component:x.lazy(()=>L(()=>import("./index-pIqlMpni-678ee116.js"),["static/index-pIqlMpni-678ee116.js","static/sanity-89e23d3b.js"])),document:x.lazy(()=>L(()=>import("./pane-DelUyv32-b32a07a5.js"),["static/pane-DelUyv32-b32a07a5.js","static/sanity-89e23d3b.js"])),documentList:x.lazy(()=>L(()=>import("./pane-CoYwJxjj-2a7bc545.js"),["static/pane-CoYwJxjj-2a7bc545.js","static/sanity-89e23d3b.js"])),list:x.lazy(()=>L(()=>import("./index-DH4YIT_w-7885adc1.js"),["static/index-DH4YIT_w-7885adc1.js","static/sanity-89e23d3b.js"]))},Tt=x.memo(function(n){const{active:t,childItemId:s,groupIndex:c,index:f,itemId:i,pane:l,paneKey:a,params:r,payload:d,path:u,selected:P,siblingIndex:h}=n,y=Rt[l.type]||Ct;return o.jsx(ct,{flatIndex:f,index:c,params:r,payload:d,siblingIndex:h,children:o.jsx(x.Suspense,{fallback:o.jsx(H,{paneKey:a,path:u,selected:P}),children:o.jsx(y,{childItemId:s||"",index:f,itemId:i,isActive:t,isSelected:P,paneKey:a,pane:l})})})},(e,n)=>{let{params:t={},payload:s=null,...c}=e,{params:f={},payload:i=null,...l}=n;if(!U(t,f)||!U(s,i))return!1;const a=new Set([...Object.keys(c),...Object.keys(l)]);for(const r of a)if(c[r]!==l[r])return!1;return!0});function Et(){const{t:e}=B(W);return o.jsx(N,{height:"fill",children:o.jsx(ae,{align:"center",height:"fill",justify:"center",padding:4,sizing:"border",children:o.jsx(me,{width:0,children:o.jsx(N,{padding:4,radius:2,shadow:1,tone:"caution",children:o.jsxs(ae,{children:[o.jsx(V,{children:o.jsx(R,{size:1,children:o.jsx(He,{})})}),o.jsxs(q,{flex:1,marginLeft:3,space:3,children:[o.jsx(R,{as:"h1",size:1,weight:"medium",children:e("no-document-types-screen.title")}),o.jsx(R,{as:"p",muted:!0,size:1,children:e("no-document-types-screen.subtitle")}),o.jsx(R,{as:"p",muted:!0,size:1,children:o.jsx("a",{href:"https://www.sanity.io/docs/create-a-schema-and-configure-sanity-studio",target:"_blank",rel:"noreferrer",children:e("no-document-types-screen.link-text")})})]})]})})})})})}const Dt=e=>{const{documentId:n,documentType:t}=e,s=Qe(n,t),c=fe(),{t:f}=B(W),i=!(s!=null&&s.published)&&!(s!=null&&s.draft),l=(s==null?void 0:s.draft)||(s==null?void 0:s.published),a=c.get(t),{value:r,isLoading:d}=Xe({enabled:!0,schemaType:a,value:l}),u=i?f("browser-document-title.new-document",{schemaType:(a==null?void 0:a.title)||(a==null?void 0:a.name)}):(r==null?void 0:r.title)||f("browser-document-title.untitled-document"),P=s.ready&&!d,h=Pe(u);return x.useEffect(()=>{P&&(document.title=h)},[u,P,h]),null},F=e=>{const{title:n}=e,t=Pe(n);return x.useEffect(()=>{document.title=t},[t,n]),null},zt=e=>{const{resolvedPanes:n}=e;if(!(n!=null&&n.length))return null;const t=n[n.length-1];return Mt(t)?o.jsx(F,{}):Lt(t)?t!=null&&t.title?o.jsx(F,{title:t.title}):o.jsx(Dt,{documentId:t.options.id,documentType:t.options.type}):o.jsx(F,{title:t==null?void 0:t.title})};function Pe(e){const n=A().structureContext.title;return[e,n].filter(t=>t).join(" | ")}function Lt(e){return e!==z&&e.type==="document"}function Mt(e){return e===z}var ue=Object.freeze,Ot=Object.defineProperty,Nt=(e,n)=>ue(Ot(e,"raw",{value:ue(n||e.slice())})),de;const Vt=pe(at)(de||(de=Nt([`
  min-height: 100%;
  min-width: 320px;
`]))),At=be("mod+s"),Bt=x.memo(function(n){let{onPaneChange:t}=n;var s;const{push:c}=je(),f=fe(),{layoutCollapsed:i,setLayoutCollapsed:l}=A(),{paneDataItems:a,resolvedPanes:r}=vt(),d=Y(x.useCallback(v=>typeof v.intent=="string",[])),{sanity:{media:u}}=Se(),[P,h]=x.useState(null),y=x.useCallback(()=>l(!0),[l]),g=x.useCallback(()=>l(!1),[l]);return x.useEffect(()=>{r.length&&t(r)},[t,r]),x.useEffect(()=>{const v=w=>{At(w)&&(w.preventDefault(),c({closable:!0,id:"auto-save-message",status:"info",title:"Your work is automatically saved!",duration:4e3}))};return window.addEventListener("keydown",v),()=>window.removeEventListener("keydown",v)},[c]),((s=f._original)==null?void 0:s.types.some(ke))?o.jsxs(Ce,{element:P||null,children:[o.jsxs(Vt,{flex:1,height:i?void 0:"fill",minWidth:u[1],onCollapse:y,onExpand:g,children:[a.map(v=>{let{active:w,childItemId:S,groupIndex:_,itemId:b,key:C,pane:m,index:p,params:I,path:k,payload:T,siblingIndex:Z,selected:ee}=v;return o.jsx(x.Fragment,{children:m===z?o.jsx(H,{paneKey:C,path:k,selected:ee}):o.jsx(Tt,{active:w,groupIndex:_,index:p,pane:m,childItemId:S,itemId:b,paneKey:C,params:I,payload:T,path:k,selected:ee,siblingIndex:Z})},"".concat(m===z?"loading":m.type,"-").concat(p))}),a.length<=1&&d&&o.jsx(H,{paneKey:"intent-resolver"})]}),o.jsx(zt,{resolvedPanes:r}),o.jsx("div",{"data-portal":"",ref:h})]}):o.jsx(Et,{})});function $t(e){let{tool:{options:n}}=e;const{unstable_sources:t}=Re(),[s]=t,{source:c,defaultDocumentNode:f,structure:i}=n||{};x.useEffect(()=>(G([]),()=>G([])),[]);const[{error:l},a]=x.useState({error:null});return l?o.jsx(kt,{error:l}):o.jsx(Te,{onCatch:a,children:o.jsx(Ee,{name:c||s.name,children:o.jsxs(De,{defaultDocumentNode:f,structure:i,children:[o.jsx(Bt,{onPaneChange:G}),o.jsx(wt,{})]})})})}export{$t as default};
