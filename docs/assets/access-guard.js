(function () {
  var LOG_PREFIX = '[AccessGuard]';

  // Domínios da Plataforma Target autorizados a exibir esta base de conhecimento em iframe.
  var ALLOWED_REFERRER_HOSTS = [
    'plataformatarget.com.br',
    'visao.serpro.gov.br'
  ];

  // --- MODO DE TESTE LOCAL --------------------------------------------
  // Só ativa quando o site está rodando em localhost/127.0.0.1 (mkdocs serve).
  // Permite simular um referrer "autorizado" sem precisar de DNS/domínio real.
  // REMOVER este bloco (e o parâmetro ?debug_allow=1) antes de migrar para produção.
  var isLocalDev = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1;
  var debugAllow = isLocalDev && /(?:^|[?&])debug_allow=1(?:&|$)/.test(location.search);
  if (isLocalDev) {
    ALLOWED_REFERRER_HOSTS = ALLOWED_REFERRER_HOSTS.concat(['localhost', '127.0.0.1']);
  }
  // ---------------------------------------------------------------------

  function log(msg) {
    console.log(LOG_PREFIX + ' ' + msg);
  }

  function hostMatches(hostname, allowedList) {
    return allowedList.some(function (allowed) {
      return hostname === allowed || hostname.endsWith('.' + allowed);
    });
  }

  function isInsideIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      // Acesso a window.top bloqueado por cross-origin normalmente significa que
      // estamos em um iframe de outra origem — tratamos como "está em iframe".
      return true;
    }
  }

  function getReferrerHost() {
    if (!document.referrer) return null;
    try {
      return new URL(document.referrer).hostname;
    } catch (e) {
      return null;
    }
  }

  function grantAccess(reason) {
    log('Acesso liberado (' + reason + ').');
    document.documentElement.classList.add('access-granted');
  }

  function blockAccess(reason) {
    log('Acesso bloqueado (' + reason + ').');
    document.documentElement.classList.add('access-blocked');

    var run = function () {
      document.body.innerHTML =
        '<div class="access-blocked-screen">' +
        '  <div class="access-blocked-card">' +
        '    <h1>Acesso restrito</h1>' +
        '    <p>Esta página só pode ser acessada de dentro da Plataforma. ' +
        '    Acesse pelo atalho disponível na sua área de trabalho.</p>' +
        '  </div>' +
        '</div>';
    };

    if (document.body) {
      run();
    } else {
      document.addEventListener('DOMContentLoaded', run);
    }
  }

  var inIframe = isInsideIframe();
  var referrerHost = getReferrerHost();

  if (debugAllow) {
    grantAccess('debug_allow=1 em ambiente local');
    return;
  }

  if (!inIframe) {
    blockAccess('não está dentro de um iframe');
    return;
  }

  if (!referrerHost || !hostMatches(referrerHost, ALLOWED_REFERRER_HOSTS)) {
    blockAccess('referrer ausente ou não autorizado: ' + referrerHost);
    return;
  }

  grantAccess('iframe com referrer autorizado: ' + referrerHost);
})();
