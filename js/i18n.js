/**
 * PUBG PC Tactical Wiki - i18n Engine
 * Handles bilingual support (Vietnamese & English), DOM translation binding, and state persistence
 */

class I18nEngine {
  constructor() {
    this.currentLang = localStorage.getItem('pubg_wiki_lang') || this.detectInitialLang();
    this.translations = {};
    this.loaded = false;
  }

  detectInitialLang() {
    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return navLang.startsWith('vi') ? 'vi' : 'en';
  }

  async init(jsonPath = 'data/i18n.json') {
    try {
      const res = await fetch(jsonPath);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      this.translations = await res.json();
      this.loaded = true;
      this.applyTranslations();
      this.setupLanguageSwitcher();
      document.dispatchEvent(new CustomEvent('i18nReady', { detail: { lang: this.currentLang } }));
    } catch (err) {
      console.error('Failed to load i18n data:', err);
    }
  }

  getLang() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (!['vi', 'en'].includes(lang) || lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem('pubg_wiki_lang', lang);
    this.applyTranslations();
    this.updateSwitcherUI();
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  t(keyPath, fallback = '') {
    if (!this.loaded || !this.translations[this.currentLang]) return fallback || keyPath;
    const parts = keyPath.split('.');
    let current = this.translations[this.currentLang];
    for (const part of parts) {
      if (current && current[part] !== undefined) {
        current = current[part];
      } else {
        return fallback || keyPath;
      }
    }
    return current;
  }

  applyTranslations() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        el.textContent = text;
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const placeholder = this.t(key);
      if (placeholder) {
        el.setAttribute('placeholder', placeholder);
      }
    });

    // Translate titles / tooltips
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const title = this.t(key);
      if (title) {
        el.setAttribute('title', title);
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;
  }

  setupLanguageSwitcher() {
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const lang = btn.getAttribute('data-lang');
        if (lang) {
          this.setLanguage(lang);
        }
      });
    });
    this.updateSwitcherUI();
  }

  updateSwitcherUI() {
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const lang = btn.getAttribute('data-lang');
      if (lang === this.currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// Global instance
window.i18n = new I18nEngine();
