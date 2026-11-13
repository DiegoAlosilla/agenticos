// Same editor, local-only resources and device storage. No offline=1 (disables plugins).
(function () {
  var params = new URLSearchParams(window.location.search);
  var fixed = {gapi:'0', db:'0', od:'0', gh:'0', gl:'0', tr:'0', browser:'0', picker:'0', stealth:'1', math:'0', mode:'device'};
  Object.keys(fixed).forEach(function (key) { params.set(key, fixed[key]); });
  window.urlParams = Object.fromEntries(params);
  window.urlParams.sync = 'manual';
  window.DRAWIO_PUBLIC_BUILD = true;
  window.DRAWIO_BASE_URL = window.location.origin;
  window.DRAWIO_LIGHTBOX_URL = window.location.origin;
  window.EXPORT_URL = null;
  window.DRAWIO_LOG_URL = '';
  window.DRAWIO_CONFIG = {enableAi: false};
})();
