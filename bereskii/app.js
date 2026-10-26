import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. CORE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.04);
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.2);
composer.addPass(bloomPass);

// --- 2. AUDIO SETUP ---
const noteSound = new Audio('assets/note.mp3');
const bgmNorm = new Audio('assets/norm.mp3'); bgmNorm.loop = true; bgmNorm.volume = 0.5;
const bgmScary = new Audio('assets/scary.mp3'); bgmScary.loop = true; bgmScary.volume = 0.6;

// --- 3. ENVIRONMENT BUILDS ---
const roomGroup = new THREE.Group(); scene.add(roomGroup);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xffeebb, roughness: 0.9 });
const darkWallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
const bedMat = new THREE.MeshStandardMaterial({ color: 0xcc5555, roughness: 0.9 });
const screenMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Off initially
const windowMat = new THREE.MeshStandardMaterial({ color: 0x112244, emissive: 0x051122 });

// Walls & Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat); floor.rotation.x = -Math.PI/2; roomGroup.add(floor);
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); backWall.position.set(0, 4, -8); roomGroup.add(backWall);
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); leftWall.position.set(-8, 4, 0); leftWall.rotation.y = Math.PI/2; roomGroup.add(leftWall);
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); rightWall.position.set(8, 4, 0); rightWall.rotation.y = -Math.PI/2; roomGroup.add(rightWall);
const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); frontWall.position.set(0, 4, 8); frontWall.rotation.y = Math.PI; roomGroup.add(frontWall);

// Furniture
const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 7), bedMat); bed.position.set(-5.5, 0.75, -4); roomGroup.add(bed);
const closet = new THREE.Mesh(new THREE.BoxGeometry(3, 7, 2), woodMat); closet.position.set(6, 3.5, 6); roomGroup.add(closet);
const desk = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 2.5), woodMat); desk.position.set(0, 1.25, -6.5); roomGroup.add(desk);
const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0xaaaaaa })); monitor.position.set(0, 3.1, -6.8); roomGroup.add(monitor);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), screenMat); screen.position.set(0, 3.1, -6.29); roomGroup.add(screen);
const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), windowMat); windowMesh.position.set(4, 4, -7.9); roomGroup.add(windowMesh);

// Toys
const toys = [];
for(let i=0; i<5; i++) {
    const toy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
    toy.position.set(Math.random() * 8 - 4, 0.2, Math.random() * 6);
    roomGroup.add(toy); toys.push(toy);
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffddaa, 0.8); scene.add(ambientLight);
const ceilingLight = new THREE.PointLight(0xffcc88, 15, 20); ceilingLight.position.set(0, 7, 0); scene.add(ceilingLight);
const screenLight = new THREE.PointLight(0x88ff88, 0, 8); screenLight.position.set(0, 3.5, -5); scene.add(screenLight);

// --- 4. CHARACTERS ---

// A. The Child (Chibi)
const character = new THREE.Group();
const skinMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee }); const clothesMat = new THREE.MeshStandardMaterial({ color: 0x444444 }); const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const headGroup = new THREE.Group(); headGroup.position.y = 1.3;
headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12).scale(1.1, 0.9, 1.0), skinMat));
const hairGeo = new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1.15, 1.0, 1.1);
const hair = new THREE.Mesh(hairGeo, hairMat); hair.position.set(0, 0.15, -0.05); headGroup.add(hair);
const eyeGeo = new THREE.PlaneGeometry(0.2, 0.3); const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.35, -0.1, 0.92); leftEye.rotation.y = -0.15; headGroup.add(leftEye);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.35, -0.1, 0.92); rightEye.rotation.y = 0.15; headGroup.add(rightEye);
character.add(headGroup);
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.7, 10), clothesMat); body.position.y = 0.65; character.add(body);
const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.2, 0.4, 0); const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), skinMat); leftLeg.position.y = -0.15; leftLegPivot.add(leftLeg); character.add(leftLegPivot);
const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.2, 0.4, 0); const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), skinMat); rightLeg.position.y = -0.15; rightLegPivot.add(rightLeg); character.add(rightLegPivot);
scene.add(character);

// B. The Older Self (Dark Figure)
const darkFigure = new THREE.Group();
const darkMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
const figBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 2.5, 8), darkMat); figBody.position.y = 1.25; darkFigure.add(figBody);
const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), darkMat); figHead.position.set(0, 2.6, 0.2); figHead.rotation.x = 0.4; darkFigure.add(figHead); // Slouched forward
darkFigure.position.set(0, 0, -3);
darkFigure.visible = false;
scene.add(darkFigure);

// Active Player Reference
let playerModel = character;

// --- 5. NARRATIVE LOGIC & STATE MACHINE ---
let gameState = "INTRO"; // INTRO, EXPLORE, CUTSCENE, SCARE, WAKEUP
let isInteracting = false;
let logQueue = [];

