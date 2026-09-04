/**
 * PUBG PC Tactical Wiki - Interactive Tactical Map Viewer
 * Features:
 * - Official High-Precision Satellite In-Game Imagery
 * - Multi-level Smooth Zoom (1.0x - 4.0x) centered at mouse cursor / touch pinch
 * - Drag and Pan navigation with boundary clamping
 * - Military Grid Overlay (A-H / 1-8) adapting dynamically per map size
 * - Interactive Strategic Hotspot POIs with radar pulses & tactical filters
 * - Live Grid & Coordinate tracking HUD
 * - Tactical Intelligence Dossier & Fast Target Focus
 * - Full bilingual support (VI / EN)
 */

class TacticalMapViewer {
  constructor() {
    this.maps = [];
    this.currentMap = null;
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.showGrid = true;
    this.activeFilter = 'all';
    this.selectedPoi = null;

    // Multi-touch pinch tracking
    this.initialPinchDistance = 0;
    this.initialPinchScale = 1;

    // Elements
    this.container = null;
    this.viewport = null;
    this.stage = null;
    this.mapImage = null;
    this.gridOverlay = null;
    this.markersLayer = null;
    this.popupCard = null;
  }

  async init() {
    try {
      this.maps = await window.dataLoader.getMaps();
      if (!this.maps || this.maps.length === 0) {
        console.error('No maps data found.');
        return;
      }

      this.cacheDom();
      this.bindEvents();

      // Check URL search params for map selection (e.g. ?map=rondo)
      const urlParams = new URLSearchParams(window.location.search);
      const requestedMap = urlParams.get('map');
      const initialMap = this.maps.find(m => m.id === requestedMap) || this.maps[0];

      this.renderTabs();
      this.loadMap(initialMap.id);

      // Listen for i18n language changes
      document.addEventListener('languageChanged', () => {
        this.onLanguageChanged();
      });
    } catch (err) {
      console.error('TacticalMapViewer init error:', err);
    }
  }

  cacheDom() {
    this.container = document.getElementById('mapViewerContainer');
    this.viewport = document.getElementById('mapViewport');
    this.stage = document.getElementById('mapStage');
    this.mapImage = document.getElementById('mapCanvasImage');
    this.gridOverlay = document.getElementById('gridOverlay');
    this.markersLayer = document.getElementById('markersLayer');
    this.tabsContainer = document.getElementById('mapSelectorTabs');
    this.popupCard = document.getElementById('poiPopupCard');
    this.hudCoord = document.getElementById('hudCoordinates');
    this.hudZoom = document.getElementById('hudZoomLevel');
    this.filterChips = document.querySelectorAll('.filter-chip');
    this.dossierContainer = document.getElementById('tacticalDossierSection');
    this.btnInfographic = document.getElementById('btnOpenInfographic');
    this.infographicModal = document.getElementById('infographicModal');
    this.infographicModalImg = document.getElementById('infographicModalImg');
    this.btnCloseInfographic = document.getElementById('btnCloseInfographic');
  }

  bindEvents() {
    if (!this.viewport) return;

    // Mouse wheel zoom
    this.viewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Mouse drag
    this.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());

    // Coordinate tracker
    this.viewport.addEventListener('mousemove', (e) => this.handleCoordinateTrack(e));

    // Double click to zoom in / reset
    this.viewport.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

    // Touch events for mobile
    this.viewport.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.viewport.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.viewport.addEventListener('touchend', () => this.handleTouchEnd());

    // HUD Button Controls
    document.getElementById('hudBtnZoomIn')?.addEventListener('click', () => this.zoomStep(1.25));
    document.getElementById('hudBtnZoomOut')?.addEventListener('click', () => this.zoomStep(0.8));
    document.getElementById('hudBtnReset')?.addEventListener('click', () => this.resetView());
    document.getElementById('hudBtnGrid')?.addEventListener('click', () => this.toggleGrid());
    document.getElementById('hudBtnFullscreen')?.addEventListener('click', () => this.toggleFullscreen());

