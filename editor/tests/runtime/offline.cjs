// Test-only network isolation for npm/start process: loopback remains available.
// No OS/network settings are changed. Not loaded by normal npm start.
const dns = require('node:dns');
const net = require('node:net');
const loopback = host => host === '127.0.0.1' || host === 'localhost' || host === '::1';
const lookup = dns.lookup;
dns.lookup = function(host, ...args) {
  if (!loopback(host)) throw new Error(`OFFLINE_TEST: DNS externo prohibido: ${host}`);
  return lookup.call(this, host, ...args);
};
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const options = args[0];
  const host = typeof options === 'object' ? options.host : args[1];
  if (host && typeof host === 'string' && !loopback(host) && !options?.path) {
    throw new Error(`OFFLINE_TEST: conexión externa prohibida: ${host}`);
  }
  return connect.apply(this, args);
};
globalThis.fetch = async function() { throw new Error('OFFLINE_TEST: fetch deshabilitado'); };
