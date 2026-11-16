/* Primary-tab loading only. No timers, route mutations or artificial dwell time.
   Query-owned pending branches and each tab's Suspense boundary share one shape. */
const FS_TAB_LOADING_LABELS = Object.freeze({ops:'增长',cust:'客户',appr:'决策',more:'工作台'});
function FansaiTabSkeleton({tab}) {
  const name=FS_TAB_LOADING_LABELS[tab] || '数据';
  return <div className="fs-tab-skeleton" data-loading-tab={tab} role="status" aria-busy="true" aria-label={l('{name}加载中…',{name:l(name)})}>
    <div className="fs-tab-skeleton-shapes" aria-hidden="true">
      <div className="fs-tab-skeleton-bar"/>
      <div className="fs-tab-skeleton-hero"/>
      <div className="fs-tab-skeleton-summary"/>
      <div className="fs-tab-skeleton-grid">{Array.from({length:6},(_,index)=><div className="fs-tab-skeleton-tile" key={index}/>)}</div>
      <div className="fs-tab-skeleton-card"/>
      <div className="fs-tab-skeleton-card is-tall"/>
    </div>
  </div>;
}
function FansaiTabContent({tab,children}) {
  // A boundary belongs to one permanent #v-* section. Hidden/older work cannot
  // replace another tab's content. Ready children are returned without waiting.
  // Workbench's bundled catalog is synchronous and uses no manufactured delay.
  return <CXReact.Suspense fallback={<FansaiTabSkeleton tab={tab}/>}>{children}</CXReact.Suspense>;
}
