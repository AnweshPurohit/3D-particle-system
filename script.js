// --- Configuration ---
const PARTICLE_COUNT = 15000; // Increased for density
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.002); // Slightly more fog for depth

const camera = new THREE.PerspectiveCamera(75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1000);
camera.position.z = 45; // Moved back slightly more for bigger shapes

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// --- Particle Parameters (Stable Mapping) ---
const particleParams = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleParams.push({
        t: Math.random() * Math.PI * 2,
        u: Math.random(),
        v: Math.random(),
        sign: Math.random() > 0.5 ? 1 : -1,
        offset: (Math.random() - 0.5) * 2
    });
}

// --- Particle System ---
const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleColors = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const targetColors = new Float32Array(PARTICLE_COUNT * 3); // New: for per-shape coloring

// Initialize Positions
for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Generate initial position using stable params
    const start = getPointOnSphere(60, particleParams[i]);

    const idx = i * 3;
    particlePositions[idx] = start.x;
    particlePositions[idx + 1] = start.y;
    particlePositions[idx + 2] = start.z;

    // Set target to same initially
    targetPositions[idx] = start.x;
    targetPositions[idx + 1] = start.y;
    targetPositions[idx + 2] = start.z;

    // Add variations to color for realism
    particleColors[idx] = 1.0;
    particleColors[idx + 1] = 1.0;
    particleColors[idx + 2] = 1.0;

    targetColors[idx] = 1.0;
    targetColors[idx + 1] = 1.0;
    targetColors[idx + 2] = 1.0;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

// Sharper texture for clarity
const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/spark1.png');

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.4, // Slightly larger for visibility
    vertexColors: true,
    map: sprite,
    alphaTest: 0.1,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleSystem);

// --- State & shape Logic ---
let currentShape = 'fireworks';
let expansionFactor = 1.0;
let baseColor = { r: 1, g: 0.5, b: 0 };

// --- Accurate Shape Generators ---

// --- Accurate Shape Generators ---

