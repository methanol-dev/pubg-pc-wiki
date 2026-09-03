/**
 * PUBG PC Tactical Wiki - Weapons Controller
 * Manages weapon catalog rendering, interactive filters, search, modal views, and calculator bindings
 */

class WeaponsManager {
  constructor() {
    this.weapons = [];
    this.attachments = [];
    this.activeCategory = 'all';
    this.activeAmmo = 'all';
    this.searchQuery = '';
    this.sortBy = 'damage-desc';
    this.currentModalWeapon = null;

    // Current calculator state in modal
    this.calcState = {
      location: 'chest',
      armor: 2,
      range: 10
    };
  }

  async init() {
    const [weapons, attachments] = await Promise.all([
      window.dataLoader.getWeapons(),
      window.dataLoader.getAttachments()
    ]);
    this.weapons = weapons;
    this.attachments = attachments;
    this.bindEvents();
    this.renderCatalog();

    // Listen for language switch
    document.addEventListener('languageChanged', () => {
      this.renderCatalog();
      if (this.currentModalWeapon) {
        this.renderModalContent(this.currentModalWeapon);
      }
    });
  }

  bindEvents() {
    // Category tabs
    document.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.getAttribute('data-cat') || 'all';
        this.renderCatalog();
      });
    });

    // Ammo filter pills (if present)
    document.querySelectorAll('.ammo-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.ammo-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeAmmo = btn.getAttribute('data-ammo') || 'all';
        this.renderCatalog();
      });
    });

    // Search bar with 120ms debounce to prevent input lag
    const searchInput = document.getElementById('weaponSearchInput');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderCatalog();
        }, 120);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('weaponSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderCatalog();
      });
    }

    // Modal close events
    const modalOverlay = document.getElementById('weaponModal');
    const modalClose = document.getElementById('modalCloseBtn');
    if (modalClose && modalOverlay) {
      modalClose.addEventListener('click', () => this.closeModal());
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeModal();
      });
    }
  }

  getFilteredWeapons() {
    let list = [...this.weapons];

    if (this.activeCategory !== 'all') {
      list = list.filter((w) => w.category === this.activeCategory);
    }

    if (this.activeAmmo !== 'all') {
      list = list.filter((w) => w.ammo === this.activeAmmo);
    }

    if (this.searchQuery) {
      list = list.filter((w) => {
        const nameMatch = w.name.toLowerCase().includes(this.searchQuery);
        const catMatch = w.category.toLowerCase().includes(this.searchQuery);
        return nameMatch || catMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      const dpsA = window.damageCalculator.calculateDPS(a);
      const dpsB = window.damageCalculator.calculateDPS(b);
      switch (this.sortBy) {
        case 'damage-desc':
          return b.damage - a.damage;
        case 'damage-asc':
          return a.damage - b.damage;
        case 'rpm-desc':
          return b.rpm - a.rpm;
        case 'dps-desc':
          return dpsB - dpsA;
        case 'velocity-desc':
          return b.muzzleVelocity - a.muzzleVelocity;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return list;
  }

  renderCatalog() {
    const grid = document.getElementById('weaponsGrid');
    if (!grid) return;

    const filtered = this.getFilteredWeapons();
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <p style="font-family: var(--font-display); font-size: 1.25rem;">${window.i18n.t('common.clear_filter', 'Không tìm thấy vũ khí phù hợp.')}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((weapon) => this.renderWeaponCard(weapon)).join('');

    // Attach card action listeners
    grid.querySelectorAll('.btn-view-details').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openModal(id);
      });
    });

    grid.querySelectorAll('.btn-add-compare').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.location.href = `compare.html?slot1=${id}`;
      });
    });
  }

  renderWeaponCard(weapon) {
    const lang = window.i18n.getLang();
    const ammoLabel = window.i18n.t(`ammo.${weapon.ammo}`, weapon.ammo);
    const catLabel = window.i18n.t(`categories.${weapon.category}`, weapon.category.toUpperCase());
    const spawnClass = weapon.spawn === 'airdrop' ? 'badge-airdrop' : 'badge-world';
    const spawnText = window.i18n.t(`common.${weapon.spawn}`, weapon.spawn);
    const ammoBadgeClass = `badge-${weapon.ammo.replace('_', '-')}`;
    const dps = window.damageCalculator.calculateDPS(weapon);

    return `
      <article class="weapon-card" data-id="${weapon.id}">
        <div>
          <div class="card-top">
            <h3 class="weapon-name">${weapon.name}</h3>
            <div class="weapon-badges">
              <span class="badge ${spawnClass}">${spawnText}</span>
              <span class="badge ${ammoBadgeClass}">${ammoLabel}</span>
            </div>
          </div>

          <div class="weapon-preview">
            <div class="weapon-img-placeholder">
              <span style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em;">
                ${weapon.name}
              </span>
            </div>
          </div>

          <div class="weapon-card-stats">
            <div class="stat-item">
              <div class="stat-header">
                <span>${window.i18n.t('stats.base_damage', 'Sát thương gốc')}</span>
                <span class="stat-value">${weapon.damage}</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width: ${Math.min(100, (weapon.damage / 110) * 100)}%"></div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-header">
                <span>${window.i18n.t('stats.fire_rate', 'Tốc độ bắn')}</span>
                <span class="stat-value">${weapon.rpm} RPM</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill fill-blue" style="width: ${Math.min(100, (weapon.rpm / 1250) * 100)}%"></div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-header">
                <span>${window.i18n.t('stats.dps', 'DPS')}</span>
                <span class="stat-value">${dps}</span>
              </div>
              <div class="stat-bar-track">
                <div class="stat-bar-fill fill-red" style="width: ${Math.min(100, (dps / 650) * 100)}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-secondary btn-sm btn-add-compare" data-id="${weapon.id}" title="${window.i18n.t('common.compare', 'So sánh')}">
            ⚖️ ${window.i18n.t('common.compare', 'So sánh')}
          </button>
          <button class="btn btn-primary btn-sm btn-view-details" data-id="${weapon.id}">
            ${window.i18n.t('common.details', 'Chi tiết')}
          </button>
        </div>
      </article>
    `;
  }

  openModal(weaponId) {
    const weapon = this.weapons.find((w) => w.id === weaponId);
    if (!weapon) return;
    this.currentModalWeapon = weapon;
    this.renderModalContent(weapon);

    const modal = document.getElementById('weaponModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const modal = document.getElementById('weaponModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    this.currentModalWeapon = null;
  }

  renderModalContent(weapon) {
    const titleEl = document.getElementById('modalWeaponTitle');
    const bodyEl = document.getElementById('modalWeaponBody');
    if (!titleEl || !bodyEl) return;

    const lang = window.i18n.getLang();
    const ammoLabel = window.i18n.t(`ammo.${weapon.ammo}`, weapon.ammo);
    const desc = weapon.description[lang] || weapon.description.en;
    const dps = window.damageCalculator.calculateDPS(weapon);

    titleEl.innerHTML = `
      ${weapon.name}
      <span class="badge badge-${weapon.ammo.replace('_', '-')}" style="font-size: 0.75rem;">${ammoLabel}</span>
      <span class="badge ${weapon.spawn === 'airdrop' ? 'badge-airdrop' : 'badge-world'}" style="font-size: 0.75rem;">
        ${window.i18n.t(`common.${weapon.spawn}`)}
      </span>
    `;

    bodyEl.innerHTML = `
      <div class="weapon-detail-grid">
        <!-- Left: Visual & Core Attributes -->
        <div class="detail-left-col">
          <div class="detail-visual-box">
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; color: var(--pubg-gold); text-align: center; margin-bottom: 0.5rem;">
              ${weapon.name}
            </h2>
            <p style="font-family: var(--font-display); color: var(--text-secondary); text-transform: uppercase;">
              ${window.i18n.t(`categories.${weapon.category}`)} | ${ammoLabel}
            </p>
          </div>

          <p class="detail-desc">${desc}</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${window.i18n.t('stats.muzzle_velocity')}</span>
              <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 1.1rem;">${weapon.muzzleVelocity} m/s</strong>
            </div>
            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${window.i18n.t('stats.mag_capacity')}</span>
              <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 1.1rem;">${weapon.magStandard} / ${weapon.magExtended}</strong>
            </div>
            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${window.i18n.t('stats.reload_time')}</span>
              <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 1.1rem;">${weapon.reloadTime}s (${weapon.tacticalReload}s)</strong>
            </div>
            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${window.i18n.t('stats.dps')}</span>
              <strong style="font-family: var(--font-mono); color: var(--pubg-gold); font-size: 1.1rem;">${dps} DPS</strong>
            </div>
          </div>

          <div class="attachment-slots-section">
            <h4 class="section-subtitle">
              ⚙️ ${window.i18n.t('stats.attachments_slots', 'Các khe phụ kiện')} (${weapon.slots.length})
            </h4>
            <div class="attachment-slots-list">
              ${weapon.slots.map((s) => `
                <span class="slot-tag">
                  ✓ ${window.i18n.t(`attachments.${s}`, s)}
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right: Interactive Damage & TTK Calculator -->
        <div class="detail-right-col">
          <div class="calculator-box">
            <h3 class="section-subtitle" style="margin-bottom: 1rem;">
              🎯 ${window.i18n.t('calculator.title', 'Bảng tính sát thương thực chiến')}
            </h3>

            <!-- Controls -->
            <div class="calc-controls">
              <!-- Hit Location -->
              <div>
                <div class="control-group-title">${window.i18n.t('calculator.hit_location', 'Vị trí trúng đạn')}</div>
                <div class="segmented-control" id="calcLocationBtns">
                  <button class="seg-btn ${this.calcState.location === 'head' ? 'active' : ''}" data-val="head">
                    ${window.i18n.t('calculator.head', 'Đầu')}
                  </button>
                  <button class="seg-btn ${this.calcState.location === 'chest' ? 'active' : ''}" data-val="chest">
                    ${window.i18n.t('calculator.chest', 'Ngực')}
                  </button>
                  <button class="seg-btn ${this.calcState.location === 'stomach' ? 'active' : ''}" data-val="stomach">
                    ${window.i18n.t('calculator.stomach', 'Bụng')}
                  </button>
                  <button class="seg-btn ${this.calcState.location === 'limbs' ? 'active' : ''}" data-val="limbs">
                    ${window.i18n.t('calculator.limbs', 'Tay/Chân')}
                  </button>
                </div>
              </div>

              <!-- Target Armor / Helmet -->
              <div>
                <div class="control-group-title">
                  ${this.calcState.location === 'head' ? window.i18n.t('calculator.target_helmet') : window.i18n.t('calculator.target_armor')}
                </div>
                <div class="segmented-control" id="calcArmorBtns">
                  <button class="seg-btn ${this.calcState.armor === 0 ? 'active' : ''}" data-val="0">
                    ${window.i18n.t('calculator.no_armor', 'Cấp 0')}
                  </button>
                  <button class="seg-btn ${this.calcState.armor === 1 ? 'active' : ''}" data-val="1">
                    ${window.i18n.t('calculator.level_1_short', 'Cấp 1 (-30%)')}
                  </button>
                  <button class="seg-btn ${this.calcState.armor === 2 ? 'active' : ''}" data-val="2">
                    ${window.i18n.t('calculator.level_2_short', 'Cấp 2 (-40%)')}
                  </button>
                  <button class="seg-btn ${this.calcState.armor === 3 ? 'active' : ''}" data-val="3">
                    ${window.i18n.t('calculator.level_3_short', 'Cấp 3 (-55%)')}
                  </button>
                </div>
              </div>

              <!-- Distance Slider -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <span class="control-group-title" style="margin: 0;">${window.i18n.t('calculator.range_distance', 'Khoảng cách')}</span>
                  <span id="rangeValDisplay" style="font-family: var(--font-mono); color: var(--pubg-gold); font-size: 0.9rem; font-weight: 700;">
                    ${this.calcState.range}m
                  </span>
                </div>
                <input type="range" min="10" max="500" step="10" value="${this.calcState.range}" class="tactical-slider" id="calcRangeSlider" />
              </div>
            </div>

            <!-- Dynamic Result Highlights -->
            <div id="calcDynamicResults">
              <!-- Rendered by updateCalculatorResults() -->
            </div>

            <!-- Full Damage Matrix -->
            <div style="margin-top: 1.5rem;">
              <h4 style="font-family: var(--font-display); font-size: 0.95rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.5rem;">
                📊 ${window.i18n.t('calculator.damage_matrix_title', 'Ma trận sát thương toàn diện')}
              </h4>
              <div class="damage-matrix-wrap" id="damageMatrixTableWrap">
                <!-- Rendered by renderDamageMatrix() -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindCalculatorEvents(weapon);
    this.updateCalculatorResults(weapon);
    this.renderDamageMatrix(weapon);
  }

  bindCalculatorEvents(weapon) {
    // Location buttons
    document.querySelectorAll('#calcLocationBtns .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#calcLocationBtns .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.calcState.location = btn.getAttribute('data-val');
        this.updateCalculatorResults(weapon);
      });
    });

    // Armor buttons
    document.querySelectorAll('#calcArmorBtns .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#calcArmorBtns .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.calcState.armor = parseInt(btn.getAttribute('data-val'), 10);
        this.updateCalculatorResults(weapon);
      });
    });

    // Range slider
    const slider = document.getElementById('calcRangeSlider');
    const rangeDisplay = document.getElementById('rangeValDisplay');
    if (slider && rangeDisplay) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.calcState.range = val;
        rangeDisplay.textContent = `${val}m`;
        this.updateCalculatorResults(weapon);
        this.renderDamageMatrix(weapon);
      });
    }
  }

  updateCalculatorResults(weapon) {
    const container = document.getElementById('calcDynamicResults');
    if (!container) return;

    const calc = window.damageCalculator.calculateShot(
      weapon,
      this.calcState.location,
      this.calcState.armor,
      this.calcState.range
    );

    const isOneShot = calc.isOneShot;

    container.innerHTML = `
      ${isOneShot ? `
        <div class="oneshot-alert">
          💀 <strong>${window.i18n.t('calculator.one_shot', 'Hạ gục 1 viên! (One-Shot Kill)')}</strong>
        </div>
      ` : ''}

      <div class="calc-results-summary">
        <div class="result-card">
          <div class="result-label">${window.i18n.t('calculator.calculated_damage', 'Sát thương')}</div>
          <div class="result-value val-damage">${calc.damage}</div>
        </div>
        <div class="result-card highlight">
          <div class="result-label">${window.i18n.t('calculator.shots_to_kill', 'Số viên hạ')}</div>
          <div class="result-value val-shots">${calc.shotsToKill} ${window.i18n.t('common.shots', 'viên')}</div>
        </div>
        <div class="result-card">
          <div class="result-label">${window.i18n.t('calculator.ttk', 'Thời gian (TTK)')}</div>
          <div class="result-value val-ttk">${calc.ttkMs} ms</div>
        </div>
      </div>
    `;
  }

  renderDamageMatrix(weapon) {
    const wrap = document.getElementById('damageMatrixTableWrap');
    if (!wrap) return;

    const matrix = window.damageCalculator.generateMatrix(weapon, this.calcState.range);
    const locations = ['head', 'chest', 'stomach', 'limbs'];

    wrap.innerHTML = `
      <table class="damage-matrix-table">
        <thead>
          <tr>
            <th style="text-align: left;">${window.i18n.t('calculator.hit_location')}</th>
            <th>${window.i18n.t('calculator.no_armor')}</th>
            <th>${window.i18n.t('calculator.level_1_short')}</th>
            <th>${window.i18n.t('calculator.level_2_short')}</th>
            <th>${window.i18n.t('calculator.level_3_short')}</th>
          </tr>
        </thead>
        <tbody>
          ${locations.map((loc) => `
            <tr>
              <td class="location-name">${window.i18n.t(`calculator.${loc}`)}</td>
              <td>${matrix[loc][0].damage} <span style="font-size: 0.7rem; color: var(--text-muted)">(${matrix[loc][0].shotsToKill}v)</span></td>
              <td>${matrix[loc][1].damage} <span style="font-size: 0.7rem; color: var(--text-muted)">(${matrix[loc][1].shotsToKill}v)</span></td>
              <td>${matrix[loc][2].damage} <span style="font-size: 0.7rem; color: var(--text-muted)">(${matrix[loc][2].shotsToKill}v)</span></td>
              <td>${matrix[loc][3].damage} <span style="font-size: 0.7rem; color: var(--text-muted)">(${matrix[loc][3].shotsToKill}v)</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// Global instance
window.weaponsManager = new WeaponsManager();
