// UrbanTwin AI - Frontend Application Logic

let map, polylineGroup, markersGroup;
let currentTab = 'dashboard';
let camerasData = [];
let activeCamId = 'CAM_01';
let canvasAnimationId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  try {
    initMap();
  } catch (e) {
    console.warn("Map initialization skipped or waiting for Leaflet:", e);
  }
  loadDashboardData();
  try {
    initYoloCanvas();
  } catch (e) {
    console.warn("YOLO canvas error:", e);
  }
  try {
    initAnalyticsCharts();
  } catch (e) {
    console.warn("Analytics charts error:", e);
  }

  // Refresh live metrics periodically
  setInterval(() => {
    if (currentTab === 'dashboard') loadDashboardData();
  }, 10000);
});

// TAB NAVIGATION
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('text-white', 'bg-cyan-600/30', 'border-cyan-500/40');
    btn.classList.add('text-gray-400');
  });

  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.classList.remove('text-gray-400');
    activeNav.classList.add('text-white', 'bg-cyan-600/30', 'border-cyan-500/40');
  }

  if (tabId === 'dashboard' && map) {
    setTimeout(() => map.invalidateSize(), 200);
  } else if (tabId === 'tracking') {
    loadVehicleTrajectory('V1023');
  } else if (tabId === 'predictions') {
    loadPredictions();
  } else if (tabId === 'simulation') {
    runSimulation();
  }
}

// LEAFLET MAP INITIALIZATION
function initMap() {
  const mapElement = document.getElementById('city-map');
  if (!mapElement) return;

  if (typeof L === 'undefined') {
    mapElement.innerHTML = `
      <div class="w-full h-full bg-gray-900 rounded-xl flex flex-col items-center justify-center p-6 border border-gray-800 text-center space-y-3">
        <i class="fa-solid fa-map text-4xl text-cyan-400"></i>
        <h4 class="font-bold text-white">Urban Digital Twin Network Map</h4>
        <p class="text-xs text-gray-400 max-w-md">Live road network visualization with 6 active camera nodes, heatmaps & traffic flow overlays.</p>
        <div class="grid grid-cols-3 gap-2 w-full max-w-sm text-xs font-mono">
          <div class="bg-emerald-500/20 text-emerald-400 p-2 rounded border border-emerald-500/30">ROAD-D-E: 24%</div>
          <div class="bg-amber-500/20 text-amber-400 p-2 rounded border border-amber-500/30">ROAD-E-F: 55%</div>
          <div class="bg-rose-500/20 text-rose-400 p-2 rounded border border-rose-500/30">ROAD-A-B: 78%</div>
        </div>
      </div>
    `;
    return;
  }

  // Center on Bangalore traffic corridor network
  map = L.map('city-map', { zoomControl: true }).setView([12.9350, 77.6350], 12);

  // CartoDB Dark Matter tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  polylineGroup = L.layerGroup().addTo(map);
  markersGroup = L.layerGroup().addTo(map);
}

// LOAD DASHBOARD DATA FROM FASTAPI BACKEND
async function loadDashboardData() {
  try {
    const [camsRes, trafficRes, anomalyRes] = await Promise.all([
      fetch('/api/v1/cameras'),
      fetch('/api/v1/traffic/current'),
      fetch('/api/v1/anomalies')
    ]);

    camerasData = await camsRes.json();
    const trafficData = await trafficRes.json();
    const anomalyData = await anomalyRes.json();

    renderMapElements(camerasData, trafficData);
    renderCameraSelector(camerasData);
    renderAnomalies(anomalyData);
    renderQuickCameras(camerasData);
    updateSummaryStats(trafficData);
  } catch (err) {
    console.error("Failed loading dashboard data:", err);
  }
}

