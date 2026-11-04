/* Comparação pura, em centavos, reutilizada pela tela e pelos testes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ITOPBudgetCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const cents=v=>Math.round((Number(v)||0)*100);
 const sum=rows=>rows.reduce((n,p)=>n+cents(p.price)*Number(p.q||1),0)/100;
 const key=p=>String(p.category||'').trim().toLocaleLowerCase('pt-BR').replace(/\s+\d+$/,'');
 function compare(current,proposed,discount=0){
  const before=sum(current),after=Math.max(0,sum(proposed)-Number(discount||0));
  const changes=[];const used=new Set();
  current.forEach(a=>{let i=proposed.findIndex((p,i)=>!used.has(i)&&p.name===a.name&&Number(p.q)===Number(a.q));if(i<0)i=proposed.findIndex((p,i)=>!used.has(i)&&key(p)===key(a));if(i<0)changes.push({kind:'Removido',before:a});else{used.add(i);const b=proposed[i];changes.push({kind:a.name===b.name&&cents(a.price)===cents(b.price)&&Number(a.q)===Number(b.q)?'Mantido':'Substituído / alterado',before:a,after:b});}});
  proposed.forEach((p,i)=>{if(!used.has(i))changes.push({kind:'Adicionado',after:p});});
  const delta=(cents(after)-cents(before))/100;
  return {before,after,delta,type:delta>0?'Upgrade':delta<0?'Downgrade':'Mesmo valor',changes};
 }
 return {sum,compare};
});
