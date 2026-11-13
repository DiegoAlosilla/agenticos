// Supported self-hosted plugin entry point; no core source patch.
window.ICONSEARCH_PATH = null;
window.ICON_SERVICE_PATH = null;
App.initPluginCallback();
if (urlParams['contracts'] !== '0') {
  mxscript('plugins/contracts.js');
}
