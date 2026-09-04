/**
 * PUBG PC Tactical Wiki - Equipment Module Controller
 * Handles:
 * - 35 In-Game Equipment Items across 7 Categories
 * - Category Tab Filtering, Level Filtering & Real-time Search
 * - Ballistic Defense Matrix & TTK / Hits-to-Knock Calculator
 * - Full Bilingual Support (VI / EN)
 */

class EquipmentApp {
  constructor() {
    this.data = null;
    this.weapons = [];
    this.activeCategory = 'all';
    this.activeLevel = 'all';
    this.searchQuery = '';
    this.selectedWeaponKey = 'm416';

    // Ballistic weapon parameters for damage matrix
    this.matrixWeapons = {
      m416: { name: 'M416 (5.56mm AR)', baseDmg: 40, headMult: 2.35, torsoMult: 1.0 },
      beryl: { name: 'Beryl M762 (7.62mm AR)', baseDmg: 44, headMult: 2.35, torsoMult: 1.0 },
      kar98k: { name: 'Kar98k (7.62mm SR)', baseDmg: 79, headMult: 2.5, torsoMult: 1.1 },
      m24: { name: 'M24 (7.62mm SR)', baseDmg: 75, headMult: 2.5, torsoMult: 1.1 },
      awm: { name: 'AWM (.300 Magnum SR)', baseDmg: 105, headMult: 2.5, torsoMult: 1.1 },
      sks: { name: 'SKS (7.62mm DMR)', baseDmg: 53, headMult: 2.35, torsoMult: 1.05 },
      mini14: { name: 'Mini14 (5.56mm DMR)', baseDmg: 48, headMult: 2.35, torsoMult: 1.05 },
      vector: { name: 'Vector (9mm SMG)', baseDmg: 31, headMult: 1.8, torsoMult: 1.05 },
      dbs: { name: 'DBS (12 Gauge Shotgun)', baseDmg: 26, headMult: 1.5, torsoMult: 1.0, isShotgun: true }
    };

    // Elements
    this.categoryBar = null;
    this.gridContainer = null;
    this.searchInput = null;
    this.levelFilterBtns = null;
    this.weaponSelect = null;
    this.matrixBody = null;
  }

  async init() {
    try {
      this.data = await window.dataLoader.getEquipment();
      if (!this.data) {
        console.error('Failed to load equipment data.');
        return;
      }

      this.cacheDom();
      this.bindEvents();
      this.renderCategoryTabs();
      this.renderDefenseMatrix();
      this.renderGrid();

      // Listen for i18n language change
      document.addEventListener('languageChanged', () => {
        this.renderCategoryTabs();
        this.renderDefenseMatrix();
        this.renderGrid();
      });
    } catch (err) {
      console.error('EquipmentApp init error:', err);
    }
  }

  cacheDom() {
    this.categoryBar = document.getElementById('equipCategoryBar');
    this.gridContainer = document.getElementById('equipmentGridContainer');
    this.searchInput = document.getElementById('equipSearchInput');
    this.levelFilterBtns = document.querySelectorAll('.level-filter-btn');
    this.weaponSelect = document.getElementById('matrixWeaponSelect');
    this.matrixBody = document.getElementById('matrixTableBody');
  }

