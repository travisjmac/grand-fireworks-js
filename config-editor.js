(() => {
  const clone = value => structuredClone(value);
  function merge(base, input) {
    for (const [key, value] of Object.entries(input || {})) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        base[key] = merge(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
      } else base[key] = clone(value);
    }
    return base;
  }
  function encode(config) { return JSON.stringify(config, (_, v) => v === Infinity ? '__GF_INFINITY__' : v); }
  function decode(text) { return JSON.parse(text, (k, v) => ['__proto__','constructor','prototype'].includes(k) ? undefined : v === '__GF_INFINITY__' ? Infinity : v); }
  window.FireworksConfigEditor = class {
    static encode = encode;
    static decode = decode;
    constructor(host, initial) { this.host = host; this.reset(initial); }
    help(path) {
      const data=window.FireworksConfigHelp?.[path];
      if(!data)return document.createTextNode('');
      const wrap=document.createElement('span');wrap.className='config-help';
      const button=document.createElement('button');button.type='button';button.className='config-help-button';button.textContent='?';button.setAttribute('aria-label','Help for '+(path||'initialisation'));button.setAttribute('aria-haspopup','dialog');
      const tooltip=document.createElement('span');tooltip.className='config-tooltip';tooltip.textContent=data.description;tooltip.id='help-'+Math.random().toString(36).slice(2);tooltip.setAttribute('role','tooltip');button.setAttribute('aria-describedby',tooltip.id);
      wrap.append(button,tooltip);
      button.addEventListener('click',()=>{
        const dialog=document.createElement('dialog');dialog.className='config-dialog config-help-dialog';
        const heading=document.createElement('h2');heading.textContent=data.title;
        const close=document.createElement('button');close.type='button';close.textContent='Close';
        const body=document.createElement('div');body.className='help-content';body.innerHTML=data.html;
        dialog.append(heading,close,body);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
      });return wrap;
    }
    reset(initial) {
      this.value = merge(clone(window.FireworksConfigData.defaults), initial);
      this.host.replaceChildren();
      this.sections = new Map(); this.inputs = new Map();
      const start = document.createElement('div'); start.className = 'json-line'; start.textContent = 'const config = {'; this.host.append(start);
      this.render(this.value, this.host, '', 1);
      const end = document.createElement('div'); end.className = 'json-line'; end.textContent = '};'; this.host.append(end);
    }
    render(object, host, prefix, depth) {
      const entries = Object.entries(object);
      entries.forEach(([key, original], index) => {
        const path = prefix ? prefix + '.' + key : key;
        const comma = index < entries.length - 1 ? ',' : '';
        if ((original && typeof original === 'object' && !Array.isArray(original)) || path === 'background') {
          const section = document.createElement('section'); section.className = 'json-section'; section.id = 'edit-' + path.replaceAll('.', '-');
          const summary = document.createElement('div');summary.className='json-section-heading'; summary.textContent = '  '.repeat(depth) + JSON.stringify(key) + ': {';
          summary.append(this.help(path));
          section.append(summary); host.append(section); this.sections.set(path, section);
          let nested = original;
          if (path === 'background') {
            nested = original || {value:'#080b18',opacity:1,className:''};
            const enabled = document.createElement('input'); enabled.type='checkbox'; enabled.checked=!!original;
            const label=document.createElement('label'); label.className='json-background'; label.append(enabled,document.createTextNode(' Enable background'));
            section.append(label); enabled.addEventListener('change',()=>{object[key]=enabled.checked?nested:false;});
            if(enabled.checked)object[key]=nested;
          }
          this.render(nested, section, path, depth + 1);
          const close=document.createElement('div'); close.className='json-line'; close.textContent='  '.repeat(depth)+'}'+comma;section.append(close);
          return;
        }
        const line=document.createElement('div');line.className='json-line';line.append(document.createTextNode('  '.repeat(depth)+JSON.stringify(key)+': '));
        const schema=window.FireworksConfigData.fields[path]||{};
        const options=typeof original==='boolean'?['true','false']:path==='renderer.preserveDrawingBuffer'?['auto','true','false']:schema.choices;
        let control;
        if(options && options.length && (typeof original==='string'||typeof original==='boolean')) {
          control=document.createElement('select');
          for(const choice of options)control.add(new Option(typeof original==='boolean'?choice:JSON.stringify(choice),choice,false,choice===String(original)));
        } else {
          control=document.createElement('input');
          const number=typeof original==='number'&&Number.isFinite(original)&&!schema.flexible;
          control.type=number?'number':'text';if(number)control.step=schema.integer?'1':'any';
          control.value=Array.isArray(original)?JSON.stringify(original):original===null?'null':String(original);
          if(Array.isArray(original))control.className='json-array';
        }
        control.setAttribute('aria-label',path);this.inputs.set(path,control);
        if(typeof original==='string'&&control.tagName==='INPUT')line.append(document.createTextNode('"'));
        line.append(control);
        if(typeof original==='string'&&control.tagName==='INPUT')line.append(document.createTextNode('"'));
        line.append(document.createTextNode(comma),this.help(path));host.append(line);
        if(path==='background.value'){
          const build=document.createElement('button');build.type='button';build.className='background-builder-launch';build.textContent='Build background';
          build.addEventListener('click',()=>this.buildBackground(control));line.append(build);
        }
        control.addEventListener('input',()=>{
          try {
            const raw=control.value.trim();let next;
            if(typeof original==='boolean')next=raw==='true';
            else if(schema.flexible){
              if(raw==='null')next=null;
              else if(raw==='Infinity')next=Infinity;
              else if(raw.startsWith('[')){next=JSON.parse(raw);if(!Array.isArray(next))throw Error('Enter a JSON array.');}
              else if(raw==='true'||raw==='false')next=raw==='true';
              else if(raw && Number.isFinite(Number(raw)))next=Number(raw);
              else next=control.value;
              if(path==='textFirework.tilt' && !(typeof next==='number'||(Array.isArray(next)&&next.length===2&&next.every(v=>typeof v==='number'&&Number.isFinite(v)))))throw Error('Enter a number or a [min, max] pair.');
              if(path==='renderer.preserveDrawingBuffer' && !['auto',true,false].includes(next))throw Error('Choose auto, true or false.');
              if(path==='show.enabledTypes' && next!=='all' && !Array.isArray(next))throw Error('Enter all or a JSON array of shell names.');
            } else if(typeof original==='string')next=control.value;
            else if(Array.isArray(original)){next=JSON.parse(raw);if(!Array.isArray(next))throw Error('Enter a JSON array.');}
            else if(raw==='null'&&original===null)next=null;
            else if(raw==='Infinity')next=Infinity;
            else {if(!raw||!Number.isFinite(Number(raw)))throw Error('Enter a number.');next=Number(raw);}
            if(schema.integer&&typeof next==='number'&&Number.isFinite(next)&&!Number.isInteger(next))throw Error('Enter a whole number.');
            object[key]=next;control.setCustomValidity('');
          }catch(error){control.setCustomValidity(error.message);}
        });
      });
    }
    getValue() {
      const invalid=this.host.querySelector(':invalid');
      if(invalid){this.open(invalid.getAttribute('aria-label'));invalid.reportValidity();throw Error('Correct the highlighted value.');}
      return clone(this.value);
    }
    buildBackground(control) {
      const dialog=document.createElement('dialog');dialog.className='config-dialog background-builder';dialog.setAttribute('aria-label','Background builder');
      dialog.innerHTML='<h2>Background builder</h2><p>Choose a colour, gradient, or image with an optional gradient overlay. You can still edit the resulting CSS directly.</p><div class="background-fields"><label>Background type<select data-kind><option value="colour">Colour</option><option value="gradient">Gradient</option><option value="image">Image</option></select></label><label>First colour<input type="color" data-first value="#080b18"></label><label>Second colour<input type="color" data-second value="#243d73"></label><label>Gradient angle<input type="number" data-angle value="135" min="0" max="360"></label><label>Gradient opacity (%)<input type="number" data-alpha value="100" min="0" max="100"></label><label class="image-field">Image reference<input type="text" data-image placeholder="https://example.com/background.jpg"></label><label><input type="checkbox" data-overlay> Gradient over image</label></div><p data-note></p><div class="background-swatch" aria-label="Background preview"></div><pre data-output></pre><div class="dialog-actions"><button type="button" data-use>Use background</button><button type="button" data-cancel>Cancel</button></div>';
      document.body.append(dialog);
      const get=key=>dialog.querySelector('[data-'+key+']');
      const old=control.value;
      if(/^#[0-9a-f]{6}$/i.test(old))get('first').value=old;
      else if(old.trim())get('note').textContent='Your existing CSS stays unchanged until you select Use background.';
      let css='';
      function update(){
        const kind=get('kind').value;
        const angle=Number(get('angle').value),alpha=Number(get('alpha').value);
        const needsGradient=kind==='gradient'||(kind==='image'&&get('overlay').checked);
        const valid=!needsGradient||(get('angle').value!==''&&get('alpha').value!==''&&Number.isFinite(angle)&&angle>=0&&angle<=360&&Number.isFinite(alpha)&&alpha>=0&&alpha<=100);
        const rgba=hex=>'rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+', '+(alpha/100)+')';
        const gradient='linear-gradient('+angle+'deg, '+rgba(get('first').value)+', '+rgba(get('second').value)+')';
        const image=get('image').value.trim();
        css=kind==='colour'?get('first').value:kind==='gradient'?gradient:(get('overlay').checked?gradient+', ':'')+'url('+JSON.stringify(image)+') center / cover no-repeat';
        get('use').disabled=!valid||(kind==='image'&&!image);
        get('output').textContent=css;
        dialog.querySelector('.background-swatch').removeAttribute('style');
        dialog.querySelector('.background-swatch').style.background=css;
        get('image').disabled=kind!=='image';get('overlay').disabled=kind!=='image';
        get('second').disabled=kind==='colour';get('angle').disabled=kind==='colour';get('alpha').disabled=kind==='colour';
      }
      dialog.addEventListener('input',update);dialog.addEventListener('change',update);
      get('use').onclick=()=>{control.value=css;control.dispatchEvent(new Event('input',{bubbles:true}));const enabled=control.closest('.json-section').querySelector('.json-background input');if(enabled&&!enabled.checked){enabled.checked=true;enabled.dispatchEvent(new Event('change',{bubbles:true}));}dialog.close();};
      get('cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
      update();dialog.showModal();
    }
    open(path) {
      const target=this.inputs.get(path)||this.sections.get(path)||this.host;
      let parent=target.closest('details');while(parent){parent.open=true;parent=parent.parentElement.closest('details');}
      target.scrollIntoView({block:'center'});if(target.matches('input,select'))target.focus();
    }
  };
})();
