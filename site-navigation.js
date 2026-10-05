(() => {
  const next=document.body.dataset.nextPage;
  if(!next)return;
  const zone=document.createElement('div');zone.className='scroll-next-zone';
  const link=document.createElement('a');link.href=next;
  const label=document.body.dataset.sitePage==='home'?'Guide':'Workbench';
  link.append(document.createTextNode('Loading '+label.toLowerCase()));
  const hint=document.createElement('span');hint.textContent='Keep scrolling to continue, or click here';link.append(hint);zone.append(link);
  const fade=document.createElement('div');fade.className='scroll-next-fade';fade.setAttribute('aria-hidden','true');
  document.body.append(zone,fade);
  let queued=false,navigating=false;
  let frame,ready=false;
  function preload(){
    if(frame)return;
    frame=document.createElement('iframe');frame.className='scroll-next-page';frame.title=label;frame.src=next;
    frame.setAttribute('aria-hidden','true');frame.inert=true;
    frame.addEventListener('load',()=>{ready=true;if(navigating)reveal();},{once:true});
    document.body.append(frame);
  }
  function reveal(){
    frame.inert=false;frame.removeAttribute('aria-hidden');frame.classList.add('visible');
    navigating=false;
  }
  function continueInPage(){if(navigating)return;navigating=true;preload();scrollTo(0,document.documentElement.scrollHeight);if(ready)reveal();}
  link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();continueInPage();});
  function update(){
    queued=false;
    if(navigating)return;
    if(document.querySelector('dialog[open]')||document.body.classList.contains('showing-fireworks')){fade.style.opacity='0';return;}
    const top=zone.getBoundingClientRect().top+scrollY;
    // Start fading only once the final real content has left the viewport.
    const start=top-innerHeight;
    const travel=zone.offsetHeight;
    const progress=Math.max(0,Math.min(1,(scrollY-start)/travel));
    fade.style.opacity=String(progress*progress);
    if(frame&&ready){frame.style.opacity=String(Math.max(0,(progress-.65)/.35));const active=progress>=.998;frame.inert=!active;frame.style.pointerEvents=active?'auto':'none';frame.setAttribute('aria-hidden',String(!active));}
    if(progress>0)preload();
    if(progress>=.998)continueInPage();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  addEventListener('pageshow',()=>{navigating=false;schedule();});
})();
