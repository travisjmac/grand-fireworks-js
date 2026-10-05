(() => {
  const editor=new FireworksConfigEditor(document.getElementById('initialisation-editor'));
  const status=document.getElementById('config-status');
  const tabs=Array.from(document.querySelectorAll('[role=tab]'));
  function select(name){for(const tab of tabs){const active=tab.getAttribute('aria-controls')===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;}}
  for(const tab of tabs){tab.addEventListener('click',()=>{select(tab.getAttribute('aria-controls'));history.replaceState(null,'','#'+tab.getAttribute('aria-controls'));});tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(tab)+1)%tabs.length];next.click();next.focus();});}
  function navigate(){const id=decodeURIComponent(location.hash.slice(1));if(id==='methods'||id==='functions-properties'||id.startsWith('function-')){select('methods');const target=document.getElementById(id);if(target)target.scrollIntoView({block:'start'});return;}
    select('initialisation');if(id.startsWith('edit-')){const path=[...editor.sections.keys(),...editor.inputs.keys()].find(k=>'edit-'+k.replaceAll('.','-')===id);if(path)editor.open(path);}
  }
  window.addEventListener('hashchange',navigate);navigate();
  document.getElementById('reset-config').onclick=()=>{editor.reset();status.textContent='Defaults restored.';};
  document.getElementById('try-config').onclick=()=>{try{const text=FireworksConfigEditor.encode(editor.getValue());try{localStorage.setItem('grand-fireworks-preview-config',text);}catch{}location.href='examples/guided-builder.html?mode=workbench#try-config='+encodeURIComponent(text);}catch(error){status.textContent=error.message;}};
})();