  bindEvents() {
    // Search input
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderGrid();
    });

    // Level filter buttons
    this.levelFilterBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.levelFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeLevel = btn.getAttribute('data-level') || 'all';
        this.renderGrid();
      });
    });

    // Defense matrix weapon select
    this.weaponSelect?.addEventListener('change', (e) => {
      this.selectedWeaponKey = e.target.value;
      this.renderDefenseMatrix();
    });
  }

  t(key, fallback = '') {
    return window.i18n ? window.i18n.t(key, fallback) : fallback;
  }

  getLang() {
    return window.i18n ? window.i18n.getLang() : 'vi';
  }

  getAllItems() {
    if (!this.data) return [];
    const all = [];
    const categories = ['helmets', 'vests', 'backpacks', 'ghillie', 'medical', 'throwables', 'tactical'];
    categories.forEach(cat => {
      const items = this.data[cat] || [];
      items.forEach(item => {
        all.push({ ...item, category: cat });
      });
    });
    return all;
  }

  renderCategoryTabs() {
    if (!this.categoryBar || !this.data) return;
    const categories = [
      { id: 'all', icon: '🗂️', labelKey: 'cat_all', fallback: 'Tất Cả' },
      { id: 'helmets', icon: '🪖', labelKey: 'cat_helmets', fallback: 'Mũ Chống Đạn' },
      { id: 'vests', icon: '🦺', labelKey: 'cat_vests', fallback: 'Áo Giáp' },
      { id: 'backpacks', icon: '🎒', labelKey: 'cat_backpacks', fallback: 'Ba Lô & Dù' },
      { id: 'ghillie', icon: '🌿', labelKey: 'cat_ghillie', fallback: 'Đồ Ngụy Trang' },
      { id: 'medical', icon: '💊', labelKey: 'cat_medical', fallback: 'Cứu Thương' },
      { id: 'throwables', icon: '💣', labelKey: 'cat_throwables', fallback: 'Lựu Đạn & Nổ' },
      { id: 'tactical', icon: '⚙️', labelKey: 'cat_tactical', fallback: 'Khí Tài Tiện Ích' }
    ];

    const allItems = this.getAllItems();

    this.categoryBar.innerHTML = categories.map(c => {
      let count = 0;
      if (c.id === 'all') {
        count = allItems.length;
      } else {
        count = (this.data[c.id] || []).length;
      }

      const activeClass = this.activeCategory === c.id ? 'active' : '';
      const label = this.t(`equipment_page.${c.labelKey}`, c.fallback);

      return `
        <button class="cat-tab-btn ${activeClass}" data-cat="${c.id}">
          <span>${c.icon} ${label}</span>
          <span class="cat-count">${count}</span>
        </button>
      `;
    }).join('');

    this.categoryBar.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.getAttribute('data-cat') || 'all';
        this.categoryBar.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderGrid();
      });
    });
  }

  renderDefenseMatrix() {
    if (!this.matrixBody) return;
    const w = this.matrixWeapons[this.selectedWeaponKey] || this.matrixWeapons.m416;

    // Defense tiers: [TierName, HeadReduction, TorsoReduction]
    const tiers = [
      { name: 'Không Giáp / Mũ (No Armor)', redHead: 0, redTorso: 0 },
      { name: 'Trang Bị Cấp 1 (Level 1 - 30%)', redHead: 0.30, redTorso: 0.30 },
      { name: 'Trang Bị Cấp 2 (Level 2 - 40%)', redHead: 0.40, redTorso: 0.40 },
      { name: 'Trang Bị Cấp 3 (Level 3 - 55%)', redHead: 0.55, redTorso: 0.55 }
    ];

    this.matrixBody.innerHTML = tiers.map(tier => {
      // Head damage
      const headDmgPerShot = w.baseDmg * w.headMult * (1 - tier.redHead);
      const headHits = Math.ceil(100 / headDmgPerShot);

      // Torso damage
      const torsoDmgPerShot = w.baseDmg * w.torsoMult * (1 - tier.redTorso);
      const torsoHits = Math.ceil(100 / torsoDmgPerShot);

      const getBadge = (hits) => {
        if (hits === 1) return `<span class="ttk-hits-badge hits-1">1 Viên (1 Tap)</span>`;
        if (hits === 2) return `<span class="ttk-hits-badge hits-2">2 Viên</span>`;
        if (hits === 3) return `<span class="ttk-hits-badge hits-3">3 Viên</span>`;
        return `<span class="ttk-hits-badge hits-4plus">${hits} Viên</span>`;
      };

      return `
        <tr>
          <td style="text-align: left; font-family: var(--font-display); font-weight: 700; color: var(--text-primary);">
            ${tier.name}
          </td>
          <td>
            <span style="color: var(--airdrop-red); font-weight: 700;">${headDmgPerShot.toFixed(1)}</span> HP
          </td>
          <td>
            ${getBadge(headHits)}
          </td>
          <td>
            <span style="color: var(--pubg-gold); font-weight: 700;">${torsoDmgPerShot.toFixed(1)}</span> HP
          </td>
          <td>
            ${getBadge(torsoHits)}
          </td>
        </tr>
      `;
    }).join('');
  }

  renderGrid() {
    if (!this.gridContainer || !this.data) return;
    const lang = this.getLang();
    let items = this.getAllItems();

    // Filter by category
    if (this.activeCategory !== 'all') {
      items = items.filter(i => i.category === this.activeCategory);
    }

    // Filter by level
    if (this.activeLevel !== 'all') {
      if (this.activeLevel === 'airdrop') {
        items = items.filter(i => (i.rarity && i.rarity.toLowerCase().includes('airdrop')) || i.level === 3);
      } else {
        const lvl = parseInt(this.activeLevel, 10);
        items = items.filter(i => i.level === lvl);
      }
    }

    // Filter by search query
    if (this.searchQuery) {
      items = items.filter(i => {
        const nameEn = (i.name || '').toLowerCase();
        const nameVi = (i.nameVi || '').toLowerCase();
        const desc = (i.description[lang] || i.description.en || '').toLowerCase();
        return nameEn.includes(this.searchQuery) || nameVi.includes(this.searchQuery) || desc.includes(this.searchQuery);
      });
    }

    if (items.length === 0) {
      this.gridContainer.innerHTML = `
        <div class="equip-empty-state">
          <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            🔍 ${this.t('equipment_page.no_results', 'Không tìm thấy trang bị nào khớp với từ khóa tìm kiếm.')}
          </p>
          <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--pubg-gold);">
            SYSTEM // ZERO MATCHES
          </span>
        </div>
      `;
      return;
    }

    this.gridContainer.innerHTML = items.map(item => {
      const isVi = lang === 'vi';
      const mainName = isVi ? (item.nameVi || item.name) : item.name;
      const subName = isVi ? item.name : (item.nameVi || '');

      // Level / Rarity badge
      let badgeHtml = '';
      if (item.level) {
        const badgeClass = item.level === 3 ? 'badge-airdrop' : 'badge-world';
        badgeHtml = `<span class="badge ${badgeClass}">${isVi ? 'Cấp ' + item.level : 'Level ' + item.level}</span>`;
      } else if (item.rarity) {
        const isAirdrop = item.rarity.toLowerCase().includes('airdrop');
        badgeHtml = `<span class="badge ${isAirdrop ? 'badge-airdrop' : 'badge-ammo-556'}">${item.rarity}</span>`;
      }

      // Stats rows
      let statsHtml = '';
      if (item.category === 'helmets' || item.category === 'vests') {
        const maxDur = item.category === 'helmets' ? 230 : 250;
        const durPct = Math.round((item.durability / maxDur) * 100);
        statsHtml = `
          <div class="equip-stat-item">
            <span class="stat-label">🛡️ ${this.t('equipment_page.durability', 'Độ bền')}:</span>
            <span class="stat-value">${item.durability}</span>
          </div>
          <div class="stat-progress-bg">
            <div class="stat-progress-bar" style="width: ${durPct}%;"></div>
          </div>
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚡ ${this.t('equipment_page.damage_reduction', 'Giảm sát thương')}:</span>
            <span class="stat-value" style="color: var(--bluezone-cyan);">-${item.reduction}%</span>
          </div>
          ${item.capacity ? `
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">🎒 ${this.t('equipment_page.capacity', 'Sức chứa')}:</span>
            <span class="stat-value">+${item.capacity}</span>
          </div>` : ''}
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚖️ ${this.t('equipment_page.weight_label', 'Trọng lượng')}:</span>
            <span class="stat-value" style="color: var(--text-muted);">${item.weight}</span>
          </div>
        `;
      } else if (item.category === 'backpacks') {
        statsHtml = `
          <div class="equip-stat-item">
            <span class="stat-label">🎒 ${this.t('equipment_page.capacity', 'Dung lượng mở rộng')}:</span>
            <span class="stat-value">+${item.capacity}</span>
          </div>
          ${item.totalCapacity ? `
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">📦 Tổng sức chứa balo:</span>
            <span class="stat-value" style="color: var(--bluezone-cyan);">${item.totalCapacity}</span>
          </div>` : ''}
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚖️ ${this.t('equipment_page.weight_label', 'Trọng lượng')}:</span>
            <span class="stat-value" style="color: var(--text-muted);">${item.weight}</span>
          </div>
        `;
      } else if (item.category === 'medical') {
        statsHtml = `
          <div class="equip-stat-item">
            <span class="stat-label">⏱️ ${this.t('equipment_page.cast_time', 'Thời gian dùng')}:</span>
            <span class="stat-value" style="color: var(--bluezone-cyan);">${item.castTime}s</span>
          </div>
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">✨ ${this.t('equipment_page.effect_label', 'Hiệu lực')}:</span>
            <span class="stat-value" style="color: #10b981;">${item.healAmount || item.boostAmount}</span>
          </div>
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚖️ ${this.t('equipment_page.weight_label', 'Trọng lượng')}:</span>
            <span class="stat-value" style="color: var(--text-muted);">${item.weight}</span>
          </div>
        `;
      } else if (item.category === 'throwables') {
        statsHtml = `
          <div class="equip-stat-item">
            <span class="stat-label">⏱️ ${this.t('equipment_page.fuse_time', 'Ngòi nổ')}:</span>
            <span class="stat-value" style="color: var(--airdrop-red);">${item.fuseTime}</span>
          </div>
          ${item.duration ? `
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⏳ ${this.t('equipment_page.duration_label', 'Thời gian tác dụng')}:</span>
            <span class="stat-value">${item.duration}</span>
          </div>` : ''}
          ${item.blastRadius ? `
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">💥 ${this.t('equipment_page.blast_radius', 'Bán kính nổ')}:</span>
            <span class="stat-value">${item.blastRadius}</span>
          </div>` : ''}
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚖️ ${this.t('equipment_page.weight_label', 'Trọng lượng')}:</span>
            <span class="stat-value" style="color: var(--text-muted);">${item.weight}</span>
          </div>
        `;
      } else {
        // Ghillie / Tactical
        statsHtml = `
          <div class="equip-stat-item">
            <span class="stat-label">🏷️ Phẩm cấp:</span>
            <span class="stat-value">${item.rarity || 'Standard'}</span>
          </div>
          <div class="equip-stat-item" style="margin-top: 0.35rem;">
            <span class="stat-label">⚖️ ${this.t('equipment_page.weight_label', 'Trọng lượng')}:</span>
            <span class="stat-value" style="color: var(--text-muted);">${item.weight}</span>
          </div>
        `;
      }

      const descText = item.description[lang] || item.description.en || '';
      const tipText = item.tip ? (item.tip[lang] || item.tip.en || '') : '';

      return `
        <div class="equipment-card">
          <!-- Card Image & Badges -->
          <div class="equip-card-media">
            <div class="equip-card-badges">
              ${badgeHtml}
              <span class="badge badge-ammo-762">${item.category.toUpperCase()}</span>
            </div>
            <img class="equip-item-img" src="${item.image}" alt="${mainName}" loading="lazy" />
          </div>

          <!-- Card Body -->
          <div class="equip-card-body">
            <div class="equip-card-title-group">
              <h3 class="equip-card-title">${mainName}</h3>
              ${subName ? `<span class="equip-card-subtitle">${subName}</span>` : ''}
            </div>

            <div class="equip-stats-list">
              ${statsHtml}
            </div>

            <p class="equip-description">
              ${descText}
            </p>

            ${tipText ? `
            <div class="equip-pro-tip">
              <div class="equip-pro-tip-title">
                <span>🛡️</span> ${this.t('equipment_page.pro_tip', 'Mẹo Tác Chiến Sinh Tồn')}
              </div>
              <div>${tipText}</div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.equipmentApp = new EquipmentApp();
  window.equipmentApp.init();
});