const interactions = {
    bed: { pos: new THREE.Vector3(-5.5, 0, -4), radius: 3, explored: false, logs: ["mom used to tuck me in.", "my bed used to be so soft. i don't remember when was the last time i slept on something that soft.", "i wish i could hear my mom's voice again."] },
    table: { pos: new THREE.Vector3(0, 0, -5), radius: 3, explored: false, logs: ["i remember i used to hate homework.", "my sister used to help me with math."] },
    toys: { pos: new THREE.Vector3(0, 0, 3), radius: 3.5, explored: false, logs: ["i liked this cartoon. i wish they hadn't cancelled it by now.", "i used to be so happy over such small things."] },
    closet: { pos: new THREE.Vector3(6, 0, 6), radius: 3.5, explored: false, logs: ["i used to hide in here during hide and seek.", "it felt safe in the dark back then."] },
    window: { pos: new THREE.Vector3(4, 0, -6), radius: 3, explored: false, logs: ["the snow used to be so magical.", "now it just feels cold."] },
    computer: { pos: new THREE.Vector3(0, 0, -5), radius: 3, explored: false, logs: ["We can't stay in here forever.", "It's time to wake up."] } // Phase 2 ending interaction
};

const uiContainer = document.getElementById('retro-ui');
const logText = document.getElementById('log-text');
const closeBtn = document.getElementById('close-log');
const windowTitle = document.getElementById('window-title');

function playLogSound() {
    noteSound.currentTime = 0; noteSound.play().catch(e=>{});
}

function showNextLog() {
    if (logQueue.length > 0) {
        let text = logQueue.shift();
        
        // Glitch text handling
        if (gameState === "SCARE") {
            text = text.split('').map(c => Math.random() > 0.3 ? c : '!@#$%^&*'[(Math.floor(Math.random()*8))]).join('');
            logText.innerHTML = `<p class="glitch-text">> ${text}</p>`;
            windowTitle.innerText = "ERROR_FATAL.SYS";
        } else {
            logText.innerHTML = `<p>> ${text}</p>`;
        }

        uiContainer.style.display = 'block';
        playLogSound();
        isInteracting = true;
    } else {
        uiContainer.style.display = 'none';
        isInteracting = false;
        
        if (gameState === "INTRO") {
            gameState = "EXPLORE";
            bgmNorm.play().catch(e=>{});
        }
        else if (gameState === "EXPLORE") {
            checkExplorationComplete();
        }
        else if (gameState === "WAKEUP") {
            // If the final computer interaction finished, fade to black
            document.getElementById('start-overlay').style.display = 'flex';
            document.getElementById('start-overlay').innerHTML = "<p>CONNECTION LOST.</p>";
        }
    }
}

closeBtn.addEventListener('click', showNextLog);

function triggerInteraction(key) {
    if (!interactions[key].explored) {
        interactions[key].explored = true;
        logQueue = [...interactions[key].logs];
        showNextLog();
    }
}

function checkExplorationComplete() {
    if (interactions.bed.explored && interactions.table.explored && interactions.toys.explored && interactions.closet.explored && interactions.window.explored) {
        startCutscene();
    }
}

let cutsceneTimer = 0;
function startCutscene() {
    gameState = "CUTSCENE";
    isInteracting = true; // Locks player movement
    bgmNorm.pause();
    
    // Dim lights, turn on PC
    ambientLight.intensity = 0.1;
    ceilingLight.intensity = 2;
    screenMat.color = new THREE.Color(0xffffff);
    screenMat.emissive = new THREE.Color(0x88ff88);
    screenLight.intensity = 5;
}

// --- 6. MOVEMENT LOGIC ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
let targetRotation = 0;

