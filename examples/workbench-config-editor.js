(() => {
  const button=document.createElement('button');button.type='button';button.className='tab-btn';button.textContent='View and Edit Config';button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','config-editor-dialog');
  const tabBar=document.getElementById('tab-bar');
  function attachTab(){if(!button.isConnected)tabBar.append(button);}
  attachTab();new MutationObserver(attachTab).observe(tabBar,{childList:true});
  const dialog=document.createElement('dialog');dialog.className='config-dialog workbench-config-dialog';dialog.id='config-editor-dialog';dialog.setAttribute('aria-labelledby','config-editor-title');
  dialog.innerHTML='<header class="config-dialog-titlebar"><h2 id="config-editor-title">View and Edit Config</h2><button type="button" data-close-x aria-label="Close configuration editor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button></header><div class="config-dialog-scroll"><div class="json-editor"></div></div><footer class="config-dialog-footer"><p data-status role="status"></p><div class="dialog-actions"><button type="button" data-apply>Apply</button><button type="button" data-apply-close>Apply and Close</button><button type="button" data-close>Close</button></div></footer>';
  document.body.append(dialog);let editor;
  function apply(config){document.getElementById('load-textarea').value='const config = '+serialize(config)+';';applyLoadedConfig();const error=document.getElementById('load-error');if(error.style.display==='block')throw Error(error.textContent);}
  function serialize(value){if(value===Infinity)return 'Infinity';if(Array.isArray(value))return '['+value.map(serialize).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).map(([k,v])=>JSON.stringify(k)+':'+serialize(v)).join(',')+'}';return JSON.stringify(value);}
  button.addEventListener('click',()=>{editor=new FireworksConfigEditor(dialog.querySelector('.json-editor'),effectiveConfig());dialog.querySelector('[data-status]').textContent='';dialog.showModal();button.classList.add('active');button.setAttribute('aria-selected','true');dialog.querySelector('.config-dialog-scroll').scrollTop=0;});
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-close-x]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{button.classList.remove('active');button.setAttribute('aria-selected','false');button.focus();});
  dialog.querySelector('[data-apply]').addEventListener('click',()=>{try{apply(editor.getValue());dialog.querySelector('[data-status]').textContent='Applied to preview.';}catch(e){dialog.querySelector('[data-status]').textContent=e.message;}});
  dialog.querySelector('[data-apply-close]').addEventListener('click',()=>{try{apply(editor.getValue());dialog.close();}catch(e){dialog.querySelector('[data-status]').textContent=e.message;}});
  const hash=location.hash;
  if(hash.startsWith('#try-config=')) {
    try{const config=FireworksConfigEditor.decode(decodeURIComponent(hash.slice(12)));apply(config);dismissWizard();try{localStorage.setItem('grand-fireworks-preview-config',FireworksConfigEditor.encode(config));}catch{}history.replaceState(null,'',location.pathname+location.search);showToast('Configuration from the guide loaded');}
    catch(error){button.textContent='View & edit config — import failed';console.error(error);}
  }
})();
