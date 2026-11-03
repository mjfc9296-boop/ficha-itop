(()=>{'use strict';
 const $=id=>document.getElementById(id),top=document.querySelector('#sondagem > .itop-sales-flow'),toolbar=top?.querySelector('.actions');
 if(top&&toolbar){
  top.id='itop-survey-toolbar';toolbar.classList.add('itop-survey-toolbar-actions');if($('itop-flow-new'))$('itop-flow-new').textContent='NOVA PROPOSTA';
  const test=$('itop-test-control');if(test)toolbar.append(test);
  const number=$('survey-proposal-id');if(number){const line=document.createElement('div');line.id='itop-proposal-number';line.append(document.createTextNode('PROPOSTA: '),number);top.prepend(line);}
 }
 const old=$('itop-survey-record');if(old){old.hidden=true;old.setAttribute('aria-hidden','true');old.inert=true;}
 // Campos internos são conservados para o histórico e os scripts já existentes.
 // A observação obrigatória permanece no bloco de finalização, fora desta seção.
 const bar=document.querySelector('#sondagem .itop-one-line-actions');
 const message=$('itop-next-message');if(bar&&message&&bar.contains(message))bar.insertAdjacentElement('afterend',message);
})();
