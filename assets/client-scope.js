/*!
 * client-scope.js v1
 * Filtra artigos/categorias específicos de cliente e/ou ambiente.
 * - Cliente: derivado do document.referrer (subdomínio do host do Target).
 * - Ambiente: derivado do parâmetro ?ambiente=/#ambiente=, que o portlet HTML
 *   Customizado precisa passar (ex.: themeDisplay.getClientId()), já que esse
 *   dado não existe dentro do iframe.
 * - Páginas sem entrada em SCOPED_PAGES continuam visíveis para todo mundo.
 */
(function () {
  var LOG_PREFIX = '[ClientScope]';
  function log(msg) {
    console.log(LOG_PREFIX + ' ' + msg);
  }

  // Mesmos domínios-base do access-guard.js — o "cliente" é o subdomínio deles.
  var KNOWN_BASE_DOMAINS = ['plataformatarget.com.br', 'visao.serpro.gov.br'];

  // --- MODO DE TESTE LOCAL --------------------------------------------
  // Permite simular o cliente via ?debug_cliente=<code> quando rodando em
  // localhost/127.0.0.1, sem precisar de DNS/domínio real.
  // REMOVER este bloco (e o parâmetro ?debug_cliente=) antes de migrar para produção.
  var isLocalDev = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1;
  // ---------------------------------------------------------------------

  // Manifesto: só lista páginas com escopo restrito (arquivo → cliente(s)/ambiente(s)).
  // "clientes" e "ambientes" são independentes: se os dois estiverem presentes,
  // os dois precisam bater. Se só um estiver presente, só ele é exigido.
  var SCOPED_PAGES = {
    'regras-do-ambiente': { clientes: ['facilit'], ambientes: ['601'] }
  };

  function getReferrerHost() {
    if (!document.referrer) return null;
    try {
      return new URL(document.referrer).hostname;
    } catch (e) {
      return null;
    }
  }

  function getParams() {
    var h = new URLSearchParams(location.hash.replace(/^#/, ''));
    var q = new URLSearchParams(location.search);
    function pick(k) {
      return h.get(k) || q.get(k);
    }
    return {
      ambienteId: pick('ambiente') || null,
      debugCliente: pick('debug_cliente') || null
    };
  }

  function getClienteCode(referrerHost, debugCliente) {
    if (isLocalDev && debugCliente) return debugCliente;
    if (!referrerHost) return null;
    for (var i = 0; i < KNOWN_BASE_DOMAINS.length; i++) {
      var base = KNOWN_BASE_DOMAINS[i];
      if (referrerHost === base) return null; // host raiz, sem subdomínio de cliente
      var suffix = '.' + base;
      if (referrerHost.length > suffix.length && referrerHost.indexOf(suffix, referrerHost.length - suffix.length) !== -1) {
        return referrerHost.slice(0, referrerHost.length - suffix.length);
      }
    }
    return null;
  }

  var params = getParams();
  var CLIENTE = getClienteCode(getReferrerHost(), params.debugCliente);
  var AMBIENTE = params.ambienteId;

  function pageKeyFromHref(href) {
    try {
      var path = new URL(href, location.href).pathname;
      var parts = path.split('/').filter(Boolean);
      var last = parts[parts.length - 1] || '';
      return decodeURIComponent(last).replace(/__brand-[a-z]+$/i, '');
    } catch (e) {
      return '';
    }
  }

  function scopeAllows(scope) {
    if (!scope) return true; // sem entrada no manifesto = visível pra todos
    if (scope.clientes && (!CLIENTE || scope.clientes.indexOf(CLIENTE) === -1)) return false;
    if (scope.ambientes && (!AMBIENTE || scope.ambientes.indexOf(AMBIENTE) === -1)) return false;
    return true;
  }

  function hideEmptyNavSections() {
    // Depois de esconder os itens fora de escopo, esconde também categorias
    // do menu que ficaram sem nenhum item visível.
    var lists = document.querySelectorAll('.md-nav__list');
    for (var pass = 0; pass < 2; pass++) {
      lists.forEach(function (list) {
        var items = list.children;
        if (!items.length) return;
        var anyVisible = Array.prototype.some.call(items, function (li) {
          return li.style.display !== 'none';
        });
        if (!anyVisible) {
          var parentLi = list.closest('.md-nav__item');
          if (parentLi) parentLi.style.display = 'none';
        }
      });
    }
  }

  function filterNav() {
    var hiddenCount = 0;
    document.querySelectorAll('.md-nav a[href]').forEach(function (a) {
      var origHref = a.getAttribute('data-orig-href') || a.getAttribute('href');
      var key = pageKeyFromHref(origHref);
      var scope = SCOPED_PAGES[key];
      if (!scope) return;
      var allowed = scopeAllows(scope);
      var li = a.closest('li') || a.parentElement;
      if (li) li.style.display = allowed ? '' : 'none';
      if (!allowed) hiddenCount++;
    });
    hideEmptyNavSections();
    return hiddenCount;
  }

  function blockIfCurrentPageOutOfScope() {
    var key = pageKeyFromHref(location.pathname);
    var scope = SCOPED_PAGES[key];
    if (!scope || scopeAllows(scope)) return;
    var content = document.querySelector('.md-content__inner');
    if (content) {
      content.innerHTML =
        '<h1>Conteúdo não disponível</h1>' +
        '<p>Este artigo é específico de outro cliente/ambiente.</p>';
    }
    log('Conteúdo bloqueado (fora de escopo): cliente=' + CLIENTE + ' ambiente=' + AMBIENTE);
  }

  function apply() {
    var hidden = filterNav();
    blockIfCurrentPageOutOfScope();
    log('cliente=' + CLIENTE + ' ambiente=' + AMBIENTE + ' itens ocultos=' + hidden);
  }

  // warm-up: a nav pode ainda não estar pronta no primeiro tick
  var tries = 0;
  (function wait() {
    if (document.querySelector('.md-nav a[href]') || tries >= 30) {
      apply();
      setTimeout(apply, 100);
      setTimeout(apply, 300);
      return;
    }
    tries++;
    requestAnimationFrame(wait);
  })();
})();
