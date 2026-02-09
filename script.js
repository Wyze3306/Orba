// ===== ŌRBA — Interactive Script with Three.js =====

document.addEventListener('DOMContentLoaded', () => {

    // ===== Cursor Glow =====
    const cursorGlow = document.getElementById('cursorGlow');
    let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    function animateGlow() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
        requestAnimationFrame(animateGlow);
    }
    animateGlow();

    // ===== Navigation Scroll =====
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 80);
    });

    // ===== Hero Counter Animation =====
    const counters = document.querySelectorAll('[data-count]');
    let counterAnimated = false;

    function animateCounters() {
        if (counterAnimated) return;
        counterAnimated = true;
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.count);
            const duration = 2000;
            const startTime = performance.now();
            function update(currentTime) {
                const progress = Math.min((currentTime - startTime) / duration, 1);
                counter.textContent = Math.round((1 - Math.pow(1 - progress, 4)) * target);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }
    setTimeout(animateCounters, 800);

    // ===== Particles =====
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 3 + 1;
        p.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            background:rgba(168,255,120,${Math.random()*0.3+0.05});
            border-radius:50%; left:${Math.random()*100}%; top:${Math.random()*100}%;
            animation:particleDrift ${Math.random()*10+10}s ease-in-out infinite;
            animation-delay:${Math.random()*-10}s;
        `;
        particlesContainer.appendChild(p);
    }
    const pStyle = document.createElement('style');
    pStyle.textContent = `@keyframes particleDrift{0%,100%{transform:translate(0,0);opacity:.3}50%{transform:translate(${Math.random()*60-30}px,${Math.random()*60-30}px);opacity:.6}}`;
    document.head.appendChild(pStyle);

    // ========================================
    // ===== THREE.JS GEODESIC DOME (HALF-SPHERE) =====
    // ========================================

    const container = document.getElementById('threeContainer');
    if (container && typeof THREE !== 'undefined') {

        let currentView = 'exterior';
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 2, 8);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x161616, 1);
        container.appendChild(renderer.domElement);

        // OrbitControls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 4;
        controls.maxDistance = 15;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.maxPolarAngle = Math.PI * 0.85;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 8, 5);
        scene.add(dirLight);

        const accentLight = new THREE.PointLight(0xa8ff78, 0.5, 20);
        accentLight.position.set(-3, 4, 3);
        scene.add(accentLight);

        const warmLight = new THREE.PointLight(0xffc878, 0.3, 15);
        warmLight.position.set(3, 2, -3);
        scene.add(warmLight);

        // ---- Create groups for each view ----
        const exteriorGroup = new THREE.Group();
        const interiorGroup = new THREE.Group();
        const floorplanGroup = new THREE.Group();
        const explodedGroup = new THREE.Group();

        // ===== EXTERIOR VIEW: Geodesic half-sphere dome =====
        function createGeodesicDome(radius, detail) {
            // Start from icosahedron for geodesic pattern
            const icoGeo = new THREE.IcosahedronGeometry(radius, detail);

            // Clip to half-sphere (keep only top half, y >= -0.05)
            const positions = icoGeo.attributes.position;
            const indices = [];
            const posArr = [];

            // Build half-sphere by creating a new geometry
            const halfGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

            return { icoGeo, halfGeo };
        }

        // --- Exterior dome ---
        (function buildExterior() {
            // Main dome wireframe (geodesic)
            const icoGeo = new THREE.IcosahedronGeometry(3, 2);
            // Clip vertices below y=0
            const pos = icoGeo.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                if (pos[i + 1] < -0.05) pos[i + 1] = -0.05;
            }

            const wireframe = new THREE.WireframeGeometry(icoGeo);
            const wireMat = new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.25 });
            const wireLines = new THREE.LineSegments(wireframe, wireMat);
            exteriorGroup.add(wireLines);

            // Solid translucent dome
            const domeGeo = new THREE.SphereGeometry(2.95, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a2a15,
                transparent: true,
                opacity: 0.15,
                roughness: 0.2,
                metalness: 0.3,
                side: THREE.DoubleSide,
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            exteriorGroup.add(dome);

            // Glass window section
            const windowGeo = new THREE.SphereGeometry(3.01, 32, 16, Math.PI * 0.3, Math.PI * 0.4, Math.PI * 0.15, Math.PI * 0.25);
            const windowMat = new THREE.MeshPhysicalMaterial({
                color: 0x78d4ff,
                transparent: true,
                opacity: 0.25,
                roughness: 0.0,
                metalness: 0.1,
                side: THREE.DoubleSide,
            });
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            exteriorGroup.add(windowMesh);

            // Solar panels on top (golden ring)
            const solarGeo = new THREE.SphereGeometry(3.02, 32, 8, 0, Math.PI * 2, 0, Math.PI * 0.2);
            const solarMat = new THREE.MeshPhysicalMaterial({
                color: 0x2a2a40,
                transparent: true,
                opacity: 0.5,
                roughness: 0.1,
                metalness: 0.8,
                side: THREE.DoubleSide,
            });
            const solar = new THREE.Mesh(solarGeo, solarMat);
            exteriorGroup.add(solar);

            // Solar panel grid lines
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const lineGeo = new THREE.BufferGeometry();
                const points = [];
                for (let t = 0; t <= 10; t++) {
                    const phi = (t / 10) * Math.PI * 0.2;
                    points.push(new THREE.Vector3(
                        3.03 * Math.sin(phi) * Math.cos(angle),
                        3.03 * Math.cos(phi),
                        3.03 * Math.sin(phi) * Math.sin(angle)
                    ));
                }
                lineGeo.setFromPoints(points);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.4 });
                exteriorGroup.add(new THREE.Line(lineGeo, lineMat));
            }

            // Base platform (floor)
            const baseGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.3, 32);
            const baseMat = new THREE.MeshPhysicalMaterial({
                color: 0x222222,
                roughness: 0.5,
                metalness: 0.5,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = -0.15;
            exteriorGroup.add(base);

            // Entry door indicator
            const doorGeo = new THREE.BoxGeometry(0.8, 1.5, 0.05);
            const doorMat = new THREE.MeshPhysicalMaterial({
                color: 0xa8ff78,
                transparent: true,
                opacity: 0.15,
                emissive: 0xa8ff78,
                emissiveIntensity: 0.2,
            });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, 0.75, 2.98);
            exteriorGroup.add(door);

            // Ground plane
            const groundGeo = new THREE.PlaneGeometry(20, 20);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.3;
            exteriorGroup.add(ground);

            scene.add(exteriorGroup);
        })();

        // ===== INTERIOR VIEW =====
        (function buildInterior() {
            // Inner dome (seen from inside - wood texture color)
            const innerDomeGeo = new THREE.SphereGeometry(2.9, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const innerDomeMat = new THREE.MeshPhysicalMaterial({
                color: 0x8B7355,
                roughness: 0.7,
                metalness: 0.05,
                side: THREE.BackSide,
            });
            const innerDome = new THREE.Mesh(innerDomeGeo, innerDomeMat);
            interiorGroup.add(innerDome);

            // Ribs (structural)
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const ribGeo = new THREE.BufferGeometry();
                const points = [];
                for (let t = 0; t <= 30; t++) {
                    const phi = (t / 30) * Math.PI / 2;
                    points.push(new THREE.Vector3(
                        2.85 * Math.sin(phi) * Math.cos(angle),
                        2.85 * Math.cos(phi),
                        2.85 * Math.sin(phi) * Math.sin(angle)
                    ));
                }
                ribGeo.setFromPoints(points);
                const ribMat = new THREE.LineBasicMaterial({ color: 0xc8a87a, transparent: true, opacity: 0.5 });
                interiorGroup.add(new THREE.Line(ribGeo, ribMat));
            }

            // LED light rings
            const ledColors = [0xa8ff78, 0xffb347, 0x78d4ff];
            ledColors.forEach((color, i) => {
                const phi = Math.PI * 0.12 + i * Math.PI * 0.12;
                const ringRadius = 2.87 * Math.sin(phi);
                const ringY = 2.87 * Math.cos(phi);
                const ringGeo = new THREE.TorusGeometry(ringRadius, 0.015, 8, 64);
                const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.y = ringY;
                ring.rotation.x = Math.PI / 2;
                interiorGroup.add(ring);

                // Glow
                const glowRing = new THREE.Mesh(
                    new THREE.TorusGeometry(ringRadius, 0.08, 8, 64),
                    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.08 })
                );
                glowRing.position.y = ringY;
                glowRing.rotation.x = Math.PI / 2;
                interiorGroup.add(glowRing);
            });

            // Floor
            const floorGeo = new THREE.CircleGeometry(2.8, 64);
            const floorMat = new THREE.MeshPhysicalMaterial({ color: 0x6B5B45, roughness: 0.8, metalness: 0.05 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = 0.01;
            interiorGroup.add(floor);

            // Bed (purple zone)
            const bedGeo = new THREE.BoxGeometry(1.2, 0.25, 0.8);
            const bedMat = new THREE.MeshPhysicalMaterial({ color: 0x8B6BAE, roughness: 0.6 });
            const bed = new THREE.Mesh(bedGeo, bedMat);
            bed.position.set(-1.5, 0.15, -0.8);
            interiorGroup.add(bed);

            // Desk (green zone)
            const deskGeo = new THREE.BoxGeometry(1.0, 0.05, 0.5);
            const deskMat = new THREE.MeshPhysicalMaterial({ color: 0x5a7a4a, roughness: 0.4 });
            const desk = new THREE.Mesh(deskGeo, deskMat);
            desk.position.set(1.5, 0.75, 0);
            interiorGroup.add(desk);

            // Desk legs
            const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8);
            const legMat = new THREE.MeshPhysicalMaterial({ color: 0x444444 });
            [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].forEach(([x, z]) => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(1.5 + x, 0.375, z);
                interiorGroup.add(leg);
            });

            // Kitchen area (yellow)
            const kitchenGeo = new THREE.BoxGeometry(0.3, 0.8, 1.5);
            const kitchenMat = new THREE.MeshPhysicalMaterial({ color: 0x8a7a3a, roughness: 0.5, metalness: 0.2 });
            const kitchen = new THREE.Mesh(kitchenGeo, kitchenMat);
            kitchen.position.set(-0.5, 0.4, 2.2);
            interiorGroup.add(kitchen);

            // Window light from inside
            const wLight = new THREE.SpotLight(0x78d4ff, 0.5, 10, Math.PI * 0.3);
            wLight.position.set(2, 1.5, 0);
            wLight.target.position.set(0, 0, 0);
            interiorGroup.add(wLight);
            interiorGroup.add(wLight.target);

            interiorGroup.visible = false;
            scene.add(interiorGroup);
        })();

        // ===== FLOORPLAN VIEW =====
        (function buildFloorplan() {
            const R = 2.75; // outer radius
            const wallR = 2.65; // inner wall radius

            // Outer wall ring
            const outerRing = new THREE.Mesh(
                new THREE.RingGeometry(R, R + 0.06, 64),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
            );
            outerRing.rotation.x = -Math.PI / 2;
            floorplanGroup.add(outerRing);

            // Inner wall ring
            const innerRing = new THREE.Mesh(
                new THREE.RingGeometry(wallR, wallR + 0.03, 64),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            innerRing.rotation.x = -Math.PI / 2;
            floorplanGroup.add(innerRing);

            // Floor fill
            const floorFill = new THREE.Mesh(
                new THREE.CircleGeometry(wallR, 64),
                new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide })
            );
            floorFill.rotation.x = -Math.PI / 2;
            floorFill.position.y = -0.01;
            floorplanGroup.add(floorFill);

            // --- Zone layout (top-down, z+ = south/entry) ---
            // Organized as clear, non-overlapping sectors:
            //   Back (north): Couchage (wide, top)
            //   Left: Cuisine
            //   Right: Salle d'eau
            //   Center: Bureau / Espace de vie
            //   Front: Salon (near entry)
            //   Small: Local technique (left-front)

            const zones = [
                { name: 'COUCHAGE',    area: '6.8m²', color: 0xc896ff, startAngle: Math.PI * 0.65, endAngle: Math.PI * 1.35, inner: 0.35 },
                { name: 'CUISINE',     area: '4.5m²', color: 0xffc832, startAngle: Math.PI * 1.35, endAngle: Math.PI * 1.7,  inner: 0.3 },
                { name: 'SALLE D\'EAU',area: '3.2m²', color: 0x64b4ff, startAngle: Math.PI * 0.3,  endAngle: Math.PI * 0.65, inner: 0.4 },
                { name: 'VIE/BUREAU',  area: '8.3m²', color: 0xa8ff78, startAngle: Math.PI * 1.7,  endAngle: Math.PI * 0.05, inner: 0.0 },
                { name: 'SALON',       area: '5.2m²', color: 0x7acc5a, startAngle: Math.PI * 0.05, endAngle: Math.PI * 0.3,  inner: 0.0 },
                { name: 'TECH',        area: '',      color: 0x888888, startAngle: Math.PI * 1.35, endAngle: Math.PI * 1.7,  inner: 0.7 },
            ];

            // Helper to create a sector shape
            function createSector(startA, endA, outerR, innerR) {
                const shape = new THREE.Shape();
                const segs = 24;
                // Handle wrap-around (e.g., startAngle > endAngle)
                let eA = endA;
                if (eA <= startA) eA += Math.PI * 2;
                // Outer arc
                for (let i = 0; i <= segs; i++) {
                    const a = startA + (i / segs) * (eA - startA);
                    const x = outerR * Math.cos(a);
                    const z = outerR * Math.sin(a);
                    if (i === 0) shape.moveTo(x, z);
                    else shape.lineTo(x, z);
                }
                // Inner arc (reverse)
                for (let i = segs; i >= 0; i--) {
                    const a = startA + (i / segs) * (eA - startA);
                    shape.lineTo(innerR * Math.cos(a), innerR * Math.sin(a));
                }
                shape.closePath();
                return shape;
            }

            zones.forEach(zone => {
                const shape = createSector(zone.startAngle, zone.endAngle, wallR, wallR * zone.inner);
                const geo = new THREE.ShapeGeometry(shape);

                // Filled zone
                const mat = new THREE.MeshBasicMaterial({
                    color: zone.color,
                    transparent: true,
                    opacity: 0.12,
                    side: THREE.DoubleSide,
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = 0.005;
                floorplanGroup.add(mesh);

                // Zone border
                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeMat = new THREE.LineBasicMaterial({ color: zone.color, transparent: true, opacity: 0.5 });
                const edges = new THREE.LineSegments(edgeGeo, edgeMat);
                edges.rotation.x = -Math.PI / 2;
                edges.position.y = 0.005;
                floorplanGroup.add(edges);
            });

            // --- Partition walls (lines separating zones) ---
            function addWall(x1, z1, x2, z2, color) {
                const wallGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x1, 0.01, z1),
                    new THREE.Vector3(x2, 0.01, z2)
                ]);
                const wallMat = new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.35, linewidth: 2 });
                floorplanGroup.add(new THREE.Line(wallGeo, wallMat));
            }

            // Partition lines at zone boundaries (radial lines)
            const partitionAngles = [
                { angle: Math.PI * 0.05, color: 0xa8ff78 },
                { angle: Math.PI * 0.3,  color: 0x64b4ff },
                { angle: Math.PI * 0.65, color: 0xc896ff },
                { angle: Math.PI * 1.35, color: 0xffc832 },
                { angle: Math.PI * 1.7,  color: 0xa8ff78 },
            ];
            partitionAngles.forEach(p => {
                const innerR = 0.15;
                addWall(
                    innerR * Math.cos(p.angle), innerR * Math.sin(p.angle),
                    wallR * Math.cos(p.angle), wallR * Math.sin(p.angle),
                    p.color
                );
            });

            // Tech room inner curved wall
            const techWallGeo = new THREE.BufferGeometry();
            const techPts = [];
            for (let i = 0; i <= 16; i++) {
                const a = Math.PI * 1.35 + (i / 16) * (Math.PI * 1.7 - Math.PI * 1.35);
                techPts.push(new THREE.Vector3(wallR * 0.7 * Math.cos(a), 0.01, wallR * 0.7 * Math.sin(a)));
            }
            techWallGeo.setFromPoints(techPts);
            const techWallMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4 });
            floorplanGroup.add(new THREE.Line(techWallGeo, techWallMat));

            // --- Furniture indicators ---
            // Bed in Couchage zone (back, center)
            const bedGeo = new THREE.PlaneGeometry(0.9, 0.55);
            const bedMat = new THREE.MeshBasicMaterial({ color: 0xc896ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
            const bed = new THREE.Mesh(bedGeo, bedMat);
            bed.rotation.x = -Math.PI / 2;
            bed.position.set(-1.3 * Math.cos(Math.PI), 0.01, -1.3 * Math.sin(Math.PI));
            bed.position.set(0, 0.01, -1.5);
            floorplanGroup.add(bed);
            // Bed outline
            const bedEdges = new THREE.LineSegments(
                new THREE.EdgesGeometry(bedGeo),
                new THREE.LineBasicMaterial({ color: 0xc896ff, transparent: true, opacity: 0.5 })
            );
            bedEdges.rotation.x = -Math.PI / 2;
            bedEdges.position.copy(bed.position);
            floorplanGroup.add(bedEdges);

            // Desk in Bureau zone
            const deskGeo = new THREE.PlaneGeometry(0.6, 0.3);
            const deskMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
            const desk = new THREE.Mesh(deskGeo, deskMat);
            desk.rotation.x = -Math.PI / 2;
            desk.position.set(1.6, 0.01, 0.8);
            floorplanGroup.add(desk);
            const deskEdges = new THREE.LineSegments(
                new THREE.EdgesGeometry(deskGeo),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.5 })
            );
            deskEdges.rotation.x = -Math.PI / 2;
            deskEdges.position.copy(desk.position);
            floorplanGroup.add(deskEdges);

            // Kitchen counter in Cuisine zone
            const kitchenPts = [];
            for (let i = 0; i <= 12; i++) {
                const a = Math.PI * 1.4 + (i / 12) * (Math.PI * 1.65 - Math.PI * 1.4);
                kitchenPts.push(new THREE.Vector3(wallR * 0.85 * Math.cos(a), 0.01, wallR * 0.85 * Math.sin(a)));
            }
            const kitchenGeo = new THREE.BufferGeometry().setFromPoints(kitchenPts);
            const kitchenMat = new THREE.LineBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.6, linewidth: 3 });
            floorplanGroup.add(new THREE.Line(kitchenGeo, kitchenMat));

            // Shower in Salle d'eau (small circle)
            const showerGeo = new THREE.RingGeometry(0.2, 0.25, 16);
            const showerMat = new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
            const shower = new THREE.Mesh(showerGeo, showerMat);
            shower.rotation.x = -Math.PI / 2;
            shower.position.set(1.8, 0.01, -1.2);
            floorplanGroup.add(shower);

            // Sofa in Salon (curved line)
            const sofaPts = [];
            for (let i = 0; i <= 10; i++) {
                const a = Math.PI * 0.1 + (i / 10) * (Math.PI * 0.25 - Math.PI * 0.1);
                sofaPts.push(new THREE.Vector3(wallR * 0.7 * Math.cos(a), 0.01, wallR * 0.7 * Math.sin(a)));
            }
            const sofaGeo = new THREE.BufferGeometry().setFromPoints(sofaPts);
            const sofaMat = new THREE.LineBasicMaterial({ color: 0x7acc5a, transparent: true, opacity: 0.6, linewidth: 3 });
            floorplanGroup.add(new THREE.Line(sofaGeo, sofaMat));

            // --- Zone labels (using sprite-like flat text via canvas) ---
            function createLabel(text, x, z, color) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'transparent';
                ctx.fillRect(0, 0, 256, 64);
                ctx.font = 'bold 22px Inter, sans-serif';
                ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 128, 28);
                // Area subtitle
                const areaText = zones.find(z => z.name === text);
                if (areaText && areaText.area) {
                    ctx.font = '16px Inter, sans-serif';
                    ctx.globalAlpha = 0.6;
                    ctx.fillText(areaText.area, 128, 50);
                }

                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.set(x, 0.1, z);
                sprite.scale.set(1.2, 0.3, 1);
                return sprite;
            }

            // Place labels at zone centers
            const labelData = [
                { name: 'COUCHAGE',     color: 0xc896ff, x: 0,    z: -1.5 },
                { name: 'CUISINE',      color: 0xffc832, x: -1.5, z: 1.0  },
                { name: 'SALLE D\'EAU', color: 0x64b4ff, x: 1.8,  z: -0.8 },
                { name: 'VIE/BUREAU',   color: 0xa8ff78, x: 1.2,  z: 1.2  },
                { name: 'SALON',        color: 0x7acc5a, x: 2.0,  z: 0.2  },
                { name: 'TECH',         color: 0x888888, x: -1.8, z: 1.6  },
            ];
            labelData.forEach(l => {
                floorplanGroup.add(createLabel(l.name, l.x, l.z, l.color));
            });

            // --- Entry marker and label ---
            const entryGeo = new THREE.SphereGeometry(0.08, 16, 16);
            const entryMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78 });
            const entry = new THREE.Mesh(entryGeo, entryMat);
            entry.position.set(0, 0.02, wallR);
            floorplanGroup.add(entry);

            // Entry arrow
            const arrowPts = [
                new THREE.Vector3(-0.15, 0.02, wallR + 0.3),
                new THREE.Vector3(0, 0.02, wallR + 0.05),
                new THREE.Vector3(0.15, 0.02, wallR + 0.3),
            ];
            const arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
            const arrowMat = new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.6 });
            floorplanGroup.add(new THREE.Line(arrowGeo, arrowMat));

            floorplanGroup.add(createLabel('ENTRÉE', 0, wallR + 0.55, 0xa8ff78));

            // --- Dimension lines ---
            // Horizontal dimension
            const dimPts1 = [new THREE.Vector3(-R, 0.02, R + 0.5), new THREE.Vector3(R, 0.02, R + 0.5)];
            const dimGeo1 = new THREE.BufferGeometry().setFromPoints(dimPts1);
            const dimMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
            floorplanGroup.add(new THREE.Line(dimGeo1, dimMat));
            // Dimension ticks
            [[-R, R + 0.3, -R, R + 0.7], [R, R + 0.3, R, R + 0.7]].forEach(([x1, z1, x2, z2]) => {
                const tickGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x1, 0.02, z1), new THREE.Vector3(x2, 0.02, z2)
                ]);
                floorplanGroup.add(new THREE.Line(tickGeo, dimMat));
            });
            floorplanGroup.add(createLabel('6.0m', 0, R + 0.85, 0x666666));

            // --- Grid cross (subtle) ---
            const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04 });
            [[[0, 0.005, -R], [0, 0.005, R]], [[-R, 0.005, 0], [R, 0.005, 0]]].forEach(([a, b]) => {
                const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
                floorplanGroup.add(new THREE.Line(g, gridMat));
            });

            floorplanGroup.visible = false;
            scene.add(floorplanGroup);
        })();

        // ===== EXPLODED VIEW =====
        (function buildExploded() {
            const layers = [
                { label: 'Coque ext.', color: 0xa8ff78, radius: 3.0, yOffset: 2.0, opacity: 0.2 },
                { label: 'Isolation', color: 0x64b4ff, radius: 2.7, yOffset: 0, opacity: 0.15 },
                { label: 'Coque int.', color: 0xc8a87a, radius: 2.4, yOffset: -2.0, opacity: 0.2 },
            ];

            layers.forEach(layer => {
                // Half-sphere wireframe
                const geo = new THREE.IcosahedronGeometry(layer.radius, 2);
                const posArr = geo.attributes.position.array;
                for (let i = 0; i < posArr.length; i += 3) {
                    if (posArr[i + 1] < -0.05) posArr[i + 1] = -0.05;
                }

                const wire = new THREE.WireframeGeometry(geo);
                const mat = new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity });
                const lines = new THREE.LineSegments(wire, mat);
                lines.position.y = layer.yOffset;
                explodedGroup.add(lines);

                // Transparent shell
                const shellGeo = new THREE.SphereGeometry(layer.radius - 0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const shellMat = new THREE.MeshPhysicalMaterial({
                    color: layer.color,
                    transparent: true,
                    opacity: 0.05,
                    side: THREE.DoubleSide,
                });
                const shell = new THREE.Mesh(shellGeo, shellMat);
                shell.position.y = layer.yOffset;
                explodedGroup.add(shell);
            });

            // Solar on top
            const solarGeo = new THREE.SphereGeometry(3.05, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.18);
            const solarMat = new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
            const solar = new THREE.Mesh(solarGeo, solarMat);
            solar.position.y = 3.8;
            explodedGroup.add(solar);

            explodedGroup.visible = false;
            scene.add(explodedGroup);
        })();

        // ---- View switching ----
        function switchView(view) {
            currentView = view;
            exteriorGroup.visible = (view === 'exterior');
            interiorGroup.visible = (view === 'interior');
            floorplanGroup.visible = (view === 'floorplan');
            explodedGroup.visible = (view === 'exploded');

            // Camera transitions
            if (view === 'exterior') {
                camera.position.set(0, 2, 8);
                controls.target.set(0, 1, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
            } else if (view === 'interior') {
                camera.position.set(0, 1.5, 0.5);
                controls.target.set(0, 1.5, 0);
                controls.maxPolarAngle = Math.PI;
            } else if (view === 'floorplan') {
                camera.position.set(0, 8, 0.1);
                controls.target.set(0, 0, 0);
                controls.maxPolarAngle = Math.PI * 0.5;
            } else if (view === 'exploded') {
                camera.position.set(5, 3, 5);
                controls.target.set(0, 0, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
            }
            controls.update();
        }

        // ---- Animation loop ----
        function animate() {
            requestAnimationFrame(animate);
            controls.update();

            // LED ring subtle pulse for interior
            if (currentView === 'interior') {
                const time = performance.now() * 0.001;
                interiorGroup.children.forEach(child => {
                    if (child.geometry && child.geometry.type === 'TorusGeometry' && child.material.opacity < 0.5) {
                        child.material.opacity = 0.05 + Math.sin(time * 2) * 0.04;
                    }
                });
            }

            // Floating effect for exploded view
            if (currentView === 'exploded') {
                const time = performance.now() * 0.001;
                let layerIndex = 0;
                explodedGroup.children.forEach(child => {
                    if (child.position.y !== 0 || child.type === 'LineSegments') {
                        // subtle float
                    }
                });
            }

            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // ---- Explorer button controls ----
        const explorerBtns = document.querySelectorAll('.explorer-btn');
        const infoPanels = document.querySelectorAll('.explorer-info-panel');

        explorerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                switchView(view);
                explorerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                infoPanels.forEach(p => p.classList.remove('active'));
                document.querySelector(`[data-panel="${view}"]`).classList.add('active');
            });
        });
    }

    // ===== Scroll Reveal =====
    const revealElements = document.querySelectorAll(
        '.concept-card, .spec-category, .smart-feature, .material-card, .autonomy-node, .autonomy-stat-card, .legend-item, .reserve-feature-item'
    );
    revealElements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => { entry.target.classList.add('visible'); }, index * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealElements.forEach(el => observer.observe(el));

    // ===== Floorplan Zone Hover =====
    const floorplanZones = document.querySelectorAll('.floorplan-zone');
    const legendItems = document.querySelectorAll('.legend-item');

    floorplanZones.forEach(zone => {
        zone.addEventListener('mouseenter', () => {
            legendItems.forEach(item => {
                if (item.dataset.zone === zone.dataset.zone) {
                    item.style.borderColor = 'rgba(168,255,120,0.3)';
                    item.style.background = 'rgba(168,255,120,0.05)';
                }
            });
        });
        zone.addEventListener('mouseleave', () => {
            legendItems.forEach(item => { item.style.borderColor = ''; item.style.background = ''; });
        });
    });

    legendItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            floorplanZones.forEach(zone => {
                if (zone.dataset.zone === item.dataset.zone) zone.style.filter = 'brightness(2)';
            });
        });
        item.addEventListener('mouseleave', () => {
            floorplanZones.forEach(zone => { zone.style.filter = ''; });
        });
    });

    // ===== Smooth Scroll =====
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // ===== Parallax Hero =====
    const heroSphere = document.getElementById('heroSphere');
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (heroSphere && scrollY < window.innerHeight) {
            heroSphere.style.transform = `translate(-50%, calc(-50% + ${scrollY * 0.3}px))`;
            heroSphere.style.opacity = 1 - scrollY / (window.innerHeight * 0.8);
        }
    });

    // ===== RESERVE FORM =====
    const reserveForm = document.getElementById('reserveForm');
    const reserveSuccess = document.getElementById('reserveSuccess');
    const reserveBtn = document.getElementById('reserveBtn');

    if (reserveForm) {
        reserveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('reserveEmail').value;

            // Store email in localStorage
            const subscribers = JSON.parse(localStorage.getItem('orba_subscribers') || '[]');
            if (!subscribers.includes(email)) {
                subscribers.push(email);
                localStorage.setItem('orba_subscribers', JSON.stringify(subscribers));
            }

            // Show success
            reserveBtn.style.display = 'none';
            document.querySelector('.form-group').style.display = 'none';
            reserveSuccess.style.display = 'block';
        });
    }

    // ===== CAGNOTTE =====
    const cagnotteTiers = document.querySelectorAll('.cagnotte-tier');
    const contributeBtn = document.getElementById('contributeBtn');
    const customAmount = document.getElementById('customAmount');
    let selectedAmount = 250;

    cagnotteTiers.forEach(tier => {
        tier.addEventListener('click', () => {
            cagnotteTiers.forEach(t => t.classList.remove('active'));
            tier.classList.add('active');
            selectedAmount = parseInt(tier.dataset.amount);
            if (customAmount) customAmount.value = '';
            if (contributeBtn) contributeBtn.querySelector('span').textContent = `Contribuer — ${selectedAmount}€`;
        });
    });

    if (customAmount) {
        customAmount.addEventListener('input', () => {
            const val = parseInt(customAmount.value);
            if (val && val >= 5) {
                selectedAmount = val;
                cagnotteTiers.forEach(t => t.classList.remove('active'));
                if (contributeBtn) contributeBtn.querySelector('span').textContent = `Contribuer — ${val}€`;
            }
        });
    }

    if (contributeBtn) {
        contributeBtn.addEventListener('click', () => {
            // Store contribution intent
            const contributions = JSON.parse(localStorage.getItem('orba_contributions') || '[]');
            contributions.push({ amount: selectedAmount, date: new Date().toISOString() });
            localStorage.setItem('orba_contributions', JSON.stringify(contributions));

            // Animate
            contributeBtn.querySelector('span').textContent = 'Merci pour votre soutien !';
            contributeBtn.style.background = 'var(--accent)';
            contributeBtn.disabled = true;

            // Update fake progress
            const fill = document.getElementById('cagnotteFill');
            if (fill) {
                const newWidth = Math.min(100, 34 + (selectedAmount / 1000) * 5);
                fill.style.width = newWidth + '%';
            }
        });
    }

});
