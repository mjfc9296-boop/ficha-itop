(()=>{'use strict';
 const $=id=>document.getElementById(id),top=document.querySelector('#sondagem > .itop-sales-flow'),toolbar=top?.querySelector('.actions');
 if(top&&toolbar){
  top.id='itop-survey-toolbar';toolbar.classList.add('itop-survey-toolbar-actions');if($('itop-flow-new'))$('itop-flow-new').textContent='NOVA PROPOSTA';
  const controls = $('itop-proposal-controlbar');
  if (controls) {
   const row = document.createElement('div');
   row.className = 'itop-survey-proposal-row';
   top.before(row);
   row.append(top, controls);
   const customer = document.querySelector('#sondagem .survey-customer-heading')?.parentElement;
   if (customer) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'comercial/sondagem-painel.css?v=20261117-servicos';
    document.head.append(stylesheet);
    const panel = document.createElement('section');
    panel.className = 'itop-sondagem-panel';
    const banner = document.createElement('img');
    banner.className = 'itop-sondagem-banner';
    banner.src = 'comercial/sondagem-cabecalho-20261117.jpg';
    banner.alt = 'Sondagem';
    row.before(panel);
    panel.append(banner, row);
    customer.classList.add('itop-sondagem-customer');
    panel.append(customer);
    const status = document.createElement('div');
    status.className = 'itop-sondagem-status';
    status.append(...top.querySelectorAll('.itop-flow-progress, .itop-flow-message'));
    panel.after(status);
    for (const [id, caption] of Object.entries({
     nome: 'Cliente', telefone: 'WhatsApp', cidade: 'Cidade', vendedor: 'Consultor'
    })) {
     const label = $(id)?.previousElementSibling;
     if (label?.tagName === 'LABEL') {
      label.htmlFor = id;
      label.textContent = caption;
     }
    }
    $('itop-search-toggle').textContent = 'BUSCA TOTAL DO SITE';
    const test = $('survey-is-test');
    test.setAttribute('aria-describedby', 'survey-test-hint');
    test.parentElement.lastChild.textContent = 'TESTE';
    customer.querySelector('h2').textContent = 'Dados do Cliente';
   }
  }
  const number=$('survey-proposal-id');if(number){const line=document.createElement('div');line.id='itop-proposal-number';line.append(document.createTextNode('PROPOSTA Nº: '),number);top.prepend(line);}
 }
 const packageCustomer = $('pacoteNome')?.closest('.customer-panel');
 if (packageCustomer) {
  packageCustomer.classList.add('itop-package-customer');
  const banner = document.createElement('img');
  banner.className = 'itop-package-banner';
  banner.src = 'comercial/adicionar-servicos-20261117.jpg';
  banner.alt = 'Adicionar Serviços';
  packageCustomer.prepend(banner);
  const heading = packageCustomer.querySelector('h2');
  const title = document.createElement('span');
  title.textContent = 'Dados do Cliente';
  heading.replaceChildren(title);
  for (const id of ['pacoteNome', 'pacoteTelefone', 'pacoteCidade', 'pacoteVendedor']) {
   const input = $(id);
   const label = input?.previousElementSibling;
   if (label?.tagName === 'LABEL') label.htmlFor = id;
  }
 }
 const old=$('itop-survey-record');if(old){old.hidden=true;old.setAttribute('aria-hidden','true');old.inert=true;}
 // Campos internos são conservados para o histórico e os scripts já existentes.
 // A observação obrigatória permanece no bloco de finalização, fora desta seção.
 const observation=$('final-observation'),agenda=document.querySelector('.itop-return-panel');
 if(observation&&agenda)observation.insertAdjacentElement('afterend',agenda);
 const finish=$('itop-flow-finish'),closingActions=finish?.closest('.actions');
 const adjust=document.querySelector('#fechamento button[onclick="switchModule(\'pacote\')"]');
 if(closingActions&&adjust){closingActions.id='itop-closing-actions';adjust.id='itop-closing-adjust';adjust.textContent='AJUSTAR SERVIÇOS';for(const button of [$('pdf-with-energy'),$('pdf-without-energy'),adjust,finish])if(button)closingActions.append(button);}
 const bar=document.querySelector('#sondagem .itop-one-line-actions');
 const message=$('itop-next-message');if(bar&&message&&bar.contains(message))bar.insertAdjacentElement('afterend',message);
})();
