/**
 * PUBG PC Tactical Wiki - Weapon Comparison Tool Controller
 * Compares 2-3 weapons side-by-side across all combat stats, TTK, and ballistics
 */

class CompareManager {
  constructor() {
    this.weapons = [];
    this.slots = [null, null, null]; // [weapon1, weapon2, weapon3]
  }

  async init() {
    this.weapons = await window.dataLoader.getWeapons();
    this.parseUrlParams();
    this.populateDropdowns();
    this.bindEvents();
    this.renderComparison();

    document.addEventListener('languageChanged', () => {
      this.populateDropdowns();
      this.renderComparison();
    });
  }

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const slot1Id = params.get('slot1') || 'm416';
    const slot2Id = params.get('slot2') || 'beryl-m762';
    const slot3Id = params.get('slot3') || null;

    this.slots[0] = this.weapons.find((w) => w.id === slot1Id) || this.weapons[0];
    this.slots[1] = this.weapons.find((w) => w.id === slot2Id) || this.weapons[1];
    if (slot3Id) {
      this.slots[2] = this.weapons.find((w) => w.id === slot3Id) || null;
    }
  }

  populateDropdowns() {
    for (let i = 0; i < 3; i++) {
      const select = document.getElementById(`slotSelect${i + 1}`);
      if (!select) continue;

      const currentVal = this.slots[i] ? this.slots[i].id : '';
      const placeholderText = i === 2 
        ? window.i18n.t('compare.select_slot_3', '-- Chọn súng thứ 3 (Tùy chọn) --')
        : window.i18n.t(`compare.select_slot_${i + 1}`, `-- Chọn súng thứ ${i + 1} --`);

      let optionsHtml = `<option value="">${placeholderText}</option>`;
      
      // Group by category
      const categories = ['ar', 'dmr', 'sr', 'smg', 'sg', 'lmg', 'pistol'];
      categories.forEach((cat) => {
        const catWeapons = this.weapons.filter((w) => w.category === cat);
        if (catWeapons.length > 0) {
          const catLabel = window.i18n.t(`categories.${cat}`);
          optionsHtml += `<optgroup label="${catLabel}">`;
          catWeapons.forEach((w) => {
            const selected = w.id === currentVal ? 'selected' : '';
            optionsHtml += `<option value="${w.id}" ${selected}>${w.name}</option>`;
          });
          optionsHtml += `</optgroup>`;
        }
      });

      select.innerHTML = optionsHtml;
    }
  }

  bindEvents() {
    for (let i = 0; i < 3; i++) {
      const select = document.getElementById(`slotSelect${i + 1}`);
      if (!select) continue;

      select.addEventListener('change', (e) => {
        const weaponId = e.target.value;
        this.slots[i] = weaponId ? this.weapons.find((w) => w.id === weaponId) : null;
        this.renderComparison();
      });
    }
  }

  renderComparison() {
    const activeWeapons = this.slots.filter(Boolean);
    const container = document.getElementById('comparisonContent');
    if (!container) return;

    if (activeWeapons.length < 2) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); border: 1px dashed var(--border-tactical); border-radius: var(--radius-sm); background: rgba(255,255,255,0.01);">
          <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚠️</p>
          <p style="font-family: var(--font-body); font-size: 1rem; color: var(--text-secondary);">
            ${window.i18n.t('compare.subtitle', 'Vui lòng chọn ít nhất 2 khẩu súng để bắt đầu so sánh.')}
          </p>
        </div>
      `;
      return;
    }

    // Pre-calculate TTK against Lv 2 armor (chest)
    const statsList = activeWeapons.map((w) => {
      const dps = window.damageCalculator.calculateDPS(w);
      const chestShot = window.damageCalculator.calculateShot(w, 'chest', 2, 10);
      const headShot = window.damageCalculator.calculateShot(w, 'head', 2, 10);
      return {
        weapon: w,
        dps,
        chestDamage: chestShot.damage,
        chestShots: chestShot.shotsToKill,
        chestTTK: chestShot.ttkMs,
        headDamage: headShot.damage
      };
    });

    // Helper to determine winner index (higher is better, or lower is better)
    const getWinnerIndex = (values, lowerIsBetter = false) => {
      let bestIdx = 0;
      let bestVal = values[0];
      for (let i = 1; i < values.length; i++) {
        if (lowerIsBetter) {
          if (values[i] < bestVal) {
            bestVal = values[i];
            bestIdx = i;
          }
        } else {
          if (values[i] > bestVal) {
            bestVal = values[i];
            bestIdx = i;
          }
        }
      }
      return bestIdx;
    };

    const damageWinner = getWinnerIndex(activeWeapons.map((w) => w.damage));
    const rpmWinner = getWinnerIndex(activeWeapons.map((w) => w.rpm));
    const dpsWinner = getWinnerIndex(statsList.map((s) => s.dps));
    const velocityWinner = getWinnerIndex(activeWeapons.map((w) => w.muzzleVelocity));
    const reloadWinner = getWinnerIndex(activeWeapons.map((w) => w.tacticalReload), true);
    const ttkWinner = getWinnerIndex(statsList.map((s) => s.chestTTK), true);

    container.innerHTML = `
      <div class="showdown-table-wrap">
        <table class="showdown-table">
          <thead>
            <tr>
              <th class="metric-col">${window.i18n.t('stats.ammo_type', 'THÔNG SỐ SO SÁNH')}</th>
              ${activeWeapons.map((w) => `
                <th>
                  <img src="${w.image || w.icon}" alt="${w.name}" class="compare-weapon-thumb" loading="lazy" />
                  <div style="font-size: 1.3rem; margin-bottom: 0.25rem;">${w.name}</div>
                  <span class="badge badge-${w.ammo.replace('_', '-')}" style="font-size: 0.75rem;">
                    ${window.i18n.t(`ammo.${w.ammo}`)}
                  </span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Base Damage -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.base_damage')}</span>
                <span class="metric-desc">Sát thương gốc mỗi viên đạn</span>
              </td>
              ${activeWeapons.map((w, idx) => `
                <td class="val-cell ${idx === damageWinner ? 'winner' : ''}">${w.damage}</td>
              `).join('')}
            </tr>

            <!-- Fire Rate (RPM) -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.fire_rate')}</span>
                <span class="metric-desc">Tốc độ xả đạn (Rounds per minute)</span>
              </td>
              ${activeWeapons.map((w, idx) => `
                <td class="val-cell ${idx === rpmWinner ? 'winner' : ''}">${w.rpm} RPM</td>
              `).join('')}
            </tr>

            <!-- DPS -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.dps')}</span>
                <span class="metric-desc">Sát thương xả ra mỗi giây</span>
              </td>
              ${statsList.map((s, idx) => `
                <td class="val-cell ${idx === dpsWinner ? 'winner' : ''}">${s.dps}</td>
              `).join('')}
            </tr>

            <!-- Muzzle Velocity -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.muzzle_velocity')}</span>
                <span class="metric-desc">Vận tốc bay của đầu đạn (m/s)</span>
              </td>
              ${activeWeapons.map((w, idx) => `
                <td class="val-cell ${idx === velocityWinner ? 'winner' : ''}">${w.muzzleVelocity} m/s</td>
              `).join('')}
            </tr>

            <!-- Reload Time -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.reload_time')}</span>
                <span class="metric-desc">Thời gian nạp đạn chiến thuật (giây)</span>
              </td>
              ${activeWeapons.map((w, idx) => `
                <td class="val-cell ${idx === reloadWinner ? 'winner' : ''}">${w.tacticalReload}s</td>
              `).join('')}
            </tr>

            <!-- Mag Size -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">${window.i18n.t('stats.mag_capacity')}</span>
                <span class="metric-desc">Băng tiêu chuẩn / Mở rộng</span>
              </td>
              ${activeWeapons.map((w) => `
                <td class="val-cell">${w.magStandard} / ${w.magExtended}</td>
              `).join('')}
            </tr>

            <!-- TTK vs Vest 2 -->
            <tr style="background: rgba(241, 168, 10, 0.04);">
              <td class="metric-col">
                <span class="metric-name" style="color: var(--pubg-gold);">⏱️ ${window.i18n.t('calculator.ttk')} (Giáp 2)</span>
                <span class="metric-desc">Bắn ngực đối thủ mang Giáp Cấp 2</span>
              </td>
              ${statsList.map((s, idx) => `
                <td class="val-cell ${idx === ttkWinner ? 'winner' : ''}">
                  ${s.chestTTK} ms
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">
                    (${s.chestShots} viên x ${s.chestDamage} dmg)
                  </div>
                </td>
              `).join('')}
            </tr>

            <!-- Headshot vs Helmet 2 -->
            <tr>
              <td class="metric-col">
                <span class="metric-name">🎯 Headshot vs Mũ 2</span>
                <span class="metric-desc">Sát thương bắn trúng đầu Mũ Cấp 2</span>
              </td>
              ${statsList.map((s) => `
                <td class="val-cell ${s.headDamage >= 100 ? 'winner' : ''}">
                  ${s.headDamage} dmg
                  ${s.headDamage >= 100 ? '<div style="font-size: 0.72rem; color: #ff6b6b; font-weight: 700;">💀 1-TAP KNOCKOUT!</div>' : ''}
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
}

// Global instance
window.compareManager = new CompareManager();
