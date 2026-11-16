/* One mobile overlay contract for every Customer entry point. The host keeps
   closed nodes mounted, so lifecycle follows its real .on / aria-hidden state. */
function CXCustomerSheet({title,onClose,closeLabel='关闭',children,footer,description,className=''}) {
  const root=CXReact.useRef(null), close=CXReact.useRef(null), callback=CXReact.useRef(onClose);
  callback.current=onClose;
  const uid=CXReact.useId(), titleId=uid+'-sheet-title';
  CXReact.useLayoutEffect(()=>{
    const node=root.current, host=node?.closest('.sheet');
    if(!host)return;
    const doc=node.ownerDocument, win=doc.defaultView, scope=host.closest('.fansai-mobile-scope');
    const trigger=doc.activeElement, media=win.matchMedia('(prefers-reduced-motion: reduce)');
    const previousLabel=host.getAttribute('aria-labelledby'), previousDescription=host.getAttribute('aria-describedby');
    host.setAttribute('aria-labelledby',titleId);host.removeAttribute('aria-describedby');
    let active=false, background=[], bodyOverflow='', htmlOverflow='', restoreFrame=0, animations=[];
    const stopMotion=()=>{animations.forEach(item=>item.cancel());animations=[];};
    const items=()=>Array.from(node.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(item=>item.getClientRects().length && !item.closest('[inert]'));
    const release=()=>{
      if(!active)return;active=false;stopMotion();
      background.forEach(({el,inert,hidden})=>{el.inert=inert;if(hidden==null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',hidden);});background=[];
      doc.body.style.overflow=bodyOverflow;doc.documentElement.style.overflow=htmlOverflow;
      restoreFrame=win.requestAnimationFrame(()=>{
        // A replacement sheet owns focus now; never steal it back during a swap.
        if(host.classList.contains('on') && !host.contains(node))return;
        const target=trigger instanceof win.HTMLElement && trigger.isConnected && !trigger.closest('[inert]') && !host.contains(trigger) ? trigger : scope?.querySelector('.fg-nav button[aria-current="page"]') || scope?.querySelector('#t-cust');
        target?.focus({preventScroll:true});
      });
    };
    const sync=()=>{
      if(!host.classList.contains('on') || host.getAttribute('aria-hidden')==='true'){release();return;}
      if(active)return;active=true;win.cancelAnimationFrame(restoreFrame);
      bodyOverflow=doc.body.style.overflow;htmlOverflow=doc.documentElement.style.overflow;
      doc.body.style.overflow='hidden';doc.documentElement.style.overflow='hidden';
      background=Array.from(scope?.children||[]).filter(el=>el!==host && el.id!=='scrim').map(el=>({el,inert:el.inert,hidden:el.getAttribute('aria-hidden')}));
      background.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true');});
      close.current?.focus({preventScroll:true});
      if(!media.matches && !doc.hidden){
        node.querySelectorAll('[data-cx-modal-reveal]').forEach((el,index)=>animations.push(el.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:35+Math.min(index,4)*30,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'})));
      }
    };
    const keydown=event=>{
      if(!active)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();callback.current();return;}
      if(event.key!=='Tab')return;
      const controls=items(),first=controls[0],last=controls.at(-1);
      if(!first){event.preventDefault();node.focus({preventScroll:true});return;}
      if(event.shiftKey && (doc.activeElement===first || !node.contains(doc.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey && (doc.activeElement===last || !node.contains(doc.activeElement))){event.preventDefault();first.focus();}
    };
    const focusin=event=>{if(active && !node.contains(event.target))close.current?.focus({preventScroll:true});};
    const reduce=()=>{if(media.matches)stopMotion();}, visibility=()=>{if(doc.hidden)stopMotion();};
    const observer=new win.MutationObserver(sync);observer.observe(host,{attributes:true,attributeFilter:['class','aria-hidden']});
    doc.addEventListener('keydown',keydown,true);doc.addEventListener('focusin',focusin,true);doc.addEventListener('visibilitychange',visibility);media.addEventListener('change',reduce);sync();
    return()=>{
      observer.disconnect();doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('focusin',focusin,true);doc.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduce);release();stopMotion();
      if(previousLabel==null)host.removeAttribute('aria-labelledby');else host.setAttribute('aria-labelledby',previousLabel);
      if(previousDescription==null)host.removeAttribute('aria-describedby');else host.setAttribute('aria-describedby',previousDescription);
    };
  },[titleId]);
  return <div className={'cx-sheet '+className} ref={root} tabIndex={-1}>
    <header className="cx-sheet-header"><h2 id={titleId}>{title}</h2><button className="cx-sheet-close" ref={close} type="button" onClick={onClose}>{l(closeLabel)}</button>{description && <div className="cx-sheet-description">{description}</div>}</header>
    <div className="cx-sheet-body" tabIndex={0} aria-label={title}>{children}</div>
    {footer && <footer className="cx-sheet-footer">{footer}</footer>}
  </div>;
}

/* Keep the original account component and its authenticated mutations intact.
   Its local views inherit the Customer shell and controls, never other tabs. */
function FansaiCustomerAccount({initialSession,onClose}) {
  const content=CXReact.useRef(null), [title,setTitle]=CXReact.useState(l('账号设置'));
  CXReact.useLayoutEffect(()=>{
    const node=content.current;if(!node)return;
    const sync=()=>setTitle(node.querySelector('.sh-t')?.textContent || l('账号设置'));
    const observer=new MutationObserver(sync);observer.observe(node,{childList:true,subtree:true,characterData:true});sync();
    return()=>observer.disconnect();
  },[]);
  return <CXCustomerSheet title={title} onClose={onClose} className="cx-sheet-account"><div className="cx-account-content" ref={content}>{CXReact.createElement(lM,{initialSession,onClose})}</div></CXCustomerSheet>;
}
