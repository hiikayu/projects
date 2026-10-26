import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.04);
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12); camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.2);
composer.addPass(bloomPass);

// AUDIO
const noteSound = new Audio('assets/note.mp3');
const bgmNorm = new Audio('assets/norm.mp3'); bgmNorm.loop = true; bgmNorm.volume = 0.5;
const bgmScary = new Audio('assets/scary.mp3'); bgmScary.loop = true; bgmScary.volume = 0.6;

// ROOM BUILD
const roomGroup = new THREE.Group(); scene.add(roomGroup);
const wallMat = new THREE.MeshStandardMaterial({ color: 0xffeebb, roughness: 0.9 });
const darkWallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
const bedMat = new THREE.MeshStandardMaterial({ color: 0xcc5555, roughness: 0.9 });
const screenMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x112244, emissive: 0x051122 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat); floor.rotation.x = -Math.PI/2; roomGroup.add(floor);
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); backWall.position.set(0, 4, -8); roomGroup.add(backWall);
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); leftWall.position.set(-8, 4, 0); leftWall.rotation.y = Math.PI/2; roomGroup.add(leftWall);
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); rightWall.position.set(8, 4, 0); rightWall.rotation.y = -Math.PI/2; roomGroup.add(rightWall);
const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat); frontWall.position.set(0, 4, 8); frontWall.rotation.y = Math.PI; roomGroup.add(frontWall);

const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 7), bedMat); bed.position.set(-5.5, 0.75, -4); roomGroup.add(bed);
const closet = new THREE.Mesh(new THREE.BoxGeometry(3, 7, 2), woodMat); closet.position.set(6, 3.5, 6); roomGroup.add(closet);
const desk = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 2.5), woodMat); desk.position.set(0, 1.25, -6.5); roomGroup.add(desk);
const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0xaaaaaa })); monitor.position.set(0, 3.1, -6.8); roomGroup.add(monitor);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), screenMat); screen.position.set(0, 3.1, -6.29); roomGroup.add(screen);
const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), windowMat); windowMesh.position.set(4, 4, -7.9); roomGroup.add(windowMesh);

const toys = [];
for(let i=0; i<5; i++) {
    const toy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
    toy.position.set(Math.random() * 8 - 4, 0.2, Math.random() * 6); roomGroup.add(toy); toys.push(toy);
}

const ambientLight = new THREE.AmbientLight(0xffddaa, 0.8); scene.add(ambientLight);
const ceilingLight = new THREE.PointLight(0xffcc88, 15, 20); ceilingLight.position.set(0, 7, 0); scene.add(ceilingLight);
const screenLight = new THREE.PointLight(0x88ff88, 0, 8); screenLight.position.set(0, 3.5, -5); scene.add(screenLight);

// --- RESTORED CHIBI CHARACTER MODEL ---
const character = new THREE.Group();
const skinMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 }); 
const clothesMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }); 
const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }); 
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });

// Blush Generator
const blushCanvas = document.createElement('canvas');
blushCanvas.width = 64; blushCanvas.height = 64;
const ctx = blushCanvas.getContext('2d');
const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
gradient.addColorStop(0, 'rgba(150, 100, 100, 0.6)'); gradient.addColorStop(1, 'rgba(150, 100, 100, 0)');
ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
const blushTex = new THREE.CanvasTexture(blushCanvas);
const blushMat = new THREE.MeshStandardMaterial({ map: blushTex, transparent: true, depthWrite: false, roughness: 1.0 });

const headGroup = new THREE.Group(); headGroup.position.y = 1.3;
const headGeo = new THREE.SphereGeometry(0.9, 16, 12); headGeo.scale(1.1, 0.9, 1.0);
headGroup.add(new THREE.Mesh(headGeo, skinMat));

const hairGeo = new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6); hairGeo.scale(1.15, 1.0, 1.1);
const hair = new THREE.Mesh(hairGeo, hairMat); hair.position.y = 0.15; hair.position.z = -0.05; headGroup.add(hair);

