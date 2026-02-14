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
            // Geodesic wireframe
            const icoGeo = new THREE.IcosahedronGeometry(DOME_R, 2);
            const pos = icoGeo.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                if (pos[i + 1] < -0.05) pos[i + 1] = -0.05;
            }
            const wireframe = new THREE.WireframeGeometry(icoGeo);
            const wireMat = new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2 });
            exteriorGroup.add(new THREE.LineSegments(wireframe, wireMat));

            // Solid translucent dome shell
            const domeGeo = new THREE.SphereGeometry(DOME_R - 0.02, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a2a15, transparent: true, opacity: 0.12,
                roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide,
            });
            exteriorGroup.add(new THREE.Mesh(domeGeo, domeMat));

            // Large panoramic window (front-facing, wider)
            const winGeo = new THREE.SphereGeometry(DOME_R + 0.01, 48, 24,
                -Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.15, Math.PI * 0.35);
            const winMat = new THREE.MeshPhysicalMaterial({
                color: 0x78d4ff, transparent: true, opacity: 0.3,
                roughness: 0.0, metalness: 0.1, side: THREE.DoubleSide,
            });
            exteriorGroup.add(new THREE.Mesh(winGeo, winMat));
            // Window frame lines
            const winFrameMat = new THREE.LineBasicMaterial({ color: 0x78d4ff, transparent: true, opacity: 0.4 });
            for (let i = 0; i <= 4; i++) {
                const pts = [];
                const theta = -Math.PI * 0.25 + (i / 4) * Math.PI * 0.5;
                for (let j = 0; j <= 16; j++) {
                    const phi = Math.PI * 0.15 + (j / 16) * Math.PI * 0.35;
                    const r = DOME_R + 0.015;
                    pts.push(new THREE.Vector3(
                        r * Math.sin(phi) * Math.cos(theta),
                        r * Math.cos(phi),
                        r * Math.sin(phi) * Math.sin(theta)
                    ));
                }
                const geo = new THREE.BufferGeometry().setFromPoints(pts);
                exteriorGroup.add(new THREE.Line(geo, winFrameMat));
            }

            // Solar panels on top
            const solarGeo = new THREE.SphereGeometry(DOME_R + 0.02, 32, 8, 0, Math.PI * 2, 0, Math.PI * 0.22);
            const solarMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a1a35, transparent: true, opacity: 0.6,
                roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide,
            });
            exteriorGroup.add(new THREE.Mesh(solarGeo, solarMat));

            // Solar panel grid lines
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const pts = [];
                for (let t = 0; t <= 10; t++) {
                    const phi = (t / 10) * Math.PI * 0.22;
                    const r = DOME_R + 0.025;
                    pts.push(new THREE.Vector3(
                        r * Math.sin(phi) * Math.cos(angle),
                        r * Math.cos(phi),
                        r * Math.sin(phi) * Math.sin(angle)
                    ));
                }
                const geo = new THREE.BufferGeometry().setFromPoints(pts);
                const mat = new THREE.LineBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.35 });
                exteriorGroup.add(new THREE.Line(geo, mat));
            }
            // Concentric solar rings
            for (let r = 0; r < 3; r++) {
                const phi = Math.PI * 0.06 + r * Math.PI * 0.06;
                const pts = [];
                const ringR = (DOME_R + 0.025) * Math.sin(phi);
                const ringY = (DOME_R + 0.025) * Math.cos(phi);
                for (let i = 0; i <= 48; i++) {
                    const a = (i / 48) * Math.PI * 2;
                    pts.push(new THREE.Vector3(ringR * Math.cos(a), ringY, ringR * Math.sin(a)));
                }
                const geo = new THREE.BufferGeometry().setFromPoints(pts);
                exteriorGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.2 })));
            }

            // Base platform
            const baseGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.35, 48);
            const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = -0.175;
            base.castShadow = true;
            base.receiveShadow = true;
            exteriorGroup.add(base);

            // === ENTRY DOOR (clearly visible) ===
            // Door recess in dome
            const doorW = 0.9, doorH = 2.0;
            const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12);
            const doorMat = new THREE.MeshPhysicalMaterial({
                color: 0x333333, roughness: 0.3, metalness: 0.5,
            });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, doorH / 2, DOME_R - 0.05);
            exteriorGroup.add(door);

            // Door frame (bright accent)
            const frameMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78 });
            // Left frame
            const fl = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH + 0.06, 0.06), frameMat);
            fl.position.set(-doorW / 2 - 0.02, doorH / 2, DOME_R - 0.02);
            exteriorGroup.add(fl);
            // Right frame
            const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH + 0.06, 0.06), frameMat);
            fr.position.set(doorW / 2 + 0.02, doorH / 2, DOME_R - 0.02);
            exteriorGroup.add(fr);
            // Top frame
            const ft = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, 0.04, 0.06), frameMat);
            ft.position.set(0, doorH + 0.02, DOME_R - 0.02);
            exteriorGroup.add(ft);

            // Door handle
            const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
            const handle = new THREE.Mesh(handleGeo, new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }));
            handle.rotation.x = Math.PI / 2;
            handle.position.set(0.3, doorH * 0.5, DOME_R + 0.02);
            exteriorGroup.add(handle);

            // Door step/landing
            const stepGeo = new THREE.BoxGeometry(1.4, 0.08, 0.6);
            const stepMat = new THREE.MeshPhysicalMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.4 });
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(0, -0.04, DOME_R + 0.25);
            exteriorGroup.add(step);

            // Accent light above door
            const doorLight = new THREE.PointLight(0xa8ff78, 0.6, 3);
            doorLight.position.set(0, doorH + 0.3, DOME_R + 0.1);
            exteriorGroup.add(doorLight);

            // Ground plane
            const groundGeo = new THREE.PlaneGeometry(24, 24);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.35;
            ground.receiveShadow = true;
            exteriorGroup.add(ground);

            scene.add(exteriorGroup);
        })();

        // ===================================================================
        // ===== INTERIOR VIEW — Properly laid out =====
        // ===================================================================
        (function buildInterior() {
            const innerR = DOME_R - WALL_THICKNESS;

            // Inner dome shell (wood tones, seen from inside)
            const innerDomeGeo = new THREE.SphereGeometry(innerR, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const innerDomeMat = new THREE.MeshPhysicalMaterial({
                color: 0x8B7355, roughness: 0.75, metalness: 0.02, side: THREE.BackSide,
            });
            interiorGroup.add(new THREE.Mesh(innerDomeGeo, innerDomeMat));

            // Structural ribs (12 wooden ribs)
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const pts = [];
                for (let t = 0; t <= 40; t++) {
                    const phi = (t / 40) * Math.PI / 2;
                    const r = innerR - 0.02;
                    pts.push(new THREE.Vector3(
                        r * Math.sin(phi) * Math.cos(angle),
                        r * Math.cos(phi),
                        r * Math.sin(phi) * Math.sin(angle)
                    ));
                }
                const geo = new THREE.BufferGeometry().setFromPoints(pts);
                interiorGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc8a87a, transparent: true, opacity: 0.5 })));
            }

            // LED light rings (3 concentric at different heights)
            const ledData = [
                { color: 0xa8ff78, phi: Math.PI * 0.1 },
                { color: 0xffb347, phi: Math.PI * 0.22 },
                { color: 0x78d4ff, phi: Math.PI * 0.34 },
            ];
            ledData.forEach(d => {
                const rr = innerR * Math.sin(d.phi);
                const yy = innerR * Math.cos(d.phi);
                // Solid ring
                const ringGeo = new THREE.TorusGeometry(rr, 0.02, 8, 64);
                const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.7 }));
                ring.position.y = yy;
                ring.rotation.x = Math.PI / 2;
                interiorGroup.add(ring);
                // Glow ring
                const glow = new THREE.Mesh(
                    new THREE.TorusGeometry(rr, 0.1, 8, 64),
                    new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.06 })
                );
                glow.position.y = yy;
                glow.rotation.x = Math.PI / 2;
                interiorGroup.add(glow);
                // Point light for each ring
                const pl = new THREE.PointLight(d.color, 0.15, 5);
                pl.position.set(0, yy, 0);
                interiorGroup.add(pl);
            });

            // Floor (wooden planks look)
            const floorGeo = new THREE.CircleGeometry(innerR - 0.1, 64);
            const floorMat = new THREE.MeshPhysicalMaterial({ color: 0x6B5B45, roughness: 0.8, metalness: 0.02 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = 0.01;
            floor.receiveShadow = true;
            interiorGroup.add(floor);

            // === ENTRY DOOR (visible from inside, front/south, z+) ===
            const doorW = 0.9, doorH = 2.0;
            const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.08);
            const doorMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.4 });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, doorH / 2, innerR - 0.04);
            interiorGroup.add(door);
            // Door frame accent
            const dfMat = new THREE.MeshBasicMaterial({ color: 0xa8ff78 });
            const dfl = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH + 0.04, 0.04), dfMat);
            dfl.position.set(-doorW / 2 - 0.02, doorH / 2, innerR - 0.02);
            interiorGroup.add(dfl);
            const dfr = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH + 0.04, 0.04), dfMat);
            dfr.position.set(doorW / 2 + 0.02, doorH / 2, innerR - 0.02);
            interiorGroup.add(dfr);

            // ---- ZONE LAYOUT ----
            // The dome is circular, radius ~2.85m. We place furniture against the curved walls.
            // Front (z+): Entry door, hallway
            // Left-front (z+,x-): Kitchen along the wall
            // Right-front (z+,x+): Salon/Living with sofa against wall
            // Back-left (z-,x-): Bedroom (bed against the far wall)
            // Back-right (z-,x+): Bathroom (shower cabin + toilet + sink)
            // Center: Desk/Bureau (open space)
            // Under floor (conceptual): Technical area

            // === BEDROOM — back-left sector, bed against curved wall ===
            // Bed: 160x200cm = 1.6m x 2.0m in Three.js
            const bedBase = new THREE.Mesh(
                new THREE.BoxGeometry(1.6, 0.12, 2.0),
                new THREE.MeshPhysicalMaterial({ color: 0x5a4a3a, roughness: 0.7 })
            );
            bedBase.position.set(-1.1, 0.06, -1.4);
            bedBase.rotation.y = Math.PI * 0.15;
            interiorGroup.add(bedBase);
            // Mattress
            const mattress = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.18, 1.9),
                new THREE.MeshPhysicalMaterial({ color: 0xddd8d0, roughness: 0.9 })
            );
            mattress.position.set(-1.1, 0.21, -1.4);
            mattress.rotation.y = Math.PI * 0.15;
            interiorGroup.add(mattress);
            // Pillows
            const pillowGeo = new THREE.BoxGeometry(0.45, 0.1, 0.3);
            const pillowMat = new THREE.MeshPhysicalMaterial({ color: 0xeee8e0, roughness: 0.95 });
            const p1 = new THREE.Mesh(pillowGeo, pillowMat);
            p1.position.set(-1.4, 0.35, -2.2);
            p1.rotation.y = Math.PI * 0.15;
            interiorGroup.add(p1);
            const p2 = new THREE.Mesh(pillowGeo, pillowMat);
            p2.position.set(-0.85, 0.35, -2.15);
            p2.rotation.y = Math.PI * 0.15;
            interiorGroup.add(p2);
            // Bedside table
            const nightstand = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.45, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0x6B5B45, roughness: 0.6 })
            );
            nightstand.position.set(-2.15, 0.225, -0.9);
            interiorGroup.add(nightstand);

            // Bedroom partition wall (curved, from bedroom to separate from center)
            const bedWall = createCurvedWall(Math.PI * 1.0, Math.PI * 1.15, 1.8, innerR * 0.45, 0x7a6a55, 0.5);
            interiorGroup.add(bedWall);

            // === KITCHEN — left-front, counter along the wall ===
            // Kitchen counter (L-shaped along dome wall)
            const counterH = 0.85;
            // Main counter segment along wall
            const counter1 = new THREE.Mesh(
                new THREE.BoxGeometry(1.8, counterH, 0.55),
                new THREE.MeshPhysicalMaterial({ color: 0x888070, roughness: 0.3, metalness: 0.2 })
            );
            counter1.position.set(-1.8, counterH / 2, 1.2);
            counter1.rotation.y = Math.PI * 0.3;
            interiorGroup.add(counter1);
            // Counter top (slightly lighter)
            const counterTop = new THREE.Mesh(
                new THREE.BoxGeometry(1.85, 0.04, 0.6),
                new THREE.MeshPhysicalMaterial({ color: 0xaaa89a, roughness: 0.15, metalness: 0.3 })
            );
            counterTop.position.set(-1.8, counterH + 0.02, 1.2);
            counterTop.rotation.y = Math.PI * 0.3;
            interiorGroup.add(counterTop);
            // Sink (small cylinder cutout indication)
            const sinkGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16);
            const sinkMat = new THREE.MeshPhysicalMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.1 });
            const sink = new THREE.Mesh(sinkGeo, sinkMat);
            sink.position.set(-1.5, counterH + 0.05, 1.0);
            interiorGroup.add(sink);
            // Cooktop (2 burner rings)
            [[-2.1, 1.35], [-1.9, 1.45]].forEach(([x, z]) => {
                const burner = new THREE.Mesh(
                    new THREE.TorusGeometry(0.08, 0.015, 8, 24),
                    new THREE.MeshBasicMaterial({ color: 0x333333 })
                );
                burner.position.set(x, counterH + 0.05, z);
                burner.rotation.x = Math.PI / 2;
                interiorGroup.add(burner);
            });
            // Small fridge
            const fridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.85, 0.5),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.2 })
            );
            fridge.position.set(-2.3, 0.425, 0.5);
            interiorGroup.add(fridge);

            // === BATHROOM — back-right sector ===
            // Shower cabin (corner, against wall)
            const showerW = 0.8;
            // Shower base
            const showerBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24),
                new THREE.MeshPhysicalMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.1 })
            );
            showerBase.position.set(1.6, 0.025, -1.6);
            interiorGroup.add(showerBase);
            // Shower glass wall (curved)
            const showerGlass = createCurvedWall(
                -Math.PI * 0.6, -Math.PI * 0.25, 2.0, 0.45, 0x78d4ff, 0.15
            );
            showerGlass.position.set(1.6, 0, -1.6);
            interiorGroup.add(showerGlass);
            // Shower head (small sphere)
            const showerHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 12, 12),
                new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.1 })
            );
            showerHead.position.set(1.6, 1.9, -1.6);
            interiorGroup.add(showerHead);
            // Shower pipe
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 1.9, 8),
                new THREE.MeshPhysicalMaterial({ color: 0xbbbbbb, metalness: 0.7 })
            );
            pipe.position.set(1.85, 0.95, -1.85);
            interiorGroup.add(pipe);

            // Toilet (against wall)
            const toiletBase = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.4, 0.55),
                new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.3 })
            );
            toiletBase.position.set(2.0, 0.2, -0.7);
            interiorGroup.add(toiletBase);
            // Toilet tank
            const toiletTank = new THREE.Mesh(
                new THREE.BoxGeometry(0.38, 0.35, 0.15),
                new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.3 })
            );
            toiletTank.position.set(2.0, 0.575, -0.9);
            interiorGroup.add(toiletTank);

            // Bathroom sink (wall-mounted)
            const bSink = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.08, 0.35),
                new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.1 })
            );
            bSink.position.set(1.9, 0.8, -0.1);
            interiorGroup.add(bSink);
            // Bathroom mirror
            const mirror = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.5, 0.02),
                new THREE.MeshPhysicalMaterial({ color: 0xbbddee, roughness: 0.0, metalness: 0.8 })
            );
            mirror.position.set(2.15, 1.3, -0.1);
            mirror.rotation.y = -Math.PI * 0.05;
            interiorGroup.add(mirror);

            // Bathroom partition wall (separates bathroom from living area)
            const bathWall = createCurvedWall(
                -Math.PI * 0.15, Math.PI * 0.1, 2.0, innerR * 0.55, 0x7a6a55, 0.6
            );
            interiorGroup.add(bathWall);

            // === LIVING / DESK — center area ===
            // Desk against right side
            const deskGeo = new THREE.BoxGeometry(1.0, 0.04, 0.55);
            const desk = new THREE.Mesh(deskGeo, new THREE.MeshPhysicalMaterial({ color: 0x8B7355, roughness: 0.4 }));
            desk.position.set(0.8, 0.74, 0.5);
            interiorGroup.add(desk);
            // Desk legs
            const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8);
            const legMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, metalness: 0.5 });
            [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(([dx, dz]) => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(0.8 + dx, 0.36, 0.5 + dz);
                interiorGroup.add(leg);
            });
            // Chair
            const chairSeat = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.04, 0.4),
                new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.5 })
            );
            chairSeat.position.set(0.8, 0.42, 0.95);
            interiorGroup.add(chairSeat);
            const chairBack = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.4, 0.04),
                new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.5 })
            );
            chairBack.position.set(0.8, 0.62, 1.15);
            interiorGroup.add(chairBack);
            // Chair legs
            [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([dx, dz]) => {
                const cl = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6),
                    legMat
                );
                cl.position.set(0.8 + dx, 0.21, 0.95 + dz);
                interiorGroup.add(cl);
            });

            // === SALON — front-right, sofa facing center ===
            // Sofa (low, wide, against front-right wall)
            const sofaBase = new THREE.Mesh(
                new THREE.BoxGeometry(1.6, 0.35, 0.7),
                new THREE.MeshPhysicalMaterial({ color: 0x4a4a4a, roughness: 0.7 })
            );
            sofaBase.position.set(1.2, 0.175, 1.8);
            sofaBase.rotation.y = -Math.PI * 0.2;
            interiorGroup.add(sofaBase);
            // Sofa back
            const sofaBack = new THREE.Mesh(
                new THREE.BoxGeometry(1.6, 0.35, 0.12),
                new THREE.MeshPhysicalMaterial({ color: 0x4a4a4a, roughness: 0.7 })
            );
            sofaBack.position.set(1.45, 0.42, 2.1);
            sofaBack.rotation.y = -Math.PI * 0.2;
            interiorGroup.add(sofaBack);
            // Sofa cushions
            const cushMat = new THREE.MeshPhysicalMaterial({ color: 0x607860, roughness: 0.8 });
            const cush1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.55), cushMat);
            cush1.position.set(0.85, 0.39, 1.7);
            cush1.rotation.y = -Math.PI * 0.2;
            interiorGroup.add(cush1);
            const cush2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.55), cushMat);
            cush2.position.set(1.55, 0.39, 1.85);
            cush2.rotation.y = -Math.PI * 0.2;
            interiorGroup.add(cush2);

            // Coffee table
            const coffeeTable = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24),
                new THREE.MeshPhysicalMaterial({ color: 0x8B7355, roughness: 0.4 })
            );
            coffeeTable.position.set(0.5, 0.35, 1.5);
            interiorGroup.add(coffeeTable);
            // Coffee table leg
            const ctLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.06, 0.33, 12),
                new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: 0.4 })
            );
            ctLeg.position.set(0.5, 0.165, 1.5);
            interiorGroup.add(ctLeg);

            // Window light (from panoramic window area, front-right)
            const wLight = new THREE.SpotLight(0x78d4ff, 0.4, 8, Math.PI * 0.4);
            wLight.position.set(1, 2.2, 2.5);
            wLight.target.position.set(0, 0, 0);
            interiorGroup.add(wLight);
            interiorGroup.add(wLight.target);
            // Warm overhead light
            const ceilingLight = new THREE.PointLight(0xffeedd, 0.3, 6);
            ceilingLight.position.set(0, 2.5, 0);
            interiorGroup.add(ceilingLight);

            interiorGroup.visible = false;
            scene.add(interiorGroup);
        })();

        // ===================================================================
        // ===== FLOORPLAN VIEW — Clean top-down architectural plan =====
        // ===================================================================
        (function buildFloorplan() {
            const R = 2.8;
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

            // === ZONES (rectangular/organic partitions matching interior layout) ===
            // Layout: North = z-, South = z+ (entry)
            // Back-left: Bedroom (purple)
            // Left-front: Kitchen (yellow)
            // Back-right: Bathroom (blue)
            // Center: Living/Desk (green)
            // Front-right: Salon (light green)
            // Back-center-left: Tech (grey)

            // Helper: filled rectangle zone (flat on XZ plane)
            function addZoneRect(x, z, w, d, rotation, color, opacity) {
                const geo = new THREE.PlaneGeometry(w, d);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity || 0.1, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.rotation.z = rotation || 0;
                mesh.position.set(x, 0.005, z);
                floorplanGroup.add(mesh);
                // Border
                const edge = new THREE.LineSegments(
                    new THREE.EdgesGeometry(geo),
                    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
                );
                edge.rotation.x = -Math.PI / 2;
                edge.rotation.z = rotation || 0;
                edge.position.set(x, 0.005, z);
                floorplanGroup.add(edge);
            }

            // Partition wall line helper
            function addPartition(x1, z1, x2, z2, color) {
                const geo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x1, 0.01, z1),
                    new THREE.Vector3(x2, 0.01, z2)
                ]);
                floorplanGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.4 })));
            }

            // --- Bedroom zone (back-left) ---
            addZoneRect(-1.1, -1.4, 2.2, 1.8, Math.PI * 0.15, 0xc896ff, 0.08);
            // Bed outline
            const bedPlan = new THREE.Mesh(
                new THREE.PlaneGeometry(1.6, 2.0),
                new THREE.MeshBasicMaterial({ color: 0xc896ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            bedPlan.rotation.x = -Math.PI / 2;
            bedPlan.rotation.z = Math.PI * 0.15;
            bedPlan.position.set(-1.1, 0.01, -1.4);
            floorplanGroup.add(bedPlan);
            const bedEdge = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.6, 2.0)),
                new THREE.LineBasicMaterial({ color: 0xc896ff, transparent: true, opacity: 0.5 })
            );
            bedEdge.rotation.x = -Math.PI / 2;
            bedEdge.rotation.z = Math.PI * 0.15;
            bedEdge.position.set(-1.1, 0.01, -1.4);
            floorplanGroup.add(bedEdge);

            // --- Kitchen zone (left-front) ---
            addZoneRect(-1.7, 1.1, 1.5, 1.4, Math.PI * 0.3, 0xffc832, 0.08);
            // Counter along wall (L-shape represented by thick line)
            const counterPts = [];
            for (let i = 0; i <= 12; i++) {
                const a = Math.PI * 0.55 + (i / 12) * Math.PI * 0.35;
                counterPts.push(new THREE.Vector3(R * 0.85 * Math.cos(a), 0.01, R * 0.85 * Math.sin(a)));
            }
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(counterPts),
                new THREE.LineBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.6 })
            ));
            // Sink circle
            const sinkPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.08, 0.12, 16),
                new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
            );
            sinkPlan.rotation.x = -Math.PI / 2;
            sinkPlan.position.set(-1.5, 0.015, 1.0);
            floorplanGroup.add(sinkPlan);
            // Burners
            [[-2.1, 1.35], [-1.9, 1.45]].forEach(([x, z]) => {
                const b = new THREE.Mesh(
                    new THREE.RingGeometry(0.06, 0.08, 12),
                    new THREE.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
                );
                b.rotation.x = -Math.PI / 2;
                b.position.set(x, 0.015, z);
                floorplanGroup.add(b);
            });

            // --- Bathroom zone (back-right) ---
            addZoneRect(1.8, -1.0, 1.2, 1.8, 0, 0x64b4ff, 0.08);
            // Shower circle
            const showerPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.35, 24),
                new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            showerPlan.rotation.x = -Math.PI / 2;
            showerPlan.position.set(1.6, 0.015, -1.6);
            floorplanGroup.add(showerPlan);
            // Toilet
            const toiletPlan = new THREE.Mesh(
                new THREE.PlaneGeometry(0.4, 0.5),
                new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            toiletPlan.rotation.x = -Math.PI / 2;
            toiletPlan.position.set(2.0, 0.015, -0.7);
            floorplanGroup.add(toiletPlan);
            // Sink rectangle
            const bSinkPlan = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.3),
                new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
            );
            bSinkPlan.rotation.x = -Math.PI / 2;
            bSinkPlan.position.set(1.9, 0.015, -0.1);
            floorplanGroup.add(bSinkPlan);

            // --- Living/Bureau zone (center) ---
            addZoneRect(0.5, 0.5, 1.5, 1.5, 0, 0xa8ff78, 0.05);
            // Desk rectangle
            const deskPlan = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.0, 0.55)),
                new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.5 })
            );
            deskPlan.rotation.x = -Math.PI / 2;
            deskPlan.position.set(0.8, 0.015, 0.5);
            floorplanGroup.add(deskPlan);
            // Chair circle
            const chairPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.12, 0.16, 12),
                new THREE.MeshBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            chairPlan.rotation.x = -Math.PI / 2;
            chairPlan.position.set(0.8, 0.015, 0.95);
            floorplanGroup.add(chairPlan);

            // --- Salon zone (front-right) ---
            addZoneRect(1.0, 1.8, 1.8, 1.0, -Math.PI * 0.2, 0x7acc5a, 0.06);
            // Sofa line
            const sofaPts = [];
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                sofaPts.push(new THREE.Vector3(0.4 + t * 1.6, 0.01, 1.65 + t * 0.3));
            }
            floorplanGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(sofaPts),
                new THREE.LineBasicMaterial({ color: 0x7acc5a, transparent: true, opacity: 0.5 })
            ));
            // Coffee table circle
            const ctPlan = new THREE.Mesh(
                new THREE.RingGeometry(0.18, 0.22, 16),
                new THREE.MeshBasicMaterial({ color: 0x7acc5a, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            ctPlan.rotation.x = -Math.PI / 2;
            ctPlan.position.set(0.5, 0.015, 1.5);
            floorplanGroup.add(ctPlan);

            // --- Tech zone (back-center) ---
            addZoneRect(0, -2.2, 1.0, 0.6, 0, 0x888888, 0.06);

            // --- Partition walls ---
            // Bedroom partition
            addPartition(-0.3, -0.4, -1.8, -0.1, 0xc896ff);
            // Bathroom partition
            addPartition(1.1, 0.0, 1.1, -2.0, 0x64b4ff);
            addPartition(1.1, 0.0, 2.2, 0.3, 0x64b4ff);
            // Kitchen partition
            addPartition(-0.8, 0.3, -0.8, 1.8, 0xffc832);

            // --- Door opening (gap in outer wall, front center) ---
            // Two small arcs to show the gap
            const doorArcMat = new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.8 });
            [[-0.45, 0.45]].forEach(([startX, endX]) => {
                // Door symbol (arc showing swing)
                const doorSwing = [];
                for (let i = 0; i <= 12; i++) {
                    const a = (i / 12) * Math.PI * 0.5;
                    doorSwing.push(new THREE.Vector3(
                        startX + 0.9 * Math.sin(a),
                        0.015,
                        R - 0.9 * (1 - Math.cos(a))
                    ));
                }
                floorplanGroup.add(new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(doorSwing),
                    new THREE.LineBasicMaterial({ color: 0xa8ff78, transparent: true, opacity: 0.3 })
                ));
            });

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

            // --- Zone labels ---
            floorplanGroup.add(createLabel('COUCHAGE', -1.1, 0.1, -1.4, 0xc896ff, 18));
            floorplanGroup.add(createLabel('6.8m²', -1.1, 0.05, -1.0, 0xc896ff, 14));
            floorplanGroup.add(createLabel('CUISINE', -1.7, 0.1, 1.1, 0xffc832, 18));
            floorplanGroup.add(createLabel('4.5m²', -1.7, 0.05, 1.5, 0xffc832, 14));
            floorplanGroup.add(createLabel("SALLE D'EAU", 1.8, 0.1, -1.0, 0x64b4ff, 16));
            floorplanGroup.add(createLabel('3.2m²', 1.8, 0.05, -0.6, 0x64b4ff, 14));
            floorplanGroup.add(createLabel('VIE/BUREAU', 0.5, 0.1, 0.5, 0xa8ff78, 18));
            floorplanGroup.add(createLabel('8.3m²', 0.5, 0.05, 0.9, 0xa8ff78, 14));
            floorplanGroup.add(createLabel('SALON', 1.0, 0.1, 1.8, 0x7acc5a, 18));
            floorplanGroup.add(createLabel('5.2m²', 1.0, 0.05, 2.15, 0x7acc5a, 14));
            floorplanGroup.add(createLabel('TECH', 0, 0.1, -2.2, 0x888888, 16));
            floorplanGroup.add(createLabel('ENTRÉE', 0, 0.1, R + 0.5, 0xa8ff78, 18));

            // Dimension line
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

            // Interior furniture (simplified but textured)
            // Bed
            const mattressMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f0e8, roughness: 0.95 });
            const bedFrame = new THREE.Mesh(
                new THREE.BoxGeometry(1.6, 0.12, 2.0),
                new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.6 })
            );
            bedFrame.position.set(-1.1, 0.06, -1.4);
            bedFrame.rotation.y = Math.PI * 0.15;
            realisticGroup.add(bedFrame);
            const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.9), mattressMat);
            mattress.position.set(-1.1, 0.21, -1.4);
            mattress.rotation.y = Math.PI * 0.15;
            realisticGroup.add(mattress);

            // Kitchen counter
            const counterMat = new THREE.MeshPhysicalMaterial({ color: 0xaaa89a, roughness: 0.15, metalness: 0.35 });
            const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.55), counterMat);
            counter.position.set(-1.8, 0.425, 1.2);
            counter.rotation.y = Math.PI * 0.3;
            realisticGroup.add(counter);

            // Sofa
            const sofaMat = new THREE.MeshPhysicalMaterial({ color: 0x5a6a5a, roughness: 0.8 });
            const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.7), sofaMat);
            sofa.position.set(1.2, 0.175, 1.8);
            sofa.rotation.y = -Math.PI * 0.2;
            realisticGroup.add(sofa);

            // Desk
            const deskMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.04, 0.55),
                new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.4 })
            );
            deskMesh.position.set(0.8, 0.74, 0.5);
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
