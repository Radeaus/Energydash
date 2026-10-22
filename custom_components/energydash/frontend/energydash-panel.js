var Ae=globalThis,Ce=Ae.ShadowRoot&&(Ae.ShadyCSS===void 0||Ae.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Pe=Symbol(),nt=new WeakMap,ie=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==Pe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(Ce&&e===void 0){let i=t!==void 0&&t.length===1;i&&(e=nt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&nt.set(t,e))}return e}toString(){return this.cssText}},rt=r=>new ie(typeof r=="string"?r:r+"",void 0,Pe),j=(r,...e)=>{let t=r.length===1?r[0]:e.reduce((i,n,d)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+r[d+1],r[0]);return new ie(t,r,Pe)},at=(r,e)=>{if(Ce)r.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let i=document.createElement("style"),n=Ae.litNonce;n!==void 0&&i.setAttribute("nonce",n),i.textContent=t.cssText,r.appendChild(i)}},De=Ce?r=>r:r=>r instanceof CSSStyleSheet?(e=>{let t="";for(let i of e.cssRules)t+=i.cssText;return rt(t)})(r):r;var{is:Lt,defineProperty:It,getOwnPropertyDescriptor:qt,getOwnPropertyNames:Ut,getOwnPropertySymbols:Ft,getPrototypeOf:Bt}=Object,We=globalThis,ot=We.trustedTypes,Vt=ot?ot.emptyScript:"",Zt=We.reactiveElementPolyfillSupport,ne=(r,e)=>r,He={toAttribute(r,e){switch(e){case Boolean:r=r?Vt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,e){let t=r;switch(e){case Boolean:t=r!==null;break;case Number:t=r===null?null:Number(r);break;case Object:case Array:try{t=JSON.parse(r)}catch{t=null}}return t}},lt=(r,e)=>!Lt(r,e),dt={attribute:!0,type:String,converter:He,reflect:!1,useDefault:!1,hasChanged:lt};Symbol.metadata??=Symbol("metadata"),We.litPropertyMetadata??=new WeakMap;var P=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=dt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let i=Symbol(),n=this.getPropertyDescriptor(e,i,t);n!==void 0&&It(this.prototype,e,n)}}static getPropertyDescriptor(e,t,i){let{get:n,set:d}=qt(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:n,set(o){let l=n?.call(this);d?.call(this,o),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??dt}static _$Ei(){if(this.hasOwnProperty(ne("elementProperties")))return;let e=Bt(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ne("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ne("properties"))){let t=this.properties,i=[...Ut(t),...Ft(t)];for(let n of i)this.createProperty(n,t[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[i,n]of t)this.elementProperties.set(i,n)}this._$Eh=new Map;for(let[t,i]of this.elementProperties){let n=this._$Eu(t,i);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let i=new Set(e.flat(1/0).reverse());for(let n of i)t.unshift(De(n))}else e!==void 0&&t.push(De(e));return t}static _$Eu(e,t){let i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return at(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){let i=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,i);if(n!==void 0&&i.reflect===!0){let d=(i.converter?.toAttribute!==void 0?i.converter:He).toAttribute(t,i.type);this._$Em=e,d==null?this.removeAttribute(n):this.setAttribute(n,d),this._$Em=null}}_$AK(e,t){let i=this.constructor,n=i._$Eh.get(e);if(n!==void 0&&this._$Em!==n){let d=i.getPropertyOptions(n),o=typeof d.converter=="function"?{fromAttribute:d.converter}:d.converter?.fromAttribute!==void 0?d.converter:He;this._$Em=n;let l=o.fromAttribute(t,d.type);this[n]=l??this._$Ej?.get(n)??l,this._$Em=null}}requestUpdate(e,t,i,n=!1,d){if(e!==void 0){let o=this.constructor;if(n===!1&&(d=this[e]),i??=o.getPropertyOptions(e),!((i.hasChanged??lt)(d,t)||i.useDefault&&i.reflect&&d===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:n,wrapped:d},o){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),d!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),n===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,d]of this._$Ep)this[n]=d;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[n,d]of i){let{wrapped:o}=d,l=this[n];o!==!0||this._$AL.has(n)||l===void 0||this.C(n,void 0,d,l)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};P.elementStyles=[],P.shadowRootOptions={mode:"open"},P[ne("elementProperties")]=new Map,P[ne("finalized")]=new Map,Zt?.({ReactiveElement:P}),(We.reactiveElementVersions??=[]).push("2.1.2");var Ve=globalThis,ct=r=>r,Te=Ve.trustedTypes,pt=Te?Te.createPolicy("lit-html",{createHTML:r=>r}):void 0,vt="$lit$",q=`lit$${Math.random().toFixed(9).slice(2)}$`,ft="?"+q,Gt=`<${ft}>`,K=document,ae=()=>K.createComment(""),oe=r=>r===null||typeof r!="object"&&typeof r!="function",Ze=Array.isArray,Kt=r=>Ze(r)||typeof r?.[Symbol.iterator]=="function",Le=`[ 	
\f\r]`,re=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ht=/-->/g,ut=/>/g,Z=RegExp(`>|${Le}(?:([^\\s"'>=/]+)(${Le}*=${Le}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),gt=/'/g,_t=/"/g,bt=/^(?:script|style|textarea|title)$/i,Ge=r=>(e,...t)=>({_$litType$:r,strings:e,values:t}),a=Ge(1),X=Ge(2),hs=Ge(3),J=Symbol.for("lit-noChange"),h=Symbol.for("lit-nothing"),mt=new WeakMap,G=K.createTreeWalker(K,129);function xt(r,e){if(!Ze(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return pt!==void 0?pt.createHTML(e):e}var Jt=(r,e)=>{let t=r.length-1,i=[],n,d=e===2?"<svg>":e===3?"<math>":"",o=re;for(let l=0;l<t;l++){let c=r[l],g,m,u=-1,x=0;for(;x<c.length&&(o.lastIndex=x,m=o.exec(c),m!==null);)x=o.lastIndex,o===re?m[1]==="!--"?o=ht:m[1]!==void 0?o=ut:m[2]!==void 0?(bt.test(m[2])&&(n=RegExp("</"+m[2],"g")),o=Z):m[3]!==void 0&&(o=Z):o===Z?m[0]===">"?(o=n??re,u=-1):m[1]===void 0?u=-2:(u=o.lastIndex-m[2].length,g=m[1],o=m[3]===void 0?Z:m[3]==='"'?_t:gt):o===_t||o===gt?o=Z:o===ht||o===ut?o=re:(o=Z,n=void 0);let p=o===Z&&r[l+1].startsWith("/>")?" ":"";d+=o===re?c+Gt:u>=0?(i.push(g),c.slice(0,u)+vt+c.slice(u)+q+p):c+q+(u===-2?l:p)}return[xt(r,d+(r[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]},de=class r{constructor({strings:e,_$litType$:t},i){let n;this.parts=[];let d=0,o=0,l=e.length-1,c=this.parts,[g,m]=Jt(e,t);if(this.el=r.createElement(g,i),G.currentNode=this.el.content,t===2||t===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(n=G.nextNode())!==null&&c.length<l;){if(n.nodeType===1){if(n.hasAttributes())for(let u of n.getAttributeNames())if(u.endsWith(vt)){let x=m[o++],p=n.getAttribute(u).split(q),f=/([.?@])?(.*)/.exec(x);c.push({type:1,index:d,name:f[2],strings:p,ctor:f[1]==="."?qe:f[1]==="?"?Ue:f[1]==="@"?Fe:Q}),n.removeAttribute(u)}else u.startsWith(q)&&(c.push({type:6,index:d}),n.removeAttribute(u));if(bt.test(n.tagName)){let u=n.textContent.split(q),x=u.length-1;if(x>0){n.textContent=Te?Te.emptyScript:"";for(let p=0;p<x;p++)n.append(u[p],ae()),G.nextNode(),c.push({type:2,index:++d});n.append(u[x],ae())}}}else if(n.nodeType===8)if(n.data===ft)c.push({type:2,index:d});else{let u=-1;for(;(u=n.data.indexOf(q,u+1))!==-1;)c.push({type:7,index:d}),u+=q.length-1}d++}}static createElement(e,t){let i=K.createElement("template");return i.innerHTML=e,i}};function Y(r,e,t=r,i){if(e===J)return e;let n=i!==void 0?t._$Co?.[i]:t._$Cl,d=oe(e)?void 0:e._$litDirective$;return n?.constructor!==d&&(n?._$AO?.(!1),d===void 0?n=void 0:(n=new d(r),n._$AT(r,t,i)),i!==void 0?(t._$Co??=[])[i]=n:t._$Cl=n),n!==void 0&&(e=Y(r,n._$AS(r,e.values),n,i)),e}var Ie=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:i}=this._$AD,n=(e?.creationScope??K).importNode(t,!0);G.currentNode=n;let d=G.nextNode(),o=0,l=0,c=i[0];for(;c!==void 0;){if(o===c.index){let g;c.type===2?g=new le(d,d.nextSibling,this,e):c.type===1?g=new c.ctor(d,c.name,c.strings,this,e):c.type===6&&(g=new Be(d,this,e)),this._$AV.push(g),c=i[++l]}o!==c?.index&&(d=G.nextNode(),o++)}return G.currentNode=K,n}p(e){let t=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}},le=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,n){this.type=2,this._$AH=h,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Y(this,e,t),oe(e)?e===h||e==null||e===""?(this._$AH!==h&&this._$AR(),this._$AH=h):e!==this._$AH&&e!==J&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Kt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==h&&oe(this._$AH)?this._$AA.nextSibling.data=e:this.T(K.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:i}=e,n=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=de.createElement(xt(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(t);else{let d=new Ie(n,this),o=d.u(this.options);d.p(t),this.T(o),this._$AH=d}}_$AC(e){let t=mt.get(e.strings);return t===void 0&&mt.set(e.strings,t=new de(e)),t}k(e){Ze(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,i,n=0;for(let d of e)n===t.length?t.push(i=new r(this.O(ae()),this.O(ae()),this,this.options)):i=t[n],i._$AI(d),n++;n<t.length&&(this._$AR(i&&i._$AB.nextSibling,n),t.length=n)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let i=ct(e).nextSibling;ct(e).remove(),e=i}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},Q=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,n,d){this.type=1,this._$AH=h,this._$AN=void 0,this.element=e,this.name=t,this._$AM=n,this.options=d,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=h}_$AI(e,t=this,i,n){let d=this.strings,o=!1;if(d===void 0)e=Y(this,e,t,0),o=!oe(e)||e!==this._$AH&&e!==J,o&&(this._$AH=e);else{let l=e,c,g;for(e=d[0],c=0;c<d.length-1;c++)g=Y(this,l[i+c],t,c),g===J&&(g=this._$AH[c]),o||=!oe(g)||g!==this._$AH[c],g===h?e=h:e!==h&&(e+=(g??"")+d[c+1]),this._$AH[c]=g}o&&!n&&this.j(e)}j(e){e===h?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},qe=class extends Q{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===h?void 0:e}},Ue=class extends Q{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==h)}},Fe=class extends Q{constructor(e,t,i,n,d){super(e,t,i,n,d),this.type=5}_$AI(e,t=this){if((e=Y(this,e,t,0)??h)===J)return;let i=this._$AH,n=e===h&&i!==h||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,d=e!==h&&(i===h||n);n&&this.element.removeEventListener(this.name,this,i),d&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Be=class{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){Y(this,e)}};var Yt=Ve.litHtmlPolyfillSupport;Yt?.(de,le),(Ve.litHtmlVersions??=[]).push("3.3.3");var yt=(r,e,t)=>{let i=t?.renderBefore??e,n=i._$litPart$;if(n===void 0){let d=t?.renderBefore??null;i._$litPart$=n=new le(e.insertBefore(ae(),d),d,void 0,t??{})}return n._$AI(r),n};var Ke=globalThis,k=class extends P{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=yt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return J}};k._$litElement$=!0,k.finalized=!0,Ke.litElementHydrateSupport?.({LitElement:k});var Qt=Ke.litElementPolyfillSupport;Qt?.({LitElement:k});(Ke.litElementVersions??=[]).push("4.2.2");function M(r){return Array.isArray(r)?r.filter(e=>!!e):r?[r]:[]}var S={config:r=>r.callWS({type:"energydash/config"}),saveSettings:(r,e,t=!1)=>r.callWS({type:"energydash/settings/save",settings:e,recalculate:t}),discover:r=>r.callWS({type:"energydash/discover"}),suggest:r=>r.callWS({type:"energydash/suggest"}),analyze:(r,e)=>r.callWS({type:"energydash/analyze",...e}),preview:(r,e)=>r.callWS({type:"energydash/preview_sessions",energy_entity:e.energy_entity,energy_is_power:e.energy_is_power,power_entity:e.power_entity??null,session_source:e.session_source,session_entity:e.session_entity??null,session_states:e.session_states,threshold_w:e.threshold_w,off_delay_min:e.off_delay_min,min_duration_min:e.min_duration_min}),saveDevice:(r,e,t=!0)=>r.callWS({type:"energydash/devices/save",device:e,recalculate:t}),saveDevices:(r,e)=>r.callWS({type:"energydash/devices/save_many",devices:e}),deleteDevice:(r,e)=>r.callWS({type:"energydash/devices/delete",device_id:e}),recalculate:(r,e)=>r.callWS({type:"energydash/recalculate",...e?{device_id:e}:{}}),sessions:r=>r.callWS({type:"energydash/sessions",limit:300}),summary:(r,e,t)=>r.callWS({type:"energydash/summary",period:e,offset:t}),baseload:r=>r.callWS({type:"energydash/baseload"}),steps:(r,e)=>r.callWS({type:"energydash/steps",device_id:e}),reset:(r,e)=>r.callWS({type:"energydash/reset",scope:e}),exportConfig:r=>r.callWS({type:"energydash/export"}),importConfig:(r,e,t)=>r.callWS({type:"energydash/import",data:e,apply_settings:t})};function Je(r,e){return e==="free"?r[2]:e==="grid"?r[3]:r[2]+r[4]}var z=j`
  :host {
    --ed-radius: 12px;
    --ed-gap: 16px;
    --ed-ok: var(--success-color, #036730);
    --ed-warn: var(--warning-color, #9d3800);
    --ed-err: var(--error-color, #b30532);
    --ed-pri: var(--primary-color, #006787);
    --ed-card: var(--card-background-color, #fff);
    --ed-line: var(--divider-color, #e6e6e6);
    --ed-text: var(--primary-text-color, #141414);
    --ed-text2: var(--secondary-text-color, #5e5e5e);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    color: var(--ed-text);
  }
  * { box-sizing: border-box; }
  h2 { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
  h3 { font-size: 16px; font-weight: 500; margin: 0 0 12px; }
  p { margin: 0 0 8px; line-height: 1.5; }
  .muted { color: var(--ed-text2); font-size: 14px; }
  .small { font-size: 12px; }
  .card {
    background: var(--ed-card);
    border: 1px solid var(--ed-line);
    border-radius: var(--ed-radius);
    padding: 16px;
  }
  .grid { display: grid; gap: var(--ed-gap); }
  .row { display: flex; align-items: center; gap: 12px; }
  .between { justify-content: space-between; }
  .wrap { flex-wrap: wrap; }
  .grow { flex: 1; min-width: 0; }
  button.btn {
    font: inherit; font-weight: 500; font-size: 14px; cursor: pointer;
    border-radius: 999px; padding: 8px 18px; border: 1px solid transparent;
    background: var(--ed-pri); color: var(--text-primary-color, #fff);
    display: inline-flex; align-items: center; gap: 6px; min-height: 36px;
  }
  button.btn ha-icon { --mdc-icon-size: 18px; }
  button.btn[disabled] { opacity: 0.45; cursor: default; }
  button.btn.secondary { background: transparent; color: var(--ed-pri); border-color: var(--ed-line); }
  button.btn.text { background: transparent; color: var(--ed-pri); padding: 8px 10px; }
  button.btn.danger { background: var(--ed-err); color: #fff; }
  button.btn.danger-text { background: transparent; color: var(--ed-err); border-color: var(--ed-line); }
  button.icon {
    background: none; border: none; cursor: pointer; color: inherit; padding: 8px; border-radius: 50%;
    display: inline-flex; --mdc-icon-size: 22px;
  }
  button.icon:hover, button.btn.secondary:hover, button.btn.text:hover { background: rgba(127, 127, 127, 0.1); }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 500; white-space: nowrap; border: 1px solid transparent;
  }
  .chip.ok { color: var(--ed-ok); background: color-mix(in srgb, var(--ed-ok) 12%, transparent); }
  .chip.warn { color: var(--ed-warn); background: color-mix(in srgb, var(--ed-warn) 14%, transparent); }
  .chip.bad { color: var(--ed-err); background: color-mix(in srgb, var(--ed-err) 12%, transparent); }
  .chip.neutral { color: var(--ed-text2); border-color: var(--ed-line); }
  button.chip { cursor: pointer; font: inherit; font-size: 13px; padding: 4px 12px; background: transparent; color: var(--ed-text2); border-color: var(--ed-line); }
  button.chip[aria-pressed="true"] { color: var(--ed-pri); border-color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 10%, transparent); }
  .alert { display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 14px; line-height: 1.45; }
  .alert ha-icon { flex: none; --mdc-icon-size: 20px; }
  .alert.ok { background: color-mix(in srgb, var(--ed-ok) 12%, transparent); }
  .alert.ok ha-icon { color: var(--ed-ok); }
  .alert.warn { background: color-mix(in srgb, var(--ed-warn) 12%, transparent); }
  .alert.warn ha-icon { color: var(--ed-warn); }
  .alert.bad { background: color-mix(in srgb, var(--ed-err) 12%, transparent); }
  .alert.bad ha-icon { color: var(--ed-err); }
  .alert.info { background: color-mix(in srgb, var(--ed-pri) 10%, transparent); }
  .alert.info ha-icon { color: var(--ed-pri); }
  label.field { display: grid; gap: 4px; font-size: 14px; }
  label.field > span.lbl { font-weight: 500; }
  .help { font-size: 12px; color: var(--ed-text2); }
  input.input, select.input {
    font: inherit; font-size: 15px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--ed-line);
    background: var(--ed-card); color: var(--ed-text); width: 100%;
  }
  input.input:focus, select.input:focus { outline: 2px solid var(--ed-pri); outline-offset: -1px; }
  .radio {
    display: flex; gap: 12px; padding: 12px; border: 1px solid var(--ed-line); border-radius: 12px; cursor: pointer;
    text-align: left; background: transparent; font: inherit; color: inherit; width: 100%;
  }
  .radio[aria-checked="true"] { border: 2px solid var(--ed-pri); padding: 11px; background: color-mix(in srgb, var(--ed-pri) 7%, transparent); }
  .radio .dot { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ed-text2); margin-top: 2px; display: grid; place-items: center; }
  .radio[aria-checked="true"] .dot { border-color: var(--ed-pri); }
  .radio[aria-checked="true"] .dot::after { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--ed-pri); }
  .radio b { display: block; font-weight: 500; margin-bottom: 2px; }
  .radio span { font-size: 13px; color: var(--ed-text2); line-height: 1.4; }
  .radio span.ex {
    display: block; width: fit-content; margin-top: 8px; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-variant-numeric: tabular-nums;
    color: var(--ed-text); background: color-mix(in srgb, var(--ed-text) 6%, transparent);
  }
  .radio[aria-checked="true"] span.ex { background: color-mix(in srgb, var(--ed-pri) 14%, transparent); }
  .list { display: grid; }
  .list > .item { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--ed-line); }
  .list > .item:last-child { border-bottom: none; }
  .list > button.item { background: none; border-left: none; border-right: none; border-top: none; font: inherit; color: inherit; text-align: left; cursor: pointer; width: 100%; }
  .list > button.item:hover { background: rgba(127, 127, 127, 0.06); }
  .swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .kv { display: grid; grid-template-columns: minmax(110px, 40%) 1fr; gap: 8px 16px; font-size: 14px; }
  .kv > :nth-child(odd) { color: var(--ed-text2); }
  .kv > :nth-child(even) { word-break: break-word; }
  .mono { font-family: var(--code-font-family, ui-monospace, monospace); font-size: 12px; }
  details summary { cursor: pointer; font-weight: 500; padding: 8px 0; }
  [data-tip] { cursor: help; }
  [data-tip]:hover, [data-tip]:focus-visible { text-decoration: underline dotted; text-underline-offset: 4px; outline: none; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;var Ye={"c.add_device":"Apparaat toevoegen","c.save":"Opslaan","c.next":"Volgende","c.back":"Terug","c.cancel":"Annuleren","c.close":"Sluiten","c.delete":"Verwijderen","c.edit":"Bewerken","c.add":"Toevoegen","c.search":"Zoeken","c.loading":"Laden\u2026","c.error":"Er ging iets mis: {msg}","c.menu":"Menu","c.settings":"Instellingen","c.today":"Vandaag","c.this_month":"Deze maand","c.admin_only":"Alleen beheerders kunnen dit wijzigen.","tab.dashboard":"Dashboard","tab.sessions":"Sessies","tab.baseload":"Sluipverbruik","tab.devices":"Apparaten","type.sessions":"Sessies","type.continuous":"Doorlopend","type.charger":"Laadpaal","type.sessions.text":"Draait af en toe een programma: wasmachine, droger, vaatwasser.","type.continuous.text":"Geen losse sessies, wel kosten per dag en maand. Bijvoorbeeld een server, koelkast of airco.","type.charger.text":"Laadsessies van je auto, van inpluggen tot loskoppelen.","ob.title":"Zien wat je apparaten kosten","ob.text":"Per wasbeurt, per laadsessie en per dag. Je stroommeters worden opgezocht en alles wordt voor je ingesteld.","ob.start":"Wizard starten","ob.advanced":"Geavanceerd instellen","ob.scanning":"Even zoeken\u2026","ob.scan.prefs":"Je Energy-dashboard lezen","ob.scan.meters":"Stroommeters zoeken","ob.scan.history":"Historie bekijken","ob.found":"{n} apparaten gevonden","ob.found_one":"1 apparaat gevonden","ob.found_text":"Vink uit wat je niet wilt volgen.","ob.found_unsure":"{n} meters gevonden","ob.found_unsure_text":"Van geen ervan is zeker dat het een apparaat is. Vink aan wat je wilt volgen.","ob.also":"Ook gevonden","ob.line.sessions":"{n} sessies in {d} dagen","ob.line.sessions_one":"1 sessie in {d} dagen","ob.line.charges":"{n} laadsessies in {d} dagen","ob.line.charges_one":"1 laadsessie in {d} dagen","ob.line.avg":", gemiddeld {kwh} kWh","ob.line.continuous":"Gemiddeld {w} W, {kwh} kWh per dag","ob.line.none":"Geen sessies in de laatste {d} dagen","ob.line.no_history":"Nog geen historie","ob.reason.in_prefs":"Uit je Energy-dashboard.","ob.reason.device":"Teller van een apparaat, niet in je Energy-dashboard.","ob.reason.no_history":"Dit apparaat wordt de komende dagen herkend uit het verbruik.","ob.reason.no_sessions":"Geen sessies gezien in de laatste {d} dagen. Klopt dat niet? Kies dan Aanpassen.","ob.reason.power_only":"Alleen vermogen, geen kWh-teller. Kan wel, maar is minder nauwkeurig.","ob.reason.in_car":"Meet in de auto: laadverlies telt niet mee, laden onderweg wel. Je laadpaal meet beter.","ob.reason.data":"De gegevenscheck vond een probleem. Kies Aanpassen om te zien wat.","ob.reason.loose":"Hoort niet bij een apparaat. Mogelijk een berekende of losse teller.","ob.reason.duplicate_charger":"Meet waarschijnlijk dezelfde laadsessies als je andere laadpaal.","ob.chart":"Vermogen in de laatste dagen, hoogste waarde {w} W","ob.details":"Details van {name}","ob.adjust":"Aanpassen","ob.added":"Toegevoegd","ob.add":"{n} apparaten toevoegen","ob.add_one":"1 apparaat toevoegen","ob.saving":"Toevoegen\u2026","ob.none":"Geen stroommeters gevonden","ob.none_text":"Geen kWh-tellers of vermogenssensoren gevonden die bij een apparaat horen.","ob.pick_self":"Zelf een meter kiezen","ob.again":"Opnieuw zoeken","ob.done":"{n} apparaten toegevoegd","ob.done_one":"1 apparaat toegevoegd","ob.calc_text":"Je historie wordt teruggerekend. Als dat klaar is, ga je vanzelf naar het dashboard.","ob.skip_wait":"Alvast naar het dashboard","ob.done_baseload":"Sluipverbruik werkt al. Dat komt uit je slimme meter, daar is geen apparaat voor nodig.","ob.done_adjust":"Klopt iets niet? Je past alles aan onder Apparaten.","src.in_prefs":"In je Energy-dashboard","src.not_in_prefs":"Niet in je Energy-dashboard","chip.counter":"kWh-teller","chip.power":"Alleen vermogen","chip.not_recommended":"Niet aanbevolen",busy:"Bezig met terugrekenen op je historie. De cijfers worden zo bijgewerkt.","d.week":"Week","d.month":"Maand","d.year":"Jaar","d.prev":"Vorige periode","d.next":"Volgende periode","d.kpi_total":"Totaal huis","d.kpi_devices":"Totaal apparaten","d.kpi_avg_day":"Gemiddeld per dag","d.kpi_grid_price":"Gemiddelde stroomprijs","d.kpi_saved":"Bespaard door zon","d.vs_week":"tegen dezelfde dagen vorige week","d.vs_month":"tegen dezelfde dagen vorige maand","d.vs_year":"tegen dezelfde dagen vorig jaar","d.money":"Waar gaat je geld heen","d.own_solar":"Eigen zon","d.grid":"Uit het net","d.rest":"Rest van het huis","d.rest_note":"\u2018Rest van het huis\u2019 is alles wat je P1-meter meet en niet bij een toegevoegd apparaat hoort.","d.mode.export":"Zonnestroom kost wat je anders had gekregen.","d.mode.free":"Zonnestroom telt als gratis.","d.mode.grid":"Zonnestroom kost hetzelfde als stroom uit het net.","d.per_day":"Kosten per dag","d.per_month":"Kosten per maand","d.per_kwh":"Wat betaal je per kWh?","d.vs_grid_below":"{p}% goedkoper dankzij eigen zon","d.vs_grid_above":"{p}% duurder dan zonder zon","d.vs_grid_same":"vrijwel geen eigen zon gebruikt, dus gelijk aan de netprijs","d.when":"Wanneer verbruik je?","d.when_insight":"{p}% van je verbruik valt in uren onder de gemiddelde prijs ({price}).","d.no_house":"Voor het hele huis is nog geen historie berekend. De cijfers gaan over je toegevoegde apparaten.","d.no_data":"Nog niets om te tonen in deze periode.","d.solar":"Zon","d.of_use":"van je verbruik","d.produced":"Opgewekt","d.self_used":"Zelf gebruikt","d.exported":"Teruggeleverd","d.export_value":"Opbrengst teruglevering","d.tip_total":"Alles wat je huis gebruikte ({kwh} kWh): stroom uit het net plus eigen zonnestroom. Elke stap is geprijsd met de kwartierprijs van dat moment. {mode}","d.tip_devices":"Opgeteld over je toegevoegde apparaten ({kwh} kWh), elke stap geprijsd met de kwartierprijs van dat moment. {mode}","d.tip_avg_day":"{total} gedeeld door {n} dagen.","d.tip_grid_price":"Wat je voor stroom uit het net betaalde ({cost}) gedeeld door de kWh uit het net ({kwh} kWh). Uren met veel verbruik tellen zwaarder mee.","d.tip_series":`{kwh} kWh, waarvan {zon} kWh eigen zon.
Netstroom: {net}. Zonnestroom: {zon_cost}.`,"d.tip_share":"{zon} kWh van de {kwh} kWh kwam van je eigen zonnepanelen, {grid} kWh uit het net.","d.tip_produced":"Zelf gebruikt ({zon} kWh) plus teruggeleverd ({exp} kWh).","d.tip_self_used":"Zonnestroom die je huis direct gebruikte: opwek min teruglevering.","d.tip_self_used_p":"Zonnestroom die je huis direct gebruikte: opwek min teruglevering. Dat is {p}% van wat je opwekte.","d.tip_exported":"Gemeten door de teruglevering-teller van je P1-meter.","d.tip_export_value":"Elke teruggeleverde kWh maal de terugleverprijs van dat moment. Gemiddeld {price} per kWh.","d.tip_saved":"Als al je stroom uit het net was gekomen, had het {all} gekost. Nu kost het {cost}. {mode}","d.tip_per_kwh":`Balk: wat je echt betaalde, {cost} voor {kwh} kWh = {price} per kWh. Eigen zon telt mee volgens je zon-instelling.
Streepje: de netprijs, wat dezelfde kWh hadden gekost als alles uit het net was gekomen, tegen de prijzen op de momenten dat dit apparaat stroom gebruikte: {grid} per kWh.
{diff}.`,"d.flow":"Energieverdeling","d.flow_grid":"Net","d.flow_home":"Huis","d.balance":"Netbalans","d.net_import":"Netto uit het net","d.net_export":"Netto teruggeleverd","d.self_consumed":"Zelf verbruikte zonnestroom","d.self_sufficiency":"Zelfvoorzienend","d.tip_balance":"Uit het net ({imp} kWh) min teruggeleverd ({exp} kWh) = {net} kWh.","d.tip_self_consumed":"{zon} kWh van de {produced} kWh die je opwekte, gebruikte je huis direct. {exp} kWh ging naar het net.","d.tip_grid_node":"{imp} kWh uit het net gehaald, {exp} kWh teruggeleverd.","d.day_solar":"Zon {kwh} kWh:","d.tip_day_used":"{kwh} kWh zonnestroom direct gebruikt. Uit het net had dat {value} gekost.","d.tip_day_exported":"{kwh} kWh teruggeleverd, goed voor {value}.","d.below_line":"Onder de lijn: wat je zonnepanelen waard waren. Netstroom die je niet hoefde te kopen, plus de opbrengst van teruglevering.","s.running":"Loopt nu","s.none":"Nog niets om te tonen","s.none_text":"Sessies verschijnen hier zodra een wasbeurt, droogbeurt of laadsessie klaar is.","s.session":"Sessie","s.cost":"Kosten","s.energy":"Energie","s.solar":"Zon","s.grid":"Net","s.per_quarter":"Per kwartier","s.per_quarter_text":"Oranje is eigen zon, blauw komt uit het net. Onder elke staaf de kwartierprijs.","s.breakdown":"Opbouw","s.grid_part":"Uit het net","s.solar_part":"Eigen zon","s.total":"Totaal","s.all_grid":"Als alles uit het net kwam","s.how":"Hoe is dit berekend?","s.how_energy":"Energie: de som van {n} tellerstappen van {entity}.","s.how_split":"Zon of net: per tellerstap telt wat de P1-meter in dezelfde minuten importeerde als net; de rest is eigen zon. Zon gaat eerst naar de rest van het huis.","s.how_price":"Prijs: per stap het tijdgewogen gemiddelde van de kwartierprijzen in die minuten.","s.how_zon.export":"Zon kost de terugleverprijs van dat kwartier (wat je anders had gekregen).","s.how_zon.free":"Zon telt als gratis.","s.how_zon.grid":"Zon kost hetzelfde als stroom uit het net.","s.note.reset":"De teller begon tijdens deze sessie opnieuw; dat is herkend en niet als verbruik geteld.","s.note.no_p1":"De P1-meter was even niet beschikbaar; die stappen tellen als netstroom.","s.note.no_price":"Voor een deel van de stappen was geen prijs bekend; die stappen tellen met \u20AC0.","s.note.long_gap":"Er zat een lange onderbreking in de metingen; het verbruik is over de hele onderbreking verdeeld.","s.note.implausible":"Een deel van de teller liep sneller op dan een huisaansluiting kan leveren, bijvoorbeeld door laden onderweg. Dat deel telt niet mee.","s.note.solar_capped":"Je panelen leverden op dat moment minder dan de rest van het verbruik; het verschil telt als netstroom.","s.duration":"{min} min","b.title":"Sluipverbruik","b.text":"Wat je huis altijd verbruikt: per nacht het rustigste uur tussen 02:00 en 05:00, zonder apparaten met sessies zoals je auto. Dit is de mediaan over de laatste 7 nachten.","b.per_day":"per dag","b.per_month":"per maand","b.per_year":"per jaar","b.split":"Waar zit het in?","b.explained":"Gemeten apparaten ('s nachts)","b.unexplained":"Onverklaard","b.unexplained_text":"Niet gemeten: koelkast, router, standby van apparaten zonder meter. Zet eens een meetstekker op een vermoeden.","b.weeks":"Basislast per week","b.none":"Nog niets om te tonen","b.none_text":"Sluipverbruik verschijnt na een nacht met metingen van je P1-meter (02:00 tot 05:00).","b.tip_cost":"{kwh} kWh per dag \xD7 {days} dagen \xD7 {price} per kWh (je gemiddelde prijs van de laatste 30 dagen).","v.title":"Apparaten","v.rule_power":"Klaar na {min} min onder {w} W","v.rule_entity":"Zolang {entity} {states} is","v.rule_continuous":"Kosten per dag en maand","v.archived":"Verwijderde apparaten","v.archived_text":"Worden niet meer gevolgd; eerder berekende sessies blijven bewaard.","v.recalc":"Opnieuw berekenen","v.recalc_text":"Rekent dit apparaat opnieuw uit over de beschikbare historie (meestal 10 dagen). Eerdere resultaten van dit apparaat worden vervangen.","v.steps":"Laatste meetstappen","v.steps_none":"Nog geen meetstappen.","v.steps_cols":"Van|Tot|kWh|P1|Net|Zon|Prijs|Netkosten","v.check":"Gegevenscheck","v.row_energy":"Energie","v.row_sessions":"Sessies","v.row_solar":"Zon of net","v.row_power":"Vermogen","v.solar_rule":"met je P1-importteller ({entity})","v.delete_q":"Apparaat verwijderen?","v.delete_text":"{name} wordt niet meer gevolgd. Je kunt het later opnieuw toevoegen; eerder berekende sessies blijven bewaard.","v.none_running":"Geen sessies","t.added":"Apparaat toegevoegd","t.saved":"Opgeslagen","t.deleted":"Apparaat verwijderd","t.recalc":"Herberekening gestart","t.reset":"Teruggezet","t.imported":"{n} apparaten ge\xEFmporteerd","t.exported":"Instellingen ge\xEBxporteerd","w.add_title":"Apparaat toevoegen","w.edit_title":"Apparaat bewerken","w.step":"Stap {n} van {total} \xB7 {name}","w.pick":"Kies een stroommeter","w.type":"Soort apparaat","w.sources":"Bronnen","w.tune":"Sessies instellen","w.search_help":"Zoek op naam of entiteit. Bovenaan staan de voorstellen.","w.no_results":"Geen resultaten","w.no_results_hint":"Pas je zoekterm aan.","w.suggested":"Voorgesteld","w.other":"Overige meters","w.name":"Naam","w.reason.name":"Voorgesteld op basis van de naam.","w.reason.never_below":"Voorgesteld omdat hij in 7 dagen nooit onder 30 W kwam.","w.reason.high_power":"Voorgesteld omdat er in 7 dagen langer dan een uur meer dan 7 kW werd verbruikt.","w.reason.mostly_on":"Voorgesteld omdat hij het grootste deel van de tijd aan staat.","w.reason.on_off":"Voorgesteld omdat hij steeds een tijd aan is en daarna terugvalt naar standby.","w.reason.no_history":"Nog geen historie; kies zelf de soort.","w.reason.default":"Kies de soort die het best past.","w.energy":"Energie","w.energy_help":"Bij voorkeur een kWh-teller. Een vermogen (W) kan ook, maar dan wordt de kWh uit het vermogen berekend.","w.session_how":"Begin en einde van een sessie","w.from_power":"Uit het verbruik","w.from_power_text":"Begint als het verbruik boven een drempel komt en stopt na een pauze. Die stel je in de volgende stap in.","w.from_entity":"Uit een entiteit","w.from_entity_text":"Bijvoorbeeld de status van een slimme wasmachine, een thermostaat of een drempel-helper.","w.from_entity_charger":"Van inpluggen tot loskoppelen, volgens bijvoorbeeld de status van je laadpaal of de kabel-sensor van je auto. Aanbevolen.","w.from_power_charger":"Begint als er geladen wordt en stopt na een pauze. Pauzes van slim laden die korter zijn dan \u2018Klaar na\u2019 blijven \xE9\xE9n sessie.","w.session_entity":"Sessie-entiteit","w.session_states":"Sessie loopt zolang de status is","w.session_states_help":"Voorgesteld: de statussen waarin de teller opliep.","w.pick_state":"Kies minstens \xE9\xE9n status.","w.power_entity":"Vermogen","w.power_entity_help":"Optioneel. Bepaalt begin en einde preciezer. Zonder vermogen wordt het afgeleid uit de teller.","w.none_option":"Geen","w.checking":"Gegevens controleren\u2026","w.threshold":"Aan vanaf","w.off_delay":"Klaar na","w.off_delay_help":"Minuten onder \u2018Aan vanaf\u2019 voordat een sessie klaar is. Pauzes binnen een programma moeten korter zijn.","w.off_delay_help_charger":"Minuten zonder laden voordat een sessie klaar is. Met een dynamisch contract pauzeert slim laden soms een paar kwartier; kies dit langer dan de langste pauze.","w.min_duration":"Minimale duur","w.min_duration_help":"Kortere stukken (zoals wegpompen) tellen niet als sessie.","w.standby":"Gemeten standby: {w} W. \u2018Aan vanaf\u2019 ligt daar net boven.","w.found":"{n} sessies gevonden in de laatste {d} dagen.","w.found_one":"1 sessie gevonden in de laatste {d} dagen.","w.found_none":"Geen sessies gevonden in de laatste {d} dagen.","w.found_none_hint":"Zet \u2018Aan vanaf\u2019 lager, of controleer of het apparaat in deze periode aan was.","w.found_many_hint":"Zijn dit er meer dan er werkelijk waren? Zet \u2018Klaar na\u2019 hoger, zodat pauzes binnen een programma geen nieuwe sessie starten.","w.chart":"Vermogen in de laatste {d} dagen met gevonden sessies","w.recalc_note":"Na opslaan wordt dit apparaat teruggerekend op je historie (meestal 10 dagen).","w.recalc_edit":"Opnieuw berekenen over de historie","w.recalc_edit_help":"Vervangt eerdere resultaten van dit apparaat door een herberekening met de nieuwe instellingen.","w.look":"Kleur en icoon","w.color":"Kleur","w.color_n":"Kleur {n}","w.color_custom":"Eigen kleur","w.icon":"Icoon","w.icon_other":"Ander icoon","w.icon_help":"Elk icoon van Material Design Icons, bijvoorbeeld mdi:fan. Leeg laten voor het standaardicoon.","chk.unit":"Eenheid","chk.unit.ok":"Een echte energieteller; er hoeft niets geschat te worden.","chk.unit.warn":"Geen energie-sensor volgens Home Assistant. Controleer of dit een kWh-teller is.","chk.state_class":"Soort teller","chk.state_class.ok":"Loopt op. Een reset (bijvoorbeeld na stroomuitval) wordt herkend en niet als verbruik geteld.","chk.state_class.bad":"Geen \u2018total\u2019 of \u2018total_increasing\u2019: waarschijnlijk een voorspelling of afgeleide waarde.","chk.resets":"Resets","chk.resets.ok":"Begint {value}\xD7 opnieuw op 0 in 7 dagen (bijvoorbeeld per sessie). Herkend, geen probleem.","chk.no_resets":"Resets","chk.no_resets.ok":"Geen in 7 dagen.","chk.refresh":"Verversing","chk.refresh.ok":"Elke ~{value} s tijdens verbruik. Begin en einde zijn precies.","chk.refresh.warn":"Elke ~{value} s tijdens verbruik. De kWh kloppen, maar begin en einde kunnen zoveel later zijn. Een stap over twee kwartieren wordt naar tijd verdeeld.","chk.refresh.bad":"Elke ~{value} s. Te traag om op te tellen: bij elke start mis je verbruik en bij elke stop telt er te veel.","chk.refresh_unknown":"Verversing","chk.refresh_unknown.warn":"Nog niet te meten: te weinig verbruik in de historie.","chk.interruptions":"Onderbrekingen","chk.interruptions.ok":"{value}\xD7 onbeschikbaar in 7 dagen. Overbrugd: de teller loopt daarna gewoon door.","chk.interruptions.warn":"{value}\xD7 onbeschikbaar in 7 dagen. Overbrugd, maar de verdeling over kwartieren is dan minder precies.","chk.in_car_meter":"Wat het meet","chk.in_car_meter.warn":"Wat de accu binnenkrijgt, ook bij laden onderweg. Laadverlies telt niet mee. Kies liever de teller van je laadpaal als je die hebt.","chk.power_only":"Eenheid","chk.power_only.warn":"Een vermogen: de kWh wordt berekend door het over de tijd op te tellen. Is er een kWh-teller van hetzelfde apparaat, kies die dan.","chk.session_refresh":"Sessie-entiteit","chk.session_refresh.ok":"Ververst snel genoeg; begin en einde kloppen.","chk.session_refresh.warn":"Ververst ongeveer elke {value} s. De begintijd kan te laat zijn; het verbruik mis je niet, dat komt van de teller.","chk.solar":"Zon of net","chk.solar.ok":"Per meetstap met je P1-importteller: wat de P1 in die minuten importeerde komt uit het net, de rest van je zon.","set.title":"Instellingen","set.normal":"Normaaltarief (\u20AC/kWh)","set.low":"Daltarief (\u20AC/kWh)","set.low_help":"Doordeweeks 23:00\u201307:00 en in het weekend.","set.import":"Import uit het net","set.export":"Teruglevering aan het net","set.solar":"Opwek zonnepanelen","set.solar_mode":"Wat kost stroom van je eigen zonnepanelen?","set.mode.export":"Wat je anders had gekregen","set.mode.export_text":"Wat je had gekregen als je hem had teruggeleverd.","set.mode.free":"Niets","set.mode.free_text":"Je eigen zonnestroom is gratis.","set.mode.grid":"Hetzelfde als stroom uit het net","set.mode.grid_text":"Zon kost hetzelfde als stroom uit het net.","set.test":"Testen en beheer","set.test_text":"Handig tijdens het testen. Alles hieronder werkt alleen op Energydash; je andere instellingen blijven ongemoeid.","set.recalc_all":"Alles opnieuw berekenen","set.recalc_all_text":"Rekent alle apparaten en het hele huis opnieuw uit over de beschikbare historie (meestal 10 dagen).","set.recalc_q":"Alles opnieuw berekenen?","set.recalc_q_text":"Alle berekende resultaten worden vervangen door een herberekening over de beschikbare historie. Resultaten van v\xF3\xF3r die periode gaan verloren.","set.export_btn":"Instellingen exporteren","set.import_btn":"Instellingen importeren","set.backup_text":"Sla je apparaten en prijsinstellingen op als bestand, en zet ze na een reset of herinstallatie in \xE9\xE9n keer terug.","set.import_q":"Instellingen importeren?","set.import_q_text":"{n} apparaten uit het bestand vervangen je huidige apparaten. Daarna wordt alles opnieuw berekend over je historie.","set.clear":"Berekende gegevens wissen","set.clear_text":"Wist sessies en kosten, maar bewaart je apparaten en instellingen. Daarna wordt alles direct opnieuw berekend over je historie.","set.clear_q":"Berekende gegevens wissen?","set.clear_q_text":"Alle sessies en kosten worden gewist. Je apparaten en prijsinstellingen blijven bewaard. Dit kun je niet ongedaan maken.","set.reset":"Energydash terugzetten","set.reset_text":"Verwijdert alle apparaten en berekende gegevens. Je komt terug bij \u2018Nog geen apparaten\u2019. Prijsinstellingen blijven bewaard en het hele huis wordt direct opnieuw berekend.","set.reset_q":"Energydash terugzetten?","set.reset_q_text":"Alle apparaten, sessies en kosten worden verwijderd. Exporteer eerst je instellingen als je ze later terug wilt zetten. Dit kun je niet ongedaan maken.","set.version":"Versie {v}","set.invalid_file":"Dit bestand is geen Energydash-export.","ob.step":"Stap {n} van {total}","ob.price":"Je stroomprijs","ob.price_text":"Hiermee wordt berekend wat elk apparaat kost.","ob.meters":"Je meters","ob.meters_text":"Uit je Energy-dashboard. Klopt dit?","ob.meters_none":"Geen meters gevonden in je Energy-dashboard. Kies de kWh-teller van je slimme meter.","ob.solar":"Zonnestroom en teruglevering","ob.solar_text":"Hoe zonnestroom en teruglevering worden verrekend.","ob.storing":"Opslaan\u2026","ob.save_scan":"Opslaan en apparaten zoeken","sf.h.price":"Stroomprijs","sf.h.meters":"Meters","sf.h.solar":"Zonnestroom en teruglevering","sf.how":"Hoe wil je je stroomprijs invoeren?","sf.entity":"Prijs uit een entiteit","sf.entity_text":"Een sensor van je leverancier.","sf.fixed":"Vaste prijs","sf.fixed_text":"Zoals op je contract.","sf.price_entity":"Prijs-entiteit","sf.no_number":"Deze entiteit heeft nu geen prijs.","sf.full":"Is dit de prijs die je echt betaalt?","sf.full_yes":"Ja, alles zit erin","sf.full_yes_text":"Inclusief belasting en btw.","sf.full_no":"Nee, er komt iets bij","sf.full_no_text":"Bijvoorbeeld een kale beursprijs.","sf.markup":"Opslag per kWh (\u20AC)","sf.markup_help":"Energiebelasting, inkoopvergoeding en btw samen.","sf.tariffs":"Heb je \xE9\xE9n prijs of een dag- en nachttarief?","sf.one":"E\xE9n prijs","sf.one_text":"Altijd dezelfde prijs.","sf.two":"Normaal en dal","sf.two_text":"Dal: 23\u201307 uur en in het weekend.","sf.price":"Prijs per kWh (\u20AC)","sf.another":"Nog een teller voor {label}","sf.remove":"{label} verwijderen","sf.add_counter":"Teller toevoegen","sf.import_help":"kWh-teller van je slimme meter. Aparte tellers voor normaal en dal? Voeg ze allebei toe.","sf.export_help":"Optioneel. Aparte tellers voor normaal en dal? Voeg ze allebei toe.","sf.solar_help":"Optioneel. Meerdere omvormers? Voeg ze allemaal toe. Samen met teruglevering nodig voor \u2018Rest van het huis\u2019 op zonnige dagen.","sf.export_q":"Waar komt die terugleverprijs vandaan?","sf.exp.auto":"Uit je prijs-entiteit","sf.exp.auto_text":"Uit de verwachte prijzen.","sf.exp.entity":"Uit een andere entiteit","sf.exp.entity_text":"Een sensor met je terugleverprijs.","sf.exp.fixed":"Een vast bedrag","sf.exp.fixed_text":"Zoals op je contract.","sf.export_entity":"Terugleverprijs-entiteit","sf.export_fixed":"Terugleverprijs per kWh (\u20AC)","sf.export_fixed_help":"0 als je niets krijgt.","ex.auto":"Per kwartier","ex.two":"Dag {normal} \xB7 dal {low}","ex.one":"Dag en nacht {price}","ex.markup":"opslag","ex.full_no":"{raw} + {markup} = {total}","ex.full_yes":"{price} \u2192 je betaalt {price}","ex.fixed":"Bijv. altijd {price} per kWh","ex.entity":"Bijv. 14:00 {a} \xB7 14:15 {b}","ex.now":"Nu {price} per kWh","ex.solar_grid_unknown":"Zon = stroomprijs","ex.solar_grid":"Zon = stroomprijs = {price}","ex.solar_free":"Zon = {price}","ex.solar_export_unknown":"Zon = terugleverprijs","ex.solar_export":"Zon = terugleverprijs = {price}","ex.eg":"Bijv. {price} per kWh","sf.forecast_none":"Geen verwachte prijzen: de prijs van het moment wordt gebruikt.","sf.forecast_found":"Verwachte prijzen gevonden: prijzen worden per kwartier of uur berekend.","t.saved_recalc":"Opgeslagen. Je historie wordt opnieuw berekend.","p.need_price":"Kies eerst hoe je je stroomprijs wilt invoeren. Tot die tijd kloppen de kosten niet.","p.need_price_btn":"Stroomprijs instellen"},Xt={"c.add_device":"Add device","c.save":"Save","c.next":"Next","c.back":"Back","c.cancel":"Cancel","c.close":"Close","c.delete":"Delete","c.edit":"Edit","c.add":"Add","c.search":"Search","c.loading":"Loading\u2026","c.error":"Something went wrong: {msg}","c.menu":"Menu","c.settings":"Settings","c.today":"Today","c.this_month":"This month","c.admin_only":"Only administrators can change this.","tab.dashboard":"Dashboard","tab.sessions":"Sessions","tab.baseload":"Baseload","tab.devices":"Devices","type.sessions":"Sessions","type.continuous":"Continuous","type.charger":"Charger","type.sessions.text":"Runs a program now and then: washer, dryer, dishwasher.","type.continuous.text":"No separate sessions, but cost per day and month. For example a server, fridge or air conditioner.","type.charger.text":"Charging sessions of your car, from plugging in to unplugging.","ob.title":"See what your devices cost","ob.text":"Per wash, per charging session and per day. Your energy meters are found and everything is set up for you.","ob.start":"Start wizard","ob.advanced":"Advanced setup","ob.scanning":"Looking\u2026","ob.scan.prefs":"Reading your Energy dashboard","ob.scan.meters":"Finding energy meters","ob.scan.history":"Checking history","ob.found":"{n} devices found","ob.found_one":"1 device found","ob.found_text":"Uncheck what you don't want to track.","ob.found_unsure":"{n} meters found","ob.found_unsure_text":"None of them is certainly a device. Check what you want to track.","ob.also":"Also found","ob.line.sessions":"{n} sessions in {d} days","ob.line.sessions_one":"1 session in {d} days","ob.line.charges":"{n} charging sessions in {d} days","ob.line.charges_one":"1 charging session in {d} days","ob.line.avg":", {kwh} kWh on average","ob.line.continuous":"{w} W on average, {kwh} kWh per day","ob.line.none":"No sessions in the last {d} days","ob.line.no_history":"No history yet","ob.reason.in_prefs":"From your Energy dashboard.","ob.reason.device":"Meter of a device, not in your Energy dashboard.","ob.reason.no_history":"This device is recognised from its usage over the coming days.","ob.reason.no_sessions":"No sessions seen in the last {d} days. Not right? Choose Adjust.","ob.reason.power_only":"Power only, no kWh meter. Works, but less accurate.","ob.reason.in_car":"Measures in the car: charging losses don't count, charging elsewhere does. Your charger measures better.","ob.reason.data":"The data check found a problem. Choose Adjust to see what.","ob.reason.loose":"Not part of a device. Possibly a calculated or standalone meter.","ob.reason.duplicate_charger":"Probably measures the same charging sessions as your other charger.","ob.chart":"Power in the last days, highest value {w} W","ob.details":"Details of {name}","ob.adjust":"Adjust","ob.added":"Added","ob.add":"Add {n} devices","ob.add_one":"Add 1 device","ob.saving":"Adding\u2026","ob.none":"No energy meters found","ob.none_text":"No kWh meters or power sensors found that belong to a device.","ob.pick_self":"Choose a meter yourself","ob.again":"Search again","ob.done":"{n} devices added","ob.done_one":"1 device added","ob.calc_text":"Your history is being calculated. When that's done, you go to the dashboard automatically.","ob.skip_wait":"Go to dashboard now","ob.done_baseload":"Baseload already works. It comes from your smart meter, no device needed.","ob.done_adjust":"Something not right? You can change everything under Devices.","src.in_prefs":"In your Energy dashboard","src.not_in_prefs":"Not in your Energy dashboard","chip.counter":"kWh counter","chip.power":"Power only","chip.not_recommended":"Not recommended",busy:"Recalculating from your history. The numbers will update shortly.","d.week":"Week","d.month":"Month","d.year":"Year","d.prev":"Previous period","d.next":"Next period","d.kpi_total":"Whole house","d.kpi_devices":"All devices","d.kpi_avg_day":"Average per day","d.kpi_grid_price":"Average power price","d.kpi_saved":"Saved by solar","d.vs_week":"vs. the same days last week","d.vs_month":"vs. the same days last month","d.vs_year":"vs. the same days last year","d.money":"Where your money goes","d.own_solar":"Own solar","d.grid":"From the grid","d.rest":"Rest of the house","d.rest_note":"\u2018Rest of the house\u2019 is everything your P1 meter measures that does not belong to an added device.","d.mode.export":"Solar power costs what you would otherwise have received.","d.mode.free":"Solar power counts as free.","d.mode.grid":"Solar power costs the same as grid power.","d.per_day":"Cost per day","d.per_month":"Cost per month","d.per_kwh":"What do you pay per kWh?","d.vs_grid_below":"{p}% cheaper thanks to own solar","d.vs_grid_above":"{p}% more expensive than without solar","d.vs_grid_same":"hardly any own solar used, so equal to the grid price","d.when":"When do you use power?","d.when_insight":"{p}% of your use falls in hours below the average price ({price}).","d.no_house":"No history has been calculated for the whole house yet. The numbers cover your added devices.","d.no_data":"Nothing to show in this period yet.","d.solar":"Solar","d.of_use":"of your use","d.produced":"Produced","d.self_used":"Used yourself","d.exported":"Exported","d.export_value":"Export earnings","d.tip_total":"Everything your house used ({kwh} kWh): grid power plus own solar. Each step is priced at the quarter-hour price of that moment. {mode}","d.tip_devices":"Summed over your added devices ({kwh} kWh), each step priced at the quarter-hour price of that moment. {mode}","d.tip_avg_day":"{total} divided by {n} days.","d.tip_grid_price":"What you paid for grid power ({cost}) divided by the kWh from the grid ({kwh} kWh). Hours with more use weigh more.","d.tip_series":`{kwh} kWh, of which {zon} kWh own solar.
Grid power: {net}. Solar power: {zon_cost}.`,"d.tip_share":"{zon} kWh of the {kwh} kWh came from your own solar panels, {grid} kWh from the grid.","d.tip_produced":"Used yourself ({zon} kWh) plus exported ({exp} kWh).","d.tip_self_used":"Solar power your house used directly: production minus export.","d.tip_self_used_p":"Solar power your house used directly: production minus export. That is {p}% of what you produced.","d.tip_exported":"Measured by the export counter of your P1 meter.","d.tip_export_value":"Each exported kWh times the export price of that moment. On average {price} per kWh.","d.tip_saved":"If all your power had come from the grid, it would have cost {all}. Now it costs {cost}. {mode}","d.tip_per_kwh":`Bar: what you actually paid, {cost} for {kwh} kWh = {price} per kWh. Own solar counts according to your solar setting.
Marker: the grid price, what the same kWh would have cost if everything had come from the grid, at the prices of the moments this device used power: {grid} per kWh.
{diff}.`,"d.flow":"Energy distribution","d.flow_grid":"Grid","d.flow_home":"Home","d.balance":"Grid balance","d.net_import":"Net imported from the grid","d.net_export":"Net exported to the grid","d.self_consumed":"Self-consumed solar","d.self_sufficiency":"Self-sufficiency","d.tip_balance":"From the grid ({imp} kWh) minus exported ({exp} kWh) = {net} kWh.","d.tip_self_consumed":"Your house used {zon} kWh of the {produced} kWh you produced directly. {exp} kWh went to the grid.","d.tip_grid_node":"{imp} kWh taken from the grid, {exp} kWh exported.","d.day_solar":"Solar {kwh} kWh:","d.tip_day_used":"{kwh} kWh of solar power used directly. From the grid, that would have cost {value}.","d.tip_day_exported":"{kwh} kWh exported, worth {value}.","d.below_line":"Below the line: what your solar panels were worth. Grid power you didn't have to buy, plus export earnings.","s.running":"Running now","s.none":"Nothing to show yet","s.none_text":"Sessions appear here as soon as a wash, a dry or a charging session has finished.","s.session":"Session","s.cost":"Cost","s.energy":"Energy","s.solar":"Solar","s.grid":"Grid","s.per_quarter":"Per quarter hour","s.per_quarter_text":"Orange is own solar, blue is from the grid. Below each bar the quarter-hour price.","s.breakdown":"Breakdown","s.grid_part":"From the grid","s.solar_part":"Own solar","s.total":"Total","s.all_grid":"If everything came from the grid","s.how":"How is this calculated?","s.how_energy":"Energy: the sum of {n} counter steps of {entity}.","s.how_split":"Solar or grid: per counter step, what the P1 meter imported in the same minutes counts as grid; the rest is own solar. Solar goes to the rest of the house first.","s.how_price":"Price: per step the time-weighted average of the quarter-hour prices in those minutes.","s.how_zon.export":"Solar costs the feed-in price of that quarter hour (what you would otherwise have received).","s.how_zon.free":"Solar counts as free.","s.how_zon.grid":"Solar costs the same as grid power.","s.note.reset":"The counter restarted during this session; this was recognised and not counted as use.","s.note.no_p1":"The P1 meter was briefly unavailable; those steps count as grid power.","s.note.no_price":"No price was known for some steps; those steps count at \u20AC0.","s.note.long_gap":"There was a long gap in the readings; the use is spread over the whole gap.","s.note.implausible":"Part of the counter rose faster than a home connection can deliver, for example from charging on the road. That part is not counted.","s.note.solar_capped":"Your panels produced less than the rest of the use at that moment; the difference counts as grid power.","s.duration":"{min} min","b.title":"Baseload","b.text":"What your house always uses: per night the quietest hour between 02:00 and 05:00, without devices with sessions such as your car. This is the median over the last 7 nights.","b.per_day":"per day","b.per_month":"per month","b.per_year":"per year","b.split":"Where is it?","b.explained":"Measured devices (at night)","b.unexplained":"Unexplained","b.unexplained_text":"Not measured: fridge, router, standby of devices without a meter. Try a smart plug on a suspect.","b.weeks":"Baseload per week","b.none":"Nothing to show yet","b.none_text":"Baseload appears after one night of P1 readings (02:00 to 05:00).","b.tip_cost":"{kwh} kWh per day \xD7 {days} days \xD7 {price} per kWh (your average price over the last 30 days).","v.title":"Devices","v.rule_power":"Done after {min} min below {w} W","v.rule_entity":"While {entity} is {states}","v.rule_continuous":"Cost per day and month","v.archived":"Removed devices","v.archived_text":"No longer tracked; earlier sessions are kept.","v.recalc":"Recalculate","v.recalc_text":"Recalculates this device over the available history (usually 10 days). Earlier results of this device are replaced.","v.steps":"Latest counter steps","v.steps_none":"No counter steps yet.","v.steps_cols":"From|To|kWh|P1|Grid|Solar|Price|Grid cost","v.check":"Data check","v.row_energy":"Energy","v.row_sessions":"Sessions","v.row_solar":"Solar or grid","v.row_power":"Power","v.solar_rule":"with your P1 import counter ({entity})","v.delete_q":"Delete device?","v.delete_text":"{name} will no longer be tracked. You can add it again later; earlier sessions are kept.","v.none_running":"No sessions","t.added":"Device added","t.saved":"Saved","t.deleted":"Device deleted","t.recalc":"Recalculation started","t.reset":"Reset done","t.imported":"{n} devices imported","t.exported":"Settings exported","w.add_title":"Add device","w.edit_title":"Edit device","w.step":"Step {n} of {total} \xB7 {name}","w.pick":"Choose an energy meter","w.type":"Type of device","w.sources":"Sources","w.tune":"Session settings","w.search_help":"Search by name or entity. Suggestions are on top.","w.no_results":"No results","w.no_results_hint":"Change your search term.","w.suggested":"Suggested","w.other":"Other meters","w.name":"Name","w.reason.name":"Suggested based on the name.","w.reason.never_below":"Suggested because it never went below 30 W in 7 days.","w.reason.high_power":"Suggested because it used more than 7 kW for over an hour in 7 days.","w.reason.mostly_on":"Suggested because it is on most of the time.","w.reason.on_off":"Suggested because it runs for a while and then falls back to standby.","w.reason.no_history":"No history yet; choose the type yourself.","w.reason.default":"Choose the type that fits best.","w.energy":"Energy","w.energy_help":"Preferably a kWh counter. A power sensor (W) works too, but then the kWh is calculated from the power.","w.session_how":"Start and end of a session","w.from_power":"From the power use","w.from_power_text":"Starts when the use goes above a threshold and ends after a pause. You set this in the next step.","w.from_entity":"From an entity","w.from_entity_text":"For example the status of a smart washer, a thermostat or a threshold helper.","w.from_entity_charger":"From plugging in to unplugging, using for example the status of your charger or your car's cable sensor. Recommended.","w.from_power_charger":"Starts when charging starts and ends after a pause. Smart-charging pauses shorter than \u2018Done after\u2019 stay one session.","w.session_entity":"Session entity","w.session_states":"Session runs while the status is","w.session_states_help":"Suggested: the statuses in which the counter increased.","w.pick_state":"Choose at least one status.","w.power_entity":"Power","w.power_entity_help":"Optional. Makes start and end more precise. Without it, it is derived from the counter.","w.none_option":"None","w.checking":"Checking data\u2026","w.threshold":"On from","w.off_delay":"Done after","w.off_delay_help":"Minutes below \u2018On from\u2019 before a session is done. Pauses within a program must be shorter.","w.off_delay_help_charger":"Minutes without charging before a session is done. On a dynamic contract smart charging sometimes pauses for a few quarters; set this longer than the longest pause.","w.min_duration":"Minimum duration","w.min_duration_help":"Shorter pieces (like pumping out) do not count as a session.","w.standby":"Measured standby: {w} W. \u2018On from\u2019 is just above it.","w.found":"{n} sessions found in the last {d} days.","w.found_one":"1 session found in the last {d} days.","w.found_none":"No sessions found in the last {d} days.","w.found_none_hint":"Lower \u2018On from\u2019, or check whether the device was on in this period.","w.found_many_hint":"More than there really were? Raise \u2018Done after\u2019 so pauses within a program don't start a new session.","w.chart":"Power in the last {d} days with sessions found","w.recalc_note":"After saving, this device is recalculated from your history (usually 10 days).","w.recalc_edit":"Recalculate over the history","w.recalc_edit_help":"Replaces earlier results of this device with a recalculation using the new settings.","w.look":"Colour and icon","w.color":"Colour","w.color_n":"Colour {n}","w.color_custom":"Own colour","w.icon":"Icon","w.icon_other":"Other icon","w.icon_help":"Any Material Design Icons icon, for example mdi:fan. Leave empty for the default icon.","chk.unit":"Unit","chk.unit.ok":"A real energy counter; nothing to estimate.","chk.unit.warn":"Not an energy sensor according to Home Assistant. Check that this is a kWh counter.","chk.state_class":"Counter type","chk.state_class.ok":"Increases. A reset (for example after a power cut) is recognised and not counted as use.","chk.state_class.bad":"No \u2018total\u2019 or \u2018total_increasing\u2019: probably a forecast or derived value.","chk.resets":"Resets","chk.resets.ok":"Restarts at 0 {value}\xD7 in 7 days (for example per session). Recognised, no problem.","chk.no_resets":"Resets","chk.no_resets.ok":"None in 7 days.","chk.refresh":"Refresh","chk.refresh.ok":"Every ~{value} s while in use. Start and end are precise.","chk.refresh.warn":"Every ~{value} s while in use. The kWh are right, but start and end can be that much later. A step across two quarter hours is split by time.","chk.refresh.bad":"Every ~{value} s. Too slow to add up: every start misses use and every stop adds too much.","chk.refresh_unknown":"Refresh","chk.refresh_unknown.warn":"Cannot be measured yet: too little use in the history.","chk.interruptions":"Interruptions","chk.interruptions.ok":"{value}\xD7 unavailable in 7 days. Bridged: the counter simply continues afterwards.","chk.interruptions.warn":"{value}\xD7 unavailable in 7 days. Bridged, but the split over quarter hours is less precise.","chk.in_car_meter":"What it measures","chk.in_car_meter.warn":"What the battery receives, also when charging on the road. Charging losses are not included. Prefer your charger's counter if you have one.","chk.power_only":"Unit","chk.power_only.warn":"A power sensor: the kWh is calculated by adding it up over time. If the device has a kWh counter, choose that.","chk.session_refresh":"Session entity","chk.session_refresh.ok":"Refreshes quickly enough; start and end are right.","chk.session_refresh.warn":"Refreshes about every {value} s. The start time can be late; you won't miss use, that comes from the counter.","chk.solar":"Solar or grid","chk.solar.ok":"Per step with your P1 import counter: what the P1 imported in those minutes is grid, the rest is your solar.","set.title":"Settings","set.normal":"Normal tariff (\u20AC/kWh)","set.low":"Low tariff (\u20AC/kWh)","set.low_help":"Weekdays 23:00\u201307:00 and weekends.","set.import":"Import from the grid","set.export":"Export to the grid","set.solar":"Solar production","set.solar_mode":"What does power from your own solar panels cost?","set.mode.export":"What you would otherwise have received","set.mode.export_text":"What you would have received for exporting it.","set.mode.free":"Nothing","set.mode.free_text":"Your own solar power is free.","set.mode.grid":"The same as grid power","set.mode.grid_text":"Solar costs the same as power from the grid.","set.test":"Testing and maintenance","set.test_text":"Useful while testing. Everything below only affects Energydash; your other settings are left alone.","set.recalc_all":"Recalculate everything","set.recalc_all_text":"Recalculates all devices and the whole house over the available history (usually 10 days).","set.recalc_q":"Recalculate everything?","set.recalc_q_text":"All calculated results are replaced by a recalculation over the available history. Results from before that period are lost.","set.export_btn":"Export settings","set.import_btn":"Import settings","set.backup_text":"Save your devices and price settings as a file and restore them in one go after a reset or reinstall.","set.import_q":"Import settings?","set.import_q_text":"{n} devices from the file replace your current devices. Then everything is recalculated over your history.","set.clear":"Clear calculated data","set.clear_text":"Clears sessions and costs but keeps your devices and settings. Everything is then recalculated from your history right away.","set.clear_q":"Clear calculated data?","set.clear_q_text":"All sessions and costs are cleared. Your devices and price settings are kept. This cannot be undone.","set.reset":"Reset Energydash","set.reset_text":"Removes all devices and calculated data. You return to \u2018No devices yet\u2019. Price settings are kept and the whole house is recalculated right away.","set.reset_q":"Reset Energydash?","set.reset_q_text":"All devices, sessions and costs are removed. Export your settings first if you want to restore them later. This cannot be undone.","set.version":"Version {v}","set.invalid_file":"This file is not an Energydash export.","ob.step":"Step {n} of {total}","ob.price":"Your electricity price","ob.price_text":"Used to calculate what each device costs.","ob.meters":"Your meters","ob.meters_text":"From your Energy dashboard. Is this right?","ob.meters_none":"No meters found in your Energy dashboard. Choose the kWh counter of your smart meter.","ob.solar":"Solar power and export","ob.solar_text":"How solar power and export are valued.","ob.storing":"Saving\u2026","ob.save_scan":"Save and find devices","sf.h.price":"Electricity price","sf.h.meters":"Meters","sf.h.solar":"Solar power and export","sf.how":"How do you want to enter your electricity price?","sf.entity":"Price from an entity","sf.entity_text":"A sensor from your supplier.","sf.fixed":"Fixed price","sf.fixed_text":"As on your contract.","sf.price_entity":"Price entity","sf.no_number":"This entity has no price right now.","sf.full":"Is this the price you really pay?","sf.full_yes":"Yes, everything is included","sf.full_yes_text":"Including tax and VAT.","sf.full_no":"No, something comes on top","sf.full_no_text":"For example a bare market price.","sf.markup":"Extra per kWh (\u20AC)","sf.markup_help":"Energy tax, supplier fee and VAT together.","sf.tariffs":"Do you have one price or a day and night tariff?","sf.one":"One price","sf.one_text":"Always the same price.","sf.two":"Normal and low","sf.two_text":"Low: 23\u201307 and at weekends.","sf.price":"Price per kWh (\u20AC)","sf.another":"Another counter for {label}","sf.remove":"Remove {label}","sf.add_counter":"Add counter","sf.import_help":"kWh counter of your smart meter. Separate counters for normal and low tariff? Add both.","sf.export_help":"Optional. Separate counters for normal and low tariff? Add both.","sf.solar_help":"Optional. Several inverters? Add them all. Needed together with export for \u2018Rest of the house\u2019 on sunny days.","sf.export_q":"Where does that export price come from?","sf.exp.auto":"From your price entity","sf.exp.auto_text":"From the forecast prices.","sf.exp.entity":"From another entity","sf.exp.entity_text":"A sensor with your export price.","sf.exp.fixed":"A fixed amount","sf.exp.fixed_text":"As on your contract.","sf.export_entity":"Export price entity","sf.export_fixed":"Export price per kWh (\u20AC)","sf.export_fixed_help":"0 if you get nothing.","ex.auto":"Per quarter hour","ex.two":"Day {normal} \xB7 low {low}","ex.one":"Day and night {price}","ex.markup":"extra","ex.full_no":"{raw} + {markup} = {total}","ex.full_yes":"{price} \u2192 you pay {price}","ex.fixed":"E.g. always {price} per kWh","ex.entity":"E.g. 14:00 {a} \xB7 14:15 {b}","ex.now":"Now {price} per kWh","ex.solar_grid_unknown":"Solar = grid price","ex.solar_grid":"Solar = grid price = {price}","ex.solar_free":"Solar = {price}","ex.solar_export_unknown":"Solar = export price","ex.solar_export":"Solar = export price = {price}","ex.eg":"E.g. {price} per kWh","sf.forecast_none":"No forecast prices: the price of the moment is used.","sf.forecast_found":"Forecast prices found: prices are calculated per quarter hour or hour.","t.saved_recalc":"Saved. Your history is being recalculated.","p.need_price":"First choose how to enter your electricity price. Until then the costs are not right.","p.need_price_btn":"Set electricity price"},wt=Ye;function $t(r){wt=r.startsWith("nl")?Ye:Xt}function s(r,e){let t=wt[r]??Ye[r]??r;if(e)for(let[i,n]of Object.entries(e))t=t.split(`{${i}}`).join(String(n));return t}function W(r,e,t,i,n){return a`<button class="radio" role="radio" aria-checked=${r} @click=${i}>
    <span class="dot"></span><div><b>${e}</b><span>${t}</span>${n?a`<span class="ex">${n}</span>`:h}</div>
  </button>`}function y(r,e,t){r.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!1}))}var ue=class{constructor(e){this.host=e;this.current=null;this.over=e=>{let t=e.target?.closest?.("[data-tip]")??null;t&&t!==this.current&&this.show(t)};this.out=e=>{let t=e.relatedTarget;this.current&&t&&this.current.contains(t)||this.hide()};this.hide=()=>{this.current=null,this.pop&&(this.pop.style.display="none")};e.addController(this)}hostConnected(){let e=this.host.renderRoot;e.addEventListener("pointerover",this.over),e.addEventListener("pointerout",this.out),e.addEventListener("focusin",this.over),e.addEventListener("focusout",this.out),window.addEventListener("scroll",this.hide,!0)}hostDisconnected(){let e=this.host.renderRoot;e.removeEventListener("pointerover",this.over),e.removeEventListener("pointerout",this.out),e.removeEventListener("focusin",this.over),e.removeEventListener("focusout",this.out),window.removeEventListener("scroll",this.hide,!0),this.hide()}show(e){if(this.current=e,!this.pop){let c=document.createElement("div");c.setAttribute("role","tooltip"),Object.assign(c.style,{position:"fixed",zIndex:"30",maxWidth:"280px",padding:"8px 10px",borderRadius:"8px",pointerEvents:"none",background:"var(--ed-text)",color:"var(--ed-card)",fontSize:"12px",lineHeight:"1.45",whiteSpace:"pre-line",boxShadow:"0 4px 12px rgba(0,0,0,.25)",fontWeight:"400",textAlign:"left"}),this.host.renderRoot.appendChild(c),this.pop=c}let t=this.pop;t.textContent=e.getAttribute("data-tip")??"",t.style.display="block";let i=e.getBoundingClientRect(),n=t.offsetWidth,d=t.offsetHeight,o=i.bottom+6;o+d>window.innerHeight-8&&(o=Math.max(8,i.top-d-6));let l=Math.min(Math.max(8,i.left+i.width/2-n/2),window.innerWidth-n-8);t.style.top=`${o}px`,t.style.left=`${Math.max(8,l)}px`}},ce=class extends k{constructor(){super(),this.heading="",this.subheading="",this.wide=!1}connectedCallback(){super.connectedCallback(),this._onKey=this._onKey.bind(this),window.addEventListener("keydown",this._onKey)}disconnectedCallback(){window.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}_onKey(e){e.key==="Escape"&&y(this,"closed")}firstUpdated(){this.renderRoot.querySelector(".box")?.focus()}render(){return a`<div class="scrim" @click=${e=>e.target===e.currentTarget&&y(this,"closed")}>
      <div class="box" role="dialog" aria-modal="true" aria-label=${this.heading} tabindex="-1">
        <header>
          <div class="grow">
            <h2>${this.heading}</h2>
            ${this.subheading?a`<div class="sub">${this.subheading}</div>`:h}
          </div>
          <button class="icon" aria-label=${s("c.close")} @click=${()=>y(this,"closed")}><ha-icon icon="mdi:close"></ha-icon></button>
        </header>
        <div class="content"><slot></slot></div>
        <footer><slot name="start"></slot><slot name="footer"></slot></footer>
      </div>
    </div>`}};ce.properties={heading:{type:String},subheading:{type:String},wide:{type:Boolean}},ce.styles=[z,j`
      .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 10; display: grid; place-items: center; padding: 16px; }
      .box {
        background: var(--ed-card); color: var(--ed-text); border-radius: 24px; width: min(560px, 100%);
        max-height: calc(100vh - 32px); display: flex; flex-direction: column; outline: none;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      }
      :host([wide]) .box { width: min(720px, 100%); }
      header { display: flex; align-items: flex-start; gap: 8px; padding: 20px 16px 8px 24px; }
      header h2 { font-size: 22px; font-weight: 400; margin: 0; }
      header .sub { color: var(--ed-text2); font-size: 14px; margin-top: 2px; }
      .content { padding: 8px 24px 16px; overflow: auto; display: grid; gap: 16px; }
      footer { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 24px 20px; flex-wrap: wrap; }
      footer ::slotted([slot="start"]) { margin-right: auto; }
      @media (max-width: 600px) {
        .scrim { place-items: end center; padding: 0; }
        .box { border-radius: 24px 24px 0 0; width: 100%; max-height: 92vh; }
        :host([wide]) .box { width: 100%; }
      }
    `];var pe=class extends k{constructor(){super(),this.label="",this.help="",this.value=null,this.options=[],this.filter=null,this.required=!1,this.allowNone=!1,this._open=!1,this._q=""}_all(){let e=[...this.options],t=new Set(e.map(n=>n.entity_id));if(this.filter&&this._q.length>=2)for(let n of Object.values(this.hass.states)){if(t.has(n.entity_id))continue;let d=this.filter(n);d&&e.push({...d,group:d.group??""})}let i=this._q.toLowerCase();return i?e.filter(n=>n.name.toLowerCase().includes(i)||n.entity_id.includes(i)):e}_pick(e){this.value=e,this._open=!1,this._q="",y(this,"value-changed",{value:e})}render(){let e=this.options.find(n=>n.entity_id===this.value)||(this.value&&this.hass?.states[this.value]?{entity_id:this.value,name:String(this.hass.states[this.value].attributes.friendly_name??this.value)}:null),t=this._open?this._all():[],i;return a`<div class="field" style="display:grid;gap:4px">
      <span style="font-weight:500;font-size:14px">${this.label}${this.required?" *":""}</span>
      <button class="current" aria-expanded=${this._open} @click=${()=>this._open=!this._open}>
        <div class="grow">
          ${e?a`<div>${e.name}</div><div class="eid">${e.entity_id}</div>`:a`<div class="muted">${this.allowNone?s("w.none_option"):"\u2014"}</div>`}
        </div>
        ${e&&e.chip?a`<span class="chip ${e.level??"neutral"}">${e.chip}</span>`:h}
        <ha-icon icon=${this._open?"mdi:menu-up":"mdi:menu-down"}></ha-icon>
      </button>
      ${this._open?a`<div class="panel">
            <label class="field"><span class="visually-hidden">${s("c.search")}</span>
              <input class="input" placeholder=${s("c.search")} aria-label=${s("c.search")} .value=${this._q}
                @input=${n=>this._q=n.target.value} /></label>
            <div class="opts" role="listbox">
              ${this.allowNone?a`<button class="opt" role="option" @click=${()=>this._pick(null)}>${s("w.none_option")}</button>`:h}
              ${t.length===0?a`<div class="muted" style="padding:8px">${s("w.no_results")} – ${s("w.no_results_hint")}</div>`:h}
              ${t.map(n=>{let d=n.group!==void 0&&n.group!==i&&n.group!==""?a`<div class="group">${n.group}</div>`:h;return i=n.group,a`${d}<button class="opt" role="option" aria-selected=${n.entity_id===this.value} @click=${()=>this._pick(n.entity_id)}>
                  <div class="grow"><div>${n.name}</div><div class="eid">${n.entity_id}</div></div>
                  ${n.chip?a`<span class="chip ${n.level??"neutral"}">${n.chip}</span>`:h}
                </button>`})}
            </div>
          </div>`:h}
      ${this.help?a`<span class="help">${this.help}</span>`:h}
    </div>`}};pe.properties={hass:{attribute:!1},label:{type:String},help:{type:String},value:{type:String},options:{attribute:!1},filter:{attribute:!1},required:{type:Boolean},allowNone:{type:Boolean},_open:{state:!0},_q:{state:!0}},pe.styles=[z,j`
      .current {
        display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; font: inherit; color: inherit;
        padding: 10px 12px; border: 1px solid var(--ed-line); border-radius: 8px; background: var(--ed-card); cursor: pointer;
      }
      .current .grow > div:first-child { font-size: 15px; }
      .panel { border: 1px solid var(--ed-line); border-radius: 8px; margin-top: 4px; padding: 8px; display: grid; gap: 6px; }
      .opts { max-height: 260px; overflow: auto; }
      .opt { display: flex; gap: 8px; align-items: center; width: 100%; padding: 8px; background: none; border: none; border-radius: 6px; font: inherit; color: inherit; text-align: left; cursor: pointer; }
      .opt:hover, .opt[aria-selected="true"] { background: color-mix(in srgb, var(--ed-pri) 8%, transparent); }
      .group { font-size: 12px; color: var(--ed-text2); padding: 6px 8px 2px; font-weight: 500; }
      .eid { font-size: 12px; color: var(--ed-text2); word-break: break-all; }
    `];var he=class extends k{constructor(){super(),this.heading="",this.text="",this.action="",this.danger=!0}render(){return a`<ed-dialog .heading=${this.heading} @closed=${()=>y(this,"cancel")}>
      <p>${this.text}</p>
      <button slot="footer" class="btn secondary" @click=${()=>y(this,"cancel")}>${s("c.cancel")}</button>
      <button slot="footer" class="btn ${this.danger?"danger":""}" @click=${()=>y(this,"confirm")}>${this.action}</button>
    </ed-dialog>`}};he.properties={heading:{type:String},text:{type:String},action:{type:String},danger:{type:Boolean}},he.styles=[z];function Me(r){if(!r.entity_id.startsWith("sensor."))return null;let e=r.attributes.device_class,t=String(r.attributes.friendly_name??r.entity_id);return e==="energy"?{entity_id:r.entity_id,name:t,chip:s("chip.counter"),level:"ok"}:e==="power"?{entity_id:r.entity_id,name:t,chip:s("chip.power"),level:"warn"}:null}function Qe(r){return!r.entity_id.startsWith("sensor.")||r.attributes.device_class!=="power"?null:{entity_id:r.entity_id,name:String(r.attributes.friendly_name??r.entity_id)}}function kt(r){return!r.entity_id.startsWith("sensor.")||r.attributes.device_class!=="energy"?null:{entity_id:r.entity_id,name:String(r.attributes.friendly_name??r.entity_id),chip:s("chip.counter"),level:"ok"}}function Re(r){let e=String(r.attributes.unit_of_measurement??"").toLowerCase().replace(/\s/g,"");return!r.entity_id.startsWith("sensor.")||!e.includes("/kwh")?null:{entity_id:r.entity_id,name:String(r.attributes.friendly_name??r.entity_id),chip:r.attributes.unit_of_measurement,level:"neutral"}}function St(r){let e=r.entity_id.split(".")[0];return!["sensor","binary_sensor","input_boolean","switch","input_select","select"].includes(e)||e==="sensor"&&!Number.isNaN(Number(r.state))&&r.state!==""?null:{entity_id:r.entity_id,name:String(r.attributes.friendly_name??r.entity_id),chip:r.state,level:"neutral"}}function R(r,e){customElements.get(r)||customElements.define(r,e)}R("ed-dialog",ce);R("ed-entity-select",pe);R("ed-confirm",he);var ee="nl-NL",Et="EUR";function jt(r,e){ee=r.startsWith("nl")?"nl-NL":r,Et=e||"EUR"}function v(r,e=2){return r==null||Number.isNaN(r)?"\u2014":new Intl.NumberFormat(ee,{style:"currency",currency:Et,minimumFractionDigits:e,maximumFractionDigits:e}).format(Math.abs(r)<.5*10**-e?0:r)}function _(r,e=2){return r==null||Number.isNaN(r)?"\u2014":new Intl.NumberFormat(ee,{minimumFractionDigits:e,maximumFractionDigits:e}).format(r)}function D(r,e){return e>0?Math.round(r/e*100):0}function H(r){return new Date(r).toLocaleTimeString(ee,{hour:"2-digit",minute:"2-digit"})}function L(r,e={weekday:"short",day:"numeric",month:"short"}){return new Date(r.length===10?`${r}T12:00:00`:r).toLocaleDateString(ee,e)}function ge(r){return new Date(r).toLocaleString(ee,{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}function zt(r,e){return e?Math.round((new Date(e).getTime()-new Date(r).getTime())/6e4):0}var _e=["#6250d6","#e87ba4","#008300","#eda100","#1baf7a","#e34948","#2f7fd8","#a35a00"],es=["#9085e9","#d55181","#008300","#c98500","#199e70","#e66767","#5ba3f0","#c98a3c"];function te(r,e){if(typeof r=="string")return r;let t=e?es:_e;return t[(r??0)%t.length]}var U=r=>({zon:r?"#c94e00":"#f36d00",exp:r?"#e8a06a":"#f7ad6e",net:"#488fc2",rest:r?"#7a7a7a":"#989898"});function Xe(r,e="var(--card-background-color, #fff)"){let t=r.reduce((o,l)=>o+Math.max(l.v,0),0);if(t<=0)return"conic-gradient(var(--divider-color) 0deg 360deg)";let i=0,n=[],d=r.filter(o=>o.v>0).length>1;for(let o of r){if(o.v<=0)continue;let l=i,c=i+o.v/t*360;d?n.push(`${o.color} ${(l+1).toFixed(1)}deg ${(c-1).toFixed(1)}deg`,`${e} ${(c-1).toFixed(1)}deg ${c.toFixed(1)}deg`):n.push(`${o.color} 0deg 360deg`),i=c}return`conic-gradient(${d?`${e} 0deg 1deg, `:""}${n.join(", ")})`}function At(r,e){let t=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),i=document.createElement("a");i.href=URL.createObjectURL(t),i.download=r,i.click(),setTimeout(()=>URL.revokeObjectURL(i.href),1e3)}function ve(r){return M(r.export_entity).length>0||M(r.solar_entity).length>0}function Wt(r){let e={...r};return e.contract==="dynamic"&&e.price_markup==null&&(e.price_markup=0),e.contract==="fixed"&&e.price_low!=null&&e.price_low===e.price_normal&&(e.price_low=null),e.contract&&!e.export_price_mode&&(e.export_price_entity&&e.contract==="dynamic"?e.export_price_mode="entity":e.contract==="dynamic"&&(e.export_price_mode="auto")),e.contract==="fixed"&&(e.export_price_mode="fixed",r.contract==="fixed"&&e.export_price_fixed==null&&(e.export_price_fixed=0)),e}function fe(r){let e={...r,import_entity:M(r.import_entity),export_entity:M(r.export_entity),solar_entity:M(r.solar_entity)};return ve(e)||(e.solar_mode=e.solar_mode??"export"),e.solar_mode!=="export"&&(e.export_price_mode==="fixed"&&e.export_price_fixed==null||e.export_price_mode==="entity"&&!e.export_price_entity)&&(e.export_price_mode=null),e}var Ct=r=>{let e=Number(r.replace(",","."));return r.trim()===""||Number.isNaN(e)?null:e},me=class extends k{constructor(){super(),this.section="all",this.cards=!1,this._extra=null,this._dual=null}willUpdate(e){if(e.has("value")&&e.get("value")===void 0&&this.value){let t=this.value;this._extra=t.price_markup==null?null:t.price_markup!==0,this._dual=t.contract!=="fixed"||t.price_normal==null?null:t.price_low!=null}}updated(e){e.has("section")&&this.value&&this._emit(this.value)}_set(e){this._emit({...this.value,...e})}_emit(e){this.value=e,y(this,"change",{value:e,valid:this.valid(e)})}valid(e){let t=i=>this.section==="all"||this.section===i;return!(t("price")&&!this._priceValid(e)||t("meters")&&M(e.import_entity).length===0||t("solar")&&ve(e)&&!this._solarValid(e))}_priceValid(e){return e.contract==="dynamic"?!!e.price_entity&&this._extra!==null&&(!this._extra||e.price_markup!=null):e.contract==="fixed"?this._dual!==null&&e.price_normal!=null&&(!this._dual||e.price_low!=null):!1}_solarValid(e){return e.solar_mode?e.solar_mode!=="export"?!0:e.export_price_mode?e.export_price_mode==="entity"?!!e.export_price_entity:e.export_price_mode==="fixed"?e.export_price_fixed!=null:e.export_price_mode==="auto"&&e.contract==="dynamic":!1:!1}_opt(e){let t=e?this.hass.states[e]:void 0;return t?[{entity_id:t.entity_id,name:String(t.attributes.friendly_name??t.entity_id)}]:[]}_priceOptions(e){let t=Object.values(this.hass.states).map(Re).filter(n=>!!n);t.sort((n,d)=>n.name.localeCompare(d.name));let i=this._opt(e);return i.length&&!t.some(n=>n.entity_id===e)?[...i,...t]:t}_money(e,t,i,n){return a`<label class="field"><span class="lbl">${e} *</span>
      <input class="input" inputmode="decimal" .value=${t==null?"":String(t)} @change=${d=>n(Ct(d.target.value))} />
      ${i?a`<span class="help">${i}</span>`:h}</label>`}_state(e){let t=e?this.hass.states[e]:void 0,i=t?Number(t.state):NaN;return Number.isFinite(i)?i:null}render(){let e=this.section==="all",t=this.value;if(!t)return h;let i=(n,d)=>e?this.cards?a`<section class="card"><h2>${n}</h2>${d}</section>`:a`<h3>${n}</h3>${d}`:d;return a`
      ${e||this.section==="price"?i(s("sf.h.price"),this._price(t)):h}
      ${e||this.section==="meters"?i(s("sf.h.meters"),this._meters()):h}
      ${e&&ve(t)||this.section==="solar"?i(s("sf.h.solar"),this._solar(t)):h}`}_gridPrice(e){if(e.contract==="fixed")return e.price_normal??null;let t=this._state(e.price_entity);return t===null?null:t+(this._extra?e.price_markup??0:0)}_price(e){let t=e.contract==="dynamic",i=e.contract==="fixed",n=this.config.settings.price_entity===e.price_entity&&this.config.settings.contract==="dynamic",d=this.config.status,o=this._state(e.price_entity),l=p=>v(p??null,3),c=e.price_markup??null,g=o!==null?s("ex.full_yes",{price:l(o)}):s("ex.full_yes",{price:l(.29)}),m=o!==null?s("ex.full_no",{raw:l(o),markup:c!==null&&c>0?l(c):s("ex.markup"),total:c!==null&&c>0?l(o+c):"\u2026"}):s("ex.full_no",{raw:l(.09),markup:l(.17),total:l(.26)}),u=e.price_normal??null,x=e.price_low??null;return a`
      <div class="q">
        <span class="title">${s("sf.how")} *</span>
        <div class="radios" role="radiogroup" aria-label=${s("sf.how")}>
          ${W(t,s("sf.entity"),s("sf.entity_text"),()=>this._set({contract:"dynamic"}),s("ex.entity",{a:v(.24,2),b:v(.31,2)}))}
          ${W(i,s("sf.fixed"),s("sf.fixed_text"),()=>this._set({contract:"fixed",export_price_mode:"fixed"}),s("ex.fixed",{price:v(.29,2)}))}
        </div>
      </div>
      ${t?a`<div class="sub">
            <ed-entity-select .hass=${this.hass} .label=${s("sf.price_entity")} required
              .value=${e.price_entity??null} .options=${this._priceOptions(e.price_entity)} .filter=${Re}
              @value-changed=${p=>this._set({price_entity:p.detail.value})}></ed-entity-select>
            ${e.price_entity?a`<div class="help status"><ha-icon icon="mdi:information-outline"></ha-icon><span>
                  ${o===null?s("sf.no_number"):s("ex.now",{price:v(o,3)})}${o!==null&&n?` \xB7 ${s(d.price_attribute?"sf.forecast_found":"sf.forecast_none")}`:""}</span></div>`:h}
            <div class="q">
              <span class="title">${s("sf.full")} *</span>
              <div class="radios" role="radiogroup" aria-label=${s("sf.full")}>
                ${W(this._extra===!1,s("sf.full_yes"),s("sf.full_yes_text"),()=>{this._extra=!1,this._set({price_markup:0})},g)}
                ${W(this._extra===!0,s("sf.full_no"),s("sf.full_no_text"),()=>{this._extra=!0,this._set({price_markup:e.price_markup?e.price_markup:null})},m)}
              </div>
            </div>
            ${this._extra?this._money(s("sf.markup"),e.price_markup,s("sf.markup_help"),p=>this._set({price_markup:p})):h}
          </div>`:h}
      ${i?a`<div class="sub">
            <div class="q">
              <span class="title">${s("sf.tariffs")} *</span>
              <div class="radios" role="radiogroup" aria-label=${s("sf.tariffs")}>
                ${W(this._dual===!1,s("sf.one"),s("sf.one_text"),()=>{this._dual=!1,this._set({price_low:null})},s("ex.one",{price:v(u??.29,2)}))}
                ${W(this._dual===!0,s("sf.two"),s("sf.two_text"),()=>{this._dual=!0,this._set({})},s("ex.two",{normal:v(u??.31,2),low:v(x??.27,2)}))}
              </div>
            </div>
            ${this._dual===!1?this._money(s("sf.price"),e.price_normal,"",p=>this._set({price_normal:p})):h}
            ${this._dual?a`<div class="row wrap">${this._money(s("set.normal"),e.price_normal,"",p=>this._set({price_normal:p}))}
                  ${this._money(s("set.low"),e.price_low,"",p=>this._set({price_low:p}))}</div>`:h}
          </div>`:h}`}_meterList(e,t,i,n){let d=this.value[e],o=Array.isArray(d)?[...d]:d?[d]:[];o.length===0&&o.push(null);let l=c=>this._set({[e]:c.map(g=>g??"")});return a`<div class="q">
      ${o.map((c,g)=>a`<div class="meter">
        <ed-entity-select .hass=${this.hass} .label=${g===0?t:s("sf.another",{label:t.toLowerCase()})} .help=${g===o.length-1?i:""}
          ?required=${n&&g===0} ?allowNone=${!n||g>0} .value=${c} .options=${this._opt(c)} .filter=${kt}
          @value-changed=${m=>{let u=[...o];u[g]=m.detail.value,l(u)}}></ed-entity-select>
        ${o.length>1?a`<button class="icon" aria-label=${s("sf.remove",{label:t})} title=${s("sf.remove",{label:t})} @click=${()=>l(o.filter((m,u)=>u!==g))}><ha-icon icon="mdi:close"></ha-icon></button>`:h}
      </div>`)}
      ${o[o.length-1]?a`<div><button class="btn text" style="padding-left:0" @click=${()=>l([...o,""])}>
            <ha-icon icon="mdi:plus"></ha-icon>${s("sf.add_counter")}</button></div>`:h}
    </div>`}_meters(){return a`
      ${this._meterList("import_entity",s("set.import"),s("sf.import_help"),!0)}
      ${this._meterList("export_entity",s("set.export"),s("sf.export_help"),!1)}
      ${this._meterList("solar_entity",s("set.solar"),s("sf.solar_help"),!1)}`}_solar(e){let t=e.contract==="dynamic",i=this.config.settings.price_entity===e.price_entity?this.config.status.forecast_export_now??null:null,n=this._gridPrice(e),d=t?e.export_price_mode==="auto"?i:e.export_price_mode==="entity"?this._state(e.export_price_entity):e.export_price_mode==="fixed"?e.export_price_fixed??null:null:e.export_price_fixed??null;return a`
      <div class="q">
        <span class="title">${s("set.solar_mode")} *</span>
        <div class="radios" role="radiogroup" aria-label=${s("set.solar_mode")}>
          ${W(e.solar_mode==="export",s("set.mode.export"),s("set.mode.export_text"),()=>this._set({solar_mode:"export"}),d===null?s("ex.solar_export_unknown"):s("ex.solar_export",{price:v(d,2)}))}
          ${W(e.solar_mode==="free",s("set.mode.free"),s("set.mode.free_text"),()=>this._set({solar_mode:"free"}),s("ex.solar_free",{price:v(0,2)}))}
          ${W(e.solar_mode==="grid",s("set.mode.grid"),s("set.mode.grid_text"),()=>this._set({solar_mode:"grid"}),n===null?s("ex.solar_grid_unknown"):s("ex.solar_grid",{price:v(n,2)}))}
        </div>
      </div>
      ${e.solar_mode==="export"?this._exportPrice(e,t,i):h}`}_exportPrice(e,t,i){let n=(d,o)=>d===null?s("ex.eg",{price:v(o,2)}):s("ex.now",{price:v(d,2)});return a`<div class="sub">
      <div class="q">
        <span class="title">${s(t?"sf.export_q":"sf.export_fixed")} *</span>
        ${t?a`<div class="radios" role="radiogroup" aria-label=${s("sf.export_q")}>
              ${W(e.export_price_mode==="auto",s("sf.exp.auto"),s("sf.exp.auto_text"),()=>this._set({export_price_mode:"auto"}),i!==null?n(i,0):s("ex.auto"))}
              ${W(e.export_price_mode==="entity",s("sf.exp.entity"),s("sf.exp.entity_text"),()=>this._set({export_price_mode:"entity"}),n(e.export_price_mode==="entity"?this._state(e.export_price_entity):null,.08))}
              ${W(e.export_price_mode==="fixed",s("sf.exp.fixed"),s("sf.exp.fixed_text"),()=>this._set({export_price_mode:"fixed"}),n(e.export_price_mode==="fixed"?e.export_price_fixed??null:null,.07))}
            </div>`:h}
      </div>
      ${e.export_price_mode==="entity"&&t?a`<ed-entity-select .hass=${this.hass} .label=${s("sf.export_entity")} required .value=${e.export_price_entity??null}
            .options=${this._priceOptions(e.export_price_entity)} .filter=${Re}
            @value-changed=${d=>this._set({export_price_entity:d.detail.value})}></ed-entity-select>`:h}
      ${e.export_price_mode==="fixed"&&t?this._money(s("sf.export_fixed"),e.export_price_fixed,s("sf.export_fixed_help"),d=>this._set({export_price_fixed:d})):h}
      ${t?h:a`<input class="input" inputmode="decimal" aria-label=${s("sf.export_fixed")} .value=${e.export_price_fixed==null?"":String(e.export_price_fixed)}
            @change=${d=>this._set({export_price_fixed:Ct(d.target.value),export_price_mode:"fixed"})} />
          <span class="help">${s("sf.export_fixed_help")}</span>`}
    </div>`}};me.properties={hass:{attribute:!1},config:{attribute:!1},value:{attribute:!1},section:{type:String},cards:{type:Boolean},_extra:{state:!0},_dual:{state:!0}},me.styles=[z,j`
      :host { display: grid; gap: 20px; }
      .q { display: grid; gap: 8px; }
      .q > .title { font-weight: 500; font-size: 14px; }
      .radios { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .sub { display: grid; gap: 12px; padding-left: 12px; border-left: 2px solid var(--ed-line); }
      .row > label.field { flex: 1; min-width: 140px; align-self: flex-start; }
      .meter { display: flex; gap: 4px; align-items: flex-start; }
      .meter ed-entity-select { flex: 1; min-width: 0; }
      .meter button.icon { margin-top: 26px; }
      h3 { margin: 4px 0 -8px; }
      section.card { display: grid; gap: 20px; padding: 20px 24px 24px; }
      section.card h2 { margin: 0; }
      @media (max-width: 600px) { section.card { padding: 16px; } }
      .status { display: flex; gap: 6px; align-items: flex-start; }
      .status ha-icon { --mdc-icon-size: 16px; flex: none; margin-top: 1px; }
    `];R("ed-settings-form",me);var Mt={sessions:"mdi:power-plug-outline",continuous:"mdi:power-plug",charger:"mdi:ev-station"};function et(r,e,t,i){let n=r.reduce((l,c)=>l+Math.max(c.v,0),0),d=0,o=[];for(let l of r){let c=n>0?Math.max(l.v,0)/n*100:0;c>.05&&o.push(X`<path d=${Tt} pathLength="100" fill="none" stroke-width="12" style="stroke:${l.color}" stroke-dasharray="${c} 100" stroke-dashoffset=${-d}></path>`),d+=c}return a`<div class="gauge" tabindex="0" data-tip=${i}>
    <svg viewBox="0 0 120 68" aria-hidden="true">
      <path d=${Tt} fill="none" stroke-width="12" style="stroke:var(--ed-line)"></path>
      ${o}
      <text x="60" y="60" text-anchor="middle" style="fill:var(--ed-text);font-size:15px">${e}</text>
    </svg>
    <div class="small">${t}</div>
  </div>`}var Tt="M10 62 A50 50 0 0 1 110 62",ts=[["was","mdi:washing-machine"],["washer","mdi:washing-machine"],["droger","mdi:tumble-dryer"],["dryer","mdi:tumble-dryer"],["vaatwas","mdi:dishwasher"],["dishwasher","mdi:dishwasher"],["airco","mdi:air-conditioner"],["server","mdi:server"],["koelkast","mdi:fridge"],["fridge","mdi:fridge"],["vriezer","mdi:fridge"],["warmtepomp","mdi:heat-pump"],["boiler","mdi:water-boiler"]];function se(r){let e=`${r.name} ${r.energy_entity??""}`.toLowerCase();return ts.find(([t])=>e.includes(t))?.[1]??Mt[r.type]??"mdi:flash"}function N(r,e){let t=U(r.dark);if(e==="_rest")return{name:s("d.rest"),color:t.rest,type:"rest",icon:"mdi:home"};let i=r.config.devices.findIndex(o=>o.id===e);if(i>=0){let o=r.config.devices[i];return{name:o.name,color:te(o.color??i,r.dark),type:o.type,icon:o.icon||se(o)}}let n=r.config.archived.find(o=>o.id===e),d=n?.type??"sessions";return{name:n?.name??e,color:t.rest,type:d,icon:se({name:n?.name??"",type:d})}}function T(r,e){return a`<span tabindex="0" data-tip=${e}>${r}</span>`}function tt(r,e){if(e.type==="continuous")return s("v.rule_continuous");if(e.session_source==="entity"&&e.session_entity){let t=r.hass.states[e.session_entity]?.attributes.friendly_name??e.session_entity;return s("v.rule_entity",{entity:t,states:e.session_states.join(", ")})}return s("v.rule_power",{min:_(e.off_delay_min,0),w:_(e.threshold_w,0)})}var Ne=j`
  :host { display: block; }
  .page { display: grid; gap: 16px; padding: 16px; max-width: 1200px; margin: 0 auto; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .kpi .label { font-size: 13px; color: var(--ed-text2); }
  .kpi .value { font-size: 28px; font-weight: 400; margin: 4px 0; }
  .kpi .sub { font-size: 12px; color: var(--ed-text2); }
  .two { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  .donut-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .donut { width: 150px; height: 150px; border-radius: 50%; position: relative; flex: none; }
  .donut::after { content: ""; position: absolute; inset: 26px; border-radius: 50%; background: var(--ed-card); }
  .donut .mid { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 18px; line-height: 1.2; }
  .donut .mid .small { font-size: 12px; }
  .legend { display: grid; gap: 6px; flex: 1; min-width: 180px; }
  .legend .row { font-size: 14px; gap: 8px; }
  .legend .v { margin-left: auto; font-variant-numeric: tabular-nums; }
  .legend .p { width: 42px; text-align: right; color: var(--ed-text2); font-size: 12px; }
  .bars { display: flex; gap: 3px; height: 200px; position: relative; }
  .bars .zero { position: absolute; left: 0; right: 0; border-top: 1px solid var(--ed-line); pointer-events: none; }
  .bars .col { flex: 1; display: flex; flex-direction: column; cursor: pointer; min-width: 4px; border: none; background: none; padding: 0; height: 100%; }
  .bars .up { display: flex; flex-direction: column-reverse; gap: 2px; padding-bottom: 1px; }
  .bars .down { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
  .bars .seg { width: 100%; flex: none; }
  .flow-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px 24px; align-items: center; }
  .flow { position: relative; width: 100%; max-width: 360px; aspect-ratio: 320 / 230; margin: 0 auto 20px; }
  .flow svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .flow .node { position: absolute; width: 25%; aspect-ratio: 1; transform: translate(-50%, -50%); border: 2px solid; border-radius: 50%; background: var(--ed-card);
    display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; line-height: 1.25; text-align: center; white-space: nowrap; }
  .flow .node.home { border: 4px solid transparent; }
  .flow .node ha-icon { --mdc-icon-size: 22px; }
  .flow .node .name { position: absolute; top: calc(100% + 4px); color: var(--ed-text2); }
  .flow .node .name.above { top: auto; bottom: calc(100% + 4px); }
  .balance { height: 12px; border-radius: 6px; background: var(--ed-line); position: relative; display: flex; gap: 2px; }
  .balance > div { height: 100%; }
  .balance > div:first-child { border-radius: 6px 0 0 6px; }
  .balance .ref { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ed-text); }
  .gauges { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; }
  .gauge { text-align: center; border: 1px solid var(--ed-line); border-radius: var(--ed-radius); padding: 8px; }
  .gauge[data-tip]:hover, .gauge[data-tip]:focus-visible, .flow .node[data-tip]:hover, .flow .node[data-tip]:focus-visible { text-decoration: none; background-color: color-mix(in srgb, var(--ed-text) 4%, var(--ed-card)); }
  .gauge svg { width: 100%; max-width: 120px; display: block; margin: 0 auto 4px; }
  .labels { display: flex; gap: 3px; font-size: 11px; color: var(--ed-text2); margin-top: 4px; }
  .labels span { flex: 1; text-align: center; min-width: 4px; overflow: hidden; white-space: nowrap; }
  .readout { font-size: 14px; margin-top: 8px; }
  .hbar { height: 10px; border-radius: 5px; background: var(--ed-line); position: relative; overflow: visible; }
  .hbar > div { height: 100%; border-radius: 5px; }
  .hbar .ref { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ed-text2); }
  .prow { display: grid; grid-template-columns: minmax(110px, 30%) 1fr auto; gap: 12px; align-items: center; font-size: 14px; padding: 6px 0; }
  .prow[data-tip]:hover, .prow[data-tip]:focus-visible { text-decoration: none; background: rgba(127, 127, 127, 0.06); border-radius: 6px; }
  .hours { display: flex; align-items: flex-end; gap: 2px; height: 140px; position: relative; border-bottom: 1px solid var(--ed-line); }
  .hours .h { flex: 1; position: relative; height: 100%; display: flex; align-items: flex-end; border: none; background: none; padding: 0; cursor: pointer; }
  .hours .k { width: 100%; background: var(--ed-pri); opacity: 0.55; border-radius: 3px 3px 0 0; }
  .hours .dot { position: absolute; left: 50%; width: 7px; height: 7px; border-radius: 50%; transform: translate(-50%, 50%); background: var(--ed-warn); }
  .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .seg-btns { display: inline-flex; border: 1px solid var(--ed-line); border-radius: 999px; overflow: hidden; }
  .seg-btns button { font: inherit; font-size: 14px; border: none; background: none; padding: 6px 16px; cursor: pointer; color: var(--ed-text2); }
  .seg-btns button[aria-pressed="true"] { background: color-mix(in srgb, var(--ed-pri) 12%, transparent); color: var(--ed-pri); font-weight: 500; }
  .empty { text-align: center; padding: 48px 16px; display: grid; justify-items: center; gap: 8px; }
  .empty ha-icon { --mdc-icon-size: 64px; color: var(--ed-text2); }
  .icon-bubble { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; background: color-mix(in srgb, var(--ed-pri) 10%, transparent); color: var(--ed-pri); }
  .cost { font-variant-numeric: tabular-nums; font-weight: 500; }
  .solar { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; font-size: 14px; flex: 1; min-width: 200px; }
  .solar > :nth-child(odd) { color: var(--ed-text2); }
  .solar > :nth-child(even) { text-align: right; font-variant-numeric: tabular-nums; }
  .readout .it { display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; }
  .fab { position: fixed; right: 24px; bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,.25); z-index: 2; }
`,be=class extends k{constructor(){super();this._lastTick=-1;new ue(this),this._period="month",this._offset=0,this._data=null,this._hoverDay=null,this._hoverHour=null,this._error=""}updated(t){(t.has("_period")||t.has("_offset")||this.ctx&&this.ctx.tick!==this._lastTick)&&(this._lastTick=this.ctx.tick,this._load())}async _load(){try{this._data=await S.summary(this.ctx.hass,this._period,this._offset),this._error=""}catch(t){this._error=String(t.message??t)}}render(){let t=this._data,i=this.ctx.config.settings.solar_mode??"export",n=a`<div class="toolbar">
      <div class="seg-btns" role="group">
        ${["week","month","year"].map(b=>a`<button aria-pressed=${this._period===b} @click=${()=>{this._period=b,this._offset=0,this._hoverDay=null}}>${s(`d.${b}`)}</button>`)}
      </div>
      <button class="icon" aria-label=${s("d.prev")} @click=${()=>{this._offset+=1,this._hoverDay=null}}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <button class="icon" aria-label=${s("d.next")} ?disabled=${this._offset===0} @click=${()=>{this._offset=Math.max(0,this._offset-1),this._hoverDay=null}}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
      ${t?a`<div><h2 style="margin:0">${t.period==="year"?`${t.first_day.slice(0,4)}`:`${L(t.first_day,{day:"numeric",month:"long"})} \u2013 ${L(t.last_day,{day:"numeric",month:"long",year:"numeric"})}`}</h2></div>`:h}
    </div>`;if(this._error)return a`<div class="page">${n}<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${s("c.error",{msg:this._error})}</div></div>`;if(!t)return a`<div class="page">${n}<p class="muted">${s("c.loading")}</p></div>`;let o=[...this.ctx.config.devices.map(b=>b.id),...t.has_house?["_rest"]:[]],l=t.totals._house,c=l?.cost??0,g=Math.round((Date.parse(t.last_day)-Date.parse(t.first_day))/864e5)+1,m=U(this.ctx.dark),u=l?.zon??0,x=l?.kwh??0,p=t.previous_total,f=p&&p>.01&&t.has_house?Math.round((c-p)/p*100):null,A=l?.net??0,F=A>.01?l.net_cost/A:null,C=Math.max(g,1),B=u>.001||t.export.available||M(this.ctx.config.settings.solar_entity).length>0,w=[{label:s(t.has_house?"d.kpi_total":"d.kpi_devices"),value:T(v(c),s(t.has_house?"d.tip_total":"d.tip_devices",{kwh:_(x,1),mode:s(`d.mode.${i}`)})),sub:f===null?"":`${f<=0?"\u2193":"\u2191"} ${Math.abs(f)}% ${s(`d.vs_${this._period}`)}`},{label:s("d.kpi_avg_day"),value:T(v(c/C),s("d.tip_avg_day",{total:v(c),n:C})),sub:""},{label:s("d.kpi_grid_price"),value:T(F!==null?v(F,3):"\u2014",s("d.tip_grid_price",{cost:v(l?.net_cost??0),kwh:_(A,1)})),sub:""}],$=o.map(b=>({id:b,...N(this.ctx,b),v:t.totals[b]?.cost??0,n:t.totals[b]})),E=$.reduce((b,I)=>b+Math.max(I.v,0),0),O=b=>{let I=b.n?s("d.tip_series",{kwh:_(b.n.kwh,1),zon:_(b.n.zon,1),net:v(b.n.net_cost),zon_cost:v(b.n.zon_cost)}):"";return b.id==="_rest"?`${s("d.rest_note")}
${I}`:I};return x<.001?a`<div class="page">${n}${t.has_house?h:a`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${s("d.no_house")}</div>`}
        <div class="card empty"><ha-icon icon="mdi:chart-bar"></ha-icon><h2>${s("s.none")}</h2><p class="muted">${s("d.no_data")}</p></div></div>`:a`<div class="page">
      ${n}
      ${t.has_house?h:a`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${s("d.no_house")}</div>`}
      <div class="kpis">${w.map(b=>a`<div class="card kpi"><div class="label">${b.label}</div><div class="value">${b.value}</div>${b.sub?a`<div class="sub">${b.sub}</div>`:h}</div>`)}</div>
      <div class="two">
        <div class="card">
          <h3>${s("d.money")}</h3>
          <div class="donut-row">
            <div class="donut" role="img" aria-label=${$.map(b=>`${b.name} ${v(b.v)}`).join(", ")} style="background:${Xe($.map(b=>({v:b.v,color:b.color})))}"><div class="mid"><span>${v(c,0)}</span></div></div>
            <div class="legend">${$.map(b=>a`<div class="row"><span class="swatch" style="background:${b.color}"></span><span>${b.name}</span><span class="v">${T(v(b.v),O(b))}</span><span class="p">${D(Math.max(b.v,0),E)}%</span></div>`)}</div>
          </div>
        </div>
        ${B?this._solar(t,u,x):h}
      </div>
      ${t.has_house?this._flow(t,B):h}
      ${this._perDay(t,o,B)}
      <div class="two">${this._perKwh(t,o)}${this._hours(t)}</div>
    </div>`}_solar(t,i,n){let d=U(this.ctx.dark),o=this.ctx.config.settings.solar_mode??"export",l=t.totals._house,c=t.export,g=c.available?i+c.kwh:null,m=l?l.all_net-l.cost:0,u=D(i,n),x=[];return g!==null&&x.push([s("d.produced"),T(`${_(g,1)} kWh`,s("d.tip_produced",{zon:_(i,1),exp:_(c.kwh,1)}))]),x.push([s("d.self_used"),T(`${_(i,1)} kWh`,g?s("d.tip_self_used_p",{p:D(i,g)}):s("d.tip_self_used"))]),c.available&&(x.push([s("d.exported"),T(`${_(c.kwh,1)} kWh`,s("d.tip_exported"))]),x.push([s("d.export_value"),T(v(c.value),s("d.tip_export_value",{price:c.kwh>.01?v(c.value/c.kwh,3):"\u2014"}))])),o!=="grid"&&x.push([s("d.kpi_saved"),T(v(m),s("d.tip_saved",{all:v(l?.all_net??0),cost:v(l?.cost??0),mode:s(`d.mode.${o}`)}))]),a`<div class="card">
      <h3>${s("d.solar")}</h3>
      <div class="donut-row">
        <div class="donut" role="img" aria-label="${s("d.own_solar")} ${u}%, ${s("d.grid")} ${100-u}%" style="background:${Xe([{v:i,color:d.zon},{v:n-i,color:d.net}])}">
          <div class="mid">${T(`${u}%`,s("d.tip_share",{zon:_(i,1),kwh:_(n,1),grid:_(n-i,1)}))}<span class="small muted">${s("d.of_use")}</span></div>
        </div>
        <div class="solar">${x.map(([p,f])=>a`<span>${p}</span><span>${f}</span>`)}</div>
      </div>
    </div>`}_flow(t,i){let n=U(this.ctx.dark),d=n.exp,o=t.totals._house,l=o?.kwh??0,c=o?.zon??0,g=o?.net??0,m=t.export.available,u=m?t.export.kwh:0,x=c+u,p=g-u,f=V=>`${_(V,Math.abs(V)>=100?0:1)} kWh`,A=Math.max(c,u,g,.001),F=V=>(1.5+V/A*3).toFixed(1),C=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches,B="M168 88 V128 Q168 170 210 170 H229",w="M152 88 V128 Q152 170 110 170 H91",$="M91 186 H229",E=(V,ze,it,Ht=!1)=>X`
      <path d=${V} fill="none" style="stroke:${ze>5e-4?it:"var(--ed-line)"}" stroke-width=${ze>5e-4?F(ze):"1"}></path>
      ${ze>5e-4&&!C?X`<circle r="3" fill=${it}><animateMotion dur="3s" repeatCount="indefinite" path=${V} keyPoints=${Ht?"1;0":"0;1"} keyTimes="0;1" calcMode="linear"></animateMotion></circle>`:h}`,O=D(c,l),b=[];m&&(b.push(et([{v:u,color:d},{v:g,color:n.net}],f(Math.abs(p)),s(p>=0?"d.net_import":"d.net_export"),s("d.tip_balance",{imp:_(g,2),exp:_(u,2),net:_(p,2)}))),x>.001&&b.push(et([{v:c,color:n.zon},{v:u,color:"transparent"}],`${D(c,x)}%`,s("d.self_consumed"),s("d.tip_self_consumed",{zon:_(c,1),produced:_(x,1),exp:_(u,1)})))),i&&b.push(et([{v:c,color:n.zon},{v:g,color:"transparent"}],`${O}%`,s("d.self_sufficiency"),s("d.tip_share",{zon:_(c,1),kwh:_(l,1),grid:_(g,1)})));let I=Math.max(g,u,.001);return a`<div class="card">
      <h3>${s("d.flow")}</h3>
      <div class="flow-grid">
        <div class="flow" role="img" aria-label="${s("d.flow_grid")}: ${s("d.grid")} ${f(g)}${m?`, ${s("d.exported")} ${f(u)}`:""}. ${i?`${s("d.solar")}: ${f(x)}. `:""}${s("d.flow_home")}: ${f(l)}">
          <svg viewBox="0 0 320 230" aria-hidden="true">
            ${i?E(B,c,n.zon):h}
            ${i&&m?E(w,u,d):h}
            ${E($,g,n.net)}
          </svg>
          ${i?a`<div class="node" style="left:50%;top:20.9%;border-color:${n.zon}" tabindex="0" data-tip=${m?s("d.tip_produced",{zon:_(c,1),exp:_(u,1)}):s("d.tip_self_used")}>
                <ha-icon icon="mdi:solar-power-variant" style="color:${n.zon}"></ha-icon><span>${f(m?x:c)}</span><span class="name above">${s("d.solar")}</span>
              </div>`:h}
          <div class="node" style="left:16.25%;top:77.4%;border-color:${n.net}" tabindex="0" data-tip=${s("d.tip_grid_node",{imp:_(g,1),exp:m?_(u,1):"\u2014"})}>
            <ha-icon icon="mdi:transmission-tower" style="color:${n.net}"></ha-icon>
            ${m?a`<span style="color:${d}">← ${f(u)}</span>`:h}
            <span style="color:${n.net}">→ ${f(g)}</span>
            <span class="name">${s("d.flow_grid")}</span>
          </div>
          <div class="node home" style="left:83.75%;top:77.4%;background:linear-gradient(var(--ed-card), var(--ed-card)) padding-box, conic-gradient(${n.zon} 0 ${O}%, ${n.net} ${O}% 100%) border-box" tabindex="0" data-tip=${s("d.tip_share",{zon:_(c,1),kwh:_(l,1),grid:_(g,1)})}>
            <ha-icon icon="mdi:home"></ha-icon><span>${f(l)}</span><span class="name">${s("d.flow_home")}</span>
          </div>
        </div>
        <div class="grid" style="align-content:start">
          ${m?a`<div tabindex="0" data-tip=${s("d.tip_balance",{imp:_(g,2),exp:_(u,2),net:_(p,2)})}>
                <div style="font-weight:500">${s("d.balance")}</div>
                <div class="small" style="margin:2px 0 8px"><span style="color:${n.net}">${_(g,2)} kWh</span> − <span style="color:${d}">${_(u,2)} kWh</span> = ${_(p,2)} kWh</div>
                <div class="balance">
                  <div style="width:${(g/I*100).toFixed(1)}%;background:${n.net}"></div>
                  <div style="width:${(u/I*100).toFixed(1)}%;background:${d}"></div>
                  <span class="ref" style="left:${(Math.max(p,0)/I*100).toFixed(1)}%"></span>
                </div>
              </div>`:h}
          ${b.length?a`<div class="gauges">${b}</div>`:h}
        </div>
      </div>
    </div>`}_perDay(t,i,n){let d=U(this.ctx.dark),o=d.exp,l=w=>i.reduce(($,E)=>$+(t.days[w].series[E]?.cost??0),0),c=w=>[{v:-i.reduce(($,E)=>$+Math.min(w.series[E]?.cost??0,0),0),color:"var(--ed-ok)"},...n?[{v:w.solar?.value??0,color:d.zon},{v:w.solar?.export_value??0,color:o}]:[]].filter($=>$.v>5e-4),g=Math.max(.01,...t.days.map(w=>i.reduce(($,E)=>$+Math.max(w.series[E]?.cost??0,0),0))),m=Math.max(0,...t.days.map(w=>c(w).reduce(($,E)=>$+E.v,0))),u=g/(g+m)*100,x=this._hoverDay??t.days.length-1,p=t.days[x],f=this._period==="week",A=this._period==="year",F=w=>A?L(w,{month:"long",year:"numeric"}):L(w,{weekday:"long",day:"numeric",month:"long"}),C=p?.solar,B=n&&C&&C.kwh+C.export_kwh>5e-4;return a`<div class="card">
      <h3>${s(A?"d.per_month":"d.per_day")}</h3>
      <div class="bars" style="height:${m>5e-4?260:200}px">
        <span class="zero" style="top:${u.toFixed(2)}%"></span>
        ${t.days.map((w,$)=>a`<button class="col" style="opacity:${$===x?1:.6}" aria-label="${F(w.date)}: ${v(l($))}" @mouseenter=${()=>this._hoverDay=$} @click=${()=>this._hoverDay=$}>
          <div class="up" style="height:${u.toFixed(2)}%">
            ${i.filter(E=>(w.series[E]?.cost??0)>5e-4).map((E,O,b)=>a`<div class="seg" style="height:${(w.series[E].cost/g*100).toFixed(2)}%;background:${N(this.ctx,E).color};border-radius:${O===b.length-1?"4px 4px 0 0":"0"}"></div>`)}
          </div>
          <div class="down" style="height:${(100-u).toFixed(2)}%">
            ${c(w).map((E,O,b)=>a`<div class="seg" style="height:${(E.v/m*100).toFixed(2)}%;background:${E.color};border-radius:${O===b.length-1?"0 0 4px 4px":"0"}"></div>`)}
          </div>
        </button>`)}
      </div>
      <div class="labels">${t.days.map((w,$)=>a`<span>${A?L(w.date,{month:"short"}):f?L(w.date,{weekday:"short",day:"numeric"}):$===0||($+1)%5===0?L(w.date,{day:"numeric"}):""}</span>`)}</div>
      ${p?a`<div class="readout"><b style="margin-right:12px">${F(p.date)}: ${v(l(x))}</b>
        ${i.filter(w=>Math.abs(p.series[w]?.cost??0)>5e-4).map(w=>{let $=N(this.ctx,w);return a`<span class="it small"><span class="swatch" style="background:${$.color}"></span>${$.name} ${v(p.series[w].cost)}</span>`})}</div>`:h}
      ${B?a`<div class="readout"><span style="margin-right:12px">${s("d.day_solar",{kwh:_(C.kwh+C.export_kwh,1)})}</span>
            <span class="it small"><span class="swatch" style="background:${d.zon}"></span>${T(`${s("d.self_used")} ${v(C.value)}`,s("d.tip_day_used",{kwh:_(C.kwh,1),value:v(C.value)}))}</span>
            ${t.export.available?a`<span class="it small"><span class="swatch" style="background:${o}"></span>${T(`${s("d.exported")} ${v(C.export_value)}`,s("d.tip_day_exported",{kwh:_(C.export_kwh,1),value:v(C.export_value)}))}</span>`:h}
          </div>`:h}
      ${n&&m>5e-4?a`<p class="muted small" style="margin-top:8px">${s("d.below_line")}</p>`:h}
    </div>`}_perKwh(t,i){let n=i.map(o=>({id:o,...N(this.ctx,o),n:t.totals[o]})).filter(o=>o.n&&o.n.kwh>.01),d=Math.max(.05,...n.map(o=>Math.max(o.n.price_per_kwh??0,o.n.grid_price_per_kwh??0)))*1.1;return a`<div class="card">
      <h3>${s("d.per_kwh")}</h3>
      ${n.map(o=>{let l=o.n.price_per_kwh??0,c=o.n.grid_price_per_kwh??0,g=c>0?Math.round((1-l/c)*100):0,m=s("d.tip_per_kwh",{cost:v(o.n.cost),kwh:_(o.n.kwh,1),price:v(l,3),grid:v(c,3),diff:g>1?s("d.vs_grid_below",{p:g}):g<-1?s("d.vs_grid_above",{p:-g}):s("d.vs_grid_same")});return a`<div class="prow" tabindex="0" data-tip=${m}>
          <span class="row" style="gap:8px"><span class="swatch" style="background:${o.color}"></span>${o.name}</span>
          <div class="hbar"><div style="width:${Math.max(l/d*100,0).toFixed(1)}%;background:${o.color}"></div><span class="ref" style="left:${(c/d*100).toFixed(1)}%"></span></div>
          <b>${v(l,3)}</b>
        </div>`})}
    </div>`}_hours(t){let i=Math.max(.01,...t.hours.map(p=>p.kwh)),n=t.hours.filter(p=>p.price!==null).map(p=>p.price),d=Math.max(.01,...n),o=Math.min(0,...n),l=n.length?t.hours.reduce((p,f)=>p+(f.price??0)*f.kwh,0)/Math.max(t.hours.reduce((p,f)=>p+(f.price!==null?f.kwh:0),0),1e-4):0,c=t.hours.reduce((p,f)=>p+f.kwh,0),g=t.hours.filter(p=>p.price!==null&&p.price<l).reduce((p,f)=>p+f.kwh,0),m=this._hoverHour??new Date().getHours(),u=t.hours[m],x=p=>String(p).padStart(2,"0");return a`<div class="card">
      <h3>${s("d.when")}</h3>
      <div class="hours">
        ${t.hours.map(p=>a`<button class="h" style="opacity:${p.hour===m?1:.7}" aria-label="${x(p.hour)}:00, ${_(p.kwh,2)} kWh, ${v(p.price)}" @mouseenter=${()=>this._hoverHour=p.hour} @click=${()=>this._hoverHour=p.hour}>
          <div class="k" style="height:${(p.kwh/i*100).toFixed(1)}%"></div>
          ${p.price!==null?a`<span class="dot" style="bottom:${((p.price-o)/(d-o||1)*100).toFixed(1)}%"></span>`:h}
        </button>`)}
      </div>
      <div class="labels">${t.hours.map(p=>a`<span>${p.hour%6===0?x(p.hour):""}</span>`)}</div>
      ${u?a`<div class="readout">${x(u.hour)}:00 – ${x((u.hour+1)%24)}:00 · ${_(u.kwh,2)} kWh · ${v(u.price)} /kWh</div>`:h}
      ${c>0&&n.length?a`<p class="muted small" style="margin-top:8px">${s("d.when_insight",{p:D(g,c),price:v(l)})}</p>`:h}
    </div>`}};be.properties={ctx:{attribute:!1},_period:{state:!0},_offset:{state:!0},_data:{state:!0},_hoverDay:{state:!0},_hoverHour:{state:!0},_error:{state:!0}},be.styles=[z,Ne];var xe=class extends k{constructor(){super();this._lastTick=-1;this._sessions=null,this._mode="export"}updated(){this.ctx&&this.ctx.tick!==this._lastTick&&(this._lastTick=this.ctx.tick,S.sessions(this.ctx.hass).then(t=>{this._sessions=t.sessions,this._mode=t.solar_mode}))}_row(t){let i=N(this.ctx,t.device_id),n=t.fields,d=Je(n,this._mode),o=this._mode==="grid"?0:D(n[1],n[0]);return a`<button class="item" @click=${()=>y(this,"open-session",t)}>
      <span class="icon-bubble" style="color:${i.color};background:color-mix(in srgb, ${i.color} 14%, transparent)"><ha-icon icon=${i.icon}></ha-icon></span>
      <div class="grow">
        <div>${i.name} ${t.running?a`<span class="chip ok">${s("s.running")}</span>`:h}</div>
        <div class="muted small">${ge(t.start)}${t.end?` \u2013 ${H(t.end)}`:""} · ${s("s.duration",{min:zt(t.start,t.end??new Date().toISOString())})} · ${_(n[0],2)} kWh${o>0?` \xB7 ${o}% ${s("s.solar").toLowerCase()}`:""}</div>
      </div>
      <span class="cost" style="color:${d<0?"var(--ed-ok)":"inherit"}">${v(d)}</span>
    </button>`}render(){if(!this._sessions)return a`<div class="page"><p class="muted">${s("c.loading")}</p></div>`;let t=Object.values(this.ctx.config.open_sessions);return!this._sessions.length&&!t.length?a`<div class="page"><div class="card empty"><ha-icon icon="mdi:timer-outline"></ha-icon><h2>${s("s.none")}</h2><p class="muted">${s("s.none_text")}</p></div></div>`:a`<div class="page"><div class="card"><div class="list">
      ${t.map(i=>this._row(i))}
      ${this._sessions.map(i=>this._row(i))}
    </div></div></div>`}};xe.properties={ctx:{attribute:!1},_sessions:{state:!0},_mode:{state:!0}},xe.styles=[z,Ne];function Rt(r,e,t){let i=e.fields,n=N(r,e.device_id),d=r.config.devices.find(p=>p.id===e.device_id),o=U(r.dark),l=Je(i,t),c=i[0]-i[1],g=t==="free"?0:t==="grid"?i[3]-i[2]:i[4],m=Math.max(.001,...e.quarters.map(p=>p[1])),u=t!=="grid",x=Math.ceil(e.quarters.length/16);return a`
    <div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px">
      <div><div class="muted small">${s("s.cost")}</div><div style="font-size:26px;color:${l<0?"var(--ed-ok)":"inherit"}">${v(l)}</div></div>
      <div><div class="muted small">${s("s.energy")}</div><div style="font-size:26px">${_(i[0],2)} kWh</div></div>
      <div><div class="muted small">${s("s.solar")}</div><div style="font-size:26px">${u?D(i[1],i[0]):0}%</div></div>
    </div>
    <div class="muted small">${ge(e.start)}${e.end?` \u2013 ${H(e.end)}`:""} · ${n.name}</div>
    ${e.quarters.length?a`<div>
          <h3>${s("s.per_quarter")}</h3>
          <div style="display:flex;align-items:flex-end;gap:2px;height:130px;border-bottom:1px solid var(--ed-line)">
            ${e.quarters.map(p=>{let f=u?p[2]:0;return a`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:2px" title="${H(p[0])} · ${_(p[1],2)} kWh · ${v(p[3],3)}">
                ${f>5e-4?a`<div style="height:${(f/m*100).toFixed(1)}%;background:${o.zon};border-radius:3px 3px 0 0"></div>`:h}
                <div style="height:${((p[1]-f)/m*100).toFixed(1)}%;background:${o.net};border-radius:${f>5e-4?"0":"3px 3px 0 0"}"></div>
              </div>`})}
          </div>
          <div style="display:flex;gap:2px;font-size:10px;color:var(--ed-text2);margin-top:4px">
            ${e.quarters.map((p,f)=>a`<span style="flex:1;text-align:center;overflow:hidden;white-space:nowrap">${f%x===0?a`${H(p[0])}<br />${_(p[3]*100,0)}ct`:""}</span>`)}
          </div>
          <p class="muted small" style="margin-top:6px">${s("s.per_quarter_text")}</p>
        </div>`:h}
    <div>
      <h3>${s("s.breakdown")}</h3>
      <div class="kv">
        <span>${s("s.grid_part")}</span><span>${_(c,2)} kWh × ${c>5e-4?v(i[2]/c,3):"\u2014"} = <b>${v(i[2])}</b></span>
        ${u?a`<span>${s("s.solar_part")}</span><span>${_(i[1],2)} kWh${i[1]>5e-4?` \xD7 ${v(g/i[1],3)}`:""} = <b>${v(g)}</b></span>`:h}
        <span>${s("s.total")}</span><span><b>${v(l)}</b></span>
        <span>${s("s.all_grid")}</span><span>${v(i[3])}</span>
      </div>
    </div>
    <details>
      <summary>${s("s.how")}</summary>
      <div style="display:grid;gap:6px;font-size:14px">
        <p>${s("s.how_energy",{n:e.steps,entity:d?.energy_entity??n.name})}</p>
        <p>${s("s.how_split")}</p>
        <p>${s("s.how_price")}</p>
        <p>${s(`s.how_zon.${t}`)}</p>
        ${e.notes.map(p=>a`<div class="alert warn"><ha-icon icon="mdi:alert"></ha-icon>${s(`s.note.${p}`)}</div>`)}
      </div>
    </details>`}var ye=class extends k{constructor(){super();this._lastTick=-1;new ue(this),this._data=null}updated(){this.ctx&&this.ctx.tick!==this._lastTick&&(this._lastTick=this.ctx.tick,S.baseload(this.ctx.hass).then(t=>this._data=t))}render(){let t=this._data;if(!t)return a`<div class="page"><p class="muted">${s("c.loading")}</p></div>`;if(!t.available||t.watt===void 0)return a`<div class="page"><div class="card empty"><ha-icon icon="mdi:weather-night"></ha-icon><h2>${s("b.none")}</h2><p class="muted">${s("b.none_text")}</p></div></div>`;let i=U(this.ctx.dark),n=(t.explained??[]).map(l=>({...l,color:N(this.ctx,l.device_id).color})),d=t.unexplained_w??0,o=Math.max(1,...(t.weeks??[]).map(l=>l.watt));return a`<div class="page">
      <div class="card">
        <h2>${s("b.title")}</h2>
        <div class="kpis" style="margin-top:12px">
          <div class="kpi"><div class="value">${T(`${_(t.watt,0)} W`,s("b.text"))}</div><div class="sub">${_(t.kwh_day,2)} kWh ${s("b.per_day")}</div></div>
          <div class="kpi"><div class="value">${T(v(t.cost_month),s("b.tip_cost",{kwh:_(t.kwh_day,2),days:"30,4",price:v(t.price,3)}))}</div><div class="sub">${s("b.per_month")}</div></div>
          <div class="kpi"><div class="value">${T(v(t.cost_year,0),s("b.tip_cost",{kwh:_(t.kwh_day,2),days:"365",price:v(t.price,3)}))}</div><div class="sub">${s("b.per_year")}</div></div>
        </div>
      </div>
      <div class="two">
        <div class="card">
          <h3>${s("b.split")}</h3>
          <div style="display:flex;height:16px;border-radius:8px;overflow:hidden;gap:2px;margin-bottom:12px">
            ${n.map(l=>a`<div style="flex:${l.watt};background:${l.color}"></div>`)}
            ${d>0?a`<div style="flex:${d};background:${i.rest}"></div>`:h}
          </div>
          <div class="legend">
            ${n.map(l=>a`<div class="row"><span class="swatch" style="background:${l.color}"></span><span>${l.name}</span><span class="v">${_(l.watt,0)} W</span></div>`)}
            <div class="row"><span class="swatch" style="background:${i.rest}"></span><span>${s("b.unexplained")}</span><span class="v">${T(`${_(d,0)} W`,s("b.unexplained_text"))}</span></div>
          </div>
        </div>
        <div class="card">
          <h3>${s("b.weeks")}</h3>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px;border-bottom:1px solid var(--ed-line)">
            ${(t.weeks??[]).map((l,c,g)=>a`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;align-items:center;gap:4px">
              <span class="small">${_(l.watt,0)}</span>
              <div style="width:100%;height:${(l.watt/o*85).toFixed(1)}%;background:${c===g.length-1?i.net:i.rest};border-radius:4px 4px 0 0"></div>
            </div>`)}
          </div>
          <div class="labels">${(t.weeks??[]).map(l=>a`<span>${l.week.split("-")[1]}</span>`)}</div>
        </div>
      </div>
    </div>`}};ye.properties={ctx:{attribute:!1},_data:{state:!0}},ye.styles=[z,Ne];var we=class extends k{render(){let e=this.ctx.config;return a`<div class="page">
      <div class="card"><div class="list">
        ${e.devices.map(t=>{let i=N(this.ctx,t.id),n=e.numbers[t.id],d=e.open_sessions[t.id]?.running;return a`<button class="item" @click=${()=>y(this,"open-device",t)}>
            <span class="icon-bubble" style="color:${i.color};background:color-mix(in srgb, ${i.color} 14%, transparent)"><ha-icon icon=${i.icon}></ha-icon></span>
            <div class="grow">
              <div>${t.name} ${d?a`<span class="chip ok">${s("s.running")}</span>`:h} ${t.energy_is_power?a`<span class="chip warn">${s("chip.power")}</span>`:h}</div>
              <div class="muted small">${s(`type.${t.type}`)} · ${tt(this.ctx,t)}</div>
            </div>
            <div style="text-align:right"><div class="cost">${v(n?.month.cost)}</div><div class="muted small">${s("c.this_month").toLowerCase()}</div></div>
          </button>`})}
      </div></div>
      ${e.archived.length?a`<div class="card"><h3>${s("v.archived")}</h3><p class="muted small">${s("v.archived_text")}</p>
            <div class="list">${e.archived.map(t=>a`<div class="item"><ha-icon icon=${Mt[t.type]??"mdi:flash"} style="color:var(--ed-text2)"></ha-icon><div class="grow">${t.name}</div><span class="muted small">${L(t.removed)}</span></div>`)}</div></div>`:h}
      ${e.is_admin?a`<div style="height:64px"></div><button class="btn fab" @click=${()=>y(this,"add-device")}><ha-icon icon="mdi:plus"></ha-icon>${s("c.add_device")}</button>`:h}
    </div>`}};we.properties={ctx:{attribute:!1}},we.styles=[z,Ne];function Oe(r,e){customElements.get(r)||customElements.define(r,e)}Oe("ed-dashboard",be);Oe("ed-sessions",xe);Oe("ed-baseload",ye);Oe("ed-devices",we);var ss=60;function Nt(r){let e=r.level==="ok"?"mdi:check-circle":r.level==="warn"?"mdi:alert":"mdi:close-circle",t=r.level==="ok"?"var(--ed-ok)":r.level==="warn"?"var(--ed-warn)":"var(--ed-err)",i=r.value===null||r.value===void 0?"":String(r.value);return a`<div class="row" style="align-items:flex-start;padding:6px 0">
    <ha-icon icon=${e} style="color:${t};--mdc-icon-size:20px;flex:none"></ha-icon>
    <div class="grow"><b style="font-weight:500">${s(`chk.${r.code}`)}</b>${r.code==="unit"||r.code==="state_class"||r.code==="power_only"?a` <span class="muted small">${i}</span>`:h}
      <div class="muted small">${s(`chk.${r.code}.${r.level}`,{value:i})}</div></div>
  </div>`}var Ot={level:"ok",code:"solar",value:null},is=["mdi:washing-machine","mdi:tumble-dryer","mdi:dishwasher","mdi:ev-station","mdi:car-electric","mdi:server","mdi:fridge","mdi:heat-pump","mdi:air-conditioner","mdi:water-boiler","mdi:stove","mdi:microwave","mdi:television","mdi:desktop-tower","mdi:lightbulb","mdi:power-plug"],Pt=j`
  .look { display: grid; gap: 12px; }
  .swatches, .icons { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .sw { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; outline-offset: 2px; }
  .sw[aria-checked="true"] { outline: 2px solid var(--ed-text); }
  .custom { width: 36px; height: 36px; padding: 0; border: 1px solid var(--ed-line); border-radius: 50%; background: none; cursor: pointer; }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--ed-line); background: none; cursor: pointer; color: var(--ed-text2); --mdc-icon-size: 22px; }
  .ic[aria-checked="true"] { border: 2px solid currentColor; }
`;function Dt(r,e,t,i){let n=te(r.color??e,t),d=r.icon||se(r),o=typeof r.color=="string"?r.color:_e[(r.color??e)%_e.length];return a`<div class="look">
    <div>
      <div style="font-weight:500;font-size:14px;margin-bottom:6px">${s("w.color")}</div>
      <div class="swatches" role="radiogroup" aria-label=${s("w.color")}>
        ${_e.map((l,c)=>a`<button class="sw" role="radio" aria-checked=${(r.color??e)===c} aria-label=${s("w.color_n",{n:c+1})}
          style="background:${te(c,t)}" @click=${()=>i({color:c})}></button>`)}
        <label class="row" style="gap:6px"><input class="custom" type="color" aria-label=${s("w.color_custom")} .value=${o}
          @input=${l=>i({color:l.target.value})} /><span class="help">${s("w.color_custom")}</span></label>
      </div>
    </div>
    <div>
      <div style="font-weight:500;font-size:14px;margin-bottom:6px">${s("w.icon")}</div>
      <div class="icons" role="radiogroup" aria-label=${s("w.icon")}>
        ${is.map(l=>a`<button class="ic" role="radio" aria-checked=${d===l} aria-label=${l} title=${l}
          style=${d===l?`color:${n}`:""} @click=${()=>i({icon:l})}><ha-icon icon=${l}></ha-icon></button>`)}
      </div>
    </div>
    <label class="field"><span class="lbl">${s("w.icon_other")}</span>
      <div class="row" style="gap:8px"><ha-icon icon=${d} style="color:${n};--mdc-icon-size:28px;flex:none"></ha-icon>
        <input class="input" placeholder="mdi:…" .value=${r.icon??""} @change=${l=>i({icon:l.target.value.trim()||null})} /></div>
      <span class="help">${s("w.icon_help")}</span></label>
  </div>`}var $e=class extends k{constructor(){super(),this.candidate=null,this.existing=null,this._step="pick",this._found=null,this._q="",this._analysis=null,this._analyzing=!1,this._preview=null,this._saving=!1,this._recalc=!0,this._error="",this._dev=this._blank()}_blank(){return{name:"",type:"sessions",energy_entity:"",energy_is_power:!1,power_entity:null,session_source:"power",session_entity:null,session_states:[],threshold_w:3,off_delay_min:5,min_duration_min:10}}connectedCallback(){super.connectedCallback(),this.existing?(this._dev={...this.existing,session_states:[...this.existing.session_states]},this._step="type",this._recalc=!1,this._analyze()):this.candidate?this._fromCandidate(this.candidate):S.discover(this.ctx.hass).then(e=>this._found=e)}get _isEdit(){return!!this.existing}_fromCandidate(e){this._dev={...this._blank(),name:e.name,type:e.type,energy_entity:e.entity_id,energy_is_power:e.power_only,power_entity:e.power_only?e.entity_id:e.power_entity,session_source:e.type==="charger"?"entity":"power"},this._step="type",this._analyze()}_fromEntity(e){let t=this.ctx.hass.states[e],i=t?.attributes.device_class==="power",n=String(t?.attributes.friendly_name??e),d={entity_id:e,name:n,unit:t?.attributes.unit_of_measurement??null,device_name:null,area:null,in_energy_prefs:!1,power_entity:null,power_only:i,type:"sessions",type_reason:"default"};this._fromCandidate(d)}async _analyze(){let e=this._dev;if(e.energy_entity){this._analyzing=!0;try{let t=await S.analyze(this.ctx.hass,{energy_entity:e.energy_entity,energy_is_power:e.energy_is_power,power_entity:e.energy_is_power?null:e.power_entity,session_entity:e.session_source==="entity"?e.session_entity:null});if(this._analysis=t,!this._isEdit){let i={};if(e.name||(i.name=e.energy_entity),this._step==="type"&&!this.candidate?.type_reason?.startsWith("name")&&t.type_reason!=="no_history"&&(i.type=t.suggested_type),e.session_source==="entity"&&!e.session_entity&&t.session_candidates.length)return i.session_entity=t.session_candidates[0].entity_id,this._dev={...this._dev,...i},this._analyze();e.session_source==="entity"&&e.session_states.length===0&&t.session_suggested_states?.length&&(i.session_states=[...t.session_suggested_states]),this._dev={...this._dev,...i}}}catch(t){this._error=String(t.message??t)}finally{this._analyzing=!1}}}_set(e,t=!1){this._dev={...this._dev,...e},t&&this._analyze(),this._step==="tune"&&this._schedulePreview()}_schedulePreview(){window.clearTimeout(this._previewTimer),this._previewTimer=window.setTimeout(async()=>{try{this._preview=await S.preview(this.ctx.hass,this._dev)}catch(e){this._error=String(e.message??e)}},350)}get _needsTune(){return this._dev.type!=="continuous"&&this._dev.session_source==="power"}get _seq(){let e=this.candidate||this._isEdit?[]:["pick"];return e.push("type","sources"),this._needsTune&&e.push("tune"),e}_go(e){if(e==="tune"){if(!this._isEdit&&this._analysis&&this._dev.threshold_w===3&&this._dev.off_delay_min===5){let t=this._analysis.power_settings,i=this._dev.type==="charger"?Math.max(t.off_delay_min,ss):t.off_delay_min;this._dev={...this._dev,threshold_w:t.threshold_w,off_delay_min:i,min_duration_min:t.min_duration_min}}this._preview=null,this._schedulePreview()}this._step=e}async _save(){this._saving=!0,this._error="";try{let e={...this._dev};e.type==="continuous"&&(e.session_states=[]),await S.saveDevice(this.ctx.hass,e,this._isEdit?this._recalc:!0),y(this,"saved",this._isEdit?s("t.saved"):s("t.added"))}catch(e){this._error=String(e.message??e),this._saving=!1}}get _sourcesValid(){let e=this._dev;return!e.energy_entity||!e.name.trim()?!1:e.type!=="continuous"&&e.session_source==="entity"?!!e.session_entity&&e.session_states.length>0:!0}render(){let e=this._seq,t=e.indexOf(this._step),i={pick:s("w.pick"),type:s("w.type"),sources:s("w.sources"),tune:s("w.tune")},n=t===e.length-1,d=t>0?()=>this._go(e[t-1]):null,o=this._step==="type"?!!this._dev.name.trim():this._step==="sources"?this._sourcesValid:!0;return a`<ed-dialog .heading=${s(this._isEdit?"w.edit_title":"w.add_title")} .subheading=${s("w.step",{n:t+1,total:e.length,name:i[this._step]})} ?wide=${this._step==="tune"} @closed=${()=>y(this,"closed")}>
      ${this._error?a`<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${s("c.error",{msg:this._error})}</div>`:h}
      ${this._step==="pick"?this._renderPick():this._step==="type"?this._renderType():this._step==="sources"?this._renderSources():this._renderTune()}
      ${this._step!=="pick"?a`
            <button slot="footer" class="btn secondary" @click=${()=>d?d():y(this,"closed")}>${d?s("c.back"):s("c.cancel")}</button>
            ${n?a`<button slot="footer" class="btn" ?disabled=${!o||this._saving} @click=${this._save}>${s("c.save")}</button>`:a`<button slot="footer" class="btn" ?disabled=${!o} @click=${()=>this._go(e[t+1])}>${s("c.next")}</button>`}`:a`<button slot="footer" class="btn secondary" @click=${()=>y(this,"closed")}>${s("c.cancel")}</button>`}
    </ed-dialog>`}_renderPick(){let e=this._q.toLowerCase(),t=u=>!e||u.name.toLowerCase().includes(e)||u.entity_id.includes(e),i=this._found,n=new Set(this.ctx.config.devices.flatMap(u=>[u.energy_entity,u.power_entity]).filter(u=>!!u)),d=new Set([...i?.suggested??[],...i?.others??[]].map(u=>u.entity_id)),o=e.length>=2?Object.values(this.ctx.hass.states).map(Me).filter(u=>!!u&&!d.has(u.entity_id)&&!n.has(u.entity_id)&&t(u)).slice(0,40):[],l=u=>a`<button class="item" @click=${()=>this._fromCandidate(u)}>
      <div class="grow"><div>${u.name}</div><div class="muted small">${u.entity_id}${u.area?` \xB7 ${u.area}`:""}</div></div>
      <span class="chip ${u.power_only?"warn":"ok"}">${u.power_only?s("chip.power"):s("chip.counter")}</span>
    </button>`,c=u=>!n.has(u.entity_id),g=(i?.suggested??[]).filter(u=>c(u)&&t(u)),m=(i?.others??[]).filter(u=>c(u)&&t(u));return a`
      <label class="field"><span class="lbl">${s("c.search")}</span>
        <input class="input" .value=${this._q} @input=${u=>this._q=u.target.value} />
        <span class="help">${s("w.search_help")}</span></label>
      ${i?h:a`<p class="muted">${s("c.loading")}</p>`}
      ${g.length?a`<div><h3>${s("w.suggested")}</h3><div class="list">${g.map(l)}</div></div>`:h}
      ${m.length||o.length?a`<div><h3>${s("w.other")}</h3><div class="list">${m.map(l)}${o.map(u=>a`<button class="item" @click=${()=>this._fromEntity(u.entity_id)}>
            <div class="grow"><div>${u.name}</div><div class="muted small">${u.entity_id}</div></div><span class="chip ${u.level}">${u.chip}</span></button>`)}</div></div>`:h}
      ${i&&!g.length&&!m.length&&!o.length?a`<div class="empty" style="text-align:center"><h3>${s("w.no_results")}</h3><p class="muted">${s("w.no_results_hint")}</p></div>`:h}`}_renderType(){let e=this._dev,t=["sessions","continuous","charger"],i=this._analysis?s(`w.reason.${this.candidate?.type_reason==="name"?"name":this._analysis.type_reason}`):this._analyzing?s("w.checking"):"";return a`
      <label class="field"><span class="lbl">${s("w.name")} *</span>
        <input class="input" .value=${e.name} @input=${n=>this._set({name:n.target.value})} /></label>
      <div class="muted small">${e.energy_entity}</div>
      <div class="radios" role="radiogroup" aria-label=${s("w.type")}>
        ${t.map(n=>W(e.type===n,s(`type.${n}`),s(`type.${n}.text`),()=>this._set({type:n,session_source:n==="charger"||e.session_entity&&e.session_source==="entity"?"entity":"power"},n==="charger"&&!e.session_entity)))}
      </div>
      ${i?a`<div class="help">${i}</div>`:h}
      <details ?open=${this._isEdit}>
        <summary>${s("w.look")}</summary>
        ${Dt(e,this._defaultColor,this.ctx.dark,n=>this._set(n))}
      </details>`}get _defaultColor(){let e=this.ctx.config.devices.findIndex(n=>n.id===this._dev.id);if(e>=0)return e;let t=new Set(this.ctx.config.devices.map(n=>n.color)),i=0;for(;t.has(i);)i+=1;return i}_renderSources(){let e=this._dev,t=this._analysis,i=this.ctx.hass,n=this._found,d=[],o=p=>{if(!p||d.some(A=>A.entity_id===p)||!i.states[p])return;let f=Me(i.states[p]);f&&d.push(f)};o(e.energy_entity),o(this.candidate?.entity_id),o(this.candidate?.power_entity);for(let p of[...n?.suggested??[],...n?.others??[]])o(p.entity_id);if(t?.checks.some(p=>p.code==="refresh"&&p.level==="bad")){let p=d.find(f=>f.entity_id===e.energy_entity);p&&(p.chip=s("chip.not_recommended"),p.level="bad")}let c=e.type==="charger",g=(t?.session_candidates??[]).map(p=>({entity_id:p.entity_id,name:p.name,chip:p.state,level:"neutral"})),m=Array.from(new Set([...t?.session_states??[],...e.session_states])),u=e.power_entity&&i.states[e.power_entity]?[Qe(i.states[e.power_entity])].filter(Boolean):[],x=[...t?.checks??[],...e.type!=="continuous"&&e.session_source==="entity"&&t?.session_check?[t.session_check]:[],Ot];return a`
      <ed-entity-select .hass=${i} .label=${s("w.energy")} .help=${s("w.energy_help")} required .value=${e.energy_entity} .options=${d} .filter=${Me}
        @value-changed=${p=>{let f=p.detail.value,A=i.states[f]?.attributes.device_class==="power";this._set({energy_entity:f,energy_is_power:A,power_entity:A?f:e.power_entity},!0)}}></ed-entity-select>
      ${e.type!=="continuous"?a`<div>
            <div style="font-weight:500;font-size:14px;margin-bottom:6px">${s("w.session_how")} *</div>
            <div class="radios" role="radiogroup">
              ${(c?["entity","power"]:["power","entity"]).map(p=>W(e.session_source===p,s(p==="power"?"w.from_power":"w.from_entity"),s(p==="power"?c?"w.from_power_charger":"w.from_power_text":c?"w.from_entity_charger":"w.from_entity_text"),()=>this._set({session_source:p},p==="entity"&&!e.session_entity)))}
            </div>
          </div>`:h}
      ${e.type!=="continuous"&&e.session_source==="entity"?a`<ed-entity-select .hass=${i} .label=${s("w.session_entity")} required .value=${e.session_entity??null} .options=${g} .filter=${St}
              @value-changed=${p=>this._set({session_entity:p.detail.value,session_states:[]},!0)}></ed-entity-select>
            ${e.session_entity?a`<div>
                  <div style="font-weight:500;font-size:14px;margin-bottom:6px">${s("w.session_states")} *</div>
                  <div class="states">${m.map(p=>{let f=e.session_states.includes(p);return a`<button class="chip" aria-pressed=${f} @click=${()=>this._set({session_states:f?e.session_states.filter(A=>A!==p):[...e.session_states,p]})}>${p}</button>`})}</div>
                  ${e.session_states.length===0?a`<div class="help" style="color:var(--ed-err);margin-top:4px">${s("w.pick_state")}</div>`:a`<div class="help" style="margin-top:4px">${s("w.session_states_help")}</div>`}
                </div>`:h}`:h}
      ${e.type!=="continuous"&&e.session_source==="power"&&!e.energy_is_power?a`<ed-entity-select .hass=${i} .label=${s("w.power_entity")} .help=${s("w.power_entity_help")} allowNone .value=${e.power_entity??null} .options=${u} .filter=${Qe}
            @value-changed=${p=>this._set({power_entity:p.detail.value})}></ed-entity-select>`:h}
      <div>
        <h3>${s("v.check")}</h3>
        ${this._analyzing&&!t?a`<p class="muted">${s("w.checking")}</p>`:x.map(Nt)}
      </div>
      ${this._isEdit?a`<label class="row" style="align-items:flex-start"><input type="checkbox" .checked=${this._recalc} @change=${p=>this._recalc=p.target.checked} />
            <div><b style="font-weight:500">${s("w.recalc_edit")}</b><div class="help">${s("w.recalc_edit_help")}</div></div></label>`:this._needsTune?h:a`<p class="muted small">${s("w.recalc_note")}</p>`}`}_renderTune(){let e=this._dev,t=this._preview,i=7,n=a`<p class="muted">${s("c.loading")}</p>`;if(t){let l=new Date(t.start).getTime(),c=new Date(t.end).getTime(),g=Math.max(e.threshold_w*2,...t.power.map(p=>p[1])),m=p=>((new Date(p).getTime()-l)/(c-l)*1e3).toFixed(1),u=p=>(150-Math.min(p,g)/g*140).toFixed(1),x=t.power.map(p=>`${m(p[0])},${u(p[1])}`).join(" ");n=a`<svg viewBox="0 0 1000 160" preserveAspectRatio="none" role="img" aria-label=${s("w.chart",{d:i})}>
        ${t.sessions.map(p=>a`<rect x=${m(p.start)} y="0" width=${Math.max(Number(m(p.end))-Number(m(p.start)),2)} height="150" fill="var(--ed-pri)" opacity="0.15"></rect>`)}
        <polyline points=${x} fill="none" stroke="var(--ed-pri)" stroke-width="1.2" vector-effect="non-scaling-stroke"></polyline>
        <line x1="0" x2="1000" y1=${u(e.threshold_w)} y2=${u(e.threshold_w)} stroke="var(--ed-warn)" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"></line>
        <line x1="0" x2="1000" y1="150" y2="150" stroke="var(--ed-line)"></line>
      </svg>`}let d=t?.sessions.length??0,o=this._analysis?.power_settings.standby_w;return a`
      ${n}
      <div class="tune">
        <label class="field"><span class="lbl">${s("w.threshold")} (W)</span>
          <input class="input" type="number" min="0.5" step="0.5" .value=${String(e.threshold_w)} @change=${l=>this._set({threshold_w:Number(l.target.value)||3})} />
          ${o!==void 0?a`<span class="help">${s("w.standby",{w:_(o,1)})}</span>`:h}</label>
        <label class="field"><span class="lbl">${s("w.off_delay")}: ${_(e.off_delay_min,0)} min</span>
          <input type="range" min="1" max=${e.type==="charger"?240:60} step=${e.type==="charger"?5:1} .value=${String(e.off_delay_min)} @input=${l=>this._set({off_delay_min:Number(l.target.value)})} />
          <span class="help">${s(e.type==="charger"?"w.off_delay_help_charger":"w.off_delay_help")}</span></label>
        <label class="field"><span class="lbl">${s("w.min_duration")} (min)</span>
          <input class="input" type="number" min="0" step="1" .value=${String(e.min_duration_min)} @change=${l=>this._set({min_duration_min:Number(l.target.value)||0})} />
          <span class="help">${s("w.min_duration_help")}</span></label>
      </div>
      ${t?a`<div class="alert ${d>0?"ok":"warn"}"><ha-icon icon=${d>0?"mdi:check-circle":"mdi:alert"}></ha-icon>
            <div class="grow"><b style="font-weight:500">${d===0?s("w.found_none",{d:i}):d===1?s("w.found_one",{d:i}):s("w.found",{n:d,d:i})}</b>
              <div>${d===0?s("w.found_none_hint"):d>3*i?s("w.found_many_hint"):""}</div>
              ${d>0?a`<div class="sess">${t.sessions.slice(-12).reverse().map(l=>a`<span>${ge(l.start)} – ${H(l.end)} · ${l.minutes} min${l.kwh!==null?` \xB7 ${_(l.kwh,2)} kWh`:""}</span>`)}</div>`:h}
            </div></div>`:h}
      ${this._isEdit?a`<label class="row" style="align-items:flex-start"><input type="checkbox" .checked=${this._recalc} @change=${l=>this._recalc=l.target.checked} />
            <div><b style="font-weight:500">${s("w.recalc_edit")}</b><div class="help">${s("w.recalc_edit_help")}</div></div></label>`:a`<p class="muted small">${s("w.recalc_note")}</p>`}`}};$e.properties={ctx:{attribute:!1},candidate:{attribute:!1},existing:{attribute:!1},_step:{state:!0},_dev:{state:!0},_found:{state:!0},_q:{state:!0},_analysis:{state:!0},_analyzing:{state:!0},_preview:{state:!0},_saving:{state:!0},_recalc:{state:!0},_error:{state:!0}},$e.styles=[z,Pt,j`
      .radios { display: grid; gap: 8px; }
      .states { display: flex; flex-wrap: wrap; gap: 8px; }
      svg { width: 100%; height: 160px; display: block; }
      .tune { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .sess { font-size: 13px; display: grid; gap: 2px; max-height: 160px; overflow: auto; }
    `];var ke=class extends k{constructor(){super(),this._analysis=null,this._steps=null,this._look={}}_setLook(e){this._look={...this._look,...e},window.clearTimeout(this._saveTimer),this._saveTimer=window.setTimeout(()=>S.saveDevice(this.ctx.hass,{...this.device,...this._look},!1).catch(()=>{}),400)}connectedCallback(){super.connectedCallback();let e=this.device;S.analyze(this.ctx.hass,{energy_entity:e.energy_entity,energy_is_power:e.energy_is_power,power_entity:e.energy_is_power?null:e.power_entity,session_entity:e.session_source==="entity"?e.session_entity:null}).then(t=>this._analysis=t).catch(()=>{})}render(){let e={...this.device,...this._look},t=this.ctx.config.numbers[e.id],i=this.ctx.config.is_admin,n=this.ctx.config.devices.findIndex(g=>g.id===e.id),d={...N(this.ctx,e.id),color:te(e.color??Math.max(n,0),this.ctx.dark)},o=this._analysis,l=o?[...o.checks,...e.session_source==="entity"&&o.session_check&&e.type!=="continuous"?[o.session_check]:[],Ot]:[],c=s("v.steps_cols").split("|");return a`<ed-dialog .heading=${e.name} .subheading=${s(`type.${e.type}`)} @closed=${()=>y(this,"closed")}>
      <div class="kv">
        <span>${s("v.row_energy")}</span><span class="mono">${e.energy_entity}${e.energy_is_power?` (${s("chip.power")})`:""}</span>
        ${e.power_entity&&!e.energy_is_power?a`<span>${s("v.row_power")}</span><span class="mono">${e.power_entity}</span>`:h}
        <span>${s("v.row_sessions")}</span><span>${tt(this.ctx,e)}</span>
        <span>${s("v.row_solar")}</span><span>${s("v.solar_rule",{entity:M(this.ctx.config.settings.import_entity).join(" + ")})}</span>
        <span>${s("c.today")}</span><span>${v(t?.today.cost)} · ${_(t?.today.kwh,2)} kWh</span>
        <span>${s("c.this_month")}</span><span>${v(t?.month.cost)} · ${_(t?.month.kwh,2)} kWh · ${t&&t.month.kwh>0?Math.round(t.month.zon/t.month.kwh*100):0}% ${s("s.solar").toLowerCase()}</span>
      </div>
      <div><h3>${s("v.check")}</h3>${o?l.map(Nt):a`<p class="muted">${s("w.checking")}</p>`}</div>
      ${i?a`<details><summary>${s("w.look")}</summary>${Dt(e,Math.max(n,0),this.ctx.dark,g=>this._setLook(g))}</details>`:h}
      <details @toggle=${g=>{g.target.open&&!this._steps&&S.steps(this.ctx.hass,e.id).then(m=>this._steps=m.steps)}}>
        <summary>${s("v.steps")}</summary>
        ${this._steps===null?a`<p class="muted">${s("c.loading")}</p>`:this._steps.length===0?a`<p class="muted">${s("v.steps_none")}</p>`:a`<div class="scroll"><table class="mono">
          <tr>${c.map(g=>a`<th>${g}</th>`)}</tr>
          ${this._steps.map(g=>a`<tr title=${g.notes.join(", ")}><td>${H(g.t0)}</td><td>${H(g.t1)}</td><td>${_(g.kwh,3)}</td><td>${g.import===null?"\u2014":_(g.import,3)}</td><td>${_(g.net,3)}</td><td>${_(g.zon,3)}</td><td>${_(g.price,4)}</td><td>${_(g.net_cost,4)}</td></tr>`)}
        </table></div>`}
      </details>
      ${i?a`<button slot="start" class="btn danger-text" @click=${()=>y(this,"delete-device",e)}>${s("c.delete")}</button>
            <button slot="footer" class="btn secondary" title=${s("v.recalc_text")} @click=${()=>y(this,"recalc-device",e)}>${s("v.recalc")}</button>
            <button slot="footer" class="btn secondary" @click=${()=>y(this,"edit-device",e)}>${s("c.edit")}</button>`:h}
      <button slot="footer" class="btn" style="background:${d.color}" @click=${()=>y(this,"closed")}>${s("c.close")}</button>
    </ed-dialog>`}};ke.properties={ctx:{attribute:!1},device:{attribute:!1},_analysis:{state:!0},_steps:{state:!0},_look:{state:!0}},ke.styles=[z,Pt,j`table { width: 100%; border-collapse: collapse; } td, th { text-align: right; padding: 3px 6px; border-bottom: 1px solid var(--ed-line); white-space: nowrap; } td:first-child, th:first-child, td:nth-child(2), th:nth-child(2) { text-align: left; } .scroll { overflow: auto; max-height: 260px; }`];var Se=class extends k{constructor(){super();this._start="";this._saving=!1,this._valid=!1,this._error=""}connectedCallback(){super.connectedCallback(),this._s=Wt(this.ctx.config.settings),this._start=JSON.stringify(fe(this._s))}async _save(){this._saving=!0,this._error="";try{let t=fe(this._s),i=JSON.stringify(t)!==this._start;await S.saveSettings(this.ctx.hass,t,i),y(this,"saved",s(i?"t.saved_recalc":"t.saved"))}catch(t){this._error=String(t.message??t),this._saving=!1}}_import(){let t=document.createElement("input");t.type="file",t.accept="application/json,.json",t.onchange=async()=>{let i=t.files?.[0];if(i)try{let n=JSON.parse(await i.text());if(!n||!Array.isArray(n.devices))throw new Error(s("set.invalid_file"));y(this,"import-config",n)}catch(n){this._error=String(n.message??n)}},t.click()}render(){let t=this.ctx.config.is_admin;return a`<div class="page">
      ${t?h:a`<div class="alert info"><ha-icon icon="mdi:information"></ha-icon>${s("c.admin_only")}</div>`}
      ${this._error?a`<div class="alert bad" role="alert"><ha-icon icon="mdi:alert-circle"></ha-icon>${s("c.error",{msg:this._error})}</div>`:h}
      <ed-settings-form cards .hass=${this.ctx.hass} .config=${this.ctx.config} .value=${this._s} section="all"
        @change=${i=>{this._s=i.detail.value,this._valid=i.detail.valid}}></ed-settings-form>
      ${t?a`<section class="card">
            <h2>${s("set.test")}</h2>
            <p class="muted">${s("set.test_text")}</p>
            <div class="tool"><ha-icon icon="mdi:calculator-variant-outline"></ha-icon><div class="grow"><b>${s("set.recalc_all")}</b><div class="help">${s("set.recalc_all_text")}</div></div>
              <button class="btn secondary" @click=${()=>y(this,"recalc-all")}>${s("v.recalc")}</button></div>
            <div class="tool"><ha-icon icon="mdi:file-export-outline"></ha-icon><div class="grow"><b>${s("set.export_btn")} / ${s("set.import_btn").toLowerCase()}</b><div class="help">${s("set.backup_text")}</div></div>
              <div class="row wrap" style="justify-content:flex-end"><button class="btn secondary" @click=${()=>y(this,"export-config")}>${s("set.export_btn")}</button><button class="btn secondary" @click=${this._import}>${s("set.import_btn")}</button></div></div>
            <div class="tool"><ha-icon icon="mdi:eraser"></ha-icon><div class="grow"><b>${s("set.clear")}</b><div class="help">${s("set.clear_text")}</div></div>
              <button class="btn danger-text" @click=${()=>y(this,"reset","data")}>${s("set.clear")}</button></div>
            <div class="tool"><ha-icon icon="mdi:backup-restore"></ha-icon><div class="grow"><b>${s("set.reset")}</b><div class="help">${s("set.reset_text")}</div></div>
              <button class="btn danger-text" @click=${()=>y(this,"reset","all")}>${s("set.reset")}</button></div>
          </section>`:h}
      <p class="muted small" style="text-align:center">${s("set.version",{v:this.ctx.config.version})}</p>
    </div>
    ${t?a`<div class="bar"><div>
          <button class="btn secondary" @click=${()=>y(this,"closed")}>${s("c.cancel")}</button>
          <button class="btn" ?disabled=${!this._valid||this._saving} @click=${this._save}>${s("c.save")}</button>
        </div></div>`:h}`}};Se.properties={ctx:{attribute:!1},_s:{state:!0},_valid:{state:!0},_saving:{state:!0},_error:{state:!0}},Se.styles=[z,j`
      :host { display: block; }
      .page { max-width: 760px; margin: 0 auto; padding: 24px 16px 96px; display: grid; gap: 24px; }
      ed-settings-form { gap: 24px; }
      section.card { display: grid; gap: 4px; padding: 20px 24px 12px; }
      section.card h2 { margin: 0; }
      .tool { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-top: 1px solid var(--ed-line); flex-wrap: wrap; }
      .tool > ha-icon { color: var(--ed-text2); margin-top: 2px; }
      .tool .grow { min-width: 200px; }
      .tool .grow > b { font-weight: 500; }
      .tool .help { margin-top: 2px; }
      .bar {
        position: sticky; bottom: 0; z-index: 2; display: flex; gap: 8px; justify-content: flex-end;
        padding: 12px 16px; background: var(--ed-card); border-top: 1px solid var(--ed-line);
      }
      .bar > div { max-width: 760px; width: 100%; margin: 0 auto; display: flex; gap: 8px; justify-content: flex-end; }
      @media (max-width: 600px) { .page { padding: 16px 16px 96px; gap: 16px; } section.card { padding: 16px 16px 8px; } }
    `];R("ed-add-device",$e);R("ed-device-dialog",ke);R("ed-settings-page",Se);var ns=20,rs=1200,st=["ob.scan.prefs","ob.scan.meters","ob.scan.history"],as=900;function os(r){if(r.length<2)return h;let e=300,t=48,i=Math.max(...r,1),n=r.map((d,o)=>`${(o/(r.length-1)*e).toFixed(1)},${(t-2-d/i*(t-6)).toFixed(1)}`);return a`<svg class="spark" viewBox="0 0 ${e} ${t}" preserveAspectRatio="none" role="img" aria-label=${s("ob.chart",{w:Math.round(i)})}>
    ${X`<path d="M0,${t} L${n.join(" L")} L${e},${t} Z" fill="var(--ed-pri)" fill-opacity="0.12"></path>
    <path d="M${n.join(" L")}" fill="none" stroke="var(--ed-pri)" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>`}
  </svg>`}var Ee=class extends k{constructor(){super();this._after="scan";this._hadMeters=!1;this._leaving=!1;this._stage="start",this._scanStep=0,this._items=[],this._days=7,this._sel=new Set,this._open=null,this._added=[],this._calcSince=0,this._now=0,this._error="",this._s=null,this._valid=!1,this._storing=!1}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._timer)}get _taken(){return new Set(this.ctx.config.devices.map(t=>t.energy_entity))}get _setupSteps(){return this._s&&ve(this._s)?["price","meters","solar"]:["price","meters"]}get _wizardSteps(){return this._after==="scan"?[...this._setupSteps,"devices","calc"]:this._setupSteps}get _wizardStep(){let t=this._stage;return t==="start"?null:t==="scan"||t==="list"||t==="saving"?"devices":t}_count(){let t=this._wizardStep,i=this._wizardSteps;return t?a`<div class="count">${s("ob.step",{n:i.indexOf(t)+1,total:i.length})}</div>`:h}_bar(){let t=this._wizardStep;if(!t)return h;let i=this._wizardSteps,n=i.indexOf(t),d=t==="calc"?this._doneIds().size/Math.max(this._added.length,1):1,o=Math.round((n+d)/i.length*100);return a`<div class="bar" role="progressbar" aria-label=${s("ob.step",{n:n+1,total:i.length})}
      aria-valuemin="0" aria-valuemax="100" aria-valuenow=${o}><i style="width:${o}%"></i></div>`}_begin(t){this._after=t;let i=this.ctx.config.settings;this._s={...i,contract:null,solar_mode:null,export_price_mode:null,price_markup:null,price_low:null},this._hadMeters=M(this._s.import_entity).length>0,this._error="",this._stage="price"}_advanced(){this.ctx.config.settings.contract?y(this,"advanced"):this._begin("advanced")}_move(t){let i=this._setupSteps,n=i.indexOf(this._stage)+t;n<0?this._stage="start":n>=i.length?this._storeSettings():this._stage=i[n]}async _storeSettings(){this._storing=!0,this._error="";try{await S.saveSettings(this.ctx.hass,fe(this._s),!0),this._storing=!1,this._after==="scan"?await this._scan():(this._stage="start",y(this,"advanced"))}catch(t){this._storing=!1,this._error=String(t.message??t)}}_renderSetup(t){let i=this._setupSteps,n=i.indexOf(t)===i.length-1,d=t==="meters"&&!this._hadMeters?s("ob.meters_none"):s(`ob.${t}_text`);return a`<div class="card stack">
        <div>
          ${this._count()}
          <h2>${s(`ob.${t}`)}</h2>
          <p class="muted">${d}</p>
        </div>
        <ed-settings-form .hass=${this.ctx.hass} .config=${this.ctx.config} .value=${this._s} section=${t}
          @change=${o=>{this._s=o.detail.value,this._valid=o.detail.valid}}></ed-settings-form>
      </div>
      <div class="nav">
        <button class="btn text" @click=${()=>this._move(-1)}>${s("c.back")}</button>
        <button class="btn" ?disabled=${!this._valid||this._storing} @click=${()=>this._move(1)}>
          ${this._storing?s("ob.storing"):n?s(this._after==="scan"?"ob.save_scan":"c.save"):s("c.next")}</button>
      </div>`}async _scan(){y(this,"started"),this._stage="scan",this._scanStep=0,this._error="",window.clearInterval(this._timer),this._timer=window.setInterval(()=>{this._scanStep<st.length-1&&(this._scanStep+=1)},as);try{let t=await S.suggest(this.ctx.hass);this._items=t.items,this._days=t.days,this._sel=new Set(t.items.filter(i=>i.checked).map(i=>i.device.energy_entity)),this._open=null,window.clearInterval(this._timer),this._scanStep=st.length,await new Promise(i=>window.setTimeout(i,400)),this._stage="list"}catch(t){window.clearInterval(this._timer),this._error=String(t.message??t),this._stage="start"}}_toggle(t){let i=new Set(this._sel);i.has(t)?i.delete(t):i.add(t),this._sel=i}async _save(){let t=this._taken,i=this._items.filter(n=>this._sel.has(n.device.energy_entity)&&!t.has(n.device.energy_entity)).map(n=>n.device);this._stage="saving",this._error="";try{let n=await S.saveDevices(this.ctx.hass,i);this._added=n.devices.map(d=>({id:d.id,name:d.name})),this._calcSince=this._now=Date.now(),this._stage="calc",window.clearInterval(this._timer),this._timer=window.setInterval(()=>this._now=Date.now(),1e3)}catch(n){this._error=String(n.message??n),this._stage="list"}}_doneIds(){let t=this.ctx.config,i=new Set(t.devices.map(n=>n.id));return new Set(this._added.filter(n=>i.has(n.id)&&!(n.id in t.status.busy)).map(n=>n.id))}updated(){if(this._stage!=="calc"||this._leaving)return;!(Object.keys(this.ctx.config.status.busy).length>0)&&this._doneIds().size===this._added.length&&(this._leaving=!0,window.setTimeout(()=>this._finish(),rs))}_finish(){window.clearInterval(this._timer),y(this,"finished")}render(){let t=this._error?a`<div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${s("c.error",{msg:this._error})}</div>`:h,i=this._stage==="start"?this._renderStart():this._stage==="price"||this._stage==="meters"||this._stage==="solar"?this._renderSetup(this._stage):this._stage==="scan"?this._renderScan():this._stage==="calc"?this._renderCalc():this._renderList();return a`${this._bar()}<div class="wrap stack">${t}${i}</div>`}_renderStart(){let t=this.ctx.config.is_admin;return a`<div class="card hero">
        <ha-icon icon="mdi:cash-clock"></ha-icon>
        <h2>${s("ob.title")}</h2>
        <p class="muted">${s("ob.text")}</p>
        ${t?a`<div class="actions">
              <button class="btn" @click=${()=>this._begin("scan")}><ha-icon icon="mdi:auto-fix"></ha-icon>${s("ob.start")}</button>
              <button class="btn text" @click=${this._advanced}>${s("ob.advanced")}</button>
            </div>`:a`<p class="muted small">${s("c.admin_only")}</p>`}
      </div>`}_renderScan(){return a`<div class="card stack" aria-live="polite">
      <div>${this._count()}<h2>${s("ob.scanning")}</h2></div>
      <div class="steps">${st.map((t,i)=>{let n=i<this._scanStep,d=i===this._scanStep;return a`<div class="step ${n||d?"":"wait"}">
          ${n?a`<ha-icon icon="mdi:check-circle"></ha-icon>`:d?a`<span class="spin" aria-hidden="true"></span>`:a`<ha-icon icon="mdi:circle-outline"></ha-icon>`}
          <span>${s(t)}</span></div>`})}</div>
    </div>`}_line(t){let i=t.summary,n=i.days;if(t.reason==="no_history")return s("ob.line.no_history");if(t.device.type==="continuous")return i.avg_w!==null?s("ob.line.continuous",{w:i.avg_w,kwh:_(i.kwh_day,1)}):s("type.continuous");let d=i.sessions??0;if(d===0)return s("ob.line.none",{d:n});let o=t.device.type==="charger"?"charges":"sessions",l=s(d===1?`ob.line.${o}_one`:`ob.line.${o}`,{n:d,d:n});return i.kwh_avg!==null?`${l}${s("ob.line.avg",{kwh:_(i.kwh_avg,1)})}`:l}_row(t,i){let n=t.device.energy_entity,d=this._open===n,o=this._taken.has(n),l=i?t.reason==="no_history"||t.reason==="no_sessions"?s(`ob.reason.${t.reason}`,{d:t.summary.days}):"":this._line(t);return a`<div class="item">
      ${o?a`<ha-icon icon="mdi:check-circle" style="color:var(--ed-ok);--mdc-icon-size:24px;flex:none" title=${s("ob.added")}></ha-icon>`:a`<button class="check" role="checkbox" aria-checked=${this._sel.has(n)} aria-label=${t.device.name} @click=${()=>this._toggle(n)}>${this._sel.has(n)?a`<ha-icon icon="mdi:check"></ha-icon>`:h}</button>`}
      <span class="dev"><ha-icon icon=${se(t.device)}></ha-icon></span>
      <div class="grow">
        <b>${t.device.name}</b>
        <div class="muted small">${o?s("ob.added"):i?`${s(`type.${t.device.type}`)} \xB7 ${this._line(t)}`:s(`ob.reason.${t.reason}`,{d:t.summary.days})}</div>
      </div>
      <button class="icon" aria-expanded=${d} aria-label=${s("ob.details",{name:t.device.name})} @click=${()=>this._open=d?null:n}>
        <ha-icon icon=${d?"mdi:chevron-up":"mdi:chevron-down"}></ha-icon></button>
      ${d?a`<div class="more">
            ${os(t.summary.spark)}
            ${l?a`<div class="small">${l}</div>`:h}
            <div class="muted small">${t.in_energy_prefs?s("src.in_prefs"):s("src.not_in_prefs")}${t.area?` \xB7 ${t.area}`:""} · <span class="mono">${n}</span></div>
            ${o?h:a`<div><button class="btn text" style="padding-left:0" @click=${()=>y(this,"adjust",t.candidate)}><ha-icon icon="mdi:pencil"></ha-icon>${s("ob.adjust")}</button></div>`}
          </div>`:h}
    </div>`}_renderList(){let t=this._items;if(!t.length)return a`<div class="card hero">
        ${this._count()}
        <ha-icon icon="mdi:magnify-close"></ha-icon>
        <h2>${s("ob.none")}</h2>
        <p class="muted">${s("ob.none_text")}</p>
        <div class="actions">
          <button class="btn" @click=${()=>y(this,"advanced")}>${s("ob.pick_self")}</button>
          <button class="btn text" @click=${this._scan}>${s("ob.again")}</button>
        </div>
      </div>`;let i=t.filter(c=>c.checked),n=t.filter(c=>!c.checked),d=this._taken,o=t.filter(c=>this._sel.has(c.device.energy_entity)&&!d.has(c.device.energy_entity)).length,l=this._stage==="saving";return a`
      <div>
        ${this._count()}
        <h2>${i.length?s(i.length===1?"ob.found_one":"ob.found",{n:i.length}):s("ob.found_unsure",{n:t.length})}</h2>
        <p class="muted">${i.length?s("ob.found_text"):s("ob.found_unsure_text")}</p>
      </div>
      ${i.length?a`<div class="card list">${i.map(c=>this._row(c,!0))}</div>`:h}
      ${n.length?a`${i.length?a`<div class="group">${s("ob.also")}</div>`:h}
            <div class="card list">${n.map(c=>this._row(c,!1))}</div>`:h}
      <div class="foot">
        <button class="btn" ?disabled=${o===0||l} @click=${this._save}>
          ${l?s("ob.saving"):o===1?s("ob.add_one"):s("ob.add",{n:o})}</button>
        <button class="btn text" @click=${()=>y(this,"advanced")}>${s("ob.advanced")}</button>
      </div>`}_renderCalc(){let t=this._doneIds(),i=this.ctx.config.status.busy,n=this._added.length,d=Math.round(t.size/Math.max(n,1)*100),o=(this._now-this._calcSince)/1e3>ns;return a`<div class="card stack" aria-live="polite">
        <div>
          ${this._count()}
          <h2>${n===1?s("ob.done_one"):s("ob.done",{n})}</h2>
          <p class="muted">${s("ob.calc_text")}</p>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${d}><i style="width:${d}%"></i></div>
        <div class="steps">${this._added.map(l=>{let c=t.has(l.id),g=i[l.id]==="recalculating";return a`<div class="step ${c||g?"":"wait"}">
            ${c?a`<ha-icon icon="mdi:check-circle"></ha-icon>`:g?a`<span class="spin" aria-hidden="true"></span>`:a`<ha-icon icon="mdi:circle-outline"></ha-icon>`}
            <span>${l.name}</span></div>`})}</div>
      </div>
      <div class="card stack" style="gap:12px">
        <div class="note"><ha-icon icon="mdi:weather-night"></ha-icon><span>${s("ob.done_baseload")}</span></div>
        <div class="note"><ha-icon icon="mdi:tune-variant"></ha-icon><span>${s("ob.done_adjust")}</span></div>
      </div>
      ${o?a`<div class="foot"><button class="btn text" @click=${()=>this._finish()}>${s("ob.skip_wait")}</button></div>`:h}`}};Ee.properties={ctx:{attribute:!1},_stage:{state:!0},_scanStep:{state:!0},_items:{state:!0},_days:{state:!0},_sel:{state:!0},_open:{state:!0},_added:{state:!0},_now:{state:!0},_error:{state:!0},_s:{state:!0},_valid:{state:!0},_storing:{state:!0}},Ee.styles=[z,j`
      :host { display: block; }
      .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
      .bar { position: sticky; top: 56px; z-index: 2; height: 4px; background: var(--ed-line); }
      .bar i { display: block; height: 100%; background: var(--ed-pri); transition: width 0.4s; }
      @media (prefers-reduced-motion: reduce) { .bar i, .progress i { transition: none; } }
      .stack { display: grid; gap: 16px; }
      .hero { text-align: center; display: grid; justify-items: center; gap: 8px; padding: 32px 16px; }
      .hero > ha-icon { --mdc-icon-size: 64px; color: var(--ed-pri); margin-bottom: 8px; }
      .progress { height: 4px; border-radius: 2px; background: var(--ed-line); overflow: hidden; }
      .progress i { display: block; height: 100%; background: var(--ed-pri); transition: width 0.4s; }
      .hero h2 { font-size: 24px; }
      .hero p { max-width: 42ch; }
      .hero .actions { display: grid; justify-items: center; gap: 4px; margin-top: 8px; }
      .steps { display: grid; gap: 14px; padding: 8px 0; }
      .step { display: flex; gap: 12px; align-items: center; }
      .step ha-icon { --mdc-icon-size: 22px; color: var(--ed-ok); flex: none; }
      .step.wait { color: var(--ed-text2); }
      .step.wait ha-icon { color: var(--ed-text2); }
      .spin { width: 20px; height: 20px; margin: 1px; border: 2px solid var(--ed-line); border-top-color: var(--ed-pri); border-radius: 50%; animation: spin 0.8s linear infinite; flex: none; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
      .list.card { padding: 0 16px; }
      .list > .item { flex-wrap: wrap; padding: 12px 0; }
      .item b { font-weight: 500; }
      .dev { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 12%, transparent); --mdc-icon-size: 22px; }
      .check { width: 24px; height: 24px; flex: none; border-radius: 6px; border: 2px solid var(--ed-text2); background: transparent; padding: 0; cursor: pointer; display: grid; place-items: center; color: var(--text-primary-color, #fff); --mdc-icon-size: 18px; }
      .check[aria-checked="true"] { background: var(--ed-pri); border-color: var(--ed-pri); }
      .check:focus-visible, button.icon:focus-visible, button.btn:focus-visible { outline: 2px solid var(--ed-pri); outline-offset: 2px; }
      .more { flex-basis: 100%; display: grid; gap: 8px; padding: 4px 0 4px 88px; }
      .spark { width: 100%; height: 48px; display: block; }
      .group { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ed-text2); margin: 8px 0 -8px; }
      .foot { display: grid; gap: 4px; justify-items: center; }
      .foot .btn:not(.text) { width: 100%; justify-content: center; }
      .note { display: flex; gap: 10px; align-items: flex-start; }
      .note ha-icon { --mdc-icon-size: 20px; color: var(--ed-pri); flex: none; }
      .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .count { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ed-text2); }
      @media (max-width: 480px) { .more { padding-left: 0; } }
    `];R("ed-onboarding",Ee);var je=class extends k{constructor(){super();this._started=!1;this.narrow=!1,this._config=null,this._tab="dashboard",this._settings=!1,this._dialog=null,this._confirm=null,this._toast="",this._tick=0,this._error="",this._onboarding=!1;try{let t=window.localStorage.getItem("energydash.tab");t&&["dashboard","sessions","baseload","devices"].includes(t)&&(this._tab=t)}catch{}}updated(){if(this.hass&&!this._started){this._started=!0;let t=this.hass.locale?.language??this.hass.language??"nl";$t(t),this._load(),this._unsub=this.hass.connection.subscribeMessage(()=>this._load(),{type:"energydash/subscribe"})}}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.then(t=>t()).catch(()=>{}),this._unsub=void 0,this._started=!1}async _load(){try{let t=await S.config(this.hass);jt(this.hass.locale?.language??this.hass.language??"nl",t.currency),this._config=t,this._tick+=1,this._error=""}catch(t){this._error=String(t.message??t)}}_setTab(t){this._tab=t;try{window.localStorage.setItem("energydash.tab",t)}catch{}}_showToast(t){this._toast=t,window.clearTimeout(this._toastTimer),this._toastTimer=window.setTimeout(()=>this._toast="",4e3)}_done(t){this._dialog=null,this._showToast(t),this._load()}_openSettings(t){this._settings=t,window.scrollTo({top:0})}_ask(t){this._confirm=t}async _runConfirm(){let t=this._confirm;if(t){this._confirm=null;try{await t.run(),t.leave&&(this._settings=!1),this._done(t.toast)}catch(i){this._showToast(s("c.error",{msg:String(i.message??i)}))}}}get _ctx(){return{hass:this.hass,config:this._config,dark:!!this.hass.themes?.darkMode,narrow:this.narrow,tick:this._tick}}render(){let t=this._config,i=!!t&&this._settings,n=i?a`<div class="toolbar">
          <button class="icon" aria-label=${s("c.back")} title=${s("c.back")} @click=${()=>this._openSettings(!1)}><ha-icon icon="mdi:arrow-left"></ha-icon></button>
          <div class="title">${s("set.title")}</div>
        </div>`:a`<div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="title">Energydash</div>
          ${t?a`<button class="icon" aria-label=${s("c.settings")} title=${s("c.settings")} @click=${()=>this._openSettings(!0)}><ha-icon icon="mdi:cog"></ha-icon></button>`:h}
        </div>`;if(this._error&&!t)return a`${n}<div class="banner"><div class="alert bad"><ha-icon icon="mdi:alert-circle"></ha-icon>${s("c.error",{msg:this._error})}</div></div>`;if(!t)return a`${n}<div class="banner"><p class="muted">${s("c.loading")}</p></div>`;let d=Object.keys(t.status.busy).length>0,o=[["dashboard",s("tab.dashboard"),"mdi:view-dashboard-outline"],["sessions",s("tab.sessions"),"mdi:format-list-bulleted"],["baseload",s("tab.baseload"),"mdi:weather-night"],["devices",s("tab.devices"),"mdi:power-plug-outline"]],l=this._ctx;return i?a`${n}
        ${d?a`<div class="banner"><div class="alert info"><ha-icon icon="mdi:progress-clock"></ha-icon>${s("busy")}</div></div>`:h}
        ${this._renderSettings(l)}
        ${this._renderOverlays()}`:a`${n}
      ${t.devices.length>0&&!t.settings.contract?a`<div class="banner"><div class="alert warn"><ha-icon icon="mdi:alert"></ha-icon><div class="grow">${s("p.need_price")}</div>
            ${t.is_admin?a`<button class="btn secondary" @click=${()=>this._openSettings(!0)}>${s("p.need_price_btn")}</button>`:h}</div></div>`:h}
      ${d&&!this._onboarding?a`<div class="banner"><div class="alert info"><ha-icon icon="mdi:progress-clock"></ha-icon>${s("busy")}</div></div>`:h}
      ${t.devices.length===0||this._onboarding?this._renderEmpty():a`<nav role="tablist">${o.map(([c,g,m])=>a`<button role="tab" aria-selected=${this._tab===c} @click=${()=>this._setTab(c)}><ha-icon icon=${m}></ha-icon>${g}</button>`)}</nav>
            <main
              @open-session=${c=>this._dialog={kind:"session",session:c.detail}}
              @open-device=${c=>this._dialog={kind:"device",device:c.detail}}
              @add-device=${()=>this._dialog={kind:"add"}}>
              ${this._tab==="dashboard"?a`<ed-dashboard .ctx=${l}></ed-dashboard>`:h}
              ${this._tab==="sessions"?a`<ed-sessions .ctx=${l}></ed-sessions>`:h}
              ${this._tab==="baseload"?a`<ed-baseload .ctx=${l}></ed-baseload>`:h}
              ${this._tab==="devices"?a`<ed-devices .ctx=${l}></ed-devices>`:h}
            </main>`}
      ${this._renderDialog(l)}
      ${this._renderOverlays()}`}_renderOverlays(){return a`${this._confirm?a`<ed-confirm .heading=${this._confirm.heading} .text=${this._confirm.text} .action=${this._confirm.action} .danger=${this._confirm.danger}
            @cancel=${()=>this._confirm=null} @confirm=${this._runConfirm}></ed-confirm>`:h}
      ${this._toast?a`<div class="toast" role="status">${this._toast}<button class="icon" style="color:inherit;padding:2px" aria-label=${s("c.close")} @click=${()=>this._toast=""}><ha-icon icon="mdi:close"></ha-icon></button></div>`:h}`}_renderEmpty(){return a`<ed-onboarding .ctx=${this._ctx}
      @started=${()=>this._onboarding=!0}
      @finished=${()=>{this._onboarding=!1,this._setTab("dashboard")}}
      @advanced=${()=>this._dialog={kind:"add"}}
      @adjust=${t=>this._dialog={kind:"add",candidate:t.detail}}></ed-onboarding>`}_renderDialog(t){let i=this._dialog;if(!i)return h;let n=()=>this._dialog=null,d=o=>this._done(o.detail);if(i.kind==="add")return a`<ed-add-device .ctx=${t} .candidate=${i.candidate??null} .existing=${i.device??null} @closed=${n} @saved=${d}></ed-add-device>`;if(i.kind==="session")return a`<ed-dialog wide .heading=${s("s.session")} @closed=${n}>${Rt(t,i.session,t.config.settings.solar_mode??"export")}
        <button slot="footer" class="btn" @click=${n}>${s("c.close")}</button></ed-dialog>`;if(i.kind==="device"){let o=i.device;return a`<ed-device-dialog .ctx=${t} .device=${o} @closed=${n}
        @edit-device=${()=>this._dialog={kind:"add",device:o}}
        @recalc-device=${()=>this._ask({heading:`${s("v.recalc")}?`,text:s("v.recalc_text"),action:s("v.recalc"),danger:!1,run:()=>S.recalculate(this.hass,o.id),toast:s("t.recalc")})}
        @delete-device=${()=>this._ask({heading:s("v.delete_q"),text:s("v.delete_text",{name:o.name}),action:s("c.delete"),danger:!0,run:()=>S.deleteDevice(this.hass,o.id),toast:s("t.deleted")})}
      ></ed-device-dialog>`}return h}_renderSettings(t){return a`<ed-settings-page .ctx=${t} @closed=${()=>this._openSettings(!1)}
      @saved=${i=>{this._openSettings(!1),this._done(i.detail)}}
      @recalc-all=${()=>this._ask({heading:s("set.recalc_q"),text:s("set.recalc_q_text"),action:s("v.recalc"),danger:!1,run:()=>S.recalculate(this.hass),toast:s("t.recalc")})}
      @export-config=${async()=>{let i=await S.exportConfig(this.hass);At(`energydash-${new Date().toISOString().slice(0,10)}.json`,i),this._showToast(s("t.exported"))}}
      @import-config=${i=>{let n=i.detail;this._ask({heading:s("set.import_q"),text:s("set.import_q_text",{n:n.devices.length}),action:s("set.import_btn"),danger:!0,run:()=>S.importConfig(this.hass,n,!0),toast:s("t.imported",{n:n.devices.length}),leave:!0})}}
      @reset=${i=>{let n=i.detail==="all";this._ask({heading:s(n?"set.reset_q":"set.clear_q"),text:s(n?"set.reset_q_text":"set.clear_q_text"),action:s(n?"set.reset":"set.clear"),danger:!0,run:()=>S.reset(this.hass,n?"all":"data"),toast:s("t.reset"),leave:!0})}}
    ></ed-settings-page>`}};je.properties={hass:{attribute:!1},narrow:{type:Boolean},route:{attribute:!1},panel:{attribute:!1},_config:{state:!0},_tab:{state:!0},_settings:{state:!0},_dialog:{state:!0},_confirm:{state:!0},_toast:{state:!0},_tick:{state:!0},_error:{state:!0},_onboarding:{state:!0}},je.styles=[z,j`
      :host { display: block; min-height: 100vh; background: var(--primary-background-color, #fafafa); }
      .toolbar {
        display: flex; align-items: center; gap: 4px; height: 56px; padding: 0 8px 0 4px;
        background: var(--app-header-background-color, var(--primary-background-color)); color: var(--app-header-text-color, var(--ed-text));
        border-bottom: 1px solid var(--app-header-border-bottom, var(--ed-line)); position: sticky; top: 0; z-index: 3;
      }
      .toolbar .title { font-size: 20px; margin-left: 12px; flex: 1; }
      nav { display: flex; gap: 4px; padding: 8px 12px; overflow-x: auto; border-bottom: 1px solid var(--ed-line); background: var(--primary-background-color); position: sticky; top: 56px; z-index: 2; }
      nav button { font: inherit; font-size: 14px; font-weight: 500; border: none; background: none; color: var(--ed-text2); padding: 8px 16px; border-radius: 999px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
      nav button[aria-selected="true"] { color: var(--ed-pri); background: color-mix(in srgb, var(--ed-pri) 12%, transparent); }
      :host([narrow]) nav { position: fixed; bottom: 0; left: 0; right: 0; top: auto; justify-content: space-around; border-top: 1px solid var(--ed-line); border-bottom: none; padding: 6px 4px; }
      :host([narrow]) nav button { flex-direction: column; gap: 2px; font-size: 11px; padding: 6px 8px; }
      :host([narrow]) main { padding-bottom: 72px; }
      .banner { max-width: 1200px; margin: 12px auto 0; padding: 0 16px; }
      .toast {
        position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 20; background: var(--ed-text); color: var(--ed-card);
        padding: 12px 20px; border-radius: 8px; font-size: 14px; display: flex; gap: 12px; align-items: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      }
      :host([narrow]) .toast { bottom: 88px; }
    `];R("energydash-panel",je);
