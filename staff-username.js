'use strict';
/**
 * Property Care staff username sign-in adapter.
 *
 * The existing app.js and Supabase RLS remain unchanged. Passwords are verified
 * by Supabase Auth. Only staff accounts created by an administrator with the
 * matching internal identifier will sign in. Never put a service-role key here.
 *
 * The .example.com domain is reserved for examples and is NOT a real inbox.
 * Password reset for these deliberately email-less staff accounts is manual
 * through a Supabase administrator. Never enable public staff sign-up.
 */
(() => {
  const DOMAIN = 'staff.house-compendium.example.com';
  const VALID_USERNAME = /^[a-z][a-z0-9_-]{2,31}$/;
  const app = document.getElementById('app');
  if (!app) return;

  const normalise = name => String(name || '').trim().toLowerCase();
  const alias = name => normalise(name) + '@' + DOMAIN;

  function replaceLoginField() {
    const form = app.querySelector('form[data-form="signin"]');
    if (!form || form.dataset.usernameLogin === 'true') return;

    const input = form.querySelector('input[name="email"]');
    if (!input) return;

    input.type = 'text';
    input.name = 'staff_username';
    input.id = 'staff_username';
    input.autocomplete = 'username';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.setAttribute('inputmode', 'text');
    input.setAttribute('pattern', '[A-Za-z][A-Za-z0-9_-]{2,31}');
    input.setAttribute('minlength', '3');
    input.setAttribute('maxlength', '32');
    input.setAttribute('placeholder', 'e.g. maintenance');
    input.setAttribute('aria-label', 'Staff username');
    const label = form.querySelector('label[for="email"]');
    if (label) {
      label.textContent = 'Username';
      label.htmlFor = 'staff_username';
    }

    const authField = document.createElement('input');
    authField.type = 'hidden';
    authField.name = 'email';
    authField.setAttribute('data-internal-staff-identifier', '');
    form.appendChild(authField);

    // The original app.js submit handler reads FormData(email, password). By
    // keeping that field hidden and derived from the visible username, the
    // original Supabase sign-in and RLS policies continue to apply.
    function syncAlias() {
      authField.value = alias(input.value);
    }
    input.addEventListener('input', syncAlias);
    input.addEventListener('blur', () => {
      input.value = normalise(input.value);
      syncAlias();
    });
    form.addEventListener('submit', event => {
      const username = normalise(input.value);
      if (!VALID_USERNAME.test(username)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        input.setCustomValidity('Use 3–32 characters: begin with a letter, then use letters, numbers, - or _.');
        input.reportValidity();
        input.focus();
        return;
      }
      input.setCustomValidity('');
      input.value = username;
      syncAlias();
    }, true);
    input.addEventListener('input', () => input.setCustomValidity(''));

    const help = document.createElement('p');
    help.className = 'small muted';
    help.textContent = 'Use the staff username and password provided by your administrator. An email address is not needed.';
    form.insertAdjacentElement('afterend', help);
    const next = help.nextElementSibling;
    if (next && next.matches('p') && /Accounts are added by administrators/i.test(next.textContent || '')) {
      next.textContent = 'For a forgotten password or new account, contact the housing administrator.';
    }
    form.dataset.usernameLogin = 'true';
  }

  function replaceStaffHeaderIdentifier() {
    const box = app.querySelector('.staff-box');
    if (!box) return;
    // Preserve the existing staff-role badge and only replace the text node.
    for (const node of box.childNodes) {
      if (node.nodeType !== 3 || !node.textContent.includes('@' + DOMAIN)) continue;
      const next = node.textContent.replace(
        /([a-z][a-z0-9_-]{2,31})@staff\.house-compendium\.example\.com\b/gi,
        '$1'
      );
      if (next !== node.textContent) node.textContent = next;
    }
  }

  function enhance() {
    replaceLoginField();
    replaceStaffHeaderIdentifier();
  }
  // app.js renders login forms and headers after asynchronous Supabase checks.
  // Observing those changes keeps this adapter compatible without modifying
  // the entire 60 KB staff dashboard or its other functionality.
  const observer = new MutationObserver(enhance);
  observer.observe(app, {childList: true, subtree: true});
  enhance();
})();
