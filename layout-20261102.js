(()=>{
 const menu=document.querySelector('.itop-module-menu'), links=document.querySelector('.itop-link-menu');
 const main=document.querySelector('main'), moduleRail=menu.closest('.itop-work-rail');
 const linkRail=document.createElement('aside');
 linkRail.className='itop-work-rail itop-links-rail';
 linkRail.setAttribute('aria-label','Links úteis');
 main.append(linkRail);
 const mq=matchMedia('(max-width:900px)');
 function resize(){
  if(mq.matches){moduleRail.append(links);linkRail.hidden=true;}
  else{linkRail.append(links);linkRail.hidden=false;}
  menu.open=!mq.matches;links.open=!mq.matches;
 }
 resize();mq.addEventListener('change',resize);
 const tabs=[...document.querySelectorAll('.nav-tab[data-module]')];
 function sync(){tabs.forEach(tab=>tab.setAttribute('aria-current',tab.classList.contains('active')?'page':'false'));}
 tabs.forEach(tab=>{tab.addEventListener('click',()=>{sync();if(mq.matches){menu.open=false;document.querySelector('.module.active')?.scrollIntoView({behavior:'smooth',block:'start'});}});});
 new MutationObserver(sync).observe(document.querySelector('nav.nav-tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
 const action=document.getElementById('simulateEnergy')?.closest('.actions');
 if(action)document.querySelector('#pacote')?.append(action);
 sync();
})();

/* Canais e procedimentos da ITOP TV são dois materiais independentes. */
(() => {
  const cover = document.querySelector('#svas-area a.training-cover[href="itop-tv-canais-disponiveis.webp"]');
  const channels = cover?.closest('.training-card');
  const pdf = channels?.querySelector('a.training-open');
  if (!pdf) return;

  const procedures = channels.cloneNode(true);
  const proceduresCover = procedures.querySelector('a.training-cover');
  proceduresCover.href = pdf.href;
  proceduresCover.setAttribute('aria-label', 'Visualizar PDF de procedimentos da ITOP TV');
  const image = proceduresCover.querySelector('img');
  image.src = 'sva-capa-1.png';
  image.alt = 'ITOP TV — Procedimentos';
  procedures.querySelector('h3').textContent = 'ITOP TV — Procedimentos';
  channels.after(procedures);

  channels.querySelector('h3').textContent = 'ITOP TV — Canais disponíveis';
  channels.querySelector('p').textContent = 'Consulte a grade de canais da ITOP TV.';
  channels.querySelector('.training-format').textContent = 'GRADE DE CANAIS';
  channels.querySelector('.training-meta span:last-child')?.remove();
  pdf.href = cover.href;
  pdf.textContent = 'Ver canais disponíveis';
  channels.querySelector('.training-download')?.remove();
})();

(() => {
  const style = document.createElement('style');
  style.textContent = `
    html body main .module[id] :is(.training-wa,.useful-link-wa,#supportWhatsApp,#energiaWhatsapp,#sondagemWhatsapp,#pacoteWhatsapp,#shareClosing,a[href*="wa.me/"],a[href*="whatsapp.com/"]),
    html body dialog[id] :is(#webPDF,#appPDF,#openWebChat) {
      background: #25d366 !important;
      border-color: #25d366 !important;
      color: #111 !important;
    }
  `;
  document.head.append(style);
})();
