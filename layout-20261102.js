(()=>{
 const menu=document.querySelector('.itop-module-menu'), links=document.querySelector('.itop-link-menu');
 const mq=matchMedia('(max-width:900px)');
 function resize(){menu.open=!mq.matches;links.open=!mq.matches;}
 resize();mq.addEventListener('change',resize);
 const tabs=[...document.querySelectorAll('.nav-tab[data-module]')];
 function sync(){tabs.forEach(tab=>tab.setAttribute('aria-current',tab.classList.contains('active')?'page':'false'));}
 tabs.forEach(tab=>{tab.addEventListener('click',()=>{sync();if(mq.matches){menu.open=false;document.querySelector('.module.active')?.scrollIntoView({behavior:'smooth',block:'start'});}});});
 new MutationObserver(sync).observe(document.querySelector('nav.nav-tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
 const action=document.getElementById('simulateEnergy')?.closest('.actions');
 if(action)document.querySelector('#pacote')?.append(action);
 sync();
})();
