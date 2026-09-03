/**
 * PUBG PC Tactical Wiki - Damage & TTK Calculation Engine
 * Precise formulas modeling PUBG PC ballistics, armor mitigations, and time-to-kill
 */

class DamageCalculator {
  constructor() {
    // Armor damage reduction coefficients
    this.armorReductions = {
      0: 0.0,  // No armor (100% damage taken)
      1: 0.30, // Level 1 (30% reduction -> 70% damage taken)
      2: 0.40, // Level 2 (40% reduction -> 60% damage taken)
      3: 0.55  // Level 3 (55% reduction -> 45% damage taken)
    };

    // Body location multipliers
    this.hitMultipliers = {
      head: {
        ar: 2.35,
        dmr: 2.35,
        sr: 2.50,
        smg: 1.80,
        sg: 1.50,
        lmg: 2.35,
        pistol: 2.00,
        default: 2.35
      },
      chest: {
        default: 1.00
      },
      stomach: {
        default: 0.95
      },
      limbs: {
        smg: 1.30, // SMG limb damage bonus in PUBG PC
        default: 0.90
      }
    };
  }

  getHitMultiplier(location, category) {
    const locMap = this.hitMultipliers[location];
    if (!locMap) return 1.0;
    return locMap[category] || locMap.default || 1.0;
  }

  getArmorMultiplier(level) {
    const reduction = this.armorReductions[level] ?? 0;
    return 1.0 - reduction;
  }

  /**
   * Distance damage falloff modifier
   */
  getRangeMultiplier(weapon, distanceMeters = 10) {
    const effective = weapon.effectiveRange || 300;
    if (distanceMeters <= effective) {
      return 1.0;
    }
    // Mild falloff beyond effective range (caps at 0.75 min)
    const excess = distanceMeters - effective;
    const falloff = Math.max(0.75, 1.0 - (excess / 1000) * 0.3);
    return falloff;
  }

  /**
   * Calculate single shot damage, shots to kill, and TTK
   * @param {Object} weapon - Weapon data object
   * @param {string} location - 'head' | 'chest' | 'stomach' | 'limbs'
   * @param {number} armorLevel - 0, 1, 2, 3
   * @param {number} distanceMeters - Combat distance in meters
   */
  calculateShot(weapon, location = 'chest', armorLevel = 2, distanceMeters = 10) {
    const hitMult = this.getHitMultiplier(location, weapon.category);
    
    // Limbs are not protected by vests or helmets in PUBG
    const effectiveArmor = location === 'limbs' ? 0 : armorLevel;
    const armorMult = this.getArmorMultiplier(effectiveArmor);
    const rangeMult = this.getRangeMultiplier(weapon, distanceMeters);

    const rawDamage = weapon.damage * hitMult * armorMult * rangeMult;
    const damage = Math.round(rawDamage * 10) / 10;

    const shotsToKill = damage > 0 ? Math.ceil(100 / damage) : 999;
    const isOneShot = shotsToKill === 1;

    let ttkSeconds = 0;
    if (shotsToKill > 1 && weapon.rpm > 0) {
      const delayBetweenShots = 60 / weapon.rpm;
      ttkSeconds = (shotsToKill - 1) * delayBetweenShots;
    }
    const ttkMs = Math.round(ttkSeconds * 1000);

    return {
      damage,
      shotsToKill,
      ttkSeconds: Math.round(ttkSeconds * 100) / 100,
      ttkMs,
      isOneShot,
      location,
      armorLevel,
      distanceMeters
    };
  }

  /**
   * Generates a full hit matrix table for a weapon across all 4 armor levels
   */
  generateMatrix(weapon, distanceMeters = 10) {
    const locations = ['head', 'chest', 'stomach', 'limbs'];
    const armorLevels = [0, 1, 2, 3];
    const matrix = {};

    locations.forEach((loc) => {
      matrix[loc] = {};
      armorLevels.forEach((armor) => {
        matrix[loc][armor] = this.calculateShot(weapon, loc, armor, distanceMeters);
      });
    });

    return matrix;
  }

  /**
   * Calculate weapon DPS (Damage Per Second)
   */
  calculateDPS(weapon) {
    if (!weapon.damage || !weapon.rpm) return 0;
    return Math.round((weapon.damage * (weapon.rpm / 60)) * 10) / 10;
  }
}

// Global instance
window.damageCalculator = new DamageCalculator();
