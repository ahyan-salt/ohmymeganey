/**
 * 单篇密码锁：加密 / 解密
 * ------------------------------------------------------------
 * 用浏览器原生的 Web Crypto（AES-GCM + PBKDF2）把文章正文加密成一段密文，
 * 只有输入正确密码才能还原。密码本身不会被保存，密文存在 js/locked-posts.js。
 *
 * 浏览器与 Node 都能用（Node 18+ 自带 Web Crypto）。
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Lock = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ITER = 150000;          /* PBKDF2 迭代次数 */
  var SALT_BYTES = 16;
  var IV_BYTES = 12;

  function webcrypto() {
    var c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    return c && c.subtle && c.getRandomValues ? c : null;
  }

  function supported() {
    return !!webcrypto();
  }

  function toBase64(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str);
  }

  function fromBase64(text) {
    var bin = atob(text);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function deriveKey(password, salt, iter) {
    var c = webcrypto();
    return c.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    ).then(function (baseKey) {
      return c.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  /* 加密：明文 -> 可存进文件的密文对象 */
  function encrypt(password, plaintext) {
    var c = webcrypto();
    if (!c) return Promise.reject(new Error('当前环境不支持加密，请用 https 或 localhost 打开本页面'));

    var salt = new Uint8Array(SALT_BYTES);
    var iv = new Uint8Array(IV_BYTES);
    c.getRandomValues(salt);
    c.getRandomValues(iv);

    return deriveKey(password, salt, ITER).then(function (key) {
      return c.subtle.encrypt(
        { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plaintext)
      );
    }).then(function (cipher) {
      return {
        v: 1,
        alg: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        iter: ITER,
        salt: toBase64(salt),
        iv: toBase64(iv),
        data: toBase64(new Uint8Array(cipher))
      };
    });
  }

  /* 解密：密文对象 + 密码 -> 明文；密码不对会 reject */
  function decrypt(password, payload) {
    var c = webcrypto();
    if (!c) return Promise.reject(new Error('当前环境不支持解密，请用 https 或 localhost 打开本页面'));
    if (!payload || !payload.data) return Promise.reject(new Error('密文缺失'));

    return deriveKey(password, fromBase64(payload.salt), payload.iter || ITER).then(function (key) {
      return c.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data)
      );
    }).then(function (plain) {
      return new TextDecoder().decode(plain);
    });
  }

  return {
    supported: supported,
    encrypt: encrypt,
    decrypt: decrypt
  };
});
