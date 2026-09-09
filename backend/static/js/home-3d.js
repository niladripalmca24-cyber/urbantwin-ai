/**
 * UrbanTwin AI - 3D Digital Twin City Engine
 * Powered by Three.js WebGL
 */

(function () {
  'use strict';

  let container, scene, camera, renderer, raycaster, mouse;
  let buildingsGroup, roadsGroup, trafficGroup, sensorNodesGroup, lasersGroup;
  let trafficParticles = [];
  let sensorNodes = [];
  let isWireframe = false;
  let isIncidentActive = false;
  let trafficSpeedMultiplier = 1.0;
  let cameraMode = 'cinematic'; // cinematic, drone, junction, corridor
  let targetCameraPos = { x: 0, y: 35, z: 55 };
  let targetLookAt = { x: 0, y: 0, z: 0 };
  let currentLookAt = new THREE.Vector3(0, 0, 0);
  let clock = new THREE.Clock();

  // Camera Locations mapped to 3D Space
  const CAMERA_NODES_CONFIG = [
    { id: 'CAM_01', name: 'Trinity Junction', x: -15, z: -10, flow: 142, speed: '42 km/h', status: 'optimal' },
    { id: 'CAM_02', name: 'North Arterial', x: 0, z: -25, flow: 188, speed: '56 km/h', status: 'optimal' },
    { id: 'CAM_03', name: 'Financial Core', x: 18, z: -8, flow: 215, speed: '24 km/h', status: 'dense' },
    { id: 'CAM_04', name: 'West River Crossing', x: -25, z: 15, flow: 95, speed: '62 km/h', status: 'optimal' },
    { id: 'CAM_05', name: 'Harbor Tunnel', x: 5, z: 20, flow: 164, speed: '38 km/h', status: 'moderate' },
    { id: 'CAM_06', name: 'Tech Corridor', x: 25, z: 18, flow: 110, speed: '48 km/h', status: 'optimal' }
  ];

  // Road paths for vehicles
  const ROAD_NETWORKS = [
    [ {x: -35, z: -10}, {x: -15, z: -10}, {x: 0, z: -25}, {x: 35, z: -25} ],
    [ {x: -15, z: -35}, {x: -15, z: -10}, {x: 18, z: -8}, {x: 35, z: -8} ],
    [ {x: -35, z: 15}, {x: -25, z: 15}, {x: 5, z: 20}, {x: 25, z: 18}, {x: 35, z: 18} ],
    [ {x: 0, z: -35}, {x: 0, z: -25}, {x: 5, z: 20}, {x: 5, z: 35} ],
    [ {x: 18, z: -35}, {x: 18, z: -8}, {x: 25, z: 18}, {x: 25, z: 35} ],
    [ {x: -25, z: -35}, {x: -25, z: 15}, {x: -15, z: 35} ]
  ];

  window.initUrbanTwin3D = function () {
    container = document.getElementById('webgl-canvas-container');
    if (!container) return;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.012);

    // Camera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.5, 300);
    camera.position.set(0, 38, 56);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Groups
    buildingsGroup = new THREE.Group();
    roadsGroup = new THREE.Group();
    trafficGroup = new THREE.Group();
    sensorNodesGroup = new THREE.Group();
    lasersGroup = new THREE.Group();

    scene.add(buildingsGroup);
    scene.add(roadsGroup);
    scene.add(trafficGroup);
    scene.add(sensorNodesGroup);
    scene.add(lasersGroup);

    // Setup elements
    setupLights();
    buildGroundAndRadar();
    buildRoads();
    buildCitySkyscrapers();
    buildSensorNodes();
    initTrafficVehicles();
    setupLasers();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClickNode);

    // Start render loop
    animate();

    // Load Live Telemetry from API
    fetchLiveTwinMetrics();
    setInterval(fetchLiveTwinMetrics, 8000);
  };

  // LIGHTING
  function setupLights() {
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 2.0);
    dirLight1.position.set(30, 50, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 1.5);
    dirLight2.position.set(-30, 40, -30);
    scene.add(dirLight2);

    // Central pulsing city light
    const centerPointLight = new THREE.PointLight(0x06b6d4, 3, 50);
    centerPointLight.position.set(0, 5, 0);
    scene.add(centerPointLight);
  }

  // GROUND & RADAR
  function buildGroundAndRadar() {
    // Holographic grid
    const grid = new THREE.GridHelper(90, 45, 0x06b6d4, 0x111c30);
    grid.position.y = 0;
    scene.add(grid);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070b16,
      roughness: 0.8,
      metalness: 0.5
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Concentric Pulse Rings
    for (let r = 10; r <= 45; r += 10) {
      const ringGeo = new THREE.RingGeometry(r - 0.08, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25 - (r / 200)
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      scene.add(ring);
    }
  }

  // ROADS
  function buildRoads() {
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x0c1527 });
    const laneLineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 1.2,
      gapSize: 0.8,
      linewidth: 1,
      transparent: true,
      opacity: 0.7
    });

    ROAD_NETWORKS.forEach(pts => {
      // Create thick road strip
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const roadPlaneGeo = new THREE.PlaneGeometry(len, 2.2);
        const roadMesh = new THREE.Mesh(roadPlaneGeo, roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.rotation.z = -angle;
        roadMesh.position.set((p1.x + p2.x) / 2, 0.02, (p1.z + p2.z) / 2);
        roadsGroup.add(roadMesh);

        // Center dashed divider
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p1.x, 0.05, p1.z),
          new THREE.Vector3(p2.x, 0.05, p2.z)
        ]);
        const line = new THREE.Line(lineGeo, laneLineMat);
        line.computeLineDistances();
        roadsGroup.add(line);
      }
    });
  }

  // BUILDINGS / SKYSCRAPERS
  function buildCitySkyscrapers() {
    const buildingPalette = [0x091224, 0x0d172e, 0x111c38, 0x08101f];
    const edgePalette = [0x06b6d4, 0x38bdf8, 0x8b5cf6, 0x2dd4bf];

    // Seeded layout grid
    for (let x = -36; x <= 36; x += 6) {
      for (let z = -36; z <= 36; z += 6) {
        // Skip positions that collide with main road intersections
        if (Math.abs(x + 15) < 3 && Math.abs(z + 10) < 3) continue;
        if (Math.abs(x - 18) < 3 && Math.abs(z + 8) < 3) continue;
        if (Math.abs(x - 5) < 3 && Math.abs(z - 20) < 3) continue;
        if (Math.abs(x) < 3 && Math.abs(z + 25) < 3) continue;

        // Chance of building
        if (Math.random() > 0.38) {
          const w = 3.2 + Math.random() * 1.6;
          const d = 3.2 + Math.random() * 1.6;
          // Core buildings are taller
          const distToCenter = Math.sqrt(x * x + z * z);
          let h = Math.max(5, 45 - distToCenter * 0.7) + (Math.random() * 12);
          if (distToCenter < 12) h += 18; // Landmark downtown towers

          const bColor = buildingPalette[Math.floor(Math.random() * buildingPalette.length)];
          const bMat = new THREE.MeshStandardMaterial({
            color: bColor,
            roughness: 0.2,
            metalness: 0.8,
            wireframe: false
          });

          const bGeo = new THREE.BoxGeometry(w, h, d);
          const building = new THREE.Mesh(bGeo, bMat);
          building.position.set(x + (Math.random() - 0.5) * 1.2, h / 2, z + (Math.random() - 0.5) * 1.2);
          buildingsGroup.add(building);

          // Glowing building edge outlines
          const edgeGeo = new THREE.EdgesGeometry(bGeo);
          const edgeColor = edgePalette[Math.floor(Math.random() * edgePalette.length)];
          const edgeMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: Math.random() * 0.4 + 0.35
          });
          const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
          building.add(edgeLine);

          // Rooftop beacon antenna for tall towers
          if (h > 24) {
            const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8);
            const antennaMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
            const antenna = new THREE.Mesh(antennaGeo, antennaMat);
            antenna.position.set(0, h / 2 + 1.75, 0);
            building.add(antenna);

            // Blinking red/cyan warning light
            const beaconGeo = new THREE.SphereGeometry(0.28, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(0, h / 2 + 3.5, 0);
            building.add(beacon);
          }
        }
      }
    }
  }

  // SENSOR NODES (CAM_01 to CAM_06)
  function buildSensorNodes() {
    CAMERA_NODES_CONFIG.forEach(cfg => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(cfg.x, 3.8, cfg.z);
      nodeGroup.userData = cfg;

      // Holographic Diamond Core
      const octaGeo = new THREE.OctahedronGeometry(1.2, 0);
      const octaMat = new THREE.MeshStandardMaterial({
        color: cfg.status === 'dense' ? 0xf59e0b : 0x06b6d4,
        emissive: cfg.status === 'dense' ? 0xd97706 : 0x0891b2,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        wireframe: false
      });
      const core = new THREE.Mesh(octaGeo, octaMat);
      core.name = "sensorCore";
      nodeGroup.add(core);

      // Rotating Radar Ring
      const ringGeo = new THREE.TorusGeometry(1.8, 0.06, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.name = "sensorRing";
      nodeGroup.add(ring);

      // Vertical Laser Line to Ground
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -3.8, 0)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.6
      });
      const tether = new THREE.Line(lineGeo, lineMat);
      nodeGroup.add(tether);

      // Pulse wave base on ground
      const groundDiscGeo = new THREE.RingGeometry(0.1, 2.2, 24);
      const groundDiscMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const groundDisc = new THREE.Mesh(groundDiscGeo, groundDiscMat);
      groundDisc.rotation.x = Math.PI / 2;
      groundDisc.position.y = -3.75;
      nodeGroup.add(groundDisc);

      sensorNodesGroup.add(nodeGroup);
      sensorNodes.push(nodeGroup);
    });
  }

  // TRAFFIC PARTICLES / VEHICLES
  function initTrafficVehicles() {
    const colors = [0x06b6d4, 0x10b981, 0x38bdf8, 0xa855f7, 0xf59e0b];
    const vehicleCount = 180;

    for (let i = 0; i < vehicleCount; i++) {
      const road = ROAD_NETWORKS[Math.floor(Math.random() * ROAD_NETWORKS.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const vGeo = new THREE.BoxGeometry(0.7, 0.35, 1.4);
      const vMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.9,
        roughness: 0.3
      });
      const vehicle = new THREE.Mesh(vGeo, vMat);

      // Light trail
      const tailGeo = new THREE.BoxGeometry(0.5, 0.15, 2.5);
      const tailMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.45
      });
      const trail = new THREE.Mesh(tailGeo, tailMat);
      trail.position.z = -1.2;
      vehicle.add(trail);

      trafficGroup.add(vehicle);

      trafficParticles.push({
        mesh: vehicle,
        road: road,
        segmentIndex: Math.floor(Math.random() * (road.length - 1)),
        t: Math.random(),
        speed: (0.12 + Math.random() * 0.18),
        color: color
      });
    }
  }

  // SKY SCANNING LASERS
  function setupLasers() {
    const laserCount = 4;
    for (let i = 0; i < laserCount; i++) {
      const laserGeo = new THREE.CylinderGeometry(0.05, 0.8, 80, 8);
      const laserMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x06b6d4 : 0x8b5cf6,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      const laser = new THREE.Mesh(laserGeo, laserMat);
      const angle = (i / laserCount) * Math.PI * 2;
      laser.position.set(Math.cos(angle) * 22, 40, Math.sin(angle) * 22);
      lasersGroup.add(laser);
    }
  }

  // ANIMATION LOOP
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // 1. Move vehicles along road paths
    trafficParticles.forEach(p => {
      const road = p.road;
      let effectiveSpeed = p.speed * trafficSpeedMultiplier;

      // If incident is active near CAM_03, slow down or reroute
      if (isIncidentActive && p.road === ROAD_NETWORKS[1]) {
        effectiveSpeed *= 0.25;
      }

      p.t += effectiveSpeed * delta * 0.4;
      if (p.t >= 1.0) {
        p.t = 0;
        p.segmentIndex++;
        if (p.segmentIndex >= road.length - 1) {
          p.segmentIndex = 0;
        }
      }

      const p1 = road[p.segmentIndex];
      const p2 = road[p.segmentIndex + 1];
      if (p1 && p2) {
        const x = p1.x + (p2.x - p1.x) * p.t;
        const z = p1.z + (p2.z - p1.z) * p.t;
        p.mesh.position.set(x, 0.35, z);

        // Orient vehicle to road direction
        const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
        p.mesh.rotation.y = angle;
      }
    });

    // 2. Animate Sensor Nodes
    sensorNodes.forEach((node, idx) => {
      const core = node.getObjectByName("sensorCore");
      const ring = node.getObjectByName("sensorRing");
      if (core) {
        core.rotation.y += 0.02;
        core.rotation.x = Math.sin(elapsedTime * 2 + idx) * 0.2;
        core.position.y = Math.sin(elapsedTime * 3 + idx) * 0.3;
      }
      if (ring) {
        ring.rotation.z += 0.035;
        const scale = 1.0 + Math.sin(elapsedTime * 4 + idx) * 0.15;
        ring.scale.set(scale, scale, scale);
      }
    });

    // 3. Animate Sky Lasers
    lasersGroup.children.forEach((laser, idx) => {
      laser.rotation.z = Math.sin(elapsedTime * 0.4 + idx) * 0.15;
      laser.rotation.x = Math.cos(elapsedTime * 0.3 + idx) * 0.15;
    });

    // 4. Smooth Camera Lerp
    updateCameraPosition(elapsedTime);

    renderer.render(scene, camera);
  }

  function updateCameraPosition(elapsedTime) {
    if (cameraMode === 'cinematic') {
      const radius = 62;
      const camSpeed = 0.07;
      targetCameraPos.x = Math.sin(elapsedTime * camSpeed) * radius;
      targetCameraPos.z = Math.cos(elapsedTime * camSpeed) * radius;
      targetCameraPos.y = 36 + Math.sin(elapsedTime * 0.15) * 6;
      targetLookAt = { x: 0, y: 2, z: 0 };
    } else if (cameraMode === 'drone') {
      targetCameraPos = { x: 0, y: 78, z: 0.1 };
      targetLookAt = { x: 0, y: 0, z: 0 };
    } else if (cameraMode === 'junction') {
      targetCameraPos = { x: -10, y: 16, z: 4 };
      targetLookAt = { x: -15, y: 3, z: -10 };
    } else if (cameraMode === 'corridor') {
      targetCameraPos = { x: 28, y: 12, z: 32 };
      targetLookAt = { x: 5, y: 2, z: 12 };
    }

    // Lerp camera
    camera.position.x += (targetCameraPos.x - camera.position.x) * 0.04;
    camera.position.y += (targetCameraPos.y - camera.position.y) * 0.04;
    camera.position.z += (targetCameraPos.z - camera.position.z) * 0.04;

    currentLookAt.x += (targetLookAt.x - currentLookAt.x) * 0.05;
    currentLookAt.y += (targetLookAt.y - currentLookAt.y) * 0.05;
    currentLookAt.z += (targetLookAt.z - currentLookAt.z) * 0.05;
    camera.lookAt(currentLookAt);
  }

  // WINDOW RESIZE
  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // MOUSE HOVER PARALLAX
  function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    // Raycast hover effect on nodes
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sensorNodesGroup.children, true);

    if (intersects.length > 0) {
      container.style.cursor = 'pointer';
    } else {
      container.style.cursor = 'default';
    }
  }

  // CLICK SENSOR NODE
  function onClickNode(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sensorNodesGroup.children, true);

    if (intersects.length > 0) {
      // Find top parent in sensorNodesGroup
      let obj = intersects[0].object;
      while (obj.parent && obj.parent !== sensorNodesGroup) {
        obj = obj.parent;
      }
      if (obj.userData && obj.userData.id) {
        showSensorModal(obj.userData);
      }
    }
  }

  // MODAL FOR SENSOR METRICS
  function showSensorModal(data) {
    const modal = document.getElementById('twin-sensor-modal');
    if (!modal) return;

    document.getElementById('modal-cam-id').textContent = data.id;
    document.getElementById('modal-cam-name').textContent = data.name;
    document.getElementById('modal-cam-flow').textContent = data.flow + ' veh/hr';
    document.getElementById('modal-cam-speed').textContent = data.speed;
    document.getElementById('modal-cam-status').textContent = data.status.toUpperCase();
    
    const statusBadge = document.getElementById('modal-cam-status-badge');
    if (statusBadge) {
      if (data.status === 'optimal') {
        statusBadge.className = 'px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold';
      } else {
        statusBadge.className = 'px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold';
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  window.closeSensorModal = function () {
    const modal = document.getElementById('twin-sensor-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  // CAMERA MODE CONTROLS
  window.set3DCameraMode = function (mode) {
    cameraMode = mode;
    document.querySelectorAll('.cam-mode-btn').forEach(btn => {
      btn.classList.remove('bg-cyan-500', 'text-black', 'font-bold');
      btn.classList.add('bg-gray-800/80', 'text-gray-300');
    });
    const activeBtn = document.getElementById(`btn-mode-${mode}`);
    if (activeBtn) {
      activeBtn.classList.add('bg-cyan-500', 'text-black', 'font-bold');
      activeBtn.classList.remove('bg-gray-800/80', 'text-gray-300');
    }
  };

  // WIREFRAME TOGGLE
  window.toggleWireframeMode = function () {
    isWireframe = !isWireframe;
    buildingsGroup.children.forEach(b => {
      if (b.material) b.material.wireframe = isWireframe;
    });
    const btn = document.getElementById('btn-toggle-wireframe');
    if (btn) {
      btn.innerHTML = isWireframe ? '<i class="fa-solid fa-cube mr-1 text-cyan-400"></i> Solid Mode' : '<i class="fa-solid fa-border-none mr-1 text-cyan-400"></i> Wireframe Matrix';
    }
  };

  // INCIDENT & REROUTE SIMULATION
  window.trigger3DIncident = function () {
    isIncidentActive = !isIncidentActive;
    const btn = document.getElementById('btn-sim-incident');
    const banner = document.getElementById('twin-incident-banner');

    if (isIncidentActive) {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-check mr-1 text-emerald-400"></i> Resolve Incident';
      if (banner) {
        banner.classList.remove('hidden');
        banner.classList.add('flex');
      }
      // Highlight CAM_03 Financial Core
      const cam3 = sensorNodes.find(n => n.userData.id === 'CAM_03');
      if (cam3) {
        const core = cam3.getObjectByName("sensorCore");
        if (core) core.material.color.setHex(0xef4444);
      }
    } else {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1 text-amber-400"></i> Simulate Bottleneck';
      if (banner) {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
      }
      const cam3 = sensorNodes.find(n => n.userData.id === 'CAM_03');
      if (cam3) {
        const core = cam3.getObjectByName("sensorCore");
        if (core) core.material.color.setHex(0x06b6d4);
      }
    }
  };

  // SPEED SLIDER
  window.setTrafficSpeed = function (value) {
    trafficSpeedMultiplier = parseFloat(value);
    const label = document.getElementById('traffic-speed-label');
    if (label) label.textContent = `${Math.round(trafficSpeedMultiplier * 100)}%`;
  };

  // FETCH REALTIME METRICS FROM FASTAPI
  async function fetchLiveTwinMetrics() {
    try {
      const res = await fetch('/api/v1/traffic/current');
      if (res.ok) {
        const data = await res.json();
        let totalVehicles = 0;
        let totalSpeed = 0;
        let count = data.length;

        data.forEach(item => {
          totalVehicles += item.vehicle_count || 0;
          totalSpeed += item.average_speed || 0;
        });

        const avgSpeed = count > 0 ? (totalSpeed / count).toFixed(1) : '44.8';

        // Update DOM elements if present
        const elVehicles = document.getElementById('live-total-vehicles');
        if (elVehicles) elVehicles.textContent = totalVehicles > 0 ? totalVehicles : '558';

        const elSpeed = document.getElementById('live-avg-speed');
        if (elSpeed) elSpeed.textContent = `${avgSpeed} km/h`;
      }
    } catch (e) {
      console.warn("Using simulated twin metrics:", e);
    }
  }

  // AUTO-INITIALIZE
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE !== 'undefined') {
      window.initUrbanTwin3D();
    } else {
      console.warn("Three.js not yet loaded, waiting for script tag.");
    }
  });

})();
