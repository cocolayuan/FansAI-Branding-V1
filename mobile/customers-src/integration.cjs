'use strict';

/*
 * Shared-input repair authorized by the Customers → Growth navigation report.
 * The document-level pull-to-refresh listener used to claim touches anywhere in
 * .fansai-mobile-scope. The fixed bottom navigation lives outside contentRef
 * (.app), so a small downward drift on a tab could prevent its click. Only the
 * scrollable page content should own that refresh gesture.
 *
 * Exact patches keep the generated baseline reviewable and reversible. The
 * builder verifies that each source anchor occurs once before applying it.
 */
// A memo boundary keeps the last active Growth element and props while its
// existing section is hidden. Returning null from the parent used to dispose
// its WebGL context and rebuild all motion engines on every tab round trip.
// The existing IntersectionObservers pause those engines while hidden.
// A cold inactive mount still renders null; no Growth work starts until visited.
const growthKeepAlive = `const FansaiGrowthKeepAlive=ju.memo(function FansaiGrowthKeepAlive({children}){return children;},(_previous,next)=>!next.active);`;
const growthView = `(0,ue.jsx)("section",{className:"view",id:"v-ops",hidden:!!C.page||C.tab!=="ops",children:!C.page&&C.tab==="ops"?(0,ue.jsx)(_0,{S:f,updateS:xe,openSub:Ne,go:G,openFilterSheet:Qe,openSheet:je,closeSheet:Se,toast:fe,roiKey:re,onRoiSeen:W}):null})`;
const growthViewKept = `(0,ue.jsx)("section",{className:"view",id:"v-ops",hidden:!!C.page||C.tab!=="ops",children:(0,ue.jsx)(FansaiGrowthKeepAlive,{active:!C.page&&C.tab==="ops",children:!C.page&&C.tab==="ops"?(0,ue.jsx)(_0,{S:f,updateS:xe,openSub:Ne,go:G,openFilterSheet:Qe,openSheet:je,closeSheet:Se,toast:fe,roiKey:re,onRoiSeen:W}):null})})`;

const appPatches = [
  {
    name: 'Add a frozen inactive boundary for the existing Growth home',
    before: 'function Pj(',
    after: growthKeepAlive + '\nfunction Pj(',
  },
  {
    name: 'Retain the Growth home subtree between bottom-tab visits',
    before: growthView,
    after: growthViewKept,
  },
  {
    name: 'Limit pull-to-refresh to page content, excluding bottom navigation',
    before: `if(!(w instanceof Element)||w.closest("input, textarea, select, [contenteditable='true']"))return;`,
    after: `if(!(w instanceof Element)||!s?.contains(w)||w.closest("input, textarea, select, [contenteditable='true']"))return;`,
  },
];

module.exports = {appPatches, innerPatches: []};