function getPointOnSphere(r, params) {
    const theta = params.t;
    const phi = Math.acos(2 * params.u - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return { x, y, z };
}

function getPointInHeart(scale, params) {
    const s = scale * 0.8;
    const t = params.t; // Stable angle per particle

    // XY Heart profile
    const xBase = 16 * Math.pow(Math.sin(t), 3);
    const yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

    // Thickness: use 'v' param for stable Z jitter
    const zThickness = 4;

    const x = xBase * s;
    const y = yBase * s;
    const z = params.offset * zThickness * s; // Stable Z

    // Optional: Inner fill using 'u'
    // To keep it clean, let's keep it as a thick shell
    return { x, y, z };
}

function getPointInFlower(scale, params) {
    const s = scale * 0.8;
    const theta = params.t;

    // 5 petals
    const k = 2.5;
    const shapeR = Math.abs(Math.cos(k * theta));

    const rBase = 8 * s;
    const rPetal = 18 * s;

    // Use sqrt(u) for uniform area distribution
    const r = (rBase + rPetal * shapeR) * Math.sqrt(params.u);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = (Math.pow(r / (rBase + rPetal), 2) * 10 * s) * 0.5;

    return { x, y, z };
}

function getPointInSaturn(scale, params) {
    const s = scale * 0.8;

    // Use 'v' to determine planet vs ring (stable assignment)
    if (params.v < 0.5) {
        // Planet (Sphere)
        // Recalculate specific sphere coords from t/u to allow full coverage
        const theta = params.t;
        const phi = Math.acos(2 * params.u - 1); // This re-uses u, might correlate?
        // Better: use offset for phi
        const phi2 = Math.acos(params.offset);

        const r = 10 * s;
        return {
            x: r * Math.sin(phi2) * Math.cos(theta),
            y: r * Math.sin(phi2) * Math.sin(theta),
            z: r * Math.cos(phi2)
        };
    } else {
        // Ring
        const angle = params.t;
        const rNorm = Math.sqrt(params.u); // Distribution
        const inner = 14 * s;
        const outer = 26 * s;
        const radius = inner + rNorm * (outer - inner);

        let px = radius * Math.cos(angle);
        let py = params.offset * 1.5; // Thickness
        let pz = radius * Math.sin(angle);

        // Tilt
        const tilt = 25 * (Math.PI / 180);
        const yRot = py * Math.cos(tilt) - pz * Math.sin(tilt);
        const zRot = py * Math.sin(tilt) + pz * Math.cos(tilt);

        return { x: px, y: yRot, z: zRot };
    }
}

function getPointInMilkyWay(scale, params) {
    const s = scale * 0.8;

    // Logarithmic Spiral Parameters
    // r = a * e^(b * theta)

    // Distribution: 
    // 15% Bulge (Core)
    // 85% Disk (arms)

    let x, y, z, r, g, b;

    if (params.u < 0.15) {
        // --- Galactic Bulge (Dense Core) ---
        // Ellipsoidal distribution
        // Re-map params
        const theta = params.t;
        const phi = Math.acos(2 * (params.u / 0.15) - 1);
        const radius = 6 * s * Math.pow(Math.random(), 0.3); // Concentrate center

        x = radius * 0.6 * Math.sin(phi) * Math.cos(theta); // Flattened slightly
        y = radius * 0.4 * Math.sin(phi) * Math.sin(theta);
        z = radius * 0.4 * Math.cos(phi);

        // Color: Warm Gold/White/Yellow
        r = 1.0;
        g = 0.9;
        b = 0.6 + Math.random() * 0.4; // 0.6-1.0

    } else {
        // --- Spiral Arms ---
        // 2 Main arms with split
        const armOffset = Math.floor(params.v * 2) * Math.PI; // 0 or PI

        // Random angle along the spiral (0 to 4 PI)
        const spiralAngle = params.t * 2; // More windings

        // Logarithmic Growth
        // a = 4, b = 0.2
        const a = 4 * s;
        const b_growth = 0.2;

        const dist = a * Math.exp(b_growth * spiralAngle);

        // Add "thickness" / scatter
        const scatter = (params.offset * dist * 0.15) + (Math.random() - 0.5) * 2;

        const theta = spiralAngle + armOffset + (params.offset * 0.2); // Twist scatter

        const rawX = (dist + scatter) * Math.cos(theta);
        const rawY = (dist + scatter) * Math.sin(theta);

        // Z Height - thinner at edges, thicker at center (but we are far)
        // Galaxy is flat
        const rawZ = (Math.random() - 0.5) * (1 + dist * 0.1) * s;

        // Apply Tilt (Galaxy viewed at angle)
        const tiltX = -60 * (Math.PI / 180);
        const tiltZ = -20 * (Math.PI / 180);

        // Rotate raw coords (which are in XY plane)
        // Actually, let's keep it in XY primarily, and just tilt slightly
        // 3D rotation manual

        x = rawX;
        y = rawY * Math.cos(tiltX) - rawZ * Math.sin(tiltX);
        z = rawY * Math.sin(tiltX) + rawZ * Math.cos(tiltX);

        // Color: Distance based
        // Center: Blueish/Purple -> Outer: Darker Blue/Violet
        const distNorm = Math.min(1, dist / (40 * s));

        r = 0.2 + (1 - distNorm) * 0.3; // More red near center
        g = 0.1 + (1 - distNorm) * 0.4;
        b = 0.6 + distNorm * 0.4;     // More blue outer

        // Add some random star variation
        r += (Math.random() - 0.5) * 0.1;
        g += (Math.random() - 0.5) * 0.1;
        b += (Math.random() - 0.5) * 0.1;
    }

    return { x, y, z, r, g, b };
}

function getPointInFireworks(scale, params) {
    // Sphere shell
    return getPointOnSphere(35 * scale * 0.8, params);
}

// Update Target Positions based on Shape
function updateShape(shapeType) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let p;
        const idx = i * 3;
        const params = particleParams[i]; // Get stable params

        // Default color (will be overridden by shape or hand color)
        let tr = baseColor.r;
        let tg = baseColor.g;
        let tb = baseColor.b;

        switch (shapeType) {
            case 'heart':
                p = getPointInHeart(expansionFactor, params);
                break;
            case 'flower':
                p = getPointInFlower(expansionFactor, params);
                break;
            case 'saturn':
                p = getPointInSaturn(expansionFactor, params);
                break;
            case 'milkyway':
                p = getPointInMilkyWay(expansionFactor, params);
                // Milky way defines its own colors
                if (p.r !== undefined) {
                    tr = p.r;
                    tg = p.g;
                    tb = p.b;
                }
                break;
            case 'fireworks':
            default:
                p = getPointInFireworks(expansionFactor, params);
                // Random fireworks colors could be cool here too
                break;
        }

        targetPositions[idx] = p.x;
        targetPositions[idx + 1] = p.y;
        targetPositions[idx + 2] = p.z;

        targetColors[idx] = tr;
        targetColors[idx + 1] = tg;
        targetColors[idx + 2] = tb;
    }
}

// --- Error Handling Helper ---
function logError(msg) {
    const ui = document.getElementById('ui-container');
    const err = document.createElement('p');
    err.style.color = 'red';
    err.style.fontWeight = 'bold';
    err.textContent = "Error: " + msg;
    ui.appendChild(err);
    console.error(msg);
}

// --- MediaPipe Hand Tracking ---
const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const debugInfo = document.getElementById('debug-info');