const spikeGeo = new THREE.ConeGeometry(0.2, 0.5, 5);
const spike1 = new THREE.Mesh(spikeGeo, hairMat); spike1.position.set(0, 0.9, 0.2); spike1.rotation.x = -0.2; headGroup.add(spike1);
const spike2 = new THREE.Mesh(spikeGeo, hairMat); spike2.position.set(-0.4, 0.8, -0.1); spike2.rotation.z = 0.5; spike2.rotation.x = -0.3; headGroup.add(spike2);
const spike3 = new THREE.Mesh(spikeGeo, hairMat); spike3.position.set(0.4, 0.8, -0.1); spike3.rotation.z = -0.5; spike3.rotation.x = -0.3; headGroup.add(spike3);

const eyeGeo = new THREE.PlaneGeometry(0.2, 0.3);
const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.35, -0.1, 0.92); leftEye.rotation.y = -0.15; headGroup.add(leftEye);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.35, -0.1, 0.92); rightEye.rotation.y = 0.15; headGroup.add(rightEye);

const mouthGeo = new THREE.BoxGeometry(0.08, 0.015, 0.02);
const mouth = new THREE.Mesh(mouthGeo, eyeMat); mouth.position.set(0, -0.28, 0.93); headGroup.add(mouth);

const blushGeo = new THREE.PlaneGeometry(0.4, 0.4);
const leftBlush = new THREE.Mesh(blushGeo, blushMat); leftBlush.position.set(-0.4, -0.22, 0.89); leftBlush.scale.set(1.2, 0.6, 1); leftBlush.rotation.y = -0.2; headGroup.add(leftBlush);
const rightBlush = new THREE.Mesh(blushGeo, blushMat); rightBlush.position.set(0.4, -0.22, 0.89); rightBlush.scale.set(1.2, 0.6, 1); rightBlush.rotation.y = 0.2; headGroup.add(rightBlush);

character.add(headGroup);

const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.7, 10), clothesMat); body.position.y = 0.65; character.add(body);
const armGeo = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8); const handGeo = new THREE.SphereGeometry(0.12, 8, 8);
const leftArmPivot = new THREE.Group(); leftArmPivot.position.set(-0.45, 0.9, 0); const leftArm = new THREE.Mesh(armGeo, clothesMat); leftArm.position.y = -0.2; const leftHand = new THREE.Mesh(handGeo, skinMat); leftHand.position.y = -0.45; leftArmPivot.add(leftArm); leftArmPivot.add(leftHand); leftArmPivot.rotation.z = 0.2; character.add(leftArmPivot);
const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.45, 0.9, 0); const rightArm = new THREE.Mesh(armGeo, clothesMat); rightArm.position.y = -0.2; const rightHand = new THREE.Mesh(handGeo, skinMat); rightHand.position.y = -0.45; rightArmPivot.add(rightArm); rightArmPivot.add(rightHand); rightArmPivot.rotation.z = -0.2; character.add(rightArmPivot);

const legGeo = new THREE.CapsuleGeometry(0.1, 0.25, 4, 8); const footGeo = new THREE.SphereGeometry(0.14, 8, 8);
const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.2, 0.4, 0); const leftLeg = new THREE.Mesh(legGeo, skinMat); leftLeg.position.y = -0.15; const leftFoot = new THREE.Mesh(footGeo, skinMat); leftFoot.position.y = -0.35; leftFoot.position.z = 0.05; leftLegPivot.add(leftLeg); leftLegPivot.add(leftFoot); character.add(leftLegPivot);
const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.2, 0.4, 0); const rightLeg = new THREE.Mesh(legGeo, skinMat); rightLeg.position.y = -0.15; const rightFoot = new THREE.Mesh(footGeo, skinMat); rightFoot.position.y = -0.35; rightFoot.position.z = 0.05; rightLegPivot.add(rightLeg); rightLegPivot.add(rightFoot); character.add(rightLegPivot);
scene.add(character);