// RENDER MAP ROAD SEGMENTS & CAMERA MARKERS
function renderMapElements(cameras, traffic) {
  if (!map) return;
  polylineGroup.clearLayers();
  markersGroup.clearLayers();

  // Draw Camera Markers
  cameras.forEach(cam => {
    const iconHtml = `<div class="w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 text-xs shadow-lg font-bold">${cam.camera_id.replace('CAM_', '')}</div>`;
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-map-icon',
      iconSize: [32, 32]
    });

    const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon }).addTo(markersGroup);
    marker.bindPopup(`
      <div class="custom-leaflet-popup p-2 text-xs">
        <h4 class="font-bold text-cyan-400">${cam.camera_id}: ${cam.name}</h4>
        <p class="text-gray-300">Status: <span class="text-emerald-400 font-bold">${cam.status}</span> | Road: ${cam.road_id}</p>
        <button onclick="selectCamera('${cam.camera_id}')" class="mt-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded w-full">View Video Stream</button>
      </div>
    `);
  });

  // Draw Bangalore road network polylines with congestion colors
  const roadCoords = {
    "ROAD-A-B": [[12.9756, 77.6067], [12.9784, 77.6408]],
    "ROAD-B-C": [[12.9784, 77.6408], [12.9352, 77.6245]],
    "ROAD-C-D": [[12.9352, 77.6245], [12.9176, 77.6238]],
    "ROAD-D-E": [[12.9176, 77.6238], [12.9260, 77.6762]],
    "ROAD-E-F": [[12.9260, 77.6762], [12.8452, 77.6602]],
    "ROAD-F-A": [[12.8452, 77.6602], [12.9756, 77.6067]]
  };

  traffic.forEach(item => {
    const coords = roadCoords[item.road_id];
    if (coords) {
      const color = item.congestion_pct > 65 ? '#f43f5e' : (item.congestion_pct > 35 ? '#f59e0b' : '#10b981');
      L.polyline(coords, {
        color: color,
        weight: 6,
        opacity: 0.85,
        lineCap: 'round'
      }).bindTooltip(`${item.road_id}: Congestion ${item.congestion_pct}% (${item.avg_speed_kmh} km/h)`).addTo(polylineGroup);
    }
  });

  // Fit bounds if markers exist
  if (cameras.length > 0) {
    const bounds = L.latLngBounds(cameras.map(c => [c.latitude, c.longitude]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }
}

// UPDATE SUMMARY STATS
function updateSummaryStats(trafficData) {
  if (!trafficData || trafficData.length === 0) return;
  const totalVehicles = trafficData.reduce((acc, curr) => acc + curr.vehicle_count, 0);
  const avgSpeed = (trafficData.reduce((acc, curr) => acc + curr.avg_speed_kmh, 0) / trafficData.length).toFixed(1);
  const avgCongestion = (trafficData.reduce((acc, curr) => acc + curr.congestion_pct, 0) / trafficData.length).toFixed(1);

  document.getElementById('stat-vehicles').innerText = totalVehicles;
  document.getElementById('stat-speed').innerText = avgSpeed;
  document.getElementById('stat-congestion').innerText = `${avgCongestion}%`;
}

// RENDER ANOMALIES FEED
function renderAnomalies(anomalies) {
  const container = document.getElementById('anomaly-list');
  if (!container) return;
  container.innerHTML = anomalies.map(anm => `
    <div class="p-2.5 rounded-lg bg-gray-900/80 border border-rose-500/30 text-xs space-y-1">
      <div class="flex justify-between items-center font-bold">
        <span class="text-rose-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${anm.anomaly_type}</span>
        <span class="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded font-mono">${anm.severity}</span>
      </div>
      <p class="text-gray-300">${anm.road_name} (${anm.camera_id})</p>
      <div class="flex justify-between text-gray-400 text-[11px]">
        <span>Current: <b class="text-white">${anm.current_speed_kmh} km/h</b> (Exp: ${anm.expected_speed_kmh} km/h)</span>
        <span class="text-rose-400 font-mono font-bold">Score: ${anm.anomaly_score}</span>
      </div>
    </div>
  `).join('');
}

// RENDER QUICK CAMERA LIST
function renderQuickCameras(cameras) {
  const container = document.getElementById('quick-camera-list');
  if (!container) return;
  container.innerHTML = cameras.map(cam => `
    <div onclick="selectCamera('${cam.camera_id}')" class="p-2 rounded bg-gray-900/60 border border-gray-800 hover:border-cyan-500/40 cursor-pointer flex justify-between items-center">
      <span class="font-medium text-white">${cam.camera_id}: ${cam.name}</span>
      <span class="${cam.status === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'} font-semibold">${cam.status}</span>
    </div>
  `).join('');
}

// RENDER CAMERA SELECTOR FOR CAMERA VIEW
function renderCameraSelector(cameras) {
  const container = document.getElementById('camera-selector-list');
  if (!container) return;
  container.innerHTML = cameras.map(cam => `
    <div onclick="selectCamera('${cam.camera_id}')" class="p-3 rounded-xl border ${cam.camera_id === activeCamId ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'} cursor-pointer transition space-y-1">
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold text-white">${cam.camera_id}</span>
        <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">${cam.fps} FPS</span>
      </div>
      <p class="text-xs text-gray-300">${cam.name}</p>
    </div>
  `).join('');
}

function selectCamera(camId) {
  activeCamId = camId;
  const cam = camerasData.find(c => c.camera_id === camId);
  if (cam) {
    document.getElementById('active-cam-title').innerText = `${cam.camera_id} — ${cam.name}`;
    const fpsEl = document.getElementById('active-cam-fps');
    if (fpsEl) fpsEl.innerText = `FPS: ${cam.fps} | Status: ${cam.status}`;
  }
  renderCameraSelector(camerasData);
  switchTab('cameras');
  triggerFrameProcess();
}

// YOLO CANVAS SIMULATION ENGINE
function initYoloCanvas() {
  const canvas = document.getElementById('yolo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let frame = 0;
  function animate() {
    frame++;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simulated road lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(100, 540); ctx.lineTo(400, 0);
    ctx.moveTo(860, 540); ctx.lineTo(560, 0);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(480, 540); ctx.lineTo(480, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bounding boxes for tracked vehicles
    const vehicles = [
      { id: 1023, class: 'car', x: 200 + (frame * 1.5) % 400, y: 350 - (frame * 0.8) % 250, w: 100, h: 70, speed: 48.2, color: '#06b6d4' },
      { id: 4089, class: 'bus', x: 600 - (frame * 1.1) % 350, y: 400 - (frame * 0.5) % 200, w: 140, h: 90, speed: 38.5, color: '#8b5cf6' },
      { id: 7712, class: 'truck', x: 420 + (frame * 0.7) % 200, y: 220 - (frame * 0.4) % 150, w: 120, h: 80, speed: 42.0, color: '#10b981' }
    ];

    vehicles.forEach(v => {
      // Bounding box
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(v.x, v.y, v.w, v.h);

      // Top label badge
      ctx.fillStyle = v.color;
      ctx.fillRect(v.x, v.y - 20, v.w, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${v.class.toUpperCase()} #${v.id} | ${v.speed}km/h`, v.x + 4, v.y - 6);
    });

    canvasAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

// TRIGGER FRAME SCAN API
async function triggerFrameProcess() {
  try {
    const res = await fetch(`/api/v1/cameras/${activeCamId}/process`, { method: 'POST' });
    const data = await res.json();
    if (data.sample_plate_observation) {
      document.getElementById('anpr-plate-hash').innerText = data.sample_plate_observation.plate_hash;
    }
    const fpsEl = document.getElementById('active-cam-fps');
    if (fpsEl && data.fps) {
      fpsEl.innerText = `FPS: ${data.fps} | Detections: ${data.detections_count || 6}`;
    }
  } catch (e) {
    console.error("Frame process trigger error:", e);
  }
}

// VEHICLE TRAJECTORY LOADER
async function loadVehicleTrajectory(vehicleId) {
  try {
    const res = await fetch(`/api/v1/vehicles/${vehicleId}/trajectory`);
    const data = await res.json();

    document.getElementById('traj-final-score').innerText = `${Math.round(data.final_score * 100)}%`;

    // Render Timeline
    const timelineEl = document.getElementById('trajectory-timeline');
    timelineEl.innerHTML = data.timeline.map((item, idx) => `
      <div class="relative">
        <div class="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-2 border-gray-900 shadow"></div>
        <div class="glass-card p-3 space-y-1">
          <div class="flex justify-between items-center font-bold text-xs">
            <span class="text-cyan-400">${item.camera_id}: ${item.name}</span>
            <span class="text-gray-400 font-mono">${item.timestamp}</span>
          </div>
          <p class="text-xs text-gray-300">Observed Speed: <b class="text-white">${item.speed_kmh} km/h</b></p>
        </div>
      </div>
    `).join('');

    // Render Match Breakdown Bars
    const bd = data.breakdown;
    const bdBars = [
      { label: 'Plate Hash Match', val: bd.plate_similarity },
      { label: 'Vehicle Type Classifier', val: bd.vehicle_type },
      { label: 'Appearance Features', val: bd.appearance_features },
      { label: 'Travel Time Feasibility', val: bd.travel_time },
      { label: 'Route Consistency', val: bd.route_consistency }
    ];

    document.getElementById('traj-breakdown-bars').innerHTML = bdBars.map(b => `
      <div>
        <div class="flex justify-between text-gray-300 font-medium mb-1">
          <span>${b.label}</span>
          <span class="text-cyan-400 font-bold">${Math.round(b.val * 100)}%</span>
        </div>
        <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full bg-cyan-500 rounded-full" style="width: ${Math.round(b.val * 100)}%"></div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error("Trajectory error:", err);
  }
}

// PREDICTIONS LOADER
async function loadPredictions() {
  try {
    const res = await fetch('/api/v1/predictions');
    const preds = await res.json();

    const grid = document.getElementById('predictions-grid');
    grid.innerHTML = preds.map(p => `
      <div class="glass-card p-4 space-y-3 glass-card-hover">
        <h4 class="font-bold text-white text-sm border-b border-gray-800 pb-2">${p.road_name}</h4>
        <div class="text-xs text-gray-400 flex justify-between">
          <span>Current Congestion:</span>
          <span class="text-cyan-400 font-bold">${p.current_congestion}%</span>
        </div>
        <div class="space-y-2 pt-2">
          ${p.horizons.map(h => `
            <div class="p-2 rounded bg-gray-900/60 border border-gray-800 text-xs flex justify-between items-center">
              <span class="text-purple-300 font-semibold">${h.horizon_min} min Forecast</span>
              <span class="text-white font-bold">${h.predicted_congestion_pct}% (${h.predicted_avg_speed_kmh} km/h)</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Predictions error:", err);
  }
}

// WHAT-IF SIMULATION EXECUTION
async function runSimulation() {
  const closedRoad = document.getElementById('sim-road-close').value;
  const volChange = parseFloat(document.getElementById('sim-volume').value);
  const signalSec = parseInt(document.getElementById('sim-signal').value);

  const payload = {
    closed_roads: closedRoad ? [closedRoad] : [],
    traffic_volume_change_pct: volChange,
    signal_timing_adjustments: { "Junction_Trinity": signalSec }
  };

  try {
    const res = await fetch('/api/v1/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    const cardsEl = document.getElementById('sim-results-cards');
    cardsEl.innerHTML = result.metrics.map(m => `
      <div class="glass-card p-4 space-y-2 border ${m.is_improvement ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20'}">
        <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider">${m.metric_name}</p>
        <div class="flex justify-between items-baseline">
          <div>
            <span class="text-xs text-gray-400">Before: ${m.before}</span>
            <div class="text-xl font-extrabold text-white brand-font">${m.after}</div>
          </div>
          <span class="text-xs font-bold ${m.is_improvement ? 'text-emerald-400' : 'text-rose-400'}">
            ${m.change_pct > 0 ? '+' : ''}${m.change_pct}%
          </span>
        </div>
      </div>
    `).join('');

    const badgeEl = document.getElementById('sim-scenario-badge');
    if (badgeEl) {
      badgeEl.innerText = `${result.scenario_id} | ${result.description}`;
    }

    const tagsEl = document.getElementById('sim-affected-tags');
    if (tagsEl && result.affected_roads) {
      tagsEl.innerHTML = result.affected_roads.map(r => `
        <span class="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">${r}</span>
      `).join('');
    }
  } catch (err) {
    console.error("Simulation error:", err);
  }
}

// INITIALIZE CHART.JS ANALYTICS
function initAnalyticsCharts() {
  const ctxHist = document.getElementById('chart-history');
  if (!ctxHist) return;

  new Chart(ctxHist, {
    type: 'line',
    data: {
      labels: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
      datasets: [
        {
          label: 'Vehicle Volume (veh/h)',
          data: [120, 80, 45, 310, 890, 720, 680, 740, 950, 860, 510, 240],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Avg Speed (km/h)',
          data: [68, 72, 75, 52, 28, 38, 42, 36, 22, 31, 48, 62],
          borderColor: '#10b981',
          borderDash: [5, 5],
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9ca3af', font: { family: 'Inter' } } } },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#1e293b' } }
      }
    }
  });

  const ctxCat = document.getElementById('chart-categories');
  if (!ctxCat) return;

  new Chart(ctxCat, {
    type: 'doughnut',
    data: {
      labels: ['Cars (68%)', 'Buses (12%)', 'Trucks (14%)', 'Motorcycles (6%)'],
      datasets: [{
        data: [68, 12, 14, 6],
        backgroundColor: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af' } } }
    }
  });
}