function onResults(results) {
    try {
        // Draw debugging view
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // User hand found
            const landmarks = results.multiHandLandmarks[0];

            // Draw skeleton
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });

            // --- 1. Detect Gesture ---
            // Count fingers extended (Index, Middle, Ring, Pinky)
            let fingersUp = 0;
            // Note: MediaPipe Y coordinates go DOWN (0 at top, 1 at bottom). 
            // So tip < pip means finger is UP.
            if (landmarks[8].y < landmarks[6].y) fingersUp++;  // Index
            if (landmarks[12].y < landmarks[10].y) fingersUp++; // Middle
            if (landmarks[16].y < landmarks[14].y) fingersUp++; // Ring
            if (landmarks[20].y < landmarks[18].y) fingersUp++; // Pinky

            // Thumb Detect: Check if Thumb Tip (4) is far from Index MCP (5)
            // Using logic relative to hand size (distance between 0 and 9 wrist-middle)
            const handSize = Math.sqrt(
                Math.pow(landmarks[0].x - landmarks[9].x, 2) +
                Math.pow(landmarks[0].y - landmarks[9].y, 2)
            );

            const thumbDist = Math.sqrt(
                Math.pow(landmarks[4].x - landmarks[5].x, 2) +
                Math.pow(landmarks[4].y - landmarks[5].y, 2)
            );

            let isThumbOpen = thumbDist > handSize * 0.5; // Heuristic

            let totalFingers = fingersUp + (isThumbOpen ? 1 : 0);

            let detectedShape = currentShape;

            if (totalFingers === 1) detectedShape = 'heart';
            else if (totalFingers === 2) detectedShape = 'flower';
            else if (totalFingers === 3) detectedShape = 'saturn';
            else if (totalFingers === 4) detectedShape = 'milkyway'; // 4 Fingers (Thumb tucked)
            else if (totalFingers >= 5) detectedShape = 'fireworks'; // Open Hand

            if (currentShape !== detectedShape) {
                currentShape = detectedShape;
            }

            // Update Debug Info
            if (debugInfo) {
                const shapeName = currentShape === 'milkyway' ? 'MILKY WAY' : currentShape.toUpperCase();
                debugInfo.textContent = `Status: ${totalFingers} Fingers Detected -> ${shapeName}`;
            }

            // --- 2. Pinch Detection ---
            const dx = landmarks[4].x - landmarks[8].x;
            const dy = landmarks[4].y - landmarks[8].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const rawExpand = (distance * 10);
            expansionFactor = Math.max(0.5, Math.min(3.0, rawExpand));

            // --- 3. Position/Color ---
            const handX = landmarks[9].x;
            const handY = landmarks[9].y;

            const hue = handX;
            const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
            baseColor = { r: color.r, g: color.g, b: color.b };

            // Smoother rotation
            const rotX = (handY - 0.5) * 1.5;
            const rotY = (handX - 0.5) * 1.5;

            // Damping logic for rotation could be nice, currently direct map
            particleSystem.rotation.x = rotX;
            particleSystem.rotation.y = rotY;

        } else {
            if (debugInfo) debugInfo.textContent = "Status: No hand detected";
        }

        canvasCtx.restore();
    } catch (e) {
        console.error("Error in onResults:", e);
    }
}

let hands;
try {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);
} catch (e) {
    logError("Failed to initialize MediaPipe Hands: " + e.message);
}

// Setup Camera
try {
    const cameraUtils = new Camera(videoElement, {
        onFrame: async () => {
            if (hands) {
                await hands.send({ image: videoElement });
            }
        },
        width: 640,
        height: 480
    });
    cameraUtils.start().catch(e => {
        logError("Camera start failed: " + e.message + ". Are you using HTTPS or localhost?");
    });
} catch (e) {
    logError("Camera setup error: " + e.message);
}

// --- Loop ---
function animate() {
    requestAnimationFrame(animate);

    // 1. Update targets based on current state parameters
    updateShape(currentShape);

    // 2. Morph particles towards targets
    const positions = particleSystem.geometry.attributes.position.array;
    const colors = particleSystem.geometry.attributes.color.array;
    const speed = 0.05; // Morph speed

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;

        // Position Interpolation (Lerp)
        positions[idx] += (targetPositions[idx] - positions[idx]) * speed;
        positions[idx + 1] += (targetPositions[idx + 1] - positions[idx + 1]) * speed;
        positions[idx + 2] += (targetPositions[idx + 2] - positions[idx + 2]) * speed;

        // Color Interpolation
        // Create a slight gradient per particle or random variation
        colors[idx] += (targetColors[idx] - colors[idx]) * speed;
        colors[idx + 1] += (targetColors[idx + 1] - colors[idx + 1]) * speed;
        colors[idx + 2] += (targetColors[idx + 2] - colors[idx + 2]) * speed;

        // Special Fireworks Effect: Jitter
        if (currentShape === 'fireworks') {
            positions[idx] += (Math.random() - 0.5) * 0.1;
            positions[idx + 1] += (Math.random() - 0.5) * 0.1;
            positions[idx + 2] += (Math.random() - 0.5) * 0.1;
        }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;

    // Constant slow rotation for "life"
    particleSystem.rotation.z += 0.001;

    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start loop
animate();


// --- UI Toggle Logic ---
const uiContainer = document.getElementById('ui-container');
const dragMeBtn = document.getElementById('drag-me-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');

if (dragMeBtn && uiContainer && closeMenuBtn) {
    dragMeBtn.addEventListener('click', () => {
        uiContainer.classList.add('visible');
        dragMeBtn.classList.add('hidden');
    });

    closeMenuBtn.addEventListener('click', () => {
        uiContainer.classList.remove('visible');
        dragMeBtn.classList.remove('hidden');
    });
}