// TALL DARK FIGURE (Older Self)
const darkFigure = new THREE.Group();
const darkMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
const figBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 4.5, 8), darkMat); figBody.position.y = 2.25; darkFigure.add(figBody);
const figHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), darkMat); figHead.position.set(0, 4.8, 0.3); figHead.rotation.x = 0.5; darkFigure.add(figHead);
// Start position (buried down, rises later)
darkFigure.position.set(0, -6, -4);
darkFigure.visible = false;
scene.add(darkFigure);

let playerModel = character;

// --- STATE MACHINE & LOGIC ---
let gameState = "INTRO";
let isInteracting = false;
let currentFocusKey = null;

const interactions = {
    bed: { pos: new THREE.Vector3(-5.5, 0, -4), radius: 3, explored: false, logs: ["mom used to tuck me in.", "my bed used to be so soft. i don't remember when was the last time i slept on something that soft.", "i wish i could hear my mom's voice again."] },
    table: { pos: new THREE.Vector3(0, 0, -5), radius: 3, explored: false, logs: ["i remember i used to hate homework.", "my sister used to help me with math."] },
    toys: { pos: new THREE.Vector3(0, 0, 3), radius: 3.5, explored: false, logs: ["i liked this cartoon. i wish they hadn't cancelled it by now.", "i used to be so happy over such small things."] },
    closet: { pos: new THREE.Vector3(6, 0, 6), radius: 3.5, explored: false, logs: ["i used to hide in here during hide and seek.", "it felt safe in the dark back then."] },
    window: { pos: new THREE.Vector3(4, 0, -6), radius: 3, explored: false, logs: ["the snow used to be so magical.", "now it just feels cold."] },
    computer: { pos: new THREE.Vector3(0, 0, -5), radius: 3, explored: false, logs: ["We can't stay in here forever.", "It's time to wake up."] }
};

const uiLayer = document.getElementById('ui-layer');
const interactBtn = document.getElementById('interact-btn');
const noiseOverlay = document.getElementById('noise-overlay');
let logQueue = [];

function createLogWindow(text, isGlitch = false, randomSize = false) {
    const win = document.createElement('div');
    win.className = 'log-container window';
    
    // Random position within screen bounds
    const maxX = window.innerWidth - (randomSize ? 600 : 450);
    const maxY = window.innerHeight - (randomSize ? 300 : 200);
    win.style.left = Math.max(20, Math.random() * maxX) + 'px';
    win.style.top = Math.max(20, Math.random() * maxY) + 'px';

    if (randomSize) {
        win.style.transform = `scale(${Math.random() * 1.5 + 0.5})`;
    }

    let innerHtml = `
        <div class="window-header">
            <span>${isGlitch ? 'ERROR_FATAL.SYS' : 'SYSTEM_MEMORY_LOG.TXT'}</span>
            <span class="close-btn">[X]</span>
        </div>
        <div class="window-body"><p class="${isGlitch ? 'glitch-text' : ''}">> ${text}</p></div>
    `;
    win.innerHTML = innerHtml;
    uiLayer.appendChild(win);

    win.querySelector('.close-btn').addEventListener('click', () => {
        if(gameState === "SCARE") return; // Cannot close during scare
        win.remove();
        showNextLog();
    });

    noteSound.currentTime = 0; noteSound.play().catch(()=>{});
}

function showNextLog() {
    if (logQueue.length > 0) {
        createLogWindow(logQueue.shift());
        isInteracting = true;
    } else {
        isInteracting = false;
        if (gameState === "INTRO") { gameState = "EXPLORE"; bgmNorm.play().catch(()=>{}); }
        else if (gameState === "EXPLORE") { checkExplorationComplete(); }
        else if (gameState === "WAKEUP") { document.getElementById('black-screen').style.display = 'flex'; }
    }
}

