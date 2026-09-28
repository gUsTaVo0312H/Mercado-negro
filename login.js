(() => {
  'use strict';

  const iterations = 310000;
  const maxImageBytes = 2 * 1024 * 1024;
  const $ = selector => document.querySelector(selector);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function setMessage(text, isError = false) {
    const message = $('#authMessage');
    message.textContent = text;
    message.classList.toggle('error', isError);
  }

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptRecord(record, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(record)));
    return {
      format: 'BLACKMARKET-VAULT-1',
      cipher: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA-256',
      iterations,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    };
  }

  async function decryptRecord(vault, password) {
    if (vault.format !== 'BLACKMARKET-VAULT-1' || vault.cipher !== 'AES-GCM-256' ||
        vault.kdf !== 'PBKDF2-SHA-256' || vault.iterations !== iterations ||
        typeof vault.salt !== 'string' || typeof vault.iv !== 'string' || typeof vault.ciphertext !== 'string') {
      throw new Error('Arquivo de cofre inválido ou incompatível.');
    }
    const salt = base64ToBytes(vault.salt);
    const iv = base64ToBytes(vault.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error('Arquivo de cofre inválido.');
    const key = await deriveKey(password, salt);
    const cleartext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(vault.ciphertext));
    return JSON.parse(decoder.decode(cleartext));
  }

  function isValidCpf(value) {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
    const digit = length => {
      const sum = cpf.slice(0, length).split('').reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
  }

  function validPassword(password) {
    return password.length >= 12 && password.length <= 128 &&
      /[a-z]/.test(password) && /[A-Z]/.test(password) &&
      /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }

  function readImage(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    }
    if (file.size === 0 || file.size > maxImageBytes) {
      throw new Error('A imagem precisa ter até 2 MB.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function downloadVault(vault) {
    const blob = new Blob([JSON.stringify(vault)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cofre-blackmarket.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function initTabs() {
    const registerTab = $('#registerTab');
    const loginTab = $('#loginTab');
    const registerPanel = $('#registerPanel');
    const loginPanel = $('#loginPanel');
    const show = isLogin => {
      registerPanel.hidden = isLogin;
      loginPanel.hidden = !isLogin;
      registerTab.classList.toggle('active', !isLogin);
      loginTab.classList.toggle('active', isLogin);
      registerTab.setAttribute('aria-selected', String(!isLogin));
      loginTab.setAttribute('aria-selected', String(isLogin));
      setMessage('');
    };
    registerTab.addEventListener('click', () => show(false));
    loginTab.addEventListener('click', () => show(true));
  }

  function initCpfField() {
    const field = $('#registerCpf');
    field.addEventListener('input', () => {
      const digits = field.value.replace(/\D/g, '').slice(0, 11);
      field.value = digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      field.setCustomValidity('');
    });
    field.addEventListener('change', () => {
      field.setCustomValidity(isValidCpf(field.value) ? '' : 'Informe um CPF válido.');
    });
  }

  function initImagePreview() {
    let currentUrl = '';
    $('#registerImage').addEventListener('change', event => {
      const preview = $('#imagePreview');
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      const file = event.target.files[0];
      if (!file || !file.type.startsWith('image/')) {
        preview.hidden = true;
        return;
      }
      currentUrl = URL.createObjectURL(file);
      preview.src = currentUrl;
      preview.hidden = false;
    });
  }

  function initRegister() {
    $('#registerForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const email = String(data.get('email')).trim().toLowerCase();
      const password = String(data.get('password'));
      const cpf = String(data.get('cpf')).replace(/\D/g, '');
      const image = $('#registerImage').files[0];
      if (!form.reportValidity()) return;
      if (!validPassword(password)) {
        setMessage('A senha deve ter 12 ou mais caracteres e incluir maiúscula, minúscula, número e símbolo.', true);
        return;
      }
      if (!isValidCpf(cpf)) {
        $('#registerCpf').setCustomValidity('Informe um CPF válido.');
        $('#registerCpf').reportValidity();
        return;
      }
      if (!window.isSecureContext || !crypto.subtle) {
        setMessage('A criptografia requer uma origem segura. Abra esta página em HTTPS ou localhost.', true);
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      setMessage('Criando cofre com criptografia forte…');
      try {
        const photo = await readImage(image);
        const record = {
          email,
          name: String(data.get('name')).trim(),
          address: String(data.get('address')).trim(),
          cpf,
          photo,
          createdAt: new Date().toISOString()
        };
        const vault = await encryptRecord(record, password);
        downloadVault(vault);
        form.reset();
        $('#imagePreview').hidden = true;
        setMessage('Cofre criado. Salve o arquivo .txt baixado e mantenha sua senha em segurança.');
      } catch (error) {
        setMessage(error.message || 'Não foi possível criar o cofre.', true);
      } finally {
        submit.disabled = false;
      }
    });
  }

  function initLogin() {
    $('#loginForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      if (!window.isSecureContext || !crypto.subtle) {
        setMessage('A criptografia requer uma origem segura. Abra esta página em HTTPS ou localhost.', true);
        return;
      }
      const email = $('#loginEmail').value.trim().toLowerCase();
      const password = $('#loginPassword').value;
      const file = $('#vaultFile').files[0];
      if (file.size > 6 * 1024 * 1024) {
        setMessage('O arquivo selecionado excede o limite permitido.', true);
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      setMessage('Desbloqueando cofre…');
      try {
        const vault = JSON.parse(await file.text());
        const record = await decryptRecord(vault, password);
        if (typeof record.email !== 'string' || record.email.toLowerCase() !== email) {
          throw new Error('E-mail ou senha incorretos.');
        }
        setMessage(`Acesso local confirmado. Olá, ${record.name}. Seus dados foram desbloqueados apenas nesta sessão.`);
        form.reset();
      } catch (error) {
        const message = error instanceof SyntaxError || error instanceof DOMException
          ? 'Não foi possível abrir o cofre. Confira o arquivo, o e-mail e a senha.'
          : error.message;
        setMessage(message || 'Não foi possível abrir o cofre.', true);
      } finally {
        submit.disabled = false;
      }
    });
  }

  function init() {
    initTabs();
    initCpfField();
    initImagePreview();
    initRegister();
    initLogin();
  }

  document.addEventListener('DOMContentLoaded', init);
})();