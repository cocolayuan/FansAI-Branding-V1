/* Primary titles only. Preserve the cloud SVG; add the separate period once. */
const FS_PRIMARY_TITLES = Object.freeze({ops:'Growth',cust:'Customer',appr:'Decisions',more:'Workbench'});

function FansaiPrimaryTitle({tab}) {
  const title=FS_PRIMARY_TITLES[tab] || '';
  const host=CXReact.useRef(null),text=CXReact.useRef(null);
  CXReact.useLayoutEffect(()=>{
    const node=host.current,label=text.current;
    if(!node || !label)return;
    const doc=node.ownerDocument,win=doc.defaultView;
    let disposed=false,scale=1;
    node.style.setProperty('--fh-title-scale','1');
    const fit=()=>{
      if(disposed)return;
      const available=node.clientWidth;
      if(!available)return;
      // Recover the natural 43px label width from the current common scale.
      // The 38px cloud/period composition and the 4px gap use the same scale.
      // The cloud itself always has its original 38×38 image box.
      const natural=label.getBoundingClientRect().width/scale+38+4;
      const next=Math.max(.01,Math.floor(Math.min(1,(available-1)/natural)*1000)/1000);
      if(Math.abs(next-scale)<.0005)return;
      scale=next;
      node.style.setProperty('--fh-title-scale',String(scale));
    };
    fit();
    const observer=win.ResizeObserver?new win.ResizeObserver(fit):null;
    observer?.observe(node);
    win.addEventListener('resize',fit);
    doc.fonts?.addEventListener?.('loadingdone',fit);
    doc.fonts?.ready?.then(()=>{if(!disposed)fit();});
    return()=>{
      disposed=true;observer?.disconnect();win.removeEventListener('resize',fit);
      doc.fonts?.removeEventListener?.('loadingdone',fit);
    };
  },[title]);
  return <span className="fh-primary-title" data-primary-tab={tab} ref={host}>
    <span className="fh-title-text" ref={text}>{title}</span>
    <span className="fh-logo-box" aria-hidden="true"><span className="fh-logo-scaler">
      <img className="fh-logo-image" src={FH_LOGO.src} width={FH_LOGO.width} height={FH_LOGO.height}
        alt="" data-figma-node={FH_LOGO.nodeId} draggable="false" decoding="async" />
      <i className="fh-title-dot" />
    </span></span>
  </span>;
}
