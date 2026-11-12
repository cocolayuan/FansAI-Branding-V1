/* The appearance switch previews only the bottom dock; page colours stay scoped. */
function fgReadAppearance(){
  if(window.__FANSAI_NAV_APPEARANCE)return window.__FANSAI_NAV_APPEARANCE;
  let value='light';
  try{const saved=localStorage.getItem('fansai-nav-appearance');if(saved==='dark'||saved==='light')value=saved;}catch(_){}
  window.__FANSAI_NAV_APPEARANCE=value;return value;
}
function fgUseAppearance(){
  const [appearance,setAppearance]=ju.useState(fgReadAppearance);
  ju.useEffect(()=>{const change=event=>setAppearance(event.detail);window.addEventListener('fansai-nav-appearance',change);return()=>window.removeEventListener('fansai-nav-appearance',change);},[]);
  function choose(value){
    window.__FANSAI_NAV_APPEARANCE=value;
    try{localStorage.setItem('fansai-nav-appearance',value);}catch(_){}
    window.dispatchEvent(new CustomEvent('fansai-nav-appearance',{detail:value}));setAppearance(value);
  }
  return [appearance,choose];
}
function FansaiNavAppearance(){
  const [appearance,choose]=fgUseAppearance(),E=ju.createElement;
  return E('div',{className:'fg-appearance',role:'group','aria-label':'底部导航背景'},
    ...['light','dark'].map(value=>E('button',{key:value,type:'button','aria-pressed':appearance===value,'aria-label':'底部导航 '+(value==='light'?'Light':'Dark'),onClick:()=>choose(value)},
      E('span',{'aria-hidden':true},value==='light'?'☼':'◐'),value==='light'?'Light':'Dark')));
}
/* Rive owns icon poses and transitions; React owns routing, labels, permissions and badges. */
function FansaiGlassIcon({index,artboard,active,pressed,reduced}) {
  const E=ju.createElement, canvas=ju.useRef(null), engine=ju.useRef(null);
  const desired=ju.useRef({active,pressed,reduced}); desired.current={active,pressed,reduced};
  const [status,setStatus]=ju.useState('loading');
  function applyInputs(instance) {
    if(!instance || !instance.viewModelInstance) return;
    const vm=instance.viewModelInstance;
    for(const [key,value] of Object.entries({active:desired.current.active,pressed:desired.current.pressed,reducedMotion:desired.current.reduced})) {
      const property=vm.boolean(key); if(property) property.value=value;
    }
  }
  ju.useEffect(()=>{
    let disposed=false, instance=null, resizeObserver=null, resizeFrame=0, resolutionQuery=null;
    // The approved raster contains fine glass details. Render above screen density
    // so both the static face and the 1.24x selection lift have enough samples.
    const renderScale=()=>Math.min(6,Math.max(3,(window.devicePixelRatio||1)*(window.visualViewport?.scale||1)*1.5));
    const syncSurface=()=>{
      const node=canvas.current;if(disposed||!instance?.loaded||!node)return;
      const ratio=renderScale(),box=node.getBoundingClientRect();
      if(!box.width||!box.height)return;
      const width=Math.floor(box.width*ratio),height=Math.floor(box.height*ratio);
      if(node.width!==width||node.height!==height||Math.abs(instance.devicePixelRatioUsed-ratio)>.001)
        instance.resizeDrawingSurfaceToCanvas(ratio);
      // Resizing resets Canvas2D state, so restore this after every size update.
      const context=node.getContext('2d');
      if(context){context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';}
      node.dataset.renderScale=String(ratio);
      node.dataset.renderQuality=context?.imageSmoothingQuality||'default';
      instance.drawFrame();
    };
    const scheduleSurface=()=>{if(!disposed&&!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;syncSurface();});};
    const resolutionChanged=()=>{watchResolution();scheduleSurface();};
    const watchResolution=()=>{
      resolutionQuery?.removeEventListener('change',resolutionChanged);
      resolutionQuery=window.matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)');
      resolutionQuery.addEventListener('change',resolutionChanged);
    };
    const visible=()=>{if(!document.hidden){watchResolution();scheduleSurface();}};
    if(!window.rive || !window.__FG_RIVE_BUFFER){setStatus('fallback');return;}
    try{
      instance=new rive.Rive({
        canvas:canvas.current,buffer:window.__FG_RIVE_BUFFER,artboard,
        stateMachine:'TabIcon',autoplay:true,autoBind:true,
        enableRiveAssetCDN:false,shouldDisableRiveListeners:true,
        layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),
        onLoad:()=>queueMicrotask(()=>{
          if(disposed)return; engine.current=instance;
          syncSurface();
          applyInputs(instance);setStatus('ready');
        }),
        onLoadError:(error)=>{if(!disposed){setStatus('fallback');console.warn('Glass icon could not load',artboard,error);}}
      });
      engine.current=instance;
      resizeObserver=new ResizeObserver(scheduleSurface);resizeObserver.observe(canvas.current);
      watchResolution();window.addEventListener('resize',scheduleSurface);
      window.visualViewport?.addEventListener('resize',scheduleSurface);
      document.addEventListener('visibilitychange',visible);
    }catch(error){setStatus('fallback');console.warn('Glass icon fallback',error);}
    return()=>{disposed=true;cancelAnimationFrame(resizeFrame);resizeObserver?.disconnect();
      resolutionQuery?.removeEventListener('change',resolutionChanged);
      window.removeEventListener('resize',scheduleSurface);window.visualViewport?.removeEventListener('resize',scheduleSurface);
      document.removeEventListener('visibilitychange',visible);instance?.cleanup();engine.current=null;};
  },[artboard]);
  ju.useEffect(()=>{applyInputs(engine.current);},[active,pressed,reduced,status]);
  const left=[22,268,507,751][index], top=[198,675];
  function fallback(layer,row){
    const id='fg-clip-'+index+'-'+row;
    return E('svg',{className:layer,viewBox:`${left} ${top[row]} 238 250`,'aria-hidden':true,focusable:'false'},
      E('defs',null,E('clipPath',{id,clipPathUnits:'userSpaceOnUse'},E('ellipse',{cx:left+119,cy:top[row]+123,rx:116,ry:121}))),
      E('image',{href:window.__FG_SHEET_URL,x:0,y:0,width:1003,height:1568,clipPath:`url(#${id})`})
    );
  }
  return E('span',{className:'fg-icon','data-rive-status':status,'data-artboard':artboard,'aria-hidden':true},
    E('span',{className:'fg-fallback'},fallback('fg-silver',1),fallback('fg-blue',0)),
    E('canvas',{ref:canvas,className:'fg-rive-canvas',width:128,height:144,'aria-hidden':true})
  );
}
function FansaiGlassNavigation({selected,onNavigate,visibleTabs,badge}) {
  const E=ju.createElement;
  const tabs=[{id:'ops',label:'增长',artboard:'Growth'},{id:'cust',label:'客户',artboard:'Customers'},{id:'appr',label:'决策',artboard:'Decision'},{id:'more',label:'工作台',artboard:'Workbench'}]
    .map((tab,index)=>({...tab,index})).filter(tab=>tab.id==='more'||visibleTabs.includes(tab.id));
  const [pressed,setPressed]=ju.useState(null);
  const [appearance]=fgUseAppearance();
  const [reduced,setReduced]=ju.useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nav=ju.useRef(null),light=ju.useRef(null),previous=ju.useRef(selected),lightAnimation=ju.useRef(null),selectionAnimations=ju.useRef([]);
  ju.useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  ju.useLayoutEffect(()=>{
    const from=previous.current;previous.current=selected;
    if(from===selected||reduced||!nav.current||!light.current)return;
    const a=tabs.findIndex(t=>t.id===from),b=tabs.findIndex(t=>t.id===selected);
    if(a<0||b<0)return;
    lightAnimation.current?.cancel();
    selectionAnimations.current.forEach(animation=>animation.cancel());
    const buttons=nav.current.querySelectorAll("button"),half=light.current.offsetWidth/2;
    const center=i=>buttons[i].offsetLeft+buttons[i].offsetWidth/2-half;
    const x0=center(a),x1=center(b);
    lightAnimation.current=light.current.animate([
      {transform:`translateX(${x0}px) scaleX(.65)`,opacity:0,offset:0},
      {transform:`translateX(${x0+(x1-x0)*.55}px) scaleX(1.85)`,opacity:.95,offset:.38},
      {transform:`translateX(${x1}px) scaleX(.85)`,opacity:0,offset:1}
    ],{duration:640,easing:'cubic-bezier(.22,.7,.18,1)',fill:'none'});
    const icon=buttons[b].querySelector('.fg-icon');
    const direction=b>a?1:-1;
    const iconAnimation=icon.animate([
      {transform:'translateY(0) scale(1) rotate(0deg)',offset:0},
      {transform:`translateY(-7px) scale(1.24) rotate(${direction*-5}deg)`,offset:.36},
      {transform:`translateY(1px) scale(.97) rotate(${direction*2}deg)`,offset:.76},
      {transform:'translateY(0) scale(1) rotate(0deg)',offset:1}
    ],{duration:620,easing:'cubic-bezier(.22,.75,.24,1)'});
    const page=nav.current.closest('.fansai-mobile-scope')?.querySelector('#v-'+selected);
    const transition=page?.animate([
      {opacity:.55,transform:`translateX(${direction*14}px)`},
      {opacity:1,transform:'translateX(0)'}
    ],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
    selectionAnimations.current=[iconAnimation,transition].filter(Boolean);
  },[selected,reduced]);
  ju.useEffect(()=>{const stop=()=>{lightAnimation.current?.cancel();selectionAnimations.current.forEach(animation=>animation.cancel());selectionAnimations.current=[];};if(reduced)stop();return stop;},[reduced]);
  function keyNavigate(event,index){
    const key=event.key;
    if(key===' '||key==='Enter')setPressed(tabs[index].id);
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
    event.preventDefault();
    const next=key==='Home'?0:key==='End'?tabs.length-1:(index+(key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    nav.current.querySelectorAll('button')[next]?.focus();
  }
  return E('nav',{ref:nav,className:'tb fg-nav','data-appearance':appearance,'aria-label':l('主导航'),style:{gridTemplateColumns:`repeat(${tabs.length},minmax(0,1fr))`}},
    E('span',{className:'fg-light-clip','aria-hidden':true},E('span',{ref:light,className:'fg-light'})),
    ...tabs.map((tab,index)=>E('button',{
      key:tab.id,type:'button',id:'t-'+tab.id,className:selected===tab.id?'on':'',
      'aria-current':selected===tab.id?'page':undefined,
      'aria-label':tab.label+(tab.id==='appr'&&badge?'，'+badge+'项待处理':''),
      onPointerDown:()=>setPressed(tab.id),onPointerUp:()=>setPressed(null),onPointerCancel:()=>setPressed(null),onPointerLeave:()=>setPressed(null),
      onKeyDown:(event)=>keyNavigate(event,index),onKeyUp:()=>setPressed(null),onBlur:()=>setPressed(null),
      onClick:()=>{setPressed(null);onNavigate(tab.id);}
    },E(FansaiGlassIcon,{index:tab.index,artboard:tab.artboard,active:selected===tab.id,pressed:pressed===tab.id,reduced}),
    E('span',{className:'fg-label'},tab.label),
    tab.id==='appr'?E('span',{className:'bd',id:'apBadge',hidden:!badge,'aria-hidden':true},badge):null))
  );
}
