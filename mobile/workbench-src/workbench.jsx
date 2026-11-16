/* Workbench home only. Keep the existing catalog, permission filter, routes
   and subpage renderer as the source of truth. Hide unreleased destinations. */
const WB_ICON_KEYS = Object.freeze({
  '客户业务/数据看板':'business-dashboard',
  '客户业务/客户资料':'customers',
  '客户业务/项目管理':'projects',
  '客户业务/审批管理':'approvals',
  '客户业务/财务分析':'finance',
  '客户业务/创作者列表':'creators',
  '产品增长/数据看板':'growth-dashboard',
  '产品增长/内容资产':'content',
  '产品增长/素材库':'materials',
  '产品增长/生成任务':'generation',
  '产品增长/账号管理':'accounts',
  '产品增长/达人库':'influencers',
  '产品增长/博客管理':'blog',
  '产品增长/数据管理':'data',
  '内部项目/供应商':'suppliers',
  '内部项目/内部项目':'internal-projects',
  '知识分类/知识库':'knowledge',
});

function useWBEntrance(signature) {
  const root=CXReact.useRef(null);
  CXReact.useEffect(()=>{
    const node=root.current;if(!node)return;
    const doc=node.ownerDocument,win=doc.defaultView;
    const media=win.matchMedia('(prefers-reduced-motion: reduce)');
    let animations=[],observer;
    const stop=()=>{animations.forEach(animation=>animation.cancel());animations=[];};
    const reduce=()=>{if(media.matches)stop();};
    const visibility=()=>{if(doc.hidden)stop();};
    // Each visible group settles once. No continuous icon rotation or pulsing.
    if(!media.matches && !doc.hidden && win.IntersectionObserver){
      observer=new win.IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          observer.unobserve(entry.target);
          if(media.matches || doc.hidden)continue;
          entry.target.querySelectorAll('.wb-entry').forEach((tile,index)=>{
            if(!tile.animate)return;
            const animation=tile.animate(
              [{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
              {duration:380,delay:Math.min(index,7)*28,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}
            );
            animations.push(animation);
            animation.onfinish=()=>{animations=animations.filter(item=>item!==animation);};
          });
        }
      },{threshold:.12});
      node.querySelectorAll('.wb-group').forEach(group=>observer.observe(group));
    }
    media.addEventListener('change',reduce);doc.addEventListener('visibilitychange',visibility);
    return()=>{observer?.disconnect();stop();media.removeEventListener('change',reduce);doc.removeEventListener('visibilitychange',visibility);};
  },[signature]);
  return root;
}

function WBEntry({group,item,go,toast}) {
  const [label,icon,route]=item;
  const key=WB_ICON_KEYS[group+'/'+label],asset=key?WB_ICONS[key]:null;
  const unavailable=!route;
  const separate=group==='客户业务'||group==='产品增长';
  return <button type="button"
    className={'wb-entry '+(asset?'is-glass':'is-functional')+(separate?' is-separated':'')+(unavailable?' is-unavailable':'')}
    data-icon-key={key || undefined} data-figma-node={asset?.nodeId}
    onClick={()=>route?go(route):toast(l('「{name}」开发中',{name:l(label)}))}>
    {asset?<span className="wb-icon-stage" aria-hidden="true"><img className="wb-icon-image"
      src={asset.src} width={asset.width} height={asset.height} alt="" decoding="async" draggable="false" /></span>:
      <span className="wb-functional-icon" aria-hidden="true">{icon==='userStar'?CXReact.createElement(Nm,{strokeWidth:1.9}):
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={pu[icon]} /></svg>}</span>}
    <span className="wb-entry-label">{l(label)}</span>
    {unavailable && <span className="wb-entry-status">{Ha()==='en-US'?'Coming soon':'开发中'}</span>}
  </button>;
}

function FansaiWorkbench({go,perms,toast}) {
  // Apply the original permission policy first. Only the explicitly requested
  // internal-project preview remains visible without a released destination.
  const sections=sU(vy,perms).map(section=>({...section,
    groups:section.groups.map(group=>({...group,
      items:group.items.filter(item=>item[2]||(group.g==='内部项目'&&item[0]==='内部项目'))
    })).filter(group=>group.items.length)
  })).filter(section=>section.groups.length);
  const signature=sections.flatMap(section=>section.groups.flatMap(group=>group.items.map(item=>group.g+'/'+item[0]))).join('|');
  const root=useWBEntrance(signature);
  return <div className="wb-workbench" ref={root}>
    {sections.map(section=><section className="wb-section" data-section={section.b} key={section.b} aria-label={section.b==='共享空间'?'Shared Space':l(section.b)}>
      {section.b!=='经营'&&<header className={'wb-section-head'+(section.b==='共享空间'?' is-shared':'')}><h2>{section.b==='共享空间'?'Shared Space':l(section.b)}</h2>{section.b!=='共享空间'&&<p>{l(section.d)}</p>}</header>}
      {section.groups.map(group=><div className="wb-group" data-group={group.g} key={group.g}>
        <div className="wb-group-head"><h3>{l(group.g)}</h3>{group.who && <small>{l(group.who)}</small>}</div>
        <div className="wb-entries">{group.items.map(item=><WBEntry key={group.g+'/'+item[0]} group={group.g} item={item} go={go} toast={toast} />)}</div>
      </div>)}
    </section>)}
  </div>;
}

/* The approved mobile account shell is shared, while its authenticated forms,
   save callbacks, locale and role rules remain the original implementation. */
function FansaiWorkbenchAccount(props) {
  return <FansaiCustomerAccount {...props} />;
}
