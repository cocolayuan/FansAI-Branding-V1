function cxCustomerFilterDraft(state,canUSD) {
  return {per:['m','lm','q','y'].includes(state.per)?state.per:'m',cur:state.cur==='USD' && canUSD?'USD':'CNY'};
}
function cxCustomerFilterValues(kind,draft,canUSD) {
  const clean=cxCustomerFilterDraft(draft,canUSD);
  return kind==='cust'?clean:{cur:clean.cur};
}
function FansaiCustomerFilter({kind,state,canUSD,onApply,onClose,open=true}) {
  const [draft,setDraft]=CXReact.useState(()=>cxCustomerFilterDraft(state,canUSD));
  const formId=CXReact.useId()+'-filter-form';
  const range=Ly(draft.per,Ra());
  CXReact.useEffect(()=>{if(open)setDraft(cxCustomerFilterDraft(state,canUSD));},[open,kind]);
  const submit=event=>{event.preventDefault();onApply(cxCustomerFilterValues(kind,draft,canUSD));};
  return <CXCustomerSheet title={l(kind==='cust'?'时间与币种':'金额单位')} closeLabel="取消" onClose={onClose} className="cx-sheet-filter" footer={<><button className="cx-sheet-secondary" type="button" onClick={()=>setDraft({per:'m',cur:'CNY'})}>{l('重置')}</button><button className="cx-sheet-primary" type="submit" form={formId}>{l('应用筛选')}</button></>}>
    <form className="cx-filter-form" id={formId} onSubmit={submit}>
      {kind==='cust' && <section className="cx-filter-section" data-cx-modal-reveal aria-labelledby={formId+'-period'}><h3 id={formId+'-period'}>{l('时间')}</h3><div className="cx-filter-periods">{[['m','本月'],['lm','上月'],['q','本季度'],['y','今年']].map(([key,label])=><button type="button" key={key} aria-pressed={draft.per===key} onClick={()=>setDraft(current=>({...current,per:key}))}>{l(label)}</button>)}</div><p className="cx-filter-note" aria-live="polite">{range.n} · {range.r}</p></section>}
      <section className="cx-filter-section" data-cx-modal-reveal aria-labelledby={formId+'-currency'}><h3 id={formId+'-currency'}>{l('币种')}</h3><div className="cx-filter-currencies">{[['CNY','人民币 ¥'],['USD','美元 $']].map(([key,label])=><button type="button" key={key} disabled={key==='USD'&&!canUSD} aria-pressed={draft.cur===key} onClick={()=>setDraft(current=>({...current,cur:key}))}>{l(label)}</button>)}</div><p className="cx-filter-note">{canUSD?l('按 1 美元 = {rate} 元换算（数据看板汇率），切换后所有页面一起变。',{rate:Number(state.fx).toFixed(2)}):l('汇率暂不可用，金额仅按人民币显示。')}</p></section>
    </form>
  </CXCustomerSheet>;
}
