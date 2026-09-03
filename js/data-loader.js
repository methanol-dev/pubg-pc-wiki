/**
 * PUBG PC Tactical Wiki - Data Loader
 * Fetches, caches, and provides structured query methods for all game data
 */

class DataLoader {
  constructor() {
    this.cache = {};
  }

  async fetchJson(endpoint) {
    if (this.cache[endpoint]) {
      return this.cache[endpoint];
    }
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to load ${endpoint}: ${response.status}`);
      }
      const data = await response.json();
      this.cache[endpoint] = data;
      return data;
    } catch (error) {
      console.error(`DataLoader error loading ${endpoint}:`, error);
      return null;
    }
  }

  async getWeapons() {
    return (await this.fetchJson('data/weapons.json')) || [];
  }

  async getWeaponById(id) {
    const weapons = await this.getWeapons();
    return weapons.find((w) => w.id === id) || null;
  }

  async getAttachments() {
    return (await this.fetchJson('data/attachments.json')) || [];
  }

  async getMaps() {
    return (await this.fetchJson('data/maps.json')) || [];
  }

  async getEquipment() {
    return (await this.fetchJson('data/equipment.json')) || {};
  }
}

// Global instance
window.dataLoader = new DataLoader();
