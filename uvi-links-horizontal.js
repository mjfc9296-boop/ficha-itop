(()=>{'use strict';
 const panel=document.getElementById('usefulLinksPanel');if(!panel)return;
 for(const item of panel.querySelectorAll('.useful-link-item')){
  const anchor=item.querySelector('a.useful-link'),actions=item.querySelector('.useful-link-actions');if(!anchor||!actions)continue;
  const button=document.createElement('button');button.type='button';button.className='useful-link-copy-button';button.textContent='Copiar link';button.setAttribute('aria-label','Copiar link: '+item.querySelector('strong').textContent);
  const status=document.createElement('span');status.className='useful-link-copy-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  button.onclick=async()=>{button.disabled=true;status.textContent='';
   try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(anchor.href);else{const input=document.createElement('textarea');input.value=anchor.href;input.setAttribute('readonly','');input.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw Error('copy');}
    button.textContent='Link copiado ✓';status.textContent='Link copiado.';setTimeout(()=>{button.textContent='Copiar link';status.textContent='';},3000);
   }catch{status.textContent='Não foi possível copiar automaticamente. Copie o endereço abaixo.';const input=document.createElement('input');input.type='text';input.readOnly=true;input.value=anchor.href;input.className='useful-link-copy-fallback';status.append(input);input.focus();input.select();}
   finally{button.disabled=false;}
  };actions.append(button,status);
 }
})();