interactBtn.addEventListener('click', () => {
    if (currentFocusKey && !interactions[currentFocusKey].explored && !isInteracting) {
        interactions[currentFocusKey].explored = true;
        interactBtn.style.display = 'none';
        logQueue = [...interactions[currentFocusKey].logs];
        showNextLog();
    }
});

function checkExplorationComplete() {
    if (interactions.bed.explored && interactions.table.explored && interactions.toys.explored && interactions.closet.explored && interactions.window.explored) {
        startCutscene();
    }
}

let cutsceneTimer = 0;
function startCutscene() {
    gameState = "CUTSCENE";
    isInteracting = true;
    bgmNorm.pause();
    
    ambientLight.intensity = 0.1; ceilingLight.intensity = 2;
    screenMat.color = new THREE.Color(0xffffff); screenMat.emissive = new THREE.Color(0x88ff88);
    screenLight.intensity = 5;
    
    // Add noise overlay
    noiseOverlay.style.opacity = 0.5;
}

// MOVEMENT LOGIC
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
let targetRotation = 0;

function handleMovement(time) {
    if (isInteracting && gameState !== "CUTSCENE") return;

    if (gameState === "CUTSCENE") {
        cutsceneTimer += 0.01;
        
        // VERY slow approach
        playerModel.position.x = THREE.MathUtils.lerp(playerModel.position.x, 0, 0.005);
        playerModel.position.z = THREE.MathUtils.lerp(playerModel.position.z, -5, 0.005);
        playerModel.rotation.y = THREE.MathUtils.lerp(playerModel.rotation.y, Math.PI, 0.02);
        
        leftLegPivot.rotation.x = Math.sin(time * 3) * 0.3; // Slower steps
        rightLegPivot.rotation.x = Math.sin(time * 3 + Math.PI) * 0.3;

        // Dark figure rises from floor behind player
        darkFigure.visible = true;
        darkFigure.position.y = THREE.MathUtils.lerp(darkFigure.position.y, 0, 0.01);

        if (cutsceneTimer > 1 && cutsceneTimer < 1.02) { createLogWindow("why?"); }
        if (cutsceneTimer > 3 && cutsceneTimer < 3.02) { createLogWindow("was that necessary?"); }
        if (cutsceneTimer > 5 && cutsceneTimer < 5.02) { createLogWindow("not found."); }
        
        if (cutsceneTimer > 8) {
            uiLayer.innerHTML = ''; // Clear logs
            leftLegPivot.rotation.x = 0; rightLegPivot.rotation.x = 0;
            playerModel.position.y = Math.sin(time * 50) * 0.05; // Shake
            
            if (cutsceneTimer > 10) {
                gameState = "SCARE"; executeScare();
            }
        }
        
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerModel.position.x, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, playerModel.position.z + 10, 0.05);
        return;
    }

    const speed = 0.05; // SLOWER General Movement
    let moving = false; let moveX = 0, moveZ = 0;

    if (keys['w'] || keys['arrowup']) { moveZ -= speed; moving = true; }
    if (keys['s'] || keys['arrowdown']) { moveZ += speed; moving = true; }
    if (keys['a'] || keys['arrowleft']) { moveX -= speed; moving = true; }
    if (keys['d'] || keys['arrowright']) { moveX += speed; moving = true; }

    if (moving) {
        let newX = playerModel.position.x + moveX; let newZ = playerModel.position.z + moveZ;
        if (newX > 7) newX = 7; if (newX < -7) newX = -7;
        if (newZ > 7) newZ = 7; if (newZ < -7) newZ = -7;
        playerModel.position.x = newX; playerModel.position.z = newZ;
        targetRotation = Math.atan2(moveX, moveZ);
        
        if (gameState === "EXPLORE") {
            leftLegPivot.rotation.x = Math.sin(time * 8) * 0.5; rightLegPivot.rotation.x = Math.sin(time * 8 + Math.PI) * 0.5;
        } else if (gameState === "WAKEUP") {
            playerModel.position.y = Math.abs(Math.sin(time * 3)) * 0.05; 
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

    // Proximity Detection
    let nearSomething = false;
    if (gameState === "EXPLORE") {
        for (const [key, item] of Object.entries(interactions)) {
            if (key !== "computer" && !item.explored && playerModel.position.distanceTo(item.pos) < item.radius) {
                nearSomething = true; currentFocusKey = key;
                interactBtn.style.display = 'block';
                break;
            }
        }
    } else if (gameState === "WAKEUP") {
        if (!interactions.computer.explored && playerModel.position.distanceTo(interactions.computer.pos) < 3) {
            nearSomething = true; currentFocusKey = "computer";
            interactBtn.style.display = 'block';
        }
    }
    if (!nearSomething && !isInteracting) { interactBtn.style.display = 'none'; currentFocusKey = null; }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerModel.position.x, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, playerModel.position.z + 10, 0.05);
}

