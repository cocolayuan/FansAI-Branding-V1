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
  const uid = CXReact.useId();
  const values = cxProjectDetailValues(p,source);
  const currency = source?.currency || p.currency;
  const stage = Number.isInteger(p.stg) && p.stg >= 0 && p.stg < ic.length ? p.stg : null;
  const stageName = stage == null ? '—' : l(ic[stage]);
  const currentStatus = p.settled ? l('已结清') : p.apr ? l('审批中') : l('进行中');
  const money = value => <CXProjectMoney value={value} currency={currency} state={S}/>;
  const description = <div className="cx-project-context"><span className={'cx-project-status '+(p.settled?'is-complete':p.apr?'is-review':'')}>{stageName} · {currentStatus}</span>{p.code && p.code !== '—' && <span className="cx-project-code">{p.code}</span>}</div>;
  return <CXCustomerSheet className="cx-project-modal" title={p.n || l('项目详情')} onClose={closeSheet} description={description} footer={p.apr ? <button type="button" className="cx-sheet-primary" onClick={goApprovals}>{l('去审批')}</button> : null}>
    <div className="cx-project-content">
      <section className="cx-project-finance" aria-label={l('项目财务')}>
        <div className="cx-project-contract"><span>{l('签约额')}</span><CXProjectMoney value={values.amount} currency={currency} state={S} className="cx-project-hero-money"/></div>
        <div className="cx-project-finance-grid">
          <div><span>{l('外部成本预算')}</span><b>{money(values.cost)}</b></div>
          <div><span>{l('毛利')}</span><b className={values.gross != null && values.gross < 0?'is-loss':''}>{money(values.gross)}</b><small>{values.margin == null ? '—' : values.margin.toFixed(0)+'%'} {l('毛利率')}</small></div>
          <div><span>{l('已开票')}</span><b>{money(values.invoiced)}</b></div>
          <div><span>{l('已回款')}</span><b className="cx-project-collected">{money(values.received)}</b></div>
        </div>
      </section>
      <section className="cx-project-info" aria-label={l('项目资料')}>
        <dl><div className="cx-project-wide"><dt>{l('客户')}</dt><dd>{p.c || '—'}</dd></div><div><dt>BD · {l('谈成')}</dt><dd>{p.bd || '—'}</dd></div><div><dt>{l('负责人')} · {l('执行')}</dt><dd>{p.ae || '—'}</dd></div><div className="cx-project-wide"><dt>{l('交付日期')}</dt><dd className={p.late?'is-loss':''}>{l(p.due || '—')}{p.late > 0 && <span className="cx-project-delay">{l('延期 {n} 天',{n:p.late})}</span>}</dd></div></dl>
      </section>
      <section className="cx-project-lifecycle" aria-labelledby={uid+'-stages'}>
        <h3 id={uid+'-stages'}>{l('项目阶段')}</h3>
        <ol>{ic.map((name,index)=>{
          const done=stage!=null && (index<stage || p.settled && index===stage),current=index===stage && !p.settled;
          return <li key={name} data-state={done?'done':current?'current':'waiting'} aria-current={current?'step':undefined}><span className="cx-project-step-mark" aria-hidden="true">{done?<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3 3 7-7"/></svg>:String(index+1).padStart(2,'0')}</span><div><b>{l(name)}</b><span>{done?index===stage?l('已结清'):l('已完成'):current?p.apr?l('审批中'):l('进行中'):l('未开始')}</span></div></li>;
        })}</ol>
      </section>
    </div>
  </CXCustomerSheet>;
}
