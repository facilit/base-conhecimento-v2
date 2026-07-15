/*!
 * iframe-resize.js v1
 * Avisa a página que embute este site (via postMessage) qual é a altura real
 * do conteúdo, para que o iframe possa crescer sem precisar de scroll próprio
 * — assim só existe uma barra de rolagem (a do navegador/página que embute).
 */
(function () {
  var LOG_PREFIX = '[IframeResize]';
  function log(msg) {
    console.log(LOG_PREFIX + ' ' + msg);
  }

  function sendHeight() {
    var height = document.documentElement.scrollHeight;
    try {
      window.parent.postMessage({ type: 'bc-resize', height: height }, '*');
    } catch (e) {
      // fora de um iframe, ou parent bloqueado — sem problema, simplesmente não faz nada.
    }
  }

  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);

  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function () {
      sendHeight();
    });
    ro.observe(document.body);
  }

  // Reforço: imagens/fontes que carregam de forma assíncrona podem mudar a
  // altura um pouco depois do load inicial.
  setTimeout(sendHeight, 300);
  setTimeout(sendHeight, 800);
  setTimeout(sendHeight, 1500);

  sendHeight();
  log('inicializado');
})();
