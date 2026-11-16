/* Customer detail only; use the original customer/project queries and totals. */
function cxCustomerProjectAmount(rawProjects, project) {
  const source = (rawProjects || []).find(row=>String(row.projectId)===String(project.id));
  if(!source)return project.amount ? project.amount : null;
  const value=source.signedAt ? source.contractAmount : source.estimatedAmount;
  return value == null || typeof value === 'string' && value.trim() === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) ? null : Number(value);
}
function FansaiCustomerDetail({id, S, today, canProj, closeSheet}) {
  const query=ZM(id), record=query.data;
  const projectQuery=Ey({search:record?.name,enabled:canProj && !!record});
  const title=record?.name || l('客户资料');
  if(query.isLoading)return <CXCustomerSheet className="cx-customer-detail" title={title} onClose={closeSheet}><div className="cx-customer-empty" role="status"><b>{l('正在加载客户资料…')}</b></div></CXCustomerSheet>;
  if(query.isError)return <CXCustomerSheet className="cx-customer-detail" title={title} onClose={closeSheet}><div className="cx-customer-empty" role="status"><b>{l('客户加载失败')}</b><p>{query.error?.message || l('请稍后重试')}</p></div></CXCustomerSheet>;
  if(!record)return <CXCustomerSheet className="cx-customer-detail" title={title} onClose={closeSheet}><div className="cx-customer-empty" role="status"><b>{l('找不到这个客户')}</b><p>{l('可能已被删除，或不在你的数据范围内')}</p></div></CXCustomerSheet>;
  const customer=Qm(record,today);
  const projects=(projectQuery.data?.rows || []).filter(project=>project.customerId===record.id);
  const receivablesReady=canProj && projectQuery.isSuccess;
  const {recv,over}=VM(projects,record.id);
  const overdue=new Map(projects.map(project=>[String(project.id),project.overdueDays]));
  const truncated=receivablesReady && projectQuery.data.total>projectQuery.data.rows.length;
  const signed=Object.keys(customer.ytd).length>0;
  const showSigned=signed || !Object.keys(customer.fc).length;
  return <CXCustomerSheet className="cx-customer-detail" title={title} onClose={closeSheet}>
    <div className="cx-customer-content">
      <section className="cx-customer-metadata" aria-label={l('客户资料')}>
        <dl><div><dt>{l('行业')}</dt><dd>{l(customer.ind)}</dd></div><div><dt>{l('客户阶段')}</dt><dd><span className="cx-customer-status" data-tone={customer.stTone}>{l(customer.st)}</span></dd></div><div className="cx-customer-wide"><dt>BD · {l('负责人')}</dt><dd>{customer.bd}</dd></div></dl>
      </section>
      <section className="cx-customer-metrics" aria-label={l('客户经营数据')}>
        <div><span>{showSigned?l('今年签约'):l('预测金额')}</span><b className="cx-customer-money">{gu(showSigned?customer.ytd:customer.fc,S)}</b></div>
        <div><span>{l('应收未收')}</span><b className={'cx-customer-money '+(over?'is-overdue':'')}>{receivablesReady?gu(recv,S):'—'}</b></div>
        <div><span>{l('逾期笔数')}</span><b className={over?'is-overdue':''}>{receivablesReady?l('{n} 笔',{n:over}):'—'}</b></div>
        <div><span>{l('最近跟进')}</span><b>{l(customer.last)}</b></div>
      </section>
      {truncated && <p className="cx-customer-note">{l('同名检索到的项目超过 100 个，应收只统计了最近更新的 100 个。')}</p>}
      <section className="cx-customer-projects" aria-labelledby={'cx-customer-projects-'+id}>
        <h3 id={'cx-customer-projects-'+id}>{l('项目')}<span>{customer.proj.length}</span></h3>
        {customer.proj.length?<div className="cx-customer-project-list">{customer.proj.map((project,index)=>{
          const days=project.id!=null?overdue.get(String(project.id)) || 0:0;
          const status=days>0?l('逾期 {n} 天',{n:days}):l(project.status);
          const tone=days>0?'overdue':/待/.test(project.status)?'waiting':/回款/.test(project.status)?'collected':'normal';
          return <article className="cx-customer-project" key={project.id ?? index}>
            <h4>{project.name}</h4>
            <div><CXProjectMoney value={cxCustomerProjectAmount(record.projects,project)} currency={project.currency} state={S}/><span className="cx-customer-project-status" data-tone={tone}>{status}</span></div>
          </article>;
        })}</div>:<div className="cx-customer-empty"><p>{l('还没有项目，谈成后在「项目」里立项。')}</p></div>}
      </section>
    </div>
  </CXCustomerSheet>;
}