    // Filter Chips
    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter') || 'all';
        this.setFilter(filter);
      });
    });

    // Close Popup button
    document.getElementById('popupCloseBtn')?.addEventListener('click', () => {
      this.closePoiPopup();
    });

    // Infographic Modal Controls
    this.btnInfographic?.addEventListener('click', () => this.openInfographicModal());
    this.btnCloseInfographic?.addEventListener('click', () => this.closeInfographicModal());
    this.infographicModal?.addEventListener('click', (e) => {
      if (e.target === this.infographicModal) this.closeInfographicModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeInfographicModal();
        this.closePoiPopup();
      }
    });

    // Window resize adjust
    window.addEventListener('resize', () => {
      this.clampPan();
      this.updateTransform();
    });
  }

  renderTabs() {
    if (!this.tabsContainer) return;
    this.tabsContainer.innerHTML = this.maps.map(m => `
      <button class="map-tab-btn ${m.id === this.currentMap?.id ? 'active' : ''}" data-map-id="${m.id}">
        <span>${m.name}</span>
        <span class="map-tab-size">${m.size}</span>
      </button>
    `).join('');

    this.tabsContainer.querySelectorAll('.map-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-map-id');
        this.loadMap(id);
      });
    });
  }

  loadMap(mapId) {
    const map = this.maps.find(m => m.id === mapId);
    if (!map) return;

    this.currentMap = map;
    this.closePoiPopup();
    this.resetView();

    // Update Tab UI
    this.tabsContainer.querySelectorAll('.map-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-map-id') === mapId);
    });

    // Update Header Info
    const titleEl = document.getElementById('viewerMapTitle');
    const badgeEl = document.getElementById('viewerMapBadge');
    if (titleEl) titleEl.textContent = map.name;
    if (badgeEl) badgeEl.textContent = `${map.size} // ${map.gridDimension}x${map.gridDimension} GRID`;

    // Load satellite map image
    if (this.mapImage) {
      this.mapImage.src = map.image;
      this.mapImage.alt = `${map.name} Tactical Map`;
    }

    // Build Military Grid Overlay
    this.renderGrid(map.gridDimension || 8);

    // Render POI Markers
    this.renderMarkers();

    // Update Infographic Button Visibility
    const mapsWithInfographic = ['erangel', 'taego', 'deston', 'paramo', 'vikendi', 'rondo'];
    if (this.btnInfographic) {
      this.btnInfographic.style.display = mapsWithInfographic.includes(mapId) ? 'inline-flex' : 'none';
    }

    // Render Tactical Dossier Details
    this.renderDossier();
  }

  renderGrid(dimension) {
    if (!this.gridOverlay) return;
    this.gridOverlay.innerHTML = '';
    const step = 100 / dimension;

    // Vertical lines & column labels
    for (let i = 1; i < dimension; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-vertical';
      line.style.left = `${i * step}%`;
      this.gridOverlay.appendChild(line);
    }

    // Column labels (A, B, C...)
    for (let i = 0; i < dimension; i++) {
      const colLabel = document.createElement('span');
      colLabel.className = 'grid-label-col';
      colLabel.style.left = `${i * step + step / 2}%`;
      colLabel.textContent = String.fromCharCode(65 + i);
      this.gridOverlay.appendChild(colLabel);
    }

    // Horizontal lines & row labels
    for (let i = 1; i < dimension; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-horizontal';
      line.style.top = `${i * step}%`;
      this.gridOverlay.appendChild(line);
    }

    // Row labels (1, 2, 3...)
    for (let i = 0; i < dimension; i++) {
      const rowLabel = document.createElement('span');
      rowLabel.className = 'grid-label-row';
      rowLabel.style.top = `${i * step + step / 2}%`;
      rowLabel.textContent = (i + 1).toString();
      this.gridOverlay.appendChild(rowLabel);
    }
  }

  renderMarkers() {
    if (!this.markersLayer || !this.currentMap) return;
    this.markersLayer.innerHTML = '';

    const hotspots = this.currentMap.hotspots || [];
    hotspots.forEach(poi => {
      const marker = document.createElement('div');
      marker.className = 'poi-marker';
      marker.setAttribute('data-id', poi.id);
      marker.setAttribute('data-type', poi.type);
      marker.style.left = `${poi.x}%`;
      marker.style.top = `${poi.y}%`;

      // Icon by POI type
      let icon = '🎯';
      if (poi.type === 'secret_room') icon = '🔑';
      else if (poi.type === 'bluechip') icon = '📡';
      else if (poi.type === 'market') icon = '🛒';
      else if (poi.type === 'special') icon = '⭐';

      marker.innerHTML = `
        <div class="marker-pin">${icon}</div>
        <div class="marker-label">${poi.name}</div>
      `;

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectPoi(poi);
      });

      this.markersLayer.appendChild(marker);
    });

    this.applyMarkerFilter();
  }

  setFilter(filter) {
    this.activeFilter = filter;
    this.filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-filter') === filter);
    });
    this.applyMarkerFilter();
  }

  applyMarkerFilter() {
    const filter = this.activeFilter;
    const isMatch = (type) => {
      if (filter === 'all') return true;
      if (filter === 'utility') return (type === 'bluechip' || type === 'market' || type === 'special');
      if (filter === 'hotdrop') return (type === 'hotdrop');
      if (filter === 'secret_room') return (type === 'secret_room');
      return (type === filter);
    };

    if (this.markersLayer) {
      const markers = this.markersLayer.querySelectorAll('.poi-marker');
      markers.forEach(el => {
        const type = el.getAttribute('data-type');
        el.style.display = isMatch(type) ? 'flex' : 'none';
      });
    }

    const cards = document.querySelectorAll('.hotspot-item-card');
    cards.forEach(el => {
      const type = el.getAttribute('data-type');
      el.style.display = isMatch(type) ? 'flex' : 'none';
    });
  }

  selectPoi(poi) {
    this.selectedPoi = poi;

    // Highlight marker pin
    const markers = this.markersLayer.querySelectorAll('.poi-marker');
    markers.forEach(m => m.classList.toggle('active', m.getAttribute('data-id') === poi.id));

    // Highlight list item in directory
    const items = document.querySelectorAll('.hotspot-item-card');
    items.forEach(it => it.classList.toggle('active', it.getAttribute('data-id') === poi.id));

    this.openPoiPopup(poi);
  }

  openPoiPopup(poi) {
    if (!this.popupCard) return;
    const lang = window.i18n ? window.i18n.getLang() : 'vi';

    const titleEl = document.getElementById('popupTitle');
    const coordEl = document.getElementById('popupCoord');
    const riskEl = document.getElementById('popupRiskBadge');
    const lootEl = document.getElementById('popupLootBadge');
    const descEl = document.getElementById('popupDesc');
    const tipEl = document.getElementById('popupTipText');

    if (titleEl) titleEl.textContent = poi.name;
    if (coordEl) coordEl.textContent = `GRID ${poi.grid} // X:${poi.x}% Y:${poi.y}%`;
    
    if (riskEl) {
      riskEl.textContent = poi.riskLevel;
      riskEl.className = 'popup-badge';
      if (poi.riskLevel.toLowerCase().includes('extreme')) riskEl.classList.add('badge-risk-extreme');
      else if (poi.riskLevel.toLowerCase().includes('high')) riskEl.classList.add('badge-risk-high');
      else riskEl.classList.add('badge-risk-medium');
    }

    if (lootEl) {
      lootEl.textContent = poi.lootTier;
      lootEl.className = 'popup-badge badge-risk-high';
    }

    if (descEl) {
      descEl.textContent = poi.description[lang] || poi.description.en || '';
    }

    if (tipEl) {
      tipEl.textContent = poi.tip[lang] || poi.tip.en || '';
    }

    this.popupCard.classList.add('open');
  }

  closePoiPopup() {
    if (this.popupCard) this.popupCard.classList.remove('open');
    if (this.markersLayer) {
      this.markersLayer.querySelectorAll('.poi-marker').forEach(m => m.classList.remove('active'));
    }
  }

  focusPoi(poi, targetZoom = 2.4) {
    const rect = this.viewport.getBoundingClientRect();
    this.scale = targetZoom;

    // Center target coordinates
    const targetX = (poi.x / 100) * rect.width * this.scale;
    const targetY = (poi.y / 100) * rect.height * this.scale;
    const newPanX = (rect.width / 2) - targetX;
    const newPanY = (rect.height / 2) - targetY;

    if (this.stage) {
      this.stage.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)';
    }

    this.setPan(newPanX, newPanY);
    this.updateTransform();

    setTimeout(() => {
      if (this.stage) this.stage.style.transition = '';
    }, 420);

    this.selectPoi(poi);
  }

  /* --- ZOOM & PAN ENGINE --- */

  handleWheel(e) {
    e.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, 1.0), 4.0);

    if (newScale === this.scale) return;

    // Zoom centered on cursor position
    const ratio = newScale / this.scale;
    const newPanX = mouseX - (mouseX - this.panX) * ratio;
    const newPanY = mouseY - (mouseY - this.panY) * ratio;

    this.scale = newScale;
    this.setPan(newPanX, newPanY);
    this.updateTransform();
  }

  zoomStep(multiplier) {
    const rect = this.viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.min(Math.max(this.scale * multiplier, 1.0), 4.0);
    if (newScale === this.scale) return;

    const ratio = newScale / this.scale;
    const newPanX = centerX - (centerX - this.panX) * ratio;
    const newPanY = centerY - (centerY - this.panY) * ratio;

    if (this.stage) {
      this.stage.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)';
    }

    this.scale = newScale;
    this.setPan(newPanX, newPanY);
    this.updateTransform();

    setTimeout(() => {
      if (this.stage) this.stage.style.transition = '';
    }, 250);
  }

  resetView() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    if (this.stage) {
      this.stage.style.transition = 'transform 0.3s ease-out';
    }
    this.updateTransform();
    setTimeout(() => {
      if (this.stage) this.stage.style.transition = '';
    }, 300);
  }

  handleMouseDown(e) {
    if (e.button !== 0) return; // Left mouse only
    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
    this.viewport.classList.add('is-dragging');
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    const newPanX = e.clientX - this.startX;
    const newPanY = e.clientY - this.startY;
    this.setPan(newPanX, newPanY);
    this.updateTransform();
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.viewport.classList.remove('is-dragging');
    }
  }

  handleDoubleClick(e) {
    const rect = this.viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.scale > 1.2) {
      this.resetView();
    } else {
      const targetScale = 2.2;
      const ratio = targetScale / this.scale;
      const newPanX = mouseX - (mouseX - this.panX) * ratio;
      const newPanY = mouseY - (mouseY - this.panY) * ratio;

      if (this.stage) {
        this.stage.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)';
      }
      this.scale = targetScale;
      this.setPan(newPanX, newPanY);
      this.updateTransform();
      setTimeout(() => {
        if (this.stage) this.stage.style.transition = '';
      }, 300);
    }
  }

  /* --- TOUCH GESTURE SUPPORT (MOBILE) --- */

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.panX;
      this.startY = e.touches[0].clientY - this.panY;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.initialPinchDistance = this.getTouchDistance(e.touches);
      this.initialPinchScale = this.scale;
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const newPanX = e.touches[0].clientX - this.startX;
      const newPanY = e.touches[0].clientY - this.startY;
      this.setPan(newPanX, newPanY);
      this.updateTransform();
    } else if (e.touches.length === 2) {
      const currentDistance = this.getTouchDistance(e.touches);
      if (this.initialPinchDistance > 0) {
        const factor = currentDistance / this.initialPinchDistance;
        const newScale = Math.min(Math.max(this.initialPinchScale * factor, 1.0), 4.0);
        
        const rect = this.viewport.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const ratio = newScale / this.scale;
        const newPanX = midX - (midX - this.panX) * ratio;
        const newPanY = midY - (midY - this.panY) * ratio;

        this.scale = newScale;
        this.setPan(newPanX, newPanY);
        this.updateTransform();
      }
    }
  }

  handleTouchEnd() {
    this.isDragging = false;
    this.initialPinchDistance = 0;
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  /* --- PAN BOUNDARY CLAMPING --- */

  setPan(x, y) {
    const rect = this.viewport.getBoundingClientRect();
    const minX = rect.width * (1 - this.scale);
    const minY = rect.height * (1 - this.scale);

    if (this.scale <= 1.0) {
      this.panX = 0;
      this.panY = 0;
    } else {
      this.panX = Math.min(0, Math.max(minX, x));
      this.panY = Math.min(0, Math.max(minY, y));
    }
  }

  clampPan() {
    this.setPan(this.panX, this.panY);
  }

  updateTransform() {
    if (this.stage) {
      this.stage.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.scale})`;
      this.stage.style.setProperty('--map-zoom', this.scale);
    }
    if (this.hudZoom) {
      this.hudZoom.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  handleCoordinateTrack(e) {
    if (!this.hudCoord || !this.currentMap) return;
    const rect = this.viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pctX = ((mouseX - this.panX) / (rect.width * this.scale)) * 100;
    const pctY = ((mouseY - this.panY) / (rect.height * this.scale)) * 100;

    if (pctX >= 0 && pctX <= 100 && pctY >= 0 && pctY <= 100) {
      const dim = this.currentMap.gridDimension || 8;
      const col = Math.min(dim - 1, Math.max(0, Math.floor((pctX / 100) * dim)));
      const row = Math.min(dim, Math.max(1, Math.floor((pctY / 100) * dim) + 1));
      const colLetter = String.fromCharCode(65 + col);
      this.hudCoord.textContent = `GRID: ${colLetter}${row} [${Math.round(pctX)}%, ${Math.round(pctY)}%]`;
    }
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.gridOverlay) {
      this.gridOverlay.classList.toggle('hidden', !this.showGrid);
    }
    const btn = document.getElementById('hudBtnGrid');
    if (btn) btn.classList.toggle('active', this.showGrid);
  }

  toggleFullscreen() {
    const elem = this.container;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /* --- DOSSIER & DIRECTORY RENDERING --- */

  renderDossier() {
    if (!this.dossierContainer || !this.currentMap) return;
    const map = this.currentMap;
    const lang = window.i18n ? window.i18n.getLang() : 'vi';

    const climateText = map.climate[lang] || map.climate.en || '';
    const terrainText = map.terrain[lang] || map.terrain.en || '';
    const featuresText = map.specialFeatures[lang] || map.specialFeatures.en || '';
    const descText = map.description[lang] || map.description.en || '';

    const vehiclesHtml = map.vehicles.map(v => `<span class="vehicle-tag">${v}</span>`).join(' ');
    const weaponsHtml = (map.exclusiveWeapons || []).map(w => `<span class="badge badge-airdrop">${w}</span>`).join(' ');

    const t = (key, fallback) => window.i18n ? window.i18n.t(key, fallback) : fallback;

    this.dossierContainer.innerHTML = `
      <div class="tactical-dossier-grid">
        <!-- Map Specs Card -->
        <div class="dossier-card">
          <div class="dossier-header">
            <h3 class="dossier-title">
              <span>📋 ${t('maps_page.dossier_title', 'Hồ Sơ Tác Chiến Chiến Trường')} // ${map.name}</span>
            </h3>
            <span class="badge badge-world">${map.size}</span>
          </div>
          
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
            ${descText}
          </p>

          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="label-cell">🌦️ ${t('maps_page.climate', 'Khí Hậu & Môi Trường')}:</td>
                <td class="value-cell">${climateText}</td>
              </tr>
              <tr>
                <td class="label-cell">⛰️ ${t('maps_page.terrain', 'Địa Hình Tác Chiến')}:</td>
                <td class="value-cell">${terrainText}</td>
              </tr>
              <tr>
                <td class="label-cell">✨ ${t('maps_page.secret_rooms', 'Cơ Chế & Khí Tài')}:</td>
                <td class="value-cell" style="color: var(--pubg-gold);">${featuresText}</td>
              </tr>
              <tr>
                <td class="label-cell">🚗 ${t('maps_page.vehicles', 'Phương Tiện')}:</td>
                <td class="value-cell"><div class="map-vehicle-tags">${vehiclesHtml}</div></td>
              </tr>
              ${weaponsHtml ? `
              <tr>
                <td class="label-cell">🔫 ${t('maps_page.exclusive_weapons', 'Vũ Khí Đặc Trưng')}:</td>
                <td class="value-cell">${weaponsHtml}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Hotspots Directory Card -->
        <div class="dossier-card">
          <div class="dossier-header">
            <h3 class="dossier-title">
              <span>🎯 ${t('maps_page.hotspots_list', 'Điểm Nóng Chiến Lược (POIs)')}</span>
            </h3>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
              ${map.hotspots.length} ${t('maps_page.all_markers', 'Điểm')}
            </span>
          </div>

          <div class="hotspots-directory-list" id="hotspotsDirectoryList">
            ${map.hotspots.map(h => {
              let icon = '🎯';
              let bg = '#ff4655';
              if (h.type === 'secret_room') { icon = '🔑'; bg = '#f1a80a'; }
              else if (h.type === 'bluechip') { icon = '📡'; bg = '#00f0ff'; }
              else if (h.type === 'market') { icon = '🛒'; bg = '#10b981'; }
              else if (h.type === 'special') { icon = '⭐'; bg = '#a855f7'; }

              return `
                <div class="hotspot-item-card" data-id="${h.id}" data-type="${h.type}">
                  <div class="item-left">
                    <div class="item-icon-circle" style="background: ${bg}22; border: 1px solid ${bg}; color: ${bg};">
                      ${icon}
                    </div>
                    <div class="item-info">
                      <span class="item-name">${h.name}</span>
                      <span class="item-grid">${t('maps_page.grid_coord', 'Tọa độ')}: ${h.grid} // ${h.lootTier}</span>
                    </div>
                  </div>
                  <div class="item-right">
                    <span class="badge ${h.riskLevel.toLowerCase().includes('extreme') ? 'badge-airdrop' : 'badge-world'}">
                      ${h.riskLevel}
                    </span>
                    <button class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" title="${t('maps_page.explore_map', 'Xem vị trí')}">
                      🔍
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Bind click events on Hotspots Directory items
    this.dossierContainer.querySelectorAll('.hotspot-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const poi = map.hotspots.find(h => h.id === id);
        if (poi) {
          this.focusPoi(poi, 2.3);
          // Scroll viewport into view if scrolled far down
          this.viewport.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Apply active filter to newly rendered dossier items
    this.applyMarkerFilter();
  }

  openInfographicModal() {
    if (!this.infographicModal || !this.currentMap) return;
    const imgUrl = `assets/maps_update/${this.currentMap.id}.png`;
    if (this.infographicModalImg) {
      this.infographicModalImg.src = imgUrl;
      this.infographicModalImg.alt = `${this.currentMap.name} Secret Key Tactical Guide`;
    }
    const titleEl = document.getElementById('infographicModalTitle');
    if (titleEl) {
      const baseTitle = window.i18n ? window.i18n.t('maps_page.infographic_modal_title', 'Bản Đồ Hướng Dẫn Vị Trí Chìa Khóa & Mật Thất') : 'Bản Đồ Hướng Dẫn Vị Trí Chìa Khóa & Mật Thất';
      titleEl.textContent = `${baseTitle} // ${this.currentMap.name}`;
    }
    this.infographicModal.classList.add('open');
    this.infographicModal.setAttribute('aria-hidden', 'false');
  }

  closeInfographicModal() {
    if (!this.infographicModal) return;
    this.infographicModal.classList.remove('open');
    this.infographicModal.setAttribute('aria-hidden', 'true');
  }

  onLanguageChanged() {
    this.renderDossier();
    if (this.selectedPoi) {
      this.openPoiPopup(this.selectedPoi);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.tacticalMapViewer = new TacticalMapViewer();
  window.tacticalMapViewer.init();
});