function executeScare() {
    bgmScary.play().catch(()=>{});
    ambientLight.intensity = 0; ceilingLight.intensity = 0; screenLight.intensity = 0;
    noiseOverlay.style.opacity = 1;

    // SPAM LOGS
    let spams = 0;
    const spamInterval = setInterval(() => {
        const gibberish = "CAN YOU HEAR ME IT'S COLD WAKE UP NO NO NO".split('').map(c => Math.random() > 0.5 ? c : '!@#$%'[(Math.floor(Math.random()*5))]).join('');
        createLogWindow(gibberish, true, true);
        spams++;
        if(spams > 30) {
            clearInterval(spamInterval);
            
            // SUDDEN SILENCE
            bgmScary.pause();
            noteSound.pause();
            uiLayer.innerHTML = '';
            
            // RHETORICAL ANXIOUS QUESTIONS
            const qs = ["Was it easier to close your eyes?", "Did you think hiding would erase it?", "Who is really trapped here?"];
            let qIdx = 0;
            const qInt = setInterval(() => {
                if (qIdx < qs.length) {
                    const blackScreen = document.getElementById('black-screen');
                    blackScreen.style.display = 'flex';
                    document.getElementById('ending-text').innerText = qs[qIdx];
                    qIdx++;
                } else {
                    clearInterval(qInt);
                    document.getElementById('black-screen').style.display = 'none';
                    transformRoomToReality();
                }
            }, 3000);
        }
    }, 150);
}

function transformRoomToReality() {
    gameState = "WAKEUP";
    isInteracting = false;
    noiseOverlay.style.opacity = 0;
    
    toys.forEach(t => roomGroup.remove(t)); roomGroup.remove(bed);
    backWall.material = darkWallMat; leftWall.material = darkWallMat; rightWall.material = darkWallMat; frontWall.material = darkWallMat;
    windowMesh.material = new THREE.MeshStandardMaterial({ color: 0x050505 });
    
    ambientLight.intensity = 0.05;
    screenLight.intensity = 3; screenLight.color = new THREE.Color(0xffffff);
    screenMat.emissive = new THREE.Color(0x333333); 

    scene.remove(character);
    playerModel = darkFigure;
    playerModel.position.set(0, 0, 5);
    playerModel.rotation.y = 0;
}

// ENDING CHOICES LOGIC
document.getElementById('choice-back').addEventListener('click', () => {
    document.getElementById('black-screen').style.display = 'none';
    playerModel.rotation.y = 0; // Figure turns around to face camera
    camera.position.set(0, 4, 8); // Move camera close
});

document.getElementById('choice-point').addEventListener('click', () => {
    window.close();
    // Fallback if browser blocks close
    document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:20%'>...</h1>";
});

// START
document.getElementById('start-overlay').addEventListener('click', function() {
    this.style.display = 'none';
    setTimeout(() => {
        logQueue = ["do you still remember when the room used to look like this?", "you better look around while you still can."];
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