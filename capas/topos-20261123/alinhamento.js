// Mantém as marcas das artes originais sobre o centro dos menus que estão visíveis.
export function alinharTarjas(menu, links) {
  const centros = {
    sondagem: [161.5,1320.5], pacote: [154.5,1306], fechamento: [163,1317],
    energia: [149.5,1301], 'itop-movel': [152,1292], movel: [149.5,1307.5],
    'itop-comunica': [150,1307.5], 'svas-area': [169,1303.5],
    'comissionamento-area': [150.5,1307.5], 'portaria-seguranca': [158.5,1304],
    'gestao-usuarios': [153,1314], comercial: [150.5,1298.5],
    retencao: [150.5,1305], confraternizacao: [158,1293.5]
  };
  const header = document.querySelector('body > header');
  const canvas = document.createElement('canvas');
  canvas.className = 'itop-tarja-alinhada';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden = true;
  header.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imagens = new Map();
  let frame;
  function agendar() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(desenhar);
  }
  function desenhar() {
    const id = document.querySelector('main .module.active:not([hidden])')?.id;
    if (!Object.hasOwn(centros,id)) { canvas.hidden = true; return; }
    if (!imagens.has(id)) {
      const imagem = new Image();
      imagens.set(id,imagem);
      imagem.onload = agendar;
      imagem.src = new URL('tarja-20261128-' + id + '.webp',import.meta.url);
    }
    const imagem = imagens.get(id);
    if (!imagem.complete || !imagem.naturalWidth) { canvas.hidden = true; return; }
    canvas.hidden = false;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width*dpr);
    canvas.height = Math.round(box.height*dpr);
    ctx.setTransform(canvas.width/box.width,0,0,canvas.height/box.height,0,0);
    const w = box.width, h = box.height, scale = h/174;
    const a = menu.getBoundingClientRect(), b = links.getBoundingClientRect();
    if (!a.width || !b.width || b.left < a.right) {
      ctx.drawImage(imagem,0,4,1437,174,0,0,w,h);
      return;
    }
    const [left,right] = centros[id];
    const x1 = a.left + a.width/2 - box.left, x2 = b.left + b.width/2 - box.left;
    // Só as faixas de fundo entre os elementos absorvem a variação de largura.
    const unit = Math.min(scale,(x1-2)/(left-22),(w-x2-2)/(1415-right),(x2-x1)/1110);
    if (unit <= 0) { ctx.drawImage(imagem,0,4,1437,174,0,0,w,h); return; }
    const middle = (x1+x2)/2;
    const titleScale = Math.min(scale,(middle-x1-(300-left)*unit)/414.5,(x2-(right-1220)*unit-middle)/465.5);
    const source = [0,22,300,304,1184,1220,1415,1437];
    const dest = [0,x1+(22-left)*unit,x1+(300-left)*unit,middle-414.5*titleScale,
      middle+465.5*titleScale,x2+(1220-right)*unit,x2+(1415-right)*unit,w];
    for(let i=0;i<source.length-1;i++) {
      const start = Math.round(dest[i]*dpr)/dpr;
      const end = Math.round(dest[i+1]*dpr)/dpr;
      if(end>start) ctx.drawImage(imagem,source[i],4,source[i+1]-source[i],174,start,0,end-start,h);
    }
  }
  const observer = new ResizeObserver(agendar);
  for (const el of [menu,links,header]) observer.observe(el);
  new MutationObserver(changes => {
    if(changes.some(change => change.target.matches('.module') || change.type==='childList' &&
      [...change.addedNodes].some(node => node.nodeType===1 && node.matches('.module')))) agendar();
  }).observe(document.querySelector('main'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('resize',agendar);
  agendar();
}