function handleMovement(time) {
    if (isInteracting && gameState !== "CUTSCENE") return; // Freeze player during normal logs

    // --- CUTSCENE AUTOMATED MOVEMENT ---
    if (gameState === "CUTSCENE") {
        cutsceneTimer += 0.01;
        
        // Auto walk to PC
        playerModel.position.x = THREE.MathUtils.lerp(playerModel.position.x, 0, 0.02);
        playerModel.position.z = THREE.MathUtils.lerp(playerModel.position.z, -5, 0.02);
        playerModel.rotation.y = THREE.MathUtils.lerp(playerModel.rotation.y, Math.PI, 0.05);
        
        // Walk animation
        leftLegPivot.rotation.x = Math.sin(time * 8) * 0.5;
        rightLegPivot.rotation.x = Math.sin(time * 8 + Math.PI) * 0.5;

        // Pop up logs over time
        if (cutsceneTimer > 1 && cutsceneTimer < 1.02) { logQueue.push("why?"); showNextLog(); }
        if (cutsceneTimer > 3 && cutsceneTimer < 3.02) { logQueue.push("was that necessary?"); showNextLog(); }
        if (cutsceneTimer > 5 && cutsceneTimer < 5.02) { logQueue.push("not found."); showNextLog(); }
        
        // Reached PC
        if (cutsceneTimer > 7) {
            uiContainer.style.display = 'none';
            leftLegPivot.rotation.x = 0; rightLegPivot.rotation.x = 0;
            playerModel.position.y = Math.sin(time * 50) * 0.05; // Shaking
            darkFigure.visible = true; // Spawn older self behind
            
            if (cutsceneTimer > 9) {
                gameState = "SCARE";
                executeScare();
            }
        }
        
        // Camera follows smoothly
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerModel.position.x, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, playerModel.position.z + 10, 0.05);
        return;
    }

    // --- NORMAL MOVEMENT ---
    const speed = gameState === "WAKEUP" ? 0.04 : 0.08; // Slower in real world
    let moving = false;
    let moveX = 0, moveZ = 0;

    if (keys['w'] || keys['arrowup']) { moveZ -= speed; moving = true; }
    if (keys['s'] || keys['arrowdown']) { moveZ += speed; moving = true; }
    if (keys['a'] || keys['arrowleft']) { moveX -= speed; moving = true; }
    if (keys['d'] || keys['arrowright']) { moveX += speed; moving = true; }

    if (moving) {
        let newX = playerModel.position.x + moveX;
        let newZ = playerModel.position.z + moveZ;
        if (newX > 7) newX = 7; if (newX < -7) newX = -7;
        if (newZ > 7) newZ = 7; if (newZ < -7) newZ = -7;
        playerModel.position.x = newX; playerModel.position.z = newZ;
        targetRotation = Math.atan2(moveX, moveZ);
        
        // Animation
        if (gameState === "EXPLORE") {
            leftLegPivot.rotation.x = Math.sin(time * 10) * 0.6;
            rightLegPivot.rotation.x = Math.sin(time * 10 + Math.PI) * 0.6;
        } else if (gameState === "WAKEUP") {
            // Heavy, slow walk for dark figure
            playerModel.position.y = 1.25 + Math.abs(Math.sin(time * 5)) * 0.05; 
        }

        // Check Proximity for logs
        if (gameState === "EXPLORE") {
            for (const [key, item] of Object.entries(interactions)) {
                if (key !== "computer" && playerModel.position.distanceTo(item.pos) < item.radius) {
                    triggerInteraction(key);
                }
            }
        } else if (gameState === "WAKEUP") {
            if (playerModel.position.distanceTo(interactions.computer.pos) < 3) {
                triggerInteraction("computer");
            }
        }
    } else {
        if (gameState === "EXPLORE") {
            leftLegPivot.rotation.x = THREE.MathUtils.lerp(leftLegPivot.rotation.x, 0, 0.1);
            rightLegPivot.rotation.x = THREE.MathUtils.lerp(rightLegPivot.rotation.x, 0, 0.1);
        }
    }

    if (moving) {
        let diff = targetRotation - playerModel.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); 
        playerModel.rotation.y += diff * 0.15;
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerModel.position.x, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, playerModel.position.z + 10, 0.05);
}

function executeScare() {
    bgmScary.play().catch(e=>{});
    ambientLight.intensity = 0; ceilingLight.intensity = 0; screenLight.intensity = 0;
    
    // Quick burst of glitch logs
    logQueue = ["CAN YOU HEAR ME", "ITS COLD", "WAKE UP"];
    showNextLog();
    
    setTimeout(() => {
        uiContainer.style.display = 'none';
        transformRoomToReality();
    }, 4000);
}

function transformRoomToReality() {
    gameState = "WAKEUP";
    isInteracting = false;
    
    // Clear room of comforts
    toys.forEach(t => roomGroup.remove(t));
    roomGroup.remove(bed);
    
    // Change textures to cold/abandoned
    backWall.material = darkWallMat; leftWall.material = darkWallMat; rightWall.material = darkWallMat; frontWall.material = darkWallMat;
    windowMesh.material = new THREE.MeshStandardMaterial({ color: 0x050505 }); // Blocked window
    
    // Lighting
    ambientLight.intensity = 0.05;
    screenLight.intensity = 3;
    screenLight.color = new THREE.Color(0xffffff);
    screenMat.emissive = new THREE.Color(0x333333); // Dim white light

    // THE TWIST: Swap Player to Older Self
    scene.remove(character);
    playerModel = darkFigure; // Now you control the trauma
    playerModel.position.set(0, 0, 5); // Start back of room
    playerModel.rotation.y = 0;
}

// --- 7. START & LOOP ---
document.getElementById('start-overlay').addEventListener('click', function() {
    this.style.display = 'none';
    setTimeout(() => {
        logQueue = [
            "do you still remember when the room used to look like this?",
            "you better look around while you still can."
        ];
        showNextLog();
    }, 1000);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    handleMovement(clock.getElapsedTime());
    composer.render();
}
animate();