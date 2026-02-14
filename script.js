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
        const realisticGroup = new THREE.Group();

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
            exteriorGroup.add(Object.assign(new THREE.PointLight(0xffeedd, 0.4, 3), { position: new THREE.Vector3(0, doorH + 0.2, doorZ + 0.1) }));

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
        // ===== INTERIOR VIEW — Architecturally correct layout =====
        // ===================================================================
        (function buildInterior() {
            const IR = DOME_R - WALL_THICKNESS; // inner radius = 2.85m

            // Helper: check if point (x,z) is inside dome circle
            function isInside(x, z, margin) { return Math.sqrt(x*x + z*z) < IR - (margin||0); }

            // Helper: add a straight partition wall
            function addWall(x1, z1, x2, z2, h, thickness, color) {
                const dx = x2-x1, dz = z2-z1;
                const len = Math.sqrt(dx*dx+dz*dz);
                const angle = Math.atan2(dx, dz);
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(len, h, thickness || 0.08),
                    new THREE.MeshPhysicalMaterial({ color: color||0x8a7a65, roughness: 0.65, metalness: 0.02 })
                );
                wall.position.set((x1+x2)/2, h/2, (z1+z2)/2);
                wall.rotation.y = angle;
                interiorGroup.add(wall);
            }

            // --- Dome shell (wood, seen from inside) ---
            const domeGeo = new THREE.SphereGeometry(IR, 64, 32, 0, Math.PI*2, 0, Math.PI/2);
            interiorGroup.add(new THREE.Mesh(domeGeo, new THREE.MeshPhysicalMaterial({
                color: 0x9B8365, roughness: 0.7, metalness: 0.02, side: THREE.BackSide,
            })));

            // --- Structural ribs (8 wooden beams) ---
            const ribMat = new THREE.LineBasicMaterial({ color: 0xc8a87a, transparent: true, opacity: 0.4 });
            for (let i = 0; i < 8; i++) {
                const a = (i/8)*Math.PI*2;
                const pts = [];
                for (let t = 0; t <= 30; t++) {
                    const phi = (t/30)*Math.PI/2;
                    pts.push(new THREE.Vector3((IR-0.02)*Math.sin(phi)*Math.cos(a), (IR-0.02)*Math.cos(phi), (IR-0.02)*Math.sin(phi)*Math.sin(a)));
                }
                interiorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribMat));
            }

            // --- LED ring ---
            const ledRing = new THREE.Mesh(
                new THREE.TorusGeometry(IR*Math.sin(Math.PI*0.15), 0.015, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.6 })
            );
            ledRing.position.y = IR*Math.cos(Math.PI*0.15);
            ledRing.rotation.x = Math.PI/2;
            interiorGroup.add(ledRing);
            interiorGroup.add(Object.assign(new THREE.PointLight(0xffeedd, 0.4, 6), { position: new THREE.Vector3(0, 2.6, 0) }));

            // --- Floor (wood) ---
            interiorGroup.add(Object.assign(
                new THREE.Mesh(new THREE.CircleGeometry(IR-0.05, 64), new THREE.MeshPhysicalMaterial({ color: 0x8B7B5B, roughness: 0.75, metalness: 0.02 })),
                { rotation: { x: -Math.PI/2, y: 0, z: 0 }, position: { x:0, y:0.01, z:0 } }
            ));

            // --- ENTRY DOOR (z+ side) ---
            const doorW = 0.85, doorH = 2.1;
            const doorZ = Math.sqrt(IR*IR - (doorW/2)*(doorW/2)) * 0.98;
            const doorMat = new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.3 });
            interiorGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat), { position: new THREE.Vector3(0, doorH/2, doorZ) }));
            // Frame accent
            const afMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78 });
            [[-doorW/2-0.02, doorH/2, 0.03, doorH+0.04, 0.04], [doorW/2+0.02, doorH/2, 0.03, doorH+0.04, 0.04]].forEach(([x,y,w,h,d]) => {
                interiorGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), afMat), { position: new THREE.Vector3(x,y,doorZ) }));
            });

            // ===============================================
            // LAYOUT: North=z-, South=z+(door)
            //   Partition walls create clear rooms:
            //   Wall A: x=-0.5, from z=-IR to z=0.5  (separates bedroom+kitchen from center)
            //   Wall B: x=0.8, from z=-IR to z=-0.3  (separates bathroom)
            //   Wall C: z=-0.3, from x=0.8 to x=IR   (bathroom front wall)
            // Zones:
            //   Back-left (x<-0.5, z<0.5): Bedroom
            //   Front-left (x<-0.5, z>0.5): Kitchen
            //   Back-right (x>0.8, z<-0.3): Bathroom
            //   Center+Front-right: Living / Bureau / Salon
            // ===============================================

            // --- Partition walls ---
            // Wall A: bedroom/kitchen separator (vertical, x=-0.5)
            addWall(-0.5, -2.2, -0.5, 0.8, 2.2, 0.08, 0x8a7a65);
            // Wall B: bathroom left wall (vertical, x=0.8)
            addWall(0.8, -2.2, 0.8, -0.3, 2.2, 0.08, 0x8a7a65);
            // Wall C: bathroom front wall (horizontal, z=-0.3)
            addWall(0.8, -0.3, 2.2, -0.3, 2.2, 0.08, 0x8a7a65);
            // Kitchen/bedroom divider (horizontal at z=0.5, left side)
            addWall(-2.4, 0.5, -0.5, 0.5, 1.4, 0.08, 0x8a7a65);

            // === BEDROOM (back-left: x<-0.5, z<0.5) ===
            // Bed 140x200cm (1.4m x 2.0m) — head against back wall (z-)
            // Center of bed at x=-1.5, z=-1.2, aligned with z-axis
            const bedX = -1.5, bedZ = -1.2;
            // Frame
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.10, 2.0),
                new THREE.MeshPhysicalMaterial({ color: 0x5a4a3a, roughness: 0.7 })
            ), { position: new THREE.Vector3(bedX, 0.05, bedZ) }));
            // Mattress (1.35 x 1.95)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.35, 0.15, 1.95),
                new THREE.MeshPhysicalMaterial({ color: 0xeee8dd, roughness: 0.9 })
            ), { position: new THREE.Vector3(bedX, 0.175, bedZ) }));
            // Pillows (0.4x0.08x0.25 each)
            [[-0.3, -0.85], [0.3, -0.85]].forEach(([dx, dz]) => {
                interiorGroup.add(Object.assign(new THREE.Mesh(
                    new THREE.BoxGeometry(0.4, 0.08, 0.25),
                    new THREE.MeshPhysicalMaterial({ color: 0xfff8f0, roughness: 0.95 })
                ), { position: new THREE.Vector3(bedX+dx, 0.29, bedZ+dz) }));
            });
            // Nightstand (0.4x0.5x0.35)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.5, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0x7B6B4B, roughness: 0.6 })
            ), { position: new THREE.Vector3(bedX+0.9, 0.25, bedZ-0.7) }));

            // === KITCHEN (front-left: x<-0.5, z>0.5) ===
            // Counter along the back wall (z=0.55), L-shape
            const cH = 0.90; // standard counter height 90cm
            // Main counter along z=0.55, from x=-2.3 to x=-0.6
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.6, cH, 0.55),
                new THREE.MeshPhysicalMaterial({ color: 0x888070, roughness: 0.3, metalness: 0.15 })
            ), { position: new THREE.Vector3(-1.4, cH/2, 0.85) }));
            // Counter top
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.65, 0.03, 0.6),
                new THREE.MeshPhysicalMaterial({ color: 0xbbb8aa, roughness: 0.12, metalness: 0.25 })
            ), { position: new THREE.Vector3(-1.4, cH+0.015, 0.85) }));
            // L-part along left dome wall
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.55, cH, 1.0),
                new THREE.MeshPhysicalMaterial({ color: 0x888070, roughness: 0.3, metalness: 0.15 })
            ), { position: new THREE.Vector3(-2.0, cH/2, 1.4) }));
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.03, 1.05),
                new THREE.MeshPhysicalMaterial({ color: 0xbbb8aa, roughness: 0.12, metalness: 0.25 })
            ), { position: new THREE.Vector3(-2.0, cH+0.015, 1.4) }));
            // Sink (on main counter)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.1 })
            ), { position: new THREE.Vector3(-1.1, cH+0.04, 0.85) }));
            // Burners (on L-part)
            [[-1.85, 1.2], [-2.1, 1.2]].forEach(([x,z]) => {
                interiorGroup.add(Object.assign(new THREE.Mesh(
                    new THREE.TorusGeometry(0.07, 0.012, 8, 20),
                    new THREE.MeshBasicMaterial({ color: 0x333333 })
                ), { rotation: {x:Math.PI/2,y:0,z:0}, position: new THREE.Vector3(x, cH+0.04, z) }));
            });
            // Small fridge (0.5x0.85x0.5)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.85, 0.5),
                new THREE.MeshPhysicalMaterial({ color: 0xdddddd, metalness: 0.25, roughness: 0.2 })
            ), { position: new THREE.Vector3(-0.75, 0.425, 0.85) }));

            // === BATHROOM (back-right: x>0.8, z<-0.3) ===
            // Shower base (0.8x0.8 square at back-right corner)
            const shX = 1.6, shZ = -1.5;
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.04, 0.8),
                new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.15 })
            ), { position: new THREE.Vector3(shX, 0.02, shZ) }));
            // Shower glass partition (L-shape, 2 panels)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 2.0, 0.8),
                new THREE.MeshPhysicalMaterial({ color: 0x88ccee, transparent: true, opacity: 0.2, roughness: 0, metalness: 0.1 })
            ), { position: new THREE.Vector3(shX-0.4, 1.0, shZ) }));
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 2.0, 0.03),
                new THREE.MeshPhysicalMaterial({ color: 0x88ccee, transparent: true, opacity: 0.2, roughness: 0, metalness: 0.1 })
            ), { position: new THREE.Vector3(shX, 1.0, shZ+0.4) }));
            // Shower head
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 10, 10),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8 })
            ), { position: new THREE.Vector3(shX+0.15, 1.95, shZ-0.15) }));
            // Pipe
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 1.95, 6),
                new THREE.MeshPhysicalMaterial({ color: 0xbbbbbb, metalness: 0.7 })
            ), { position: new THREE.Vector3(shX+0.15, 0.975, shZ-0.35) }));
            // WC (0.35x0.40x0.50)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.40, 0.50),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.25 })
            ), { position: new THREE.Vector3(1.5, 0.20, -0.65) }));
            // WC tank
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.33, 0.30, 0.12),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.25 })
            ), { position: new THREE.Vector3(1.5, 0.55, -0.85) }));
            // Bathroom sink (wall-mounted, 0.45x0.12x0.35)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.45, 0.08, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0, roughness: 0.2 })
            ), { position: new THREE.Vector3(1.8, 0.82, -0.38) }));
            // Mirror
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.45, 0.02),
                new THREE.MeshPhysicalMaterial({ color: 0xbbddee, roughness: 0, metalness: 0.85 })
            ), { position: new THREE.Vector3(1.8, 1.3, -0.32) }));

            // === LIVING + DESK (center, front-right area) ===
            // Desk 100x55cm at center-right
            const dkX = 0.2, dkZ = -0.8;
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.03, 0.55),
                new THREE.MeshPhysicalMaterial({ color: 0x9B8365, roughness: 0.4 })
            ), { position: new THREE.Vector3(dkX, 0.74, dkZ) }));
            // Desk legs (4)
            const dlMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, metalness: 0.4 });
            [[-0.45,-0.22],[0.45,-0.22],[-0.45,0.22],[0.45,0.22]].forEach(([dx,dz]) => {
                interiorGroup.add(Object.assign(new THREE.Mesh(
                    new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), dlMat
                ), { position: new THREE.Vector3(dkX+dx, 0.36, dkZ+dz) }));
            });
            // Chair (0.42x0.42 seat at h=0.45)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.04, 0.40),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.5 })
            ), { position: new THREE.Vector3(dkX, 0.45, dkZ+0.45) }));
            // Chair back
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.35, 0.03),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.5 })
            ), { position: new THREE.Vector3(dkX, 0.645, dkZ+0.65) }));

            // === SALON (front area, z>0.5, right of door) ===
            // 2-seater sofa 140x75cm, seat h=40cm
            const sfX = 1.2, sfZ = 1.3;
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.38, 0.65),
                new THREE.MeshPhysicalMaterial({ color: 0x4a5a4a, roughness: 0.75 })
            ), { position: new THREE.Vector3(sfX, 0.19, sfZ) }));
            // Sofa backrest
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.30, 0.10),
                new THREE.MeshPhysicalMaterial({ color: 0x4a5a4a, roughness: 0.75 })
            ), { position: new THREE.Vector3(sfX, 0.53, sfZ+0.28) }));
            // Cushions
            const cuMat = new THREE.MeshPhysicalMaterial({ color: 0x6a8a6a, roughness: 0.85 });
            [[sfX-0.32, sfZ], [sfX+0.32, sfZ]].forEach(([cx,cz]) => {
                interiorGroup.add(Object.assign(new THREE.Mesh(
                    new THREE.BoxGeometry(0.58, 0.06, 0.55), cuMat
                ), { position: new THREE.Vector3(cx, 0.41, cz) }));
            });
            // Coffee table (round, d=50cm, h=35cm)
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20),
                new THREE.MeshPhysicalMaterial({ color: 0x9B8365, roughness: 0.4 })
            ), { position: new THREE.Vector3(sfX-0.9, 0.35, sfZ) }));
            interiorGroup.add(Object.assign(new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.05, 0.32, 10),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: 0.4 })
            ), { position: new THREE.Vector3(sfX-0.9, 0.165, sfZ) }));

            // --- Lights ---
            interiorGroup.add(Object.assign(new THREE.SpotLight(0x88bbff, 0.35, 7, Math.PI*0.4), { position: new THREE.Vector3(0.5, 2.2, 2.2) }));
            interiorGroup.add(Object.assign(new THREE.PointLight(0xffeedd, 0.3, 5), { position: new THREE.Vector3(0, 2.5, 0) }));

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
            // PARTITION WALLS — matching interior layout exactly
            // Wall A: x=-0.5, z=-2.2 to z=0.5
            // Wall B: x=0.8, z=-2.2 to z=-0.3
            // Wall C: z=-0.3, x=0.8 to x=2.2
            // Kitchen divider: z=0.5, x=-2.4 to x=-0.5
            // ===============================================
            const wallColor = 0xccbbaa;
            addPartition(-0.5, -2.2, -0.5, 0.5, wallColor);   // Wall A
            addPartition(0.8, -2.2, 0.8, -0.3, wallColor);    // Wall B
            addPartition(0.8, -0.3, 2.2, -0.3, wallColor);    // Wall C
            addPartition(-2.4, 0.5, -0.5, 0.5, wallColor);    // Kitchen divider

            // --- BEDROOM zone (back-left: x<-0.5, z<0.5) ---
            addZoneRect(-1.5, -1.0, 1.8, 2.4, 0xc896ff, 0.06);
            // Bed 140x200 at x=-1.5, z=-1.2
            addFurniturePlan(-1.5, -1.2, 1.4, 2.0, 0xc896ff, 0.15);
            // Nightstand
            addFurniturePlan(-0.6, -1.9, 0.35, 0.35, 0xc896ff, 0.12);

            // --- KITCHEN zone (front-left: x<-0.5, z>0.5) ---
            addZoneRect(-1.5, 1.2, 1.8, 1.4, 0xffc832, 0.06);
            // Main counter along z=0.85
            addFurniturePlan(-1.4, 0.85, 1.6, 0.55, 0xffc832, 0.15);
            // L-part along dome wall
            addFurniturePlan(-2.0, 1.4, 0.55, 1.0, 0xffc832, 0.15);
            // Sink circle
            const sinkPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.08, 0.12, 16),
                new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
            );
            sinkPlan.rotation.x = -Math.PI / 2;
            sinkPlan.position.set(-1.1, 0.015, 0.85);
            floorplanGroup.add(sinkPlan);
            // Burners
            [[-1.85, 1.2], [-2.1, 1.2]].forEach(([x, z]) => {
                const b = new THREE.Mesh(
                    new THREE.RingGeometry(0.06, 0.08, 12),
                    new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
                );
                b.rotation.x = -Math.PI / 2;
                b.position.set(x, 0.015, z);
                floorplanGroup.add(b);
            });
            // Fridge
            addFurniturePlan(-0.75, 0.85, 0.5, 0.5, 0xffc832, 0.12);

            // --- BATHROOM zone (back-right: x>0.8, z<-0.3) ---
            addZoneRect(1.5, -1.2, 1.3, 1.8, 0x64b4ff, 0.06);
            // Shower 80x80 at x=1.6, z=-1.5
            const showerPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.35, 24),
                new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            showerPlan.rotation.x = -Math.PI / 2;
            showerPlan.position.set(1.6, 0.015, -1.5);
            floorplanGroup.add(showerPlan);
            // WC at x=1.5, z=-0.65
            addFurniturePlan(1.5, -0.65, 0.35, 0.50, 0x64b4ff, 0.15);
            // Bathroom sink at x=1.8, z=-0.38
            addFurniturePlan(1.8, -0.38, 0.45, 0.35, 0x64b4ff, 0.12);

            // --- LIVING/DESK zone (center) ---
            addZoneRect(0.15, -0.5, 1.2, 1.2, 0xa8ff78, 0.04);
            // Desk 100x55 at x=0.2, z=-0.8
            addFurniturePlan(0.2, -0.8, 1.0, 0.55, 0xa8ff78, 0.15);
            // Chair circle
            const chairPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.12, 0.16, 12),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            chairPlan.rotation.x = -Math.PI / 2;
            chairPlan.position.set(0.2, 0.015, -0.35);
            floorplanGroup.add(chairPlan);

            // --- SALON zone (front-right, z>0.5, right of door) ---
            addZoneRect(1.2, 1.3, 1.6, 1.2, 0x7acc5a, 0.05);
            // Sofa 140x65 at x=1.2, z=1.3
            addFurniturePlan(1.2, 1.3, 1.4, 0.65, 0x7acc5a, 0.15);
            // Coffee table (round d=50)
            const ctPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.20, 0.25, 16),
                new THREE.MeshBasicMaterial({ color: 0x7acc5a, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            ctPlan.rotation.x = -Math.PI / 2;
            ctPlan.position.set(0.3, 0.015, 1.3);
            floorplanGroup.add(ctPlan);

            // --- Door opening (front center, z+ side) ---
            const doorSwing = [];
            for (let i = 0; i <= 12; i++) {
                const a = (i / 12) * Math.PI * 0.5;
                doorSwing.push(new THREE.Vector3(
                    -0.42 + 0.85 * Math.sin(a),
                    0.015,
                    R - 0.85 * (1 - Math.cos(a))
                ));
            }
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(doorSwing),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.3 })
            ));

            // Entry marker
            const entryDot = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78 })
            );
            entryDot.position.set(0, 0.02, R);
            floorplanGroup.add(entryDot);
            // Arrow
            const arrowPts = [
                new THREE.Vector3(-0.15, 0.02, R + 0.3),
                new THREE.Vector3(0, 0.02, R + 0.05),
                new THREE.Vector3(0.15, 0.02, R + 0.3),
            ];
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(arrowPts),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.6 })
            ));

            // --- Zone labels (positioned at zone centers) ---
            floorplanGroup.add(createLabel('CHAMBRE', -1.5, 0.1, -1.0, 0xc896ff, 18));
            floorplanGroup.add(createLabel('6.2m²', -1.5, 0.05, -0.6, 0xc896ff, 14));
            floorplanGroup.add(createLabel('CUISINE', -1.5, 0.1, 1.2, 0xffc832, 18));
            floorplanGroup.add(createLabel('4.8m²', -1.5, 0.05, 1.6, 0xffc832, 14));
            floorplanGroup.add(createLabel("SALLE D'EAU", 1.5, 0.1, -1.2, 0x64b4ff, 16));
            floorplanGroup.add(createLabel('3.0m²', 1.5, 0.05, -0.8, 0x64b4ff, 14));
            floorplanGroup.add(createLabel('BUREAU', 0.15, 0.1, -0.5, 0xa8ff78, 18));
            floorplanGroup.add(createLabel('3.5m²', 0.15, 0.05, -0.1, 0xa8ff78, 14));
            floorplanGroup.add(createLabel('SALON', 1.2, 0.1, 1.3, 0x7acc5a, 18));
            floorplanGroup.add(createLabel('4.5m²', 1.2, 0.05, 1.7, 0x7acc5a, 14));
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

        // ===================================================================
        // ===== REALISTIC VIEW — Textured surfaces =====
        // ===================================================================
        (function buildRealistic() {
            // Create procedural textures using canvas

            // Wood texture
            function createWoodTexture() {
                const c = document.createElement('canvas');
                c.width = 512; c.height = 512;
                const ctx = c.getContext('2d');
                // Base wood color
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(0, 0, 512, 512);
                // Wood grain lines
                for (let i = 0; i < 60; i++) {
                    const y = Math.random() * 512;
                    ctx.strokeStyle = `rgba(${100 + Math.random()*40}, ${80 + Math.random()*30}, ${50 + Math.random()*20}, ${0.15 + Math.random()*0.2})`;
                    ctx.lineWidth = 0.5 + Math.random() * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    for (let x = 0; x < 512; x += 10) {
                        ctx.lineTo(x, y + Math.sin(x * 0.02) * 3 + (Math.random() - 0.5) * 2);
                    }
                    ctx.stroke();
                }
                // Knots
                for (let k = 0; k < 3; k++) {
                    const kx = Math.random() * 512, ky = Math.random() * 512;
                    const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, 15 + Math.random() * 10);
                    grad.addColorStop(0, 'rgba(80, 55, 30, 0.5)');
                    grad.addColorStop(1, 'rgba(80, 55, 30, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(kx - 25, ky - 25, 50, 50);
                }
                const tex = new THREE.CanvasTexture(c);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                return tex;
            }

            // Floor wood texture (lighter, plank-like)
            function createFloorTexture() {
                const c = document.createElement('canvas');
                c.width = 512; c.height = 512;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#A08B6B';
                ctx.fillRect(0, 0, 512, 512);
                // Planks
                const plankH = 64;
                for (let p = 0; p < 8; p++) {
                    const py = p * plankH;
                    ctx.strokeStyle = 'rgba(60, 45, 25, 0.3)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, py);
                    ctx.lineTo(512, py);
                    ctx.stroke();
                    // Grain within plank
                    for (let g = 0; g < 12; g++) {
                        const gy = py + Math.random() * plankH;
                        ctx.strokeStyle = `rgba(${90 + Math.random()*30}, ${75 + Math.random()*20}, ${45 + Math.random()*15}, ${0.1 + Math.random()*0.15})`;
                        ctx.lineWidth = 0.3 + Math.random();
                        ctx.beginPath();
                        ctx.moveTo(0, gy);
                        for (let x = 0; x < 512; x += 8) {
                            ctx.lineTo(x, gy + Math.sin(x * 0.015 + p) * 2);
                        }
                        ctx.stroke();
                    }
                }
                const tex = new THREE.CanvasTexture(c);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(3, 3);
                return tex;
            }

            // Concrete/composite exterior texture
            function createExteriorTexture() {
                const c = document.createElement('canvas');
                c.width = 512; c.height = 512;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#3a3a35';
                ctx.fillRect(0, 0, 512, 512);
                for (let i = 0; i < 3000; i++) {
                    const x = Math.random() * 512, y = Math.random() * 512;
                    ctx.fillStyle = `rgba(${180 + Math.random()*40}, ${175 + Math.random()*40}, ${165 + Math.random()*30}, ${0.02 + Math.random()*0.04})`;
                    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
                }
                const tex = new THREE.CanvasTexture(c);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(2, 2);
                return tex;
            }

            const woodTex = createWoodTexture();
            const floorTex = createFloorTexture();
            const extTex = createExteriorTexture();

            const innerR = DOME_R - WALL_THICKNESS;

            // Exterior dome (composite finish)
            const extDomeGeo = new THREE.SphereGeometry(DOME_R, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const extDomeMat = new THREE.MeshPhysicalMaterial({
                map: extTex,
                roughness: 0.5,
                metalness: 0.15,
                side: THREE.FrontSide,
            });
            realisticGroup.add(new THREE.Mesh(extDomeGeo, extDomeMat));

            // Inner dome (wood)
            const inDomeGeo = new THREE.SphereGeometry(innerR, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const inDomeMat = new THREE.MeshPhysicalMaterial({
                map: woodTex,
                roughness: 0.7,
                metalness: 0.02,
                side: THREE.BackSide,
            });
            realisticGroup.add(new THREE.Mesh(inDomeGeo, inDomeMat));

            // Wood floor
            const floorGeo = new THREE.CircleGeometry(innerR - 0.1, 64);
            const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshPhysicalMaterial({
                map: floorTex, roughness: 0.7, metalness: 0.02,
            }));
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.y = 0.01;
            realisticGroup.add(floorMesh);

            // Panoramic window (glass with realistic reflection)
            const winGeo = new THREE.SphereGeometry(DOME_R + 0.005, 48, 24,
                -Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.15, Math.PI * 0.35);
            const winMat = new THREE.MeshPhysicalMaterial({
                color: 0xaaddff, transparent: true, opacity: 0.35,
                roughness: 0.0, metalness: 0.15,
                side: THREE.DoubleSide,
            });
            realisticGroup.add(new THREE.Mesh(winGeo, winMat));

            // Solar panels on top (dark blue realistic)
            const solarGeo = new THREE.SphereGeometry(DOME_R + 0.02, 32, 8, 0, Math.PI * 2, 0, Math.PI * 0.22);
            const solarMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a1a40, roughness: 0.08, metalness: 0.9, side: THREE.DoubleSide,
            });
            realisticGroup.add(new THREE.Mesh(solarGeo, solarMat));

            // Base platform
            const baseGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.35, 48);
            const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x333333, roughness: 0.35, metalness: 0.7 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = -0.175;
            realisticGroup.add(base);

            // Door (realistic dark wood)
            const doorGeo = new THREE.BoxGeometry(0.9, 2.0, 0.08);
            const doorMat = new THREE.MeshPhysicalMaterial({ color: 0x4a3a2a, roughness: 0.6, metalness: 0.05 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, 1.0, DOME_R - 0.03);
            realisticGroup.add(door);
            // Handle
            const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
            const handle = new THREE.Mesh(handleGeo, new THREE.MeshPhysicalMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 }));
            handle.rotation.x = Math.PI / 2;
            handle.position.set(0.3, 1.0, DOME_R + 0.02);
            realisticGroup.add(handle);

            // Step
            const stepMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.08, 0.6),
                new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.5 })
            );
            stepMesh.position.set(0, -0.04, DOME_R + 0.25);
            realisticGroup.add(stepMesh);

            // Interior furniture — matching new layout exactly
            // Partition walls (visible through window)
            const rWallMat = new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.65, metalness: 0.02 });
            // Wall A: x=-0.5
            const rWallA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 3.0), rWallMat);
            rWallA.position.set(-0.5, 1.1, -0.7);
            realisticGroup.add(rWallA);
            // Wall B: x=0.8
            const rWallB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.9), rWallMat);
            rWallB.position.set(0.8, 1.1, -1.25);
            realisticGroup.add(rWallB);
            // Wall C: z=-0.3
            const rWallC = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.08), rWallMat);
            rWallC.position.set(1.5, 1.1, -0.3);
            realisticGroup.add(rWallC);

            // Bed 140x200 at x=-1.5, z=-1.2 (bedroom back-left)
            const mattressMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f0e8, roughness: 0.95 });
            const bedFrame = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.10, 2.0),
                new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.6 })
            );
            bedFrame.position.set(-1.5, 0.05, -1.2);
            realisticGroup.add(bedFrame);
            const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.15, 1.95), mattressMat);
            mattress.position.set(-1.5, 0.175, -1.2);
            realisticGroup.add(mattress);

            // Kitchen counter (front-left, along z=0.85)
            const counterMat = new THREE.MeshPhysicalMaterial({ color: 0xaaa89a, roughness: 0.15, metalness: 0.35 });
            const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.90, 0.55), counterMat);
            counter.position.set(-1.4, 0.45, 0.85);
            realisticGroup.add(counter);
            // Counter top
            const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.03, 0.6),
                new THREE.MeshPhysicalMaterial({ color: 0xbbb8aa, roughness: 0.12, metalness: 0.25 }));
            counterTop.position.set(-1.4, 0.915, 0.85);
            realisticGroup.add(counterTop);

            // Sofa 140x65 (front-right, x=1.2, z=1.3)
            const sofaMat = new THREE.MeshPhysicalMaterial({ color: 0x5a6a5a, roughness: 0.8 });
            const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.65), sofaMat);
            sofa.position.set(1.2, 0.19, 1.3);
            realisticGroup.add(sofa);
            // Sofa backrest
            const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.30, 0.10), sofaMat);
            sofaBack.position.set(1.2, 0.53, 1.58);
            realisticGroup.add(sofaBack);

            // Coffee table (round d=50, in front of sofa)
            const ctTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20),
                new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.4 }));
            ctTop.position.set(0.3, 0.35, 1.3);
            realisticGroup.add(ctTop);

            // Desk 100x55 at center (x=0.2, z=-0.8)
            const deskMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.03, 0.55),
                new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.4 })
            );
            deskMesh.position.set(0.2, 0.74, -0.8);
            realisticGroup.add(deskMesh);

            // Ground
            const groundGeo = new THREE.PlaneGeometry(24, 24);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.9 });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.35;
            realisticGroup.add(ground);

            // Warm interior lighting
            const warmInterior = new THREE.PointLight(0xffeedd, 0.5, 6);
            warmInterior.position.set(0, 2.2, 0);
            realisticGroup.add(warmInterior);
            // Window light
            const windowLight = new THREE.SpotLight(0x88bbff, 0.3, 8, Math.PI * 0.4);
            windowLight.position.set(1, 2.5, 2.5);
            windowLight.target.position.set(0, 0, 0);
            realisticGroup.add(windowLight);
            realisticGroup.add(windowLight.target);

            realisticGroup.visible = false;
            scene.add(realisticGroup);
        })();

        // ---- View switching ----
        function switchView(view) {
            currentView = view;
            exteriorGroup.visible = (view === 'exterior');
            interiorGroup.visible = (view === 'interior');
            floorplanGroup.visible = (view === 'floorplan');
            explodedGroup.visible = (view === 'exploded');
            realisticGroup.visible = (view === 'realistic');

            // Adjust lighting per view
            ambientLight.intensity = (view === 'interior') ? 0.15 : (view === 'realistic') ? 0.4 : 0.35;
            dirLight.intensity = (view === 'floorplan') ? 0.2 : 0.9;

            // Camera positions
            if (view === 'exterior') {
                camera.position.set(0, 3, 8);
                controls.target.set(0, 1.2, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
                controls.autoRotate = true;
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
            } else if (view === 'realistic') {
                camera.position.set(4, 3, 6);
                controls.target.set(0, 1, 0);
                controls.maxPolarAngle = Math.PI * 0.85;
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.4;
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
