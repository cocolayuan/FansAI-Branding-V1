/* Global KPI microcharts. All marks derive from existing count fields; these
   are counts and stage composition, never invented trends or target progress. */
function cxKpiCount(value) {
  if(value == null || typeof value === 'boolean' || typeof value === 'string' && !value.trim())return null;
  const count=Number(value);
  return Number.isSafeInteger(count) && count>=0?count:null;
}
function cxKpiUnits(rawValue,capacity) {
  const value=cxKpiCount(rawValue);
  if(value==null)return {value:null,unit:1,filled:0,lastFraction:0,slots:0};
  const unit=value>capacity?Math.pow(10,Math.ceil(Math.log10(value/capacity))):1;
  const filled=Math.floor(value/unit),lastFraction=(value%unit)/unit;
  return {value,unit,filled,lastFraction,slots:filled+(lastFraction>0?1:0)};
}
function cxKpiUnitLabel(model,markName) {
  if(model.value==null)return l('数据暂不可用');
  if(model.value===0)return l('暂无记录');
  return `${model.value.toLocaleString('en-US')}，${markName}最多代表 ${model.unit.toLocaleString('en-US')} 个${model.lastFraction?`，末格 ${model.value%model.unit} 个`:''}`;
}
function useCXKpiMotion(signature) {
  const root=CXReact.useRef(null);
  CXReact.useEffect(()=>{
    const node=root.current;if(!node)return;
    const doc=node.ownerDocument, win=doc.defaultView, media=win.matchMedia('(prefers-reduced-motion: reduce)');
    let animations=[],observer;
    const finish=()=>{animations.forEach(animation=>animation.cancel());animations=[];};
    const play=()=>{
      if(media.matches || doc.hidden || typeof node.animate!=='function')return;
      finish();
      node.querySelectorAll('[data-cx-kpi-number]').forEach((el,index)=>animations.push(el.animate([
        {opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}
      ],{duration:380,delay:index*45,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'})));
      node.querySelectorAll('[data-cx-kpi-mark]').forEach(el=>{
        const index=Number(el.dataset.cxKpiMark)||0,type=el.dataset.cxKpiMotion;
        const transform=type==='stage'?'scaleX(.04)':type==='bar'?'scaleY(.15)':'scale(.55)';
        animations.push(el.animate([{opacity:.16,transform},{opacity:1,transform:'scale(1)'}],{
          duration:500,delay:50+(index%14)*17+Math.floor(index/14)*11,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'
        }));
      });
    };
    if(win.IntersectionObserver){
      observer=new win.IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){play();observer.disconnect();}},{threshold:.25});
      observer.observe(node);
    }else play();
    const reduce=()=>{if(media.matches)finish();},hide=()=>{if(doc.hidden)finish();};
    media.addEventListener('change',reduce);doc.addEventListener('visibilitychange',hide);
    return()=>{observer?.disconnect();finish();media.removeEventListener('change',reduce);doc.removeEventListener('visibilitychange',hide);};
  },[signature]);
  return root;
}
function CXKpiScale({model}) {
  return model.unit>1?<small className="cx-kpi-scale" title={l('每格代表的数量')}>×{model.unit.toLocaleString('en-US')}</small>:null;
}
function CXKpiMatrix({value,dashes=false}) {
  const columns=dashes?7:14,rows=dashes?10:9,capacity=columns*rows;
  const model=cxKpiUnits(value,capacity),uid=CXReact.useId().replace(/:/g,'');
  const pitchX=104/columns,pitchY=66/rows,w=dashes?pitchX*.73:3.6,h=dashes?3.6:3.6;
  return <div className="cx-kpi-chart" role="img" aria-label={cxKpiUnitLabel(model,dashes?'每条短线':'每个亮点')}>
    <svg className={'cx-kpi-svg '+(dashes?'is-dashes':'is-dots')} viewBox="0 0 112 72" aria-hidden="true">
      <defs><linearGradient id={uid+'-ink'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={dashes?'#c4e7ff':'#c1fff0'}/><stop offset="100%" stopColor={dashes?'#85bee9':'#73dfc4'}/></linearGradient></defs>
      {Array.from({length:capacity},(_,index)=>{
        const x=4+(index%columns)*pitchX+(pitchX-w)/2,y=3+Math.floor(index/columns)*pitchY+(pitchY-h)/2;
        const fraction=index<model.filled?1:index===model.filled?model.lastFraction:0;
        return <g key={index}><rect className="cx-kpi-unit is-dim" x={x} y={y} width={w} height={h} rx={dashes?1.8:1.5}/>{fraction>0 && <rect className="cx-kpi-unit is-live" data-cx-kpi-mark={index} data-cx-kpi-motion="dot" data-count={fraction*model.unit} x={x} y={y} width={w*fraction} height={h} rx={dashes?1.8:1.5} fill={'url(#'+uid+'-ink)'}/>}</g>;
      })}
    </svg><CXKpiScale model={model}/>
  </div>;
}
function CXKpiCountBars({value,variant='bars'}) {
  const model=cxKpiUnits(value,12),uid=CXReact.useId().replace(/:/g,'');
  if(model.value==null || model.value===0)return <div className="cx-kpi-chart cx-kpi-chart-empty" role="img" aria-label={model.value==null?l('数据暂不可用'):l('暂无记录')}><span>{model.value==null?'—':l('暂无')}</span></div>;
  const stem=variant==='stems',hatched=variant==='hatched';
  const count=model.slots,span=stem?Math.min(72,count*28):96,pitch=span/count;
  const width=stem?2.1:hatched?Math.min(10,pitch*.67):Math.min(4.2,pitch*.42);
  const left=(112-span)/2;
  const color=hatched?'#efbc78':'#9dd4ff';
  return <div className="cx-kpi-chart" role="img" aria-label={cxKpiUnitLabel(model,'每根柱')}>
    <svg className={'cx-kpi-svg is-'+variant} viewBox="0 0 112 72" aria-hidden="true">
      <defs>
        <linearGradient id={uid+'-ink'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hatched?'#ffda9f':'#c1e7ff'}/><stop offset="100%" stopColor={color}/></linearGradient>
        <linearGradient id={uid+'-mint'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b9ffec"/><stop offset="100%" stopColor="#86e6d1"/></linearGradient>
        <pattern id={uid+'-hatch'} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M-1 1 1-1M0 5 5 0M4 6 6 4" stroke="#90602a" strokeWidth=".6" opacity=".4"/></pattern>
      </defs>
      {Array.from({length:count},(_,index)=>{
        const fraction=index<model.filled?1:model.lastFraction,x=left+index*pitch+(pitch-width)/2;
        const height=hatched?57:stem?57:39,y=68-height;
        return <g key={index} className="cx-kpi-count-mark" data-cx-kpi-mark={index} data-cx-kpi-motion="bar" data-count={fraction*model.unit}>
          {fraction<1 && <rect className="cx-kpi-unit is-dim" x={x} y={y} width={width} height={height} rx={width/2}/>}
          <rect className="cx-kpi-unit is-live" x={x} y={68-height*fraction} width={width} height={height*fraction} rx={width/2} fill={'url(#'+uid+(variant==='bars'&&index%2?'-mint)':'-ink)')}/>
          {hatched && <rect x={x} y={68-height*fraction} width={width} height={height*fraction} rx={width/2} fill={'url(#'+uid+'-hatch)'}/>}
          {stem && <><circle cx={x+width/2} cy={68-height*fraction} r="5" fill="#8dccff" opacity=".13"/><circle cx={x+width/2} cy={68-height*fraction} r="2.4" fill="#b4e0ff"/></>}
        </g>;
      })}
    </svg><CXKpiScale model={model}/>
  </div>;
}
function CXKpiStages({counts,activeCount}) {
  const names=['立项','合同','制作','验收'],values=names.map((_,index)=>cxKpiCount(counts?.[index]));
  const total=values.every(value=>value!=null)?values.reduce((sum,value)=>sum+value,0):null;
  const valid=total!=null && total===cxKpiCount(activeCount);
  if(!valid || !total)return <div className="cx-kpi-chart cx-kpi-chart-empty" role="img" aria-label={!valid?l('阶段数据暂不可用'):l('暂无在制项目')}><span>{!valid?'—':l('暂无')}</span></div>;
  const visible=values.map((value,index)=>({value,index})).filter(item=>item.value>0);
  return <div className="cx-kpi-chart cx-kpi-stages" role="img" aria-label={visible.map(({value,index})=>l(names[index])+` ${value}`).join('，')}>
    <div className="cx-kpi-stage-track" aria-hidden="true">{visible.map(({value,index})=><span key={index} className={'cx-kpi-stage is-stage-'+index} style={{flexGrow:value,flexBasis:0}} data-cx-kpi-mark={index} data-cx-kpi-motion="stage" data-count={value} data-share={value/total}/>)}</div>
    <div className="cx-kpi-legend" aria-hidden="true">{visible.map(({value,index})=><span key={index}><i className={'is-stage-'+index}/>{l(names[index])}<b>{value}</b></span>)}</div>
  </div>;
}
function CXKpiCard({label,value,caption,tone='ice',children,onClick,selected=false}) {
  const count=cxKpiCount(value),Tag=onClick?'button':'article';
  const exact=count==null?'—':count.toLocaleString('en-US');
  const display=count>=10000?new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:1}).format(count):exact;
  return <Tag className={'cx-kpi-card is-'+tone+(selected?' is-selected':'')+(count==null?' is-unavailable':'')} type={onClick?'button':undefined} onClick={onClick} aria-pressed={onClick?selected:undefined}>
    <span className="cx-kpi-label">{l(label)}</span>
    <strong className={'cx-kpi-number'+(count>=1000?' is-compact':'')} title={exact} aria-label={exact}><span key={count??'missing'} data-cx-kpi-number>{display}</span></strong>
    <span className="cx-kpi-caption">{caption}</span>
    {children}
  </Tag>;
}
function FansaiCustomerLibraryMetrics({summary,newCount,signedCount,periodLabel,newSelected,onToggleNew}) {
  const total=cxKpiCount(summary?.totalCustomers),projects=cxKpiCount(summary?.totalProjects),risk=cxKpiCount(summary?.highRiskCustomers);
  const added=cxKpiCount(newCount),signed=cxKpiCount(signedCount);
  const root=useCXKpiMotion([total,added,signed,periodLabel].join('|'));
  return <div className="cx-kpi-row is-library" ref={root} role="group" aria-label={l('客户概览')}>
    <CXKpiCard label="客户数" value={total} tone="mint" caption={summary?<>{l('在跟')} <em>{projects??'—'}</em> · {l('高风险')} <em>{risk??'—'}</em></>:'—'}><CXKpiMatrix value={total}/></CXKpiCard>
    <CXKpiCard label="新增客户" value={added} caption={l('{period}新建档',{period:periodLabel})} onClick={onToggleNew} selected={newSelected}><CXKpiMatrix value={added} dashes/></CXKpiCard>
    <CXKpiCard label="已签约客户" value={signed} caption={l('{period}签了合同',{period:periodLabel})}><CXKpiCountBars value={signed}/></CXKpiCard>
  </div>;
}
function FansaiCustomerProjectMetrics({activeCount,weekCount,lateCount,weekLabel,stageCounts}) {
  const active=cxKpiCount(activeCount),week=cxKpiCount(weekCount),late=cxKpiCount(lateCount);
  const root=useCXKpiMotion([active,week,late,weekLabel,...(stageCounts||[])].join('|'));
  return <div className="cx-kpi-row is-projects" ref={root} role="group" aria-label={l('项目概览')}>
    <CXKpiCard label="在制项目" value={active} tone="neutral" caption={l('立项到验收')}><CXKpiStages counts={stageCounts} activeCount={active}/></CXKpiCard>
    <CXKpiCard label="本周交付" value={week} caption={weekLabel}><CXKpiCountBars value={week} variant="stems"/></CXKpiCard>
    <CXKpiCard label="已延期" value={late} tone={late>0?'amber':'neutral'} caption={l('过了交付日')}><CXKpiCountBars value={late} variant="hatched"/></CXKpiCard>
  </div>;
}
