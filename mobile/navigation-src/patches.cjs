'use strict';

// Apply after the existing navigation repair. Retaining its Growth subtree is
// essential: this module adds a boundary outside it, without changing its props.
const growthSection = '(0,ue.jsx)("section",{className:"view",id:"v-ops",hidden:!!C.page||C.tab!=="ops",children:(0,ue.jsx)(FansaiGrowthKeepAlive,{active:!C.page&&C.tab==="ops",children:!C.page&&C.tab==="ops"?(0,ue.jsx)(_0,{S:f,updateS:xe,openSub:Ne,go:G,openFilterSheet:Qe,openSheet:je,closeSheet:Se,toast:fe,roiKey:re,onRoiSeen:W}):null})})';
const customerSection = '(0,ue.jsx)("section",{className:"view",id:"v-cust",hidden:!!C.page||C.tab!=="cust",children:!C.page&&C.tab==="cust"?(0,ue.jsx)(oE,{S:f,updateS:xe,openFilterSheet:Qe,openSheet:je,closeSheet:Se,perms:t,pendingCusSheetId:de,clearPendingCusSheetId:()=>Oe(null)}):null})';
const decisionSection = '(0,ue.jsx)("section",{className:"view",id:"v-appr",hidden:!!C.page||C.tab!=="appr",children:!C.page&&C.tab==="appr"?(0,ue.jsx)(MB,{S:f,updateS:xe,can:y,openSheet:je,closeSheet:Se,toast:fe}):null})';
const workbenchSection = '(0,ue.jsx)("section",{className:"view",id:"v-more",hidden:!!C.page||C.tab!=="more",children:!C.page&&C.tab==="more"?(0,ue.jsx)(gk,{S:f,perms:t,updateS:xe,go:G,openPage:Xe,openSheet:je,closeSheet:Se,toast:fe}):null})';
function boundaryPatch(tab,before) {
  const start=before.indexOf('children:')+'children:'.length;
  const child=before.slice(start,-2);
  return {
    name:`Primary ${tab} section gets its own immediate Suspense fallback`,
    before,
    after:before.slice(0,start)+`(0,ue.jsx)(FansaiTabContent,{tab:"${tab}",children:${child}})})`,
  };
}
const appPatches = [
  ...[['ops',growthSection],['cust',customerSection],['appr',decisionSection],['more',workbenchSection]].map(([tab,section])=>boundaryPatch(tab,section)),
  {
    name:'Growth home pending uses the shared tab skeleton; secondary pages retain JW',
    before:'adjustPending:t.adjustPending}):(0,U.jsx)(JW,{})}function KB(',
    after:'adjustPending:t.adjustPending}):e.S.page===null?(0,U.jsx)(FansaiTabSkeleton,{tab:"ops"}):(0,U.jsx)(JW,{})}function KB(',
  },
  {
    name:'Customer board pending uses the shared tab skeleton',
    before:'A=()=>S.isLoading?(0,ie.jsx)(QM,{}):S.isError||!S.data?cA(S.error):',
    after:'A=()=>S.isLoading?(0,ie.jsx)(FansaiTabSkeleton,{tab:"cust"}):S.isError||!S.data?cA(S.error):',
  },
  {
    name:'Customer library pending uses the shared tab skeleton without unmounting search controls',
    before:'children:C.isLoading?(0,ie.jsx)(Ta,{}):C.isError?cA(C.error):',
    after:'children:C.isLoading?(0,ie.jsx)(FansaiTabSkeleton,{tab:"cust"}):C.isError?cA(C.error):',
  },
  {
    name:'Customer project pending uses the shared tab skeleton',
    before:'D=()=>{if(h.isLoading)return(0,ie.jsx)(lc,{});if(h.isError||!h.data)return cA(h.error);',
    after:'D=()=>{if(h.isLoading)return(0,ie.jsx)(FansaiTabSkeleton,{tab:"cust"});if(h.isError||!h.data)return cA(h.error);',
  },
  {
    name:'Decision pending uses the shared tab skeleton without unmounting search controls',
    before:'className:"stack decision-list",children:p.isPending?(0,Ke.jsx)(Ta,{rows:5}):p.isError?',
    after:'className:"stack decision-list",children:p.isPending?(0,Ke.jsx)(FansaiTabSkeleton,{tab:"appr"}):p.isError?',
  },
];
module.exports = {appPatches,innerPatches:[]};
