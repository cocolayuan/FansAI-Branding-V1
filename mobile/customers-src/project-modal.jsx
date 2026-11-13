/* Project detail only. Preserve the existing sheet lifecycle and approval action. */
function cxProjectDetailValues(project, source) {
  const finite = value => value == null || typeof value === 'string' && value.trim() === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) ? null : Number(value);
  const read = (key, fallback) => finite(source ? source[key] : fallback);
  const amount = read('contractAmount', project.amt);
  const cost = read('estimatedCost', project.cost);
  const invoiced = read('invoicedAmount', project.inv);
  const received = read('paidAmount', project.rec);
  const gross = amount == null || cost == null ? null : amount-cost;
  return {amount, cost, invoiced, received, gross, margin:amount > 0 && gross != null ? gross/amount*100 : null};
}
function CXProjectMoney({value, currency, state, className=''}) {
  // Match the host's currency rule: CNY follows the selected display currency;
  // other source currencies retain their denomination. Unknown stays unknown.
  const converted = currency === 'CNY' && state.cur === 'USD';
  const code = converted ? 'USD' : currency;
  const amount = value == null || (converted && !(state.fx > 0)) ? null : converted ? value/state.fx : value;
  const prefix = code === 'CNY' ? '¥' : code === 'USD' ? '$' : code || '';
  return <span className={'cx-project-money '+className}>{amount == null ? '—' : <><small>{prefix}</small><span>{amount.toLocaleString('en-US',{maximumFractionDigits:2})}</span></>}</span>;
}
function FansaiCustomerProjectModal({p, source, S, closeSheet, goApprovals}) {
  const root = CXReact.useRef(null);
  const close = CXReact.useRef(null);
  const uid = CXReact.useId();
  const titleId = uid+'-project-title', descriptionId = uid+'-project-context';
  const values = cxProjectDetailValues(p,source);
  const currency = source?.currency || p.currency;
  const stage = Number.isInteger(p.stg) && p.stg >= 0 && p.stg < ic.length ? p.stg : null;
  const stageName = stage == null ? '—' : l(ic[stage]);
  const currentStatus = p.settled ? l('已结清') : p.apr ? l('审批中') : l('进行中');
  const money = value => <CXProjectMoney value={value} currency={currency} state={S}/>;

  CXReact.useLayoutEffect(() => {
    const node=root.current, host=node?.closest('.sheet');
    if(!node || !host)return;
    const doc=node.ownerDocument, win=doc.defaultView;
    const scope=host.closest('.fansai-mobile-scope');
    const trigger=doc.activeElement;
    const media=win.matchMedia('(prefers-reduced-motion: reduce)');
    const oldLabel=host.getAttribute('aria-labelledby'), oldDescription=host.getAttribute('aria-describedby');
    host.setAttribute('aria-labelledby',titleId);host.setAttribute('aria-describedby',descriptionId);
    let active=false, animations=[], background=[], oldBodyOverflow='', oldHtmlOverflow='', restoreFrame=0;
    const focusables=()=>Array.from(node.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length && !el.closest('[inert]'));
    const stopMotion=()=>{animations.forEach(animation=>animation.cancel());animations=[];};
    const animate=()=>{
      stopMotion();if(media.matches || doc.hidden)return;
      animations.push(node.animate([{opacity:0,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:340,easing:'cubic-bezier(.16,1,.3,1)'}));
      node.querySelectorAll('[data-cx-modal-reveal]').forEach((item,index)=>animations.push(item.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,delay:55+index*45,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'})));
    };
    const restoreBackground=()=>{
      background.forEach(({el,inert,hidden})=>{el.inert=inert;if(hidden==null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',hidden);});background=[];
      doc.body.style.overflow=oldBodyOverflow;doc.documentElement.style.overflow=oldHtmlOverflow;
    };
    const release=()=>{
      if(!active)return;active=false;stopMotion();restoreBackground();
      restoreFrame=win.requestAnimationFrame(()=>{
        const target=trigger instanceof win.HTMLElement && trigger.isConnected && !trigger.closest('[inert]') ? trigger : scope?.querySelector('.fg-nav button[aria-current="page"]');
        target?.focus({preventScroll:true});
      });
    };
    const sync=()=>{
      const isOpen=host.classList.contains('on') && host.getAttribute('aria-hidden')!=='true';
      if(!isOpen){release();return;}
      if(active)return;active=true;win.cancelAnimationFrame(restoreFrame);
      oldBodyOverflow=doc.body.style.overflow;oldHtmlOverflow=doc.documentElement.style.overflow;
      doc.body.style.overflow='hidden';doc.documentElement.style.overflow='hidden';
      background=Array.from(scope?.children || []).filter(el=>el!==host && el.id!=='scrim').map(el=>({el,inert:el.inert,hidden:el.getAttribute('aria-hidden')}));
      background.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true');});
      close.current?.focus({preventScroll:true});animate();
    };
    const keydown=event=>{
      if(!active)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSheet();return;}
      if(event.key!=='Tab')return;
      const items=focusables(),first=items[0],last=items.at(-1);
      if(!first){event.preventDefault();node.focus({preventScroll:true});return;}
      if(event.shiftKey && (doc.activeElement===first || !node.contains(doc.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey && (doc.activeElement===last || !node.contains(doc.activeElement))){event.preventDefault();first.focus();}
    };
    const focusin=event=>{if(active && !node.contains(event.target))close.current?.focus({preventScroll:true});};
    const reduce=()=>{if(media.matches)stopMotion();};
    const visibility=()=>{if(doc.hidden)stopMotion();};
    const observer=new win.MutationObserver(sync);observer.observe(host,{attributes:true,attributeFilter:['class','aria-hidden']});
    doc.addEventListener('keydown',keydown,true);doc.addEventListener('focusin',focusin,true);
    doc.addEventListener('visibilitychange',visibility);media.addEventListener('change',reduce);sync();
    return ()=>{
      observer.disconnect();doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('focusin',focusin,true);
      doc.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduce);release();stopMotion();
      if(oldLabel==null)host.removeAttribute('aria-labelledby');else host.setAttribute('aria-labelledby',oldLabel);
      if(oldDescription==null)host.removeAttribute('aria-describedby');else host.setAttribute('aria-describedby',oldDescription);
    };
  },[closeSheet,titleId,descriptionId]);

  return <div className="cx-project-modal" ref={root} tabIndex={-1}>
    <header className="cx-project-head">
      <div><p className="cx-project-eyebrow">{l('项目详情')}</p><h2 id={titleId}>{p.n || '—'}</h2></div>
      <button className="cx-project-close" ref={close} type="button" aria-label={l('关闭项目详情')} onClick={closeSheet}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <div className="cx-project-context" id={descriptionId}><span className={'cx-project-status '+(p.settled?'is-complete':p.apr?'is-review':'')}>{stageName} · {currentStatus}</span>{p.code && p.code !== '—' && <span className="cx-project-code">{p.code}</span>}</div>
    </header>
    <div className="cx-project-body" tabIndex={0} aria-label={l('项目详情内容')}>
      <section className="cx-project-finance" aria-label={l('项目财务')} data-cx-modal-reveal>
        <div className="cx-project-contract"><span>{l('签约额')}</span><CXProjectMoney value={values.amount} currency={currency} state={S} className="cx-project-hero-money"/></div>
        <div className="cx-project-finance-grid">
          <div><span>{l('外部成本预算')}</span><b>{money(values.cost)}</b></div>
          <div><span>{l('毛利')}</span><b className={values.gross != null && values.gross < 0?'is-loss':''}>{money(values.gross)}</b><small>{values.margin == null ? '—' : values.margin.toFixed(0)+'%'} {l('毛利率')}</small></div>
          <div><span>{l('已开票')}</span><b>{money(values.invoiced)}</b></div>
          <div><span>{l('已回款')}</span><b className="cx-project-collected">{money(values.received)}</b></div>
        </div>
      </section>
      <section className="cx-project-info" aria-label={l('项目资料')} data-cx-modal-reveal>
        <dl><div className="cx-project-wide"><dt>{l('客户')}</dt><dd>{p.c || '—'}</dd></div><div><dt>BD · {l('谈成')}</dt><dd>{p.bd || '—'}</dd></div><div><dt>{l('负责人')} · {l('执行')}</dt><dd>{p.ae || '—'}</dd></div><div className="cx-project-wide"><dt>{l('交付日期')}</dt><dd className={p.late?'is-loss':''}>{l(p.due || '—')}{p.late > 0 && <span className="cx-project-delay">{l('延期 {n} 天',{n:p.late})}</span>}</dd></div></dl>
      </section>
      <section className="cx-project-lifecycle" aria-labelledby={uid+'-stages'} data-cx-modal-reveal>
        <h3 id={uid+'-stages'}>{l('项目阶段')}</h3>
        <ol>{ic.map((name,index)=>{
          const done=stage!=null && (index<stage || p.settled && index===stage),current=index===stage && !p.settled;
          return <li key={name} data-state={done?'done':current?'current':'waiting'} aria-current={current?'step':undefined}><span className="cx-project-step-mark" aria-hidden="true">{done?<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3 3 7-7"/></svg>:String(index+1).padStart(2,'0')}</span><div><b>{l(name)}</b><span>{done?index===stage?l('已结清'):l('已完成'):current?p.apr?l('审批中'):l('进行中'):l('未开始')}</span></div></li>;
        })}</ol>
      </section>
    </div>
    <footer className="cx-project-foot"><button type="button" className={'cx-project-button '+(!p.apr?'is-primary':'')} onClick={closeSheet}>{l('关闭')}</button>{p.apr && <button type="button" className="cx-project-button is-primary" onClick={goApprovals}>{l('去审批')}</button>}</footer>
  </div>;
}
