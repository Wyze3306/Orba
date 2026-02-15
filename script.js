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
    if (container && typeof THREE !== 'undefined') { try {

        let currentView = 'exterior';
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 3, 8);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x161616, 1);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);

        // OrbitControls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 3;
        controls.maxDistance = 15;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        controls.maxPolarAngle = Math.PI * 0.85;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        const accentLight = new THREE.PointLight(0xa8ff78, 0.4, 20);
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
        // realisticGroup removed

        // Dome dimensions: radius=3m, hemisphere
        const DOME_R = 3.0;
        const WALL_THICKNESS = 0.15;
        const FLOOR_Y = 0.0;

        // ===== HELPER: Create curved wall segment along dome perimeter =====
        function createCurvedWall(startAngle, endAngle, height, innerR, color, opacity) {
            const segs = 24;
            const geo = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const indices = [];
            const range = endAngle - startAngle;
            for (let i = 0; i <= segs; i++) {
                const a = startAngle + (i / segs) * range;
                const x = innerR * Math.cos(a);
                const z = innerR * Math.sin(a);
                const nx = Math.cos(a);
                const nz = Math.sin(a);
                // bottom vertex
                vertices.push(x, FLOOR_Y, z);
                normals.push(nx, 0, nz);
                // top vertex
                vertices.push(x, FLOOR_Y + height, z);
                normals.push(nx, 0, nz);
            }
            for (let i = 0; i < segs; i++) {
                const b = i * 2;
                indices.push(b, b+1, b+2, b+1, b+3, b+2);
            }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geo.setIndex(indices);
            const mat = new THREE.MeshPhysicalMaterial({
                color: color,
                transparent: opacity < 1,
                opacity: opacity,
                roughness: 0.6,
                metalness: 0.05,
                side: THREE.DoubleSide,
            });
            return new THREE.Mesh(geo, mat);
        }

        // ===== HELPER: Get dome height at distance from center =====
        function domeHeightAt(r) {
            if (r >= DOME_R) return 0;
            return Math.sqrt(DOME_R * DOME_R - r * r);
        }

        // ===== HELPER: Create text sprite label =====
        function createLabel(text, x, y, z, color, fontSize) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 256, 64);
            ctx.font = `bold ${fontSize || 20}px Inter, sans-serif`;
            ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 32);
            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(x, y, z);
            sprite.scale.set(1.2, 0.3, 1);
            return sprite;
        }

        // ===================================================================
        // ===== EXTERIOR VIEW =====
        // ===================================================================
        (function buildExterior() {
            // --- Solid dome shell (matte white/grey composite look) ---
            const domeGeo = new THREE.SphereGeometry(DOME_R, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshPhysicalMaterial({
                color: 0xd8d4cc, roughness: 0.55, metalness: 0.05,
                side: THREE.FrontSide, clearcoat: 0.3,
            });
            const domeMesh = new THREE.Mesh(domeGeo, domeMat);
            domeMesh.castShadow = true;
            exteriorGroup.add(domeMesh);

            // Subtle geodesic wireframe overlay
            const icoGeo = new THREE.IcosahedronGeometry(DOME_R + 0.01, 2);
            const pos = icoGeo.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                if (pos[i + 1] < -0.05) pos[i + 1] = -0.05;
            }
            const wireframe = new THREE.WireframeGeometry(icoGeo);
            exteriorGroup.add(new THREE.LineSegments(wireframe,
                new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.08 })
            ));

            // --- Panoramic window (front face, z+) ---
            const winGeo = new THREE.SphereGeometry(DOME_R + 0.005, 48, 24,
                -Math.PI * 0.22, Math.PI * 0.44, Math.PI * 0.18, Math.PI * 0.3);
            const winMat = new THREE.MeshPhysicalMaterial({
                color: 0x88ccff, transparent: true, opacity: 0.35,
                roughness: 0.0, metalness: 0.15, side: THREE.DoubleSide,
            });
            exteriorGroup.add(new THREE.Mesh(winGeo, winMat));
            // Window frame lines (vertical mullions)
            const wfMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
            for (let i = 0; i <= 3; i++) {
                const pts = [];
                const theta = -Math.PI * 0.22 + (i / 3) * Math.PI * 0.44;
                for (let j = 0; j <= 16; j++) {
                    const phi = Math.PI * 0.18 + (j / 16) * Math.PI * 0.3;
                    const r = DOME_R + 0.01;
                    pts.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)));
                }
                exteriorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wfMat));
            }

            // --- Solar panels cap (dark blue, top 22°) ---
            const solarGeo = new THREE.SphereGeometry(DOME_R + 0.015, 32, 8, 0, Math.PI * 2, 0, Math.PI * 0.2);
            const solarMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a1a3a, roughness: 0.08, metalness: 0.85, side: THREE.DoubleSide,
            });
            exteriorGroup.add(new THREE.Mesh(solarGeo, solarMat));
            // Solar grid
            const sgMat = new THREE.LineBasicMaterial({ color: 0x3344aa, transparent: true, opacity: 0.3 });
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const pts = [];
                for (let t = 0; t <= 10; t++) {
                    const phi = (t / 10) * Math.PI * 0.2;
                    const r = DOME_R + 0.02;
                    pts.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(angle), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(angle)));
                }
                exteriorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), sgMat));
            }

            // --- Base platform (steel, dark) ---
            const baseGeo = new THREE.CylinderGeometry(DOME_R + 0.1, DOME_R + 0.2, 0.3, 48);
            const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.35, metalness: 0.7 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = -0.15;
            base.castShadow = true;
            base.receiveShadow = true;
            exteriorGroup.add(base);

            // --- ENTRY DOOR (front, z+, ground level) ---
            const doorW = 0.85, doorH = 2.1;
            // Calculate Z where dome touches ground at door width
            const doorZ = Math.sqrt(DOME_R * DOME_R - (doorW / 2) * (doorW / 2)) * 0.98;
            // Door panel
            const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.06);
            const doorMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.4 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, doorH / 2, doorZ);
            exteriorGroup.add(door);
            // Frame
            const fMat = new THREE.MeshPhysicalMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.6 });
            [[-(doorW/2+0.03), doorH/2, 0.04, doorH+0.06, 0.06],
             [(doorW/2+0.03), doorH/2, 0.04, doorH+0.06, 0.06],
             [0, doorH+0.03, doorW+0.1, 0.04, 0.06]].forEach(([x,y,w,h,d]) => {
                const f = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), fMat);
                f.position.set(x, y, doorZ);
                exteriorGroup.add(f);
            });
            // Handle
            const hGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8);
            const hMat = new THREE.MeshPhysicalMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
            const handle = new THREE.Mesh(hGeo, hMat);
            handle.rotation.x = Math.PI / 2;
            handle.position.set(0.28, doorH * 0.48, doorZ + 0.04);
            exteriorGroup.add(handle);
            // Doorstep
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.06, 0.5),
                new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.3 })
            );
            step.position.set(0, -0.03, doorZ + 0.3);
            exteriorGroup.add(step);
            // Door light
            var doorLight = new THREE.PointLight(0xffeedd, 0.4, 3);
            doorLight.position.set(0, doorH + 0.2, doorZ + 0.1);
            exteriorGroup.add(doorLight);

            // --- Ground (dark grass-tinted) ---
            const groundGeo = new THREE.PlaneGeometry(30, 30);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.95 });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.3;
            ground.receiveShadow = true;
            exteriorGroup.add(ground);

            // --- Subtle environment ring (pathway) ---
            const pathGeo = new THREE.RingGeometry(DOME_R + 0.3, DOME_R + 0.8, 48);
            const pathMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const path = new THREE.Mesh(pathGeo, pathMat);
            path.rotation.x = -Math.PI / 2;
            path.position.y = -0.29;
            exteriorGroup.add(path);

            scene.add(exteriorGroup);
        })();

        // ===================================================================
        // ===== INTERIOR VIEW — Clear room layout inside dome =====
        // ===================================================================
        (function buildInterior() {
            var IR = DOME_R - WALL_THICKNESS; // 2.85m inner radius

            // Helper: create mesh, position it, add to group
            function addM(geo, mat, x, y, z, ry, rx) {
                var m = new THREE.Mesh(geo, mat);
                m.position.set(x, y, z);
                if (ry) m.rotation.y = ry;
                if (rx) m.rotation.x = rx;
                interiorGroup.add(m);
                return m;
            }

            // Helper: clamp wall length to fit inside dome circle
            // For a wall along X at position z, max x-extent is sqrt(IR²-z²)
            function xMaxAt(z) { return Math.sqrt(Math.max(0, IR * IR - z * z)); }
            function zMaxAt(x) { return Math.sqrt(Math.max(0, IR * IR - x * x)); }

            var wallMat = new THREE.MeshPhysicalMaterial({ color: 0x9a8a70, roughness: 0.6, metalness: 0.02 });
            var wallH = 2.2;
            var wallT = 0.07;

            // --- Dome shell (wood, seen from inside) ---
            interiorGroup.add(new THREE.Mesh(
                new THREE.SphereGeometry(IR, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshPhysicalMaterial({ color: 0x9B8365, roughness: 0.7, metalness: 0.02, side: THREE.BackSide })
            ));

            // --- Structural ribs (8 wooden beams) ---
            var ribMat = new THREE.LineBasicMaterial({ color: 0xc8a87a, transparent: true, opacity: 0.4 });
            for (var ri = 0; ri < 8; ri++) {
                var ang = (ri / 8) * Math.PI * 2;
                var pts = [];
                for (var t = 0; t <= 30; t++) {
                    var phi = (t / 30) * Math.PI / 2;
                    var r = IR - 0.02;
                    pts.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(ang), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(ang)));
                }
                interiorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribMat));
            }

            // --- LED ring ---
            var ledRing = new THREE.Mesh(
                new THREE.TorusGeometry(IR * Math.sin(Math.PI * 0.15), 0.015, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.6 })
            );
            ledRing.position.y = IR * Math.cos(Math.PI * 0.15);
            ledRing.rotation.x = Math.PI / 2;
            interiorGroup.add(ledRing);
            var ledLight = new THREE.PointLight(0xffeedd, 0.4, 6);
            ledLight.position.set(0, 2.6, 0);
            interiorGroup.add(ledLight);

            // --- Floor (wood) ---
            var floor = new THREE.Mesh(
                new THREE.CircleGeometry(IR - 0.05, 64),
                new THREE.MeshPhysicalMaterial({ color: 0x8B7B5B, roughness: 0.75, metalness: 0.02 })
            );
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(0, 0.01, 0);
            interiorGroup.add(floor);

            // --- ENTRY DOOR (z+ side, south) ---
            var doorW = 0.85, doorH = 2.1;
            var doorZ = Math.sqrt(IR * IR - (doorW / 2) * (doorW / 2)) * 0.98;
            addM(new THREE.BoxGeometry(doorW, doorH, 0.06),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.3 }),
                0, doorH / 2, doorZ);
            var afMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78 });
            addM(new THREE.BoxGeometry(0.03, doorH + 0.04, 0.04), afMat, -doorW / 2 - 0.02, doorH / 2, doorZ);
            addM(new THREE.BoxGeometry(0.03, doorH + 0.04, 0.04), afMat, doorW / 2 + 0.02, doorH / 2, doorZ);

            // ===============================================
            // LAYOUT (vue de dessus, nord=z-, sud=z+ porte):
            //
            //         N (z-)
            //     .-----------.
            //    / CHAMBRE | SDB \
            //   |   (lit)  |shower|
            //   |----------|------|
            //   |  BUREAU  | WC   |
            //   |   desk   |      |
            //   |----------|------|
            //   |  CUISINE |SALON |
            //    \ counter |sofa /
            //     '---------'
            //      PORTE (z+)
            //
            // Mur vertical central: x=0, de z=-2.5 à z=0.8
            // Mur horizontal haut: z=-0.6, de x=-xMax à x=xMax
            // Mur horizontal bas: z=0.8, de x=-xMax à x=0
            // Mur SDB: z=-0.6 à z=0.8 à x=0 (partie du mur central)
            // ===============================================

            // --- WALL 1: Vertical center wall (x=0, full height) ---
            // Goes from back of dome to z=0.8 (leaving door passage)
            var w1zBack = -zMaxAt(0) + 0.1; // back of dome at x=0
            var w1zFront = 0.8;
            var w1Len = w1zFront - w1zBack;
            addM(new THREE.BoxGeometry(wallT, wallH, w1Len), wallMat, 0, wallH / 2, (w1zBack + w1zFront) / 2);

            // --- WALL 2: Horizontal wall at z=-0.6 (separates back rooms from front) ---
            var w2xMax = xMaxAt(-0.6) - 0.1;
            addM(new THREE.BoxGeometry(w2xMax * 2, wallH, wallT), wallMat, 0, wallH / 2, -0.6);

            // --- WALL 3: Half-wall at z=0.8 left side (kitchen divider) ---
            // From dome edge to x=0 (center wall)
            var w3xMax = xMaxAt(0.8) - 0.1;
            var w3Len = w3xMax; // from -w3xMax to 0
            addM(new THREE.BoxGeometry(w3Len, 1.2, wallT), wallMat, -w3Len / 2, 0.6, 0.8);

            // ===================================================
            // CHAMBRE (back-left: x<0, z<-0.6) — ~5m²
            // ===================================================
            var bedX = -1.0, bedZ = -1.6;
            // Bed frame 140x200
            addM(new THREE.BoxGeometry(1.4, 0.10, 2.0),
                new THREE.MeshPhysicalMaterial({ color: 0x5a4a3a, roughness: 0.7 }),
                bedX, 0.05, bedZ);
            // Mattress
            addM(new THREE.BoxGeometry(1.35, 0.15, 1.95),
                new THREE.MeshPhysicalMaterial({ color: 0xeee8dd, roughness: 0.9 }),
                bedX, 0.175, bedZ);
            // Pillows
            addM(new THREE.BoxGeometry(0.4, 0.08, 0.25),
                new THREE.MeshPhysicalMaterial({ color: 0xfff8f0, roughness: 0.95 }),
                bedX - 0.3, 0.29, bedZ - 0.85);
            addM(new THREE.BoxGeometry(0.4, 0.08, 0.25),
                new THREE.MeshPhysicalMaterial({ color: 0xfff8f0, roughness: 0.95 }),
                bedX + 0.3, 0.29, bedZ - 0.85);
            // Nightstand
            addM(new THREE.BoxGeometry(0.35, 0.5, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0x7B6B4B, roughness: 0.6 }),
                bedX + 0.9, 0.25, bedZ - 0.6);

            // ===================================================
            // SALLE D'EAU (back-right: x>0, z<-0.6) — ~3m²
            // ===================================================
            // Shower base 80x80 (far back-right)
            var shX = 1.2, shZ = -1.8;
            addM(new THREE.BoxGeometry(0.8, 0.04, 0.8),
                new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.15 }),
                shX, 0.02, shZ);
            // Shower glass panels
            addM(new THREE.BoxGeometry(0.03, 2.0, 0.8),
                new THREE.MeshPhysicalMaterial({ color: 0x88ccee, transparent: true, opacity: 0.25, roughness: 0 }),
                shX - 0.4, 1.0, shZ);
            addM(new THREE.BoxGeometry(0.8, 2.0, 0.03),
                new THREE.MeshPhysicalMaterial({ color: 0x88ccee, transparent: true, opacity: 0.25, roughness: 0 }),
                shX, 1.0, shZ + 0.4);
            // Shower head
            addM(new THREE.SphereGeometry(0.05, 10, 10),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8 }),
                shX + 0.15, 1.95, shZ - 0.15);
            // WC
            addM(new THREE.BoxGeometry(0.35, 0.40, 0.50),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.25 }),
                0.5, 0.20, -1.0);
            // WC tank
            addM(new THREE.BoxGeometry(0.33, 0.30, 0.12),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.25 }),
                0.5, 0.55, -1.22);
            // Sink
            addM(new THREE.BoxGeometry(0.45, 0.08, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.2 }),
                1.4, 0.82, -0.72);
            // Mirror
            addM(new THREE.BoxGeometry(0.35, 0.45, 0.02),
                new THREE.MeshPhysicalMaterial({ color: 0xbbddee, roughness: 0, metalness: 0.85 }),
                1.4, 1.3, -0.66);

            // ===================================================
            // BUREAU (center-left: x<0, -0.6<z<0.8) — ~4m²
            // ===================================================
            var dkX = -1.0, dkZ = 0.1;
            // Desk 100x55
            addM(new THREE.BoxGeometry(1.0, 0.03, 0.55),
                new THREE.MeshPhysicalMaterial({ color: 0x9B8365, roughness: 0.4 }),
                dkX, 0.74, dkZ);
            // Desk legs
            var dlMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, metalness: 0.4 });
            [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(function(d) {
                addM(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), dlMat, dkX + d[0], 0.36, dkZ + d[1]);
            });
            // Chair
            addM(new THREE.BoxGeometry(0.42, 0.04, 0.40),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.5 }),
                dkX, 0.45, dkZ + 0.45);
            addM(new THREE.BoxGeometry(0.42, 0.35, 0.03),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.5 }),
                dkX, 0.645, dkZ + 0.65);

            // ===================================================
            // CUISINE (front-left: x<0, z>0.8) — ~4m²
            // ===================================================
            var cH = 0.90;
            var kitMat = new THREE.MeshPhysicalMaterial({ color: 0x888070, roughness: 0.3, metalness: 0.15 });
            var ctMat = new THREE.MeshPhysicalMaterial({ color: 0xbbb8aa, roughness: 0.12, metalness: 0.25 });
            // Counter along back wall (z~0.9)
            addM(new THREE.BoxGeometry(1.4, cH, 0.50), kitMat, -1.0, cH / 2, 1.1);
            addM(new THREE.BoxGeometry(1.45, 0.03, 0.55), ctMat, -1.0, cH + 0.015, 1.1);
            // L-part along dome wall (left side)
            addM(new THREE.BoxGeometry(0.50, cH, 0.8), kitMat, -1.9, cH / 2, 1.5);
            addM(new THREE.BoxGeometry(0.55, 0.03, 0.85), ctMat, -1.9, cH + 0.015, 1.5);
            // Sink
            addM(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 16),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.1 }),
                -0.6, cH + 0.04, 1.1);
            // Burners
            var bMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            [[-1.75, 1.35], [-1.95, 1.55]].forEach(function(pos) {
                var b = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), bMat);
                b.rotation.x = Math.PI / 2;
                b.position.set(pos[0], cH + 0.04, pos[1]);
                interiorGroup.add(b);
            });
            // Fridge
            addM(new THREE.BoxGeometry(0.50, 0.85, 0.50),
                new THREE.MeshPhysicalMaterial({ color: 0xdddddd, metalness: 0.25, roughness: 0.2 }),
                -0.35, 0.425, 1.1);

            // ===================================================
            // SALON (front-right: x>0, z>-0.6) — ~6m²
            // ===================================================
            var sfX = 0.9, sfZ = 1.2;
            var sofaMat2 = new THREE.MeshPhysicalMaterial({ color: 0x4a5a4a, roughness: 0.75 });
            // Sofa 140x65
            addM(new THREE.BoxGeometry(0.65, 0.38, 1.4), sofaMat2, sfX + 0.6, 0.19, sfZ);
            // Backrest (along dome wall)
            addM(new THREE.BoxGeometry(0.10, 0.30, 1.4), sofaMat2, sfX + 0.93, 0.53, sfZ);
            // Cushions
            var cuMat = new THREE.MeshPhysicalMaterial({ color: 0x6a8a6a, roughness: 0.85 });
            addM(new THREE.BoxGeometry(0.55, 0.06, 0.60), cuMat, sfX + 0.6, 0.41, sfZ - 0.35);
            addM(new THREE.BoxGeometry(0.55, 0.06, 0.60), cuMat, sfX + 0.6, 0.41, sfZ + 0.35);
            // Coffee table (round d=50cm)
            addM(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20),
                new THREE.MeshPhysicalMaterial({ color: 0x9B8365, roughness: 0.4 }),
                sfX - 0.2, 0.35, sfZ);
            addM(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 10),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: 0.4 }),
                sfX - 0.2, 0.165, sfZ);

            // --- Lights ---
            var spotLight = new THREE.SpotLight(0x88bbff, 0.35, 7, Math.PI * 0.4);
            spotLight.position.set(0.5, 2.2, 2.2);
            interiorGroup.add(spotLight);
            var pLight = new THREE.PointLight(0xffeedd, 0.3, 5);
            pLight.position.set(0, 2.5, 0);
            interiorGroup.add(pLight);

            interiorGroup.visible = false;
            scene.add(interiorGroup);
        })();

        // ===================================================================
        // ===== FLOORPLAN VIEW — Matches interior partition layout =====
        // ===================================================================
        (function buildFloorplan() {
            const R = 2.8; // visual radius for floorplan
            const wallW = 0.06;

            // Floor fill
            const floorFill = new THREE.Mesh(
                new THREE.CircleGeometry(R, 64),
                new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide })
            );
            floorFill.rotation.x = -Math.PI / 2;
            floorFill.position.y = -0.01;
            floorplanGroup.add(floorFill);

            // Outer wall ring
            const outerRing = new THREE.Mesh(
                new THREE.RingGeometry(R, R + wallW, 64),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
            );
            outerRing.rotation.x = -Math.PI / 2;
            floorplanGroup.add(outerRing);

            // Cross-hair grid
            const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04 });
            [[[0, 0, -R], [0, 0, R]], [[-R, 0, 0], [R, 0, 0]]].forEach(([a, b]) => {
                const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
                floorplanGroup.add(new THREE.Line(g, gridMat));
            });

            // Helper: filled rectangle zone (flat on XZ plane)
            function addZoneRect(x, z, w, d, color, opacity) {
                const geo = new THREE.PlaneGeometry(w, d);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity || 0.1, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(x, 0.005, z);
                floorplanGroup.add(mesh);
                const edge = new THREE.LineSegments(
                    new THREE.EdgesGeometry(geo),
                    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
                );
                edge.rotation.x = -Math.PI / 2;
                edge.position.set(x, 0.005, z);
                floorplanGroup.add(edge);
            }

            // Partition wall line helper (thicker for visibility)
            function addPartition(x1, z1, x2, z2, color) {
                const geo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x1, 0.01, z1),
                    new THREE.Vector3(x2, 0.01, z2)
                ]);
                floorplanGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.5 })));
            }

            // Furniture outline helper
            function addFurniturePlan(x, z, w, d, color, opacity) {
                const geo = new THREE.PlaneGeometry(w, d);
                const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity || 0.15, side: THREE.DoubleSide }));
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(x, 0.01, z);
                floorplanGroup.add(mesh);
                const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }));
                edge.rotation.x = -Math.PI / 2;
                edge.position.set(x, 0.01, z);
                floorplanGroup.add(edge);
            }

            // ===============================================
            // PARTITION WALLS — matching interior layout
            // Central wall: x=0, z=-2.7 to z=0.8
            // Horizontal wall: z=-0.6, full width
            // Half-wall kitchen: z=0.8, left half
            // ===============================================
            const wallColor = 0xccbbaa;
            addPartition(0, -2.7, 0, 0.8, wallColor);           // Central vertical
            addPartition(-2.7, -0.6, 2.7, -0.6, wallColor);     // Horizontal upper
            addPartition(-2.6, 0.8, 0, 0.8, 0xccbbaa);          // Kitchen divider (half)

            // --- CHAMBRE (back-left: x<0, z<-0.6) ---
            addZoneRect(-1.0, -1.6, 2.0, 2.0, 0xc896ff, 0.06);
            addFurniturePlan(-1.0, -1.6, 1.4, 2.0, 0xc896ff, 0.15); // Bed
            addFurniturePlan(-0.1, -2.2, 0.35, 0.35, 0xc896ff, 0.12); // Nightstand

            // --- SALLE D'EAU (back-right: x>0, z<-0.6) ---
            addZoneRect(1.0, -1.4, 1.6, 1.6, 0x64b4ff, 0.06);
            // Shower
            const showerPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.35, 24),
                new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            showerPlan.rotation.x = -Math.PI / 2;
            showerPlan.position.set(1.2, 0.015, -1.8);
            floorplanGroup.add(showerPlan);
            addFurniturePlan(0.5, -1.0, 0.35, 0.50, 0x64b4ff, 0.15); // WC
            addFurniturePlan(1.4, -0.72, 0.45, 0.35, 0x64b4ff, 0.12); // Sink

            // --- BUREAU (center-left: x<0, -0.6<z<0.8) ---
            addZoneRect(-1.0, 0.1, 1.8, 1.2, 0xa8ff78, 0.04);
            addFurniturePlan(-1.0, 0.1, 1.0, 0.55, 0xa8ff78, 0.15); // Desk
            const chairPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.12, 0.16, 12),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            chairPlan.rotation.x = -Math.PI / 2;
            chairPlan.position.set(-1.0, 0.015, 0.55);
            floorplanGroup.add(chairPlan);

            // --- SALON (right side: x>0, z>-0.6) ---
            addZoneRect(1.0, 0.8, 1.8, 2.4, 0x7acc5a, 0.05);
            addFurniturePlan(1.5, 1.2, 0.65, 1.4, 0x7acc5a, 0.15); // Sofa (rotated)
            const ctPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.20, 0.25, 16),
                new THREE.MeshBasicMaterial({ color: 0x7acc5a, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            ctPlan.rotation.x = -Math.PI / 2;
            ctPlan.position.set(0.7, 0.015, 1.2);
            floorplanGroup.add(ctPlan);

            // --- CUISINE (front-left: x<0, z>0.8) ---
            addZoneRect(-1.0, 1.5, 1.8, 1.2, 0xffc832, 0.06);
            addFurniturePlan(-1.0, 1.1, 1.4, 0.50, 0xffc832, 0.15); // Counter
            addFurniturePlan(-1.9, 1.5, 0.50, 0.8, 0xffc832, 0.15); // L-part
            // Sink
            const sinkPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.08, 0.12, 16),
                new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
            );
            sinkPlan.rotation.x = -Math.PI / 2;
            sinkPlan.position.set(-0.6, 0.015, 1.1);
            floorplanGroup.add(sinkPlan);
            addFurniturePlan(-0.35, 1.1, 0.50, 0.50, 0xffc832, 0.12); // Fridge

            // --- Door opening (z+ side) ---
            const doorSwing = [];
            for (let i = 0; i <= 12; i++) {
                const a = (i / 12) * Math.PI * 0.5;
                doorSwing.push(new THREE.Vector3(
                    -0.42 + 0.85 * Math.sin(a), 0.015,
                    R - 0.85 * (1 - Math.cos(a))
                ));
            }
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(doorSwing),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.3 })
            ));
            // Entry marker
            const entryDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0xa8ff78 }));
            entryDot.position.set(0, 0.02, R);
            floorplanGroup.add(entryDot);
            const arrowPts = [
                new THREE.Vector3(-0.15, 0.02, R + 0.3),
                new THREE.Vector3(0, 0.02, R + 0.05),
                new THREE.Vector3(0.15, 0.02, R + 0.3),
            ];
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(arrowPts),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.6 })
            ));

            // --- Zone labels ---
            floorplanGroup.add(createLabel('CHAMBRE', -1.0, 0.1, -1.6, 0xc896ff, 18));
            floorplanGroup.add(createLabel('5.5m²', -1.0, 0.05, -1.2, 0xc896ff, 14));
            floorplanGroup.add(createLabel("SALLE D'EAU", 1.0, 0.1, -1.4, 0x64b4ff, 16));
            floorplanGroup.add(createLabel('3.0m²', 1.0, 0.05, -1.0, 0x64b4ff, 14));
            floorplanGroup.add(createLabel('BUREAU', -1.0, 0.1, 0.1, 0xa8ff78, 18));
            floorplanGroup.add(createLabel('3.5m²', -1.0, 0.05, 0.5, 0xa8ff78, 14));
            floorplanGroup.add(createLabel('SALON', 1.0, 0.1, 0.8, 0x7acc5a, 18));
            floorplanGroup.add(createLabel('6.0m²', 1.0, 0.05, 1.2, 0x7acc5a, 14));
            floorplanGroup.add(createLabel('CUISINE', -1.0, 0.1, 1.5, 0xffc832, 18));
            floorplanGroup.add(createLabel('4.0m²', -1.0, 0.05, 1.9, 0xffc832, 14));
            floorplanGroup.add(createLabel('ENTRÉE', 0, 0.1, R + 0.5, 0xa8ff78, 18));

            // Dimension line (diameter)
            const dimMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-R, 0.02, R + 0.6), new THREE.Vector3(R, 0.02, R + 0.6)]),
                dimMat
            ));
            [[-R, R + 0.4, -R, R + 0.8], [R, R + 0.4, R, R + 0.8]].forEach(([x1, z1, x2, z2]) => {
                floorplanGroup.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, 0.02, z1), new THREE.Vector3(x2, 0.02, z2)]),
                    dimMat
                ));
            });
            floorplanGroup.add(createLabel('6.0m', 0, 0.1, R + 1.0, 0x666666, 16));

            floorplanGroup.visible = false;
            scene.add(floorplanGroup);
        })();

        // ===================================================================
        // ===== EXPLODED VIEW =====
        // ===================================================================
        (function buildExploded() {
            const layers = [
                { label: 'Panneaux solaires', color: 0xffc832, radius: DOME_R + 0.02, yOff: 4.0, opacity: 0.35, detail: 1, isSolar: true },
                { label: 'Coque extérieure', color: 0xa8ff78, radius: DOME_R, yOff: 2.0, opacity: 0.2, detail: 2 },
                { label: 'Isolation aérogel', color: 0x64b4ff, radius: DOME_R - 0.08, yOff: 0, opacity: 0.15, detail: 1 },
                { label: 'Coque intérieure', color: 0xc8a87a, radius: DOME_R - WALL_THICKNESS, yOff: -2.0, opacity: 0.2, detail: 2 },
            ];

            layers.forEach((layer, idx) => {
                if (layer.isSolar) {
                    // Solar cap
                    const solarGeo = new THREE.SphereGeometry(layer.radius, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.22);
                    const solarMat = new THREE.MeshPhysicalMaterial({
                        color: layer.color, transparent: true, opacity: layer.opacity,
                        side: THREE.DoubleSide, metalness: 0.6, roughness: 0.2,
                    });
                    const solar = new THREE.Mesh(solarGeo, solarMat);
                    solar.position.y = layer.yOff;
                    explodedGroup.add(solar);
                    // Grid lines on solar
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const pts = [];
                        for (let t = 0; t <= 10; t++) {
                            const phi = (t / 10) * Math.PI * 0.22;
                            const r = layer.radius + 0.01;
                            pts.push(new THREE.Vector3(
                                r * Math.sin(phi) * Math.cos(angle),
                                layer.yOff + r * Math.cos(phi) - layer.radius,
                                r * Math.sin(phi) * Math.sin(angle)
                            ));
                        }
                        explodedGroup.add(new THREE.Line(
                            new THREE.BufferGeometry().setFromPoints(pts),
                            new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.3 })
                        ));
                    }
                } else {
                    // Half-sphere wireframe
                    const geo = new THREE.IcosahedronGeometry(layer.radius, layer.detail);
                    const posArr = geo.attributes.position.array;
                    for (let i = 0; i < posArr.length; i += 3) {
                        if (posArr[i + 1] < -0.05) posArr[i + 1] = -0.05;
                    }
                    const wire = new THREE.WireframeGeometry(geo);
                    explodedGroup.add(new THREE.LineSegments(wire,
                        new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity })
                    ));
                    // Move wireframe to yOff
                    explodedGroup.children[explodedGroup.children.length - 1].position.y = layer.yOff;

                    // Translucent shell
                    const shellGeo = new THREE.SphereGeometry(layer.radius - 0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                    const shell = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({
                        color: layer.color, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
                    }));
                    shell.position.y = layer.yOff;
                    explodedGroup.add(shell);
                }

                // Layer label
                explodedGroup.add(createLabel(layer.label, -4, layer.yOff + 0.5, 0, layer.color, 16));
                // Connecting dashed line
                const dashPts = [
                    new THREE.Vector3(-3.2, layer.yOff + 0.5, 0),
                    new THREE.Vector3(-layer.radius - 0.2, layer.yOff + 0.3, 0),
                ];
                explodedGroup.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(dashPts),
                    new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.25 })
                ));
            });

            // Base platform at bottom
            const basePlate = new THREE.Mesh(
                new THREE.CylinderGeometry(3.2, 3.4, 0.2, 32),
                new THREE.MeshPhysicalMaterial({ color: 0x444444, transparent: true, opacity: 0.3 })
            );
            basePlate.position.y = -3.5;
            explodedGroup.add(basePlate);
            explodedGroup.add(createLabel('Socle acier', -4, -3.2, 0, 0x888888, 16));

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

            // Adjust lighting per view
            ambientLight.intensity = (view === 'interior') ? 0.15 : 0.35;
            dirLight.intensity = (view === 'floorplan') ? 0.2 : 0.9;

            // Camera positions
            if (view === 'exterior') {
                camera.position.set(0, 3, 8);
                controls.target.set(0, 1.2, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.5;
            } else if (view === 'interior') {
                camera.position.set(0, 1.6, 0.3);
                controls.target.set(0, 1.2, -0.5);
                controls.maxPolarAngle = Math.PI;
                controls.autoRotate = false;
            } else if (view === 'floorplan') {
                camera.position.set(0, 8, 0.1);
                controls.target.set(0, 0, 0);
                controls.maxPolarAngle = Math.PI * 0.5;
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.3;
            } else if (view === 'exploded') {
                camera.position.set(6, 3, 6);
                controls.target.set(0, 0, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.5;
            }
            controls.update();
        }

        // ---- Animation loop ----
        function animate() {
            requestAnimationFrame(animate);
            controls.update();

            // LED ring pulse for interior view
            if (currentView === 'interior') {
                const time = performance.now() * 0.001;
                interiorGroup.children.forEach(child => {
                    if (child.geometry && child.geometry.type === 'TorusGeometry' && child.material.opacity < 0.5) {
                        child.material.opacity = 0.04 + Math.sin(time * 1.5) * 0.03;
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
                const panel = document.querySelector(`[data-panel="${view}"]`);
                if (panel) panel.classList.add('active');
            });
        });
    } catch(e) { console.error('Three.js error:', e); } }

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
    const reserveEmail = document.getElementById('reserveEmail');

    if (reserveForm && reserveBtn && reserveEmail) {
        reserveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = reserveEmail.value.trim();
            if (!email) return;

            // Store email in localStorage
            const subscribers = JSON.parse(localStorage.getItem('orba_subscribers') || '[]');
            if (!subscribers.includes(email)) {
                subscribers.push(email);
                localStorage.setItem('orba_subscribers', JSON.stringify(subscribers));
            }

            // Show success — hide form elements, show success message
            const formGroup = reserveForm.querySelector('.form-group');
            if (formGroup) formGroup.style.display = 'none';
            reserveBtn.style.display = 'none';
            if (reserveSuccess) reserveSuccess.style.display = 'block';
        });
    }

    // ===== CAGNOTTE =====
    const cagnotteTiers = document.querySelectorAll('.cagnotte-tier');
    const contributeBtn = document.getElementById('contributeBtn');
    const customAmountInput = document.getElementById('customAmount');
    let selectedAmount = 250;

    function updateContributeLabel(amount) {
        if (!contributeBtn) return;
        const span = contributeBtn.querySelector('span');
        if (span) span.textContent = `Contribuer — ${amount}€`;
    }

    cagnotteTiers.forEach(tier => {
        tier.addEventListener('click', () => {
            cagnotteTiers.forEach(t => t.classList.remove('active'));
            tier.classList.add('active');
            selectedAmount = parseInt(tier.dataset.amount) || 250;
            if (customAmountInput) customAmountInput.value = '';
            updateContributeLabel(selectedAmount);
        });
    });

    if (customAmountInput) {
        customAmountInput.addEventListener('input', () => {
            const val = parseInt(customAmountInput.value);
            if (val && val >= 5) {
                selectedAmount = val;
                cagnotteTiers.forEach(t => t.classList.remove('active'));
                updateContributeLabel(val);
            }
        });
    }

    if (contributeBtn) {
        contributeBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Store contribution intent
            const contributions = JSON.parse(localStorage.getItem('orba_contributions') || '[]');
            contributions.push({ amount: selectedAmount, date: new Date().toISOString() });
            localStorage.setItem('orba_contributions', JSON.stringify(contributions));

            // Calculate new total from all contributions
            const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);

            // Animate button
            const span = contributeBtn.querySelector('span');
            if (span) span.textContent = 'Merci pour votre soutien !';
            contributeBtn.style.background = 'var(--accent)';
            contributeBtn.style.color = '#0a0a0a';
            contributeBtn.disabled = true;

            // Update progress bar
            const fill = document.getElementById('cagnotteFill');
            if (fill) {
                const baseAmount = 34200;
                const newTotal = baseAmount + totalContributed;
                const newPct = Math.min(100, (newTotal / 100000) * 100);
                fill.style.width = newPct + '%';

                // Update displayed amount
                const amountEl = document.querySelector('.cagnotte-amount');
                if (amountEl) amountEl.textContent = newTotal.toLocaleString('fr-FR') + ' €';
            }

            // Update contributor count
            const metaSpans = document.querySelectorAll('.cagnotte-meta span');
            if (metaSpans.length > 0) {
                metaSpans[0].textContent = (127 + contributions.length) + ' contributeurs';
            }

            // Re-enable after 3s for repeat contributions
            setTimeout(() => {
                if (span) span.textContent = `Contribuer à nouveau`;
                contributeBtn.disabled = false;
                contributeBtn.style.background = '';
                contributeBtn.style.color = '';
            }, 3000);
        });
    }

});
