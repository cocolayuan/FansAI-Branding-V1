'use strict';

const appPatches = [
  {
    name:'Growth primary title uses the original cloud SVG and one separate period',
    before:"gxEl('h1',{},'Growth',gxEl('span',{className:'gx-heading-mark'},gxFigmaImage('heading',38,38),gxEl('i',{className:'gx-heading-dot'})))",
    after:"gxEl('h1',{className:'fh-title-host'},gxEl(FansaiPrimaryTitle,{tab:'ops'}))",
  },
  {
    name:'Primary shell titles share English branding; secondary titles retain Et',
    before:'(0,ue.jsx)("h1",{className:"ttl",id:"hT",children:Et})',
    after:'(0,ue.jsx)("h1",{className:"ttl",id:"hT",children:!C.page?(0,ue.jsx)(FansaiPrimaryTitle,{tab:C.tab}):Et})',
  },
  {
    name:'Primary shell headings omit the eyebrow; secondary context remains intact',
    before:'(0,ue.jsx)("div",{className:"eb",id:"hEb",children:Gt})',
    after:'C.page?(0,ue.jsx)("div",{className:"eb",id:"hEb",children:Gt}):null',
  },
];

module.exports = {appPatches,innerPatches:[]};
