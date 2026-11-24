/* ===================================================================
   LANTERN — Authentication (working sign-in / sign-up)
   Accounts are stored locally in the browser (localStorage) so the
   full flow works without a backend.
   =================================================================== */

// ---------- Theme (synced with landing page) ----------
(function () {
  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const saved = (() => {
    try { return localStorage.getItem('lantern:theme'); } catch (e) { return null; }
  })();

  const theme = saved || document.documentElement.dataset.theme || getSystemTheme();
  document.documentElement.dataset.theme = theme;
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'light' ? '#f8fafc' : '#06080f');
  }
})();

// ---------- Toast ----------
const toast = Object.assign(document.createElement('div'), {
  className: 'login-toast',
  role: 'status'
});
document.body.append(toast);

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---------- Tiny "storage" helpers (safe on file:// too) ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
      showToast('Storage is blocked in this browser.');
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
};

// Simple non-reversible-enough hash for the demo (not real cryptography)
function hashValue(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(16) + '_' + str.length;
}

// ---------- Elements ----------
const el = {
  authMain: document.getElementById('authMain'),
  authForm: document.getElementById('authForm'),
  telegramBtn: document.getElementById('telegramBtn'),
  useEmail: document.getElementById('useEmail'),
  backToTelegram: document.getElementById('backToTelegram'),
  modeTabs: document.querySelectorAll('.mode-btn'),
  fieldName: document.getElementById('fieldName'),
  nameInput: document.getElementById('nameInput'),
  emailInput: document.getElementById('emailInput'),
  pwInput: document.getElementById('pwInput'),
  pwToggle: document.getElementById('pwToggle'),
  formError: document.getElementById('formError'),
  submitBtn: document.getElementById('submitBtn')
};

let mode = 'signin'; // 'signin' | 'signup'

// ---------- View switching ----------
function showTelegramView() {
  el.authForm.hidden = true;
  el.authMain.hidden = false;
  el.formError.hidden = true;
}

function showEmailView(nextMode = 'signin') {
  el.authMain.hidden = true;
  el.authForm.hidden = false;
  setMode(nextMode);
}

function setMode(nextMode) {
  mode = nextMode;
  el.modeTabs.forEach(btn => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  el.fieldName.hidden = mode !== 'signup';
  el.submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
  el.pwInput.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  clearError();
}

function setError(msg, focusEl) {
  el.formError.textContent = msg;
  el.formError.hidden = false;
  if (focusEl) focusEl.focus();
}

function clearError() {
  el.formError.hidden = true;
  el.formError.textContent = '';
}

// ---------- Events ----------
el.telegramBtn.addEventListener('click', () => {
  showToast('✦ Opening @Lantern_bot in Telegram…');
});

el.useEmail.addEventListener('click', e => {
  e.preventDefault();
  showEmailView('signin');
  el.emailInput.focus();
});

el.backToTelegram.addEventListener('click', e => {
  e.preventDefault();
  showTelegramView();
});

el.modeTabs.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// Show / hide password
el.pwToggle.addEventListener('click', () => {
  const show = el.pwInput.type === 'password';
  el.pwInput.type = show ? 'text' : 'password';
  el.pwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Submit: sign in or sign up
el.authForm.addEventListener('submit', e => {
  e.preventDefault();
  clearError();

  const email = el.emailInput.value.trim().toLowerCase();
  const pw = el.pwInput.value;
  const name = mode === 'signup' ? el.nameInput.value.trim() : '';
  const users = store.get('lantern:users', {});

  // Validation
  if (mode === 'signup' && !name) return setError('Please pick a display name.', el.nameInput);
  if (!EMAIL_RE.test(email)) return setError('Please enter a valid email address.', el.emailInput);
  if (pw.length < 8) return setError('Password must be at least 8 characters.', el.pwInput);

  if (mode === 'signup') {
    if (users[email]) {
      setError('An account with this email already exists — sign in instead.', el.emailInput);
      setMode('signin');
      return;
    }
    users[email] = { name, hash: hashValue(email + '::' + pw), created: Date.now() };
    store.set('lantern:users', users);
    store.set('lantern:session', { email, name });
    finish(`✦ Account created. Welcome to LANTERN, ${name}!`);
  } else {
    const user = users[email];
    if (!user) {
      setError('No account with this email yet — create one below.');
      setMode('signup');
      el.emailInput.value = email;
      el.nameInput?.focus();
      return;
    }
    if (user.hash !== hashValue(email + '::' + pw)) {
      return setError('Wrong password. Try again.', el.pwInput);
    }
    store.set('lantern:session', { email, name: user.name });
    finish(`✦ Welcome back, ${user.name}!`);
  }
});

function finish(message) {
  clearError();
  el.submitBtn.textContent = '✓ Success — redirecting…';
  showToast(message);
  store.set('lantern:flash', message);
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
}

// Enter key on any input submits (native form behavior)
['keydown'].forEach(evt =>
  [el.nameInput, el.emailInput, el.pwInput].forEach(input =>
    input?.addEventListener(evt, () => clearError())
  )
);
