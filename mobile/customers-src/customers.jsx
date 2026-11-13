/* Customers board only. Uses the host React instance and existing period/currency data. */
var CXReact = F(X());
function CXAmount({value, state, className = ''}) {
  const usd = state.cur === 'USD';
  const amount = value == null ? null : value * 10000 / (usd ? state.fx : 1);
  return <span className={'cx-amount ' + className}><small>{usd ? '$' : '¥'}</small><span key={amount??'missing'} className="cx-amount-value">{amount == null ? '—' : Math.round(amount).toLocaleString('en-US')}</span></span>;
}
function CXArrow({down = false}) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={down ? 'm6 9 6 6 6-6' : 'M6 18 18 6M6 6h12v12'} /></svg>;
}
function CXCollectionBlocks({received, pending, selected, onSelect}) {
  const total = received + pending;
  const parts = [['received','已到账',received],['pending','待到账',pending]];
  return <div className={'cx-collection is-'+selected} role="group" aria-label="签约金额构成，色块宽度代表占比">
    <div className="cx-collection-label"><span>回款结构</span><span>{total>0?'签约总额 100%':'暂无签约金额'}</span></div>
    <div className="cx-collection-blocks">
      {total>0?parts.filter(([, ,value])=>value>0).map(([key,label,value])=>{
        const share=value/total;
        return <button key={key} className={'cx-collection-part is-'+key+(share<.18?' is-compact':'')} style={{flexGrow:share}} data-share={share} aria-pressed={selected===key} aria-label={`${label}，占签约金额 ${(share*100).toFixed(1)}%`} onClick={()=>onSelect(selected===key?'all':key)}>
          <span className="cx-collection-face"><span className="cx-collection-status">{label}</span><strong>{(share*100).toFixed(1)}<small>%</small></strong><span className="cx-collection-state">{selected===key?'当前查看':key==='received'?'已确认回款':'已签约 · 待收'}</span></span>
        </button>;
      }):<div className="cx-collection-empty">暂无回款比例<span>有签约记录后显示金额构成</span></div>}
    </div>
  </div>;
}
function CXAvatar({name}) {
  const src=typeof CX_AVATARS!=='undefined'?CX_AVATARS[name]:null;
  return <span className="cx-owner-avatar" title="Unsplash 示例人物头像"><span>{name.split(' ').map(v=>v[0]).join('').slice(0,2)}</span>{src&&<img src={src} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>}</span>;
}
function FansaiCustomersBoard({B, n, r, S}) {
  const [cash, setCash] = CXReact.useState('all');
  const [group, setGroup] = CXReact.useState(0);
  const [stage, setStage] = CXReact.useState(0);
  const [owner, setOwner] = CXReact.useState(null);
  const root = CXReact.useRef(null);
  const totalCash = B.recv + B.left;
  const collected = totalCash > 0 ? B.recv / totalCash : null;
  const goalPct = B.goal ? B.done / B.goal * 100 : null;
  const activeGroup = Math.min(group, Math.max(0, B.conc.length - 1));
  const colors = ['#51bca8', '#7bb8df', '#c4dbe7', '#607d88'];
  const activeStage = Math.min(stage, Math.max(0, B.fun.length - 1));
  const dotGroups = Array.from({length:100}, (_,i) => {
    let acc = 0;
    for(let j=0;j<B.conc.length;j++){acc += B.conc[j][1]/(B.concTotal||1)*100;if(i+.5<acc)return j;}
    return B.conc.length-1;
  });
  CXReact.useEffect(() => {
    const el=root.current;if(!el)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let animations=[];
    const finish=()=>{animations.forEach(a=>a.cancel());animations=[];};
    const play = (node) => {
      if(media.matches || document.hidden)return;
      node.querySelectorAll('.cx-collection-part').forEach((part,i)=>animations.push(part.animate([
        {clipPath:'inset(100% 0 0 0 round 18px)',transform:'translateY(14px)'},
        {clipPath:'inset(0% 0 0 0 round 18px)',transform:'translateY(0)'}
      ],{duration:950,delay:i*130,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})));
      node.querySelectorAll('.cx-matrix-dot').forEach((dot,i)=>animations.push(dot.animate([
        {transform:'scale(.1)'},{transform:'scale(1)'}
      ],{duration:520,delay:(i%10)*22+Math.floor(i/10)*15,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})));
      node.querySelectorAll('.cx-stage-track>i').forEach((bar,i)=>animations.push(bar.animate([
        {transform:'scaleY(0)',transformOrigin:'center bottom'},{transform:'scaleY(1)',transformOrigin:'center bottom'}
      ],{duration:650,delay:i*90,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})));
    };
    const observer = window.IntersectionObserver ? new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){play(entry.target);observer.unobserve(entry.target);}});
    },{threshold:.2}) : null;
    el.querySelectorAll('.cx-collection,.cx-matrix,.cx-stages').forEach(node=>observer?observer.observe(node):play(node));
    const onReduce=()=>{if(media.matches)finish();};
    const onHide=()=>{if(document.hidden)finish();};
    media.addEventListener('change',onReduce);document.addEventListener('visibilitychange',onHide);
    return ()=>{finish();observer?.disconnect();media.removeEventListener('change',onReduce);document.removeEventListener('visibilitychange',onHide);};
  },[B,S.cur]);
  if(B.mismatch)return <div className="cx-empty"><h2>{n}暂无业务数据</h2><p>换个统计周期，查看已有客户经营记录。</p></div>;
  const selected = B.conc[activeGroup];
  const maxBD=Math.max(...B.bd.map(v=>v[1]),1);
  const maxStage=Math.max(...B.fun.map(v=>v[1]),1);
  return <div className="cx-board" ref={root}>
    <div className="cx-context"><span><i />{r} 经营快照</span><span className="cx-demo">Demo 数据</span></div>
    <section className="cx-cash" aria-labelledby="cx-cash-title">
      <div className="cx-cash-heading"><h2 id="cx-cash-title">{cash==='all'?'签约与回款':cash==='received'?'已收款':'已签待收'}</h2><span>{n}</span></div>
      <CXAmount value={cash==='all'?totalCash:cash==='received'?B.recv:B.left} state={S} className="cx-hero-number" />
      <div className="cx-hero-meta">{cash==='all'?(collected==null?<>暂无回款比例</>:<>已收回 <b>{(collected*100).toFixed(1)}%</b> 的签约金额</>):<button onClick={()=>setCash('all')}>查看签约总额 <span>↗</span></button>}</div>
      <CXCollectionBlocks received={B.recv} pending={B.left} selected={cash} onSelect={setCash}/>
      <div className="cx-cash-legend">
        <button aria-pressed={cash==='received'} onClick={()=>setCash(cash==='received'?'all':'received')}><span><i className="cx-mint"/>已收款 <small className="cx-cash-share">{collected==null?'—':(collected*100).toFixed(1)+'%'}</small></span><CXAmount value={B.recv} state={S}/></button>
        <button aria-pressed={cash==='pending'} onClick={()=>setCash(cash==='pending'?'all':'pending')}><span><i className="cx-blue"/>已签待收 <small className="cx-cash-share">{collected==null?'—':((1-collected)*100).toFixed(1)+'%'}</small></span><CXAmount value={B.left} state={S}/></button>
      </div>
    </section>
    <div className="cx-finance-strip">
      <div><span>本期签约额</span><CXAmount value={B.sign} state={S}/></div>
      <div><span>本期回款额</span><CXAmount value={B.back} state={S}/></div>
      <div><span>平均客单</span><CXAmount value={B.signC?B.sign/B.signC:null} state={S}/></div>
    </div>
    <details className="cx-goal">
      <summary><span className="cx-goal-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="m12 12 8-8" stroke="currentColor" strokeWidth="1.4"/></svg></span><span>{n}签约目标<small>时间进度 {B.timeP.toFixed(1)}%</small></span><b>{goalPct==null?'—':goalPct.toFixed(1)+'%'}<small>已完成</small></b><CXArrow down/></summary>
      <div className="cx-goal-expanded"><div><span>已签约</span><CXAmount value={B.done} state={S}/></div><div><span>目标</span><CXAmount value={B.goal} state={S}/></div>{goalPct!=null&&<div className="cx-goal-track" role="progressbar" aria-label="签约目标完成率" aria-valuenow={Math.min(100,goalPct||0)} aria-valuemin="0" aria-valuemax="100"><i style={{width:Math.min(100,goalPct||0)+'%'}}/></div>}<div><span>在调线索金额</span><CXAmount value={B.talk} state={S}/></div><p>沿用源 Demo 目标与周期口径。{B.goal==null?'当前未设目标。':`距目标还差 ${Oo(Math.max(0,B.goal-B.done),S)}。`}</p></div>
    </details>
    <section className="cx-concentration" aria-labelledby="cx-concentration-title">
      <div className="cx-section-head"><div><h2 id="cx-concentration-title">客户集中度</h2><p>每个圆点 ≈ 1% 合同额</p></div><span className="cx-section-mark">合同分布</span></div>
      {selected?<div className="cx-mix-card">
        <div className="cx-mix-top"><div className="cx-mix-stat"><span>前三大客户占比</span><strong>{(B.cr3/(B.concTotal||1)*100).toFixed(1)}<small>%</small></strong><div className="cx-concentration-tag">其余客户 {(Math.max(0,1-B.cr3/(B.concTotal||1))*100).toFixed(1)}%</div><p>合同额合计<CXAmount value={B.concTotal} state={S}/></p></div>
        <div className="cx-matrix" role="img" aria-label={`前三大客户占比 ${(B.cr3/(B.concTotal||1)*100).toFixed(2)}%。下方按钮可选择客户分组。`}>
          {dotGroups.map((g,i)=><i key={i} className={'cx-matrix-dot '+(g===activeGroup?'is-lit':'')} style={{background:colors[g%4]}}/>)}
        </div></div>
        <div className="cx-mix-tabs" aria-label="客户集中度分组">{B.conc.map(([name,value],i)=><button key={name} onClick={()=>setGroup(i)} aria-pressed={i===activeGroup}><i style={{background:colors[i%4]}}/>{name.split(' · ')[0]}<span>{(value/(B.concTotal||1)*100).toFixed(1)}%</span></button>)}</div>
        <div className="cx-selected" key={activeGroup}><div><span>{selected[0].split(' · ')[0]}</span><h3>{selected[0].split(' · ')[1]||selected[0]}</h3></div><div><CXAmount value={selected[1]} state={S}/><span>占合同额 {(selected[1]/(B.concTotal||1)*100).toFixed(2)}%</span></div></div>
        <p className="cx-footnote">合同分布合计与本期签约额采用不同快照口径。</p>
      </div>:<p className="cx-empty">本期暂无可展示的合同分布</p>}
    </section>
    <section className="cx-pipeline" aria-labelledby="cx-pipeline-title">
      <div className="cx-section-head"><div><h2 id="cx-pipeline-title">从建联，到回款</h2><p>按建联时间归属 · {n}</p></div><span className="cx-section-mark">转化漏斗</span></div>
      <div className="cx-pipeline-card"><div className="cx-stages">{B.fun.map(([label,value],i)=><button key={label} className={'cx-stage cx-stage-'+i} onClick={()=>setStage(i)} aria-pressed={activeStage===i}><strong>{value}</strong><div className="cx-stage-track"><i style={{height:value/maxStage*100+'%'}}><span>{String(i+1).padStart(2,'0')}</span></i></div><span>{label}</span><span className="cx-stage-selection" aria-hidden="true">{activeStage===i?'查看中':'查看'}</span></button>)}</div>
      <div className="cx-stage-detail" aria-live="polite"><span>{B.fun[activeStage]?.[0]||'暂无阶段'}<b>{B.fun[activeStage]?.[1]??'—'} 条</b></span><span>{activeStage===0?'进入本期漏斗':<>上一步转化 <b>{B.fun[activeStage-1]?.[1]?(B.fun[activeStage][1]/B.fun[activeStage-1][1]*100).toFixed(0)+'%':'—'}</b></>}</span></div></div>
    </section>
    <section className="cx-team" aria-labelledby="cx-team-title"><div className="cx-section-head"><div><h2 id="cx-team-title">BD 业绩</h2><p>签约贡献 · 按签约额排序</p></div><span className="cx-team-count">{B.bd.length} 位</span></div>
      <div className="cx-team-list">{[...B.bd].sort((a,b)=>b[1]-a[1]).map(([name,amount,target],i)=><div className={'cx-owner '+(owner===name?'is-open':'')} key={name}>
        <button aria-expanded={owner===name} onClick={()=>setOwner(owner===name?null:name)}><CXAvatar name={name}/><span className="cx-owner-main"><span>{name}{i===0&&amount>0&&<small>领先</small>}</span><span className="cx-owner-track"><i style={{width:amount/maxBD*100+'%'}}/></span></span><CXAmount value={amount} state={S}/><CXArrow down/></button>
        {owner===name&&<div className="cx-owner-detail"><span>个人目标 <b>{target==null?'未设置':Oo(target,S)}</b></span><span>完成率 <b>{target? (amount/target*100).toFixed(1)+'%':'—'}</b></span></div>}
      </div>)}{!B.bd.length&&<p className="cx-empty">本期暂无 BD 数据</p>}</div>
    </section>
    <details className="cx-source"><summary>数据与统计口径 <CXArrow down/></summary><p>本页为离线 Demo。所有金额、客户与阶段均保留原始演示数据；图形由这些数值派生。回款结构按已收款与已签待收合计计算，非按目标金额计算。色块宽度对应签约金额占比，薄荷色为已收款、冰蓝斜纹为已签待收；圆点按合同占比分配取整，精确值以读数为准。</p><p>平均客单 = 本期签约额 ÷ {B.signC} 家。{B.incomplete?'部分金额缺入账汇率，未计入。':''}{Vm(S)}</p><p>BD 人像为 Unsplash 示例素材，用于演示，不代表对应人员真实身份。</p></details>
  </div>;
}
