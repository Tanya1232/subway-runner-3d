import { createWallet } from './wallet.js';

const $ = id => document.getElementById(id);
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
if (tg?.isVersionAtLeast?.('6.9')) {
  tg.setHeaderColor("#080d19");
  tg.setBackgroundColor("#080d19");
}
const home = () => location.assign(new URL('/rivalcoin/',location.origin));
for (const link of document.querySelectorAll('[data-home]')) {
  link.addEventListener('click',event => { event.preventDefault(); home(); });
}
tg?.BackButton?.show();
tg?.BackButton?.onClick(home);

let lastRun, adBusy = false, adNotice = '';
const wallet = createWallet(tg,paintWallet);
paintWallet();

function paintWallet() {
  $('record').textContent = wallet.record + ' м';
  if (!lastRun) return;
  const receipt = wallet.receipt(lastRun.id);
  $('final-coins').textContent = lastRun.coins * (lastRun.bonus ? 2 : 1) + ' RIVAL';
  $('reward-ad').hidden = !wallet.connected || !lastRun.coins || lastRun.bonus;
  $('reward-ad').disabled = adBusy;
  $('save-status').textContent = adBusy ? 'Открываем видео…' : adNotice ||
    (!wallet.connected ? 'Войдите через RivalCoin для зачисления наград.'
      : wallet.failed ? (wallet.storageFailed ? 'Нет связи. Оставьте окно открытым для сохранения.'
        : 'Прогресс на устройстве. Начислим, когда появится сеть.')
      : receipt && (!lastRun.bonus || receipt.bonus) ? 'Результат сохранён в RivalCoin.'
        : 'Сохраняем результат…');
}
$('reward-ad').addEventListener('click',async () => {
  if (!lastRun || !lastRun.coins || lastRun.bonus || adBusy) return;
  const show = window.show_11997011;
  if (typeof show !== 'function') {
    adNotice = 'Видео пока недоступно.';
    paintWallet();
    return;
  }
  const run = lastRun;
  adBusy = true;
  adNotice = '';
  paintWallet();
  try {
    await show();
    run.bonus = true;
    wallet.enqueue(run);
  } catch { if (lastRun === run) adNotice = 'Просмотр прерван. Попробуйте ещё раз.'; }
  finally { adBusy = false; paintWallet(); }
});

try {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  prepare(THREE);
  $('startup').hidden = true;
  $('start').disabled = false;
} catch (error) {
  $('startup').textContent = 'Трасса не загрузилась. Проверьте соединение и поддержку WebGL.';
  console.warn('Subway Runner startup:', error);
}

function prepare(THREE) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const instruction = mobile ? 'Свайп вбок — полоса · вверх — прыжок · вниз — подкат' :
    '← → движение · ↑ прыжок · ↓ подкат';
  $('instructions').textContent = $('run-hint').textContent = instruction;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171d39');
  scene.fog = new THREE.FogExp2('#242548',.018);
  const camera = new THREE.PerspectiveCamera(60,1,.1,180);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  $('world').append(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = -1;
  scene.add(new THREE.HemisphereLight('#b6b9ff','#292344',2.1));
  const moon = new THREE.DirectionalLight('#cdd1ff',2);
  moon.position.set(-5,12,-5);
  scene.add(moon);
  const fill = new THREE.DirectionalLight('#56d7ec',1.7);
  fill.position.set(3,6,5);
  scene.add(fill);

  const geometry = new Map();
  const box = (group, material, width,height,depth,x=0,y=0,z=0) => {
    const key = width + '/' + height + '/' + depth;
    if (!geometry.has(key)) geometry.set(key,new THREE.BoxGeometry(width,height,depth));
    const mesh = new THREE.Mesh(geometry.get(key),material);
    mesh.position.set(x,y,z);
    group.add(mesh);
    return mesh;
  };
  const standard = color => new THREE.MeshStandardMaterial({ color, roughness: .68 });
  const light = color => new THREE.MeshBasicMaterial({ color });
  const ground = standard('#28283f'), sleeper = standard('#3e3345'), steel = standard('#708a9a');
  const cyan = light('#55f6e6'), purple = light('#c791ff'), amber = light('#ffcc6b'), red = light('#ff6989');
  const city = [standard('#26314d'),standard('#352a4e'),standard('#243646')];
  const trainMat = standard('#31465b'), trainTrim = standard('#5c7d90'), glass = standard('#131d34');
  const obstacleMat = standard('#8b5264'), dark = standard('#19243b'), skin = standard('#b98178');
  const suit = standard('#5877dd'), shoes = standard('#b7c8e5');
  const gold = new THREE.MeshStandardMaterial({ color: '#ffb84c', emissive: '#ea6c10', emissiveIntensity: .24, metalness: .5, roughness: .27 });
  const lanes = [-2.35,0,2.35];

  const stripLength = 8;
  const tiles = [];
  for (let i = 0; i < 19; i++) {
    const group = new THREE.Group();
    box(group,ground,9,.3,stripLength,0,-.2,0);
    for (const x of lanes) {
      for (const rail of [-.56,.56]) box(group,steel,.08,.12,stripLength,x+rail,.03,0);
      for (let z = -3.5; z < 4; z++) box(group,sleeper,1.66,.06,.16,x,-.005,z);
    }
    for (const side of [-1,1]) {
      box(group,city[i % 3],2.5,.4,stripLength,side*5.65,.02,0);
      box(group,i % 4 === 0 ? purple : cyan,.055,.04,5.5,side*4.48,.23,0);
      box(group,city[(i+1) % 3],.16,3.2,.16,side*4.9,1.8,-3.2);
      box(group,i % 4 === 0 ? purple : cyan,.42,.075,.18,side*4.73,3.34,-3.2);
    }
    if (i % 4 === 0) {
      box(group,dark,.23,6.1,.29,-4.8,3,0);
      box(group,dark,.23,6.1,.29,4.8,3,0);
      box(group,dark,9.8,.18,.48,0,5.96,0);
      box(group,purple,2.4,.10,.27,0,5.83,0);
    }
    group.position.z = 8 - i * stripLength;
    tiles.push(group);
  }

  const blocks = [];
  for (let i = 0; i < 16; i++) {
    const block = new THREE.Group();
    for (const side of [-1,1]) {
      const height = 7 + ((i * 3 + (side > 0 ? 2 : 0)) % 6) * 1.6;
      const x = side * (8.4 + i % 3 * .6);
      box(block,city[i % 3],5.3,height,7.8,x,height/2,0);
      for (let floor = 1; floor < height - .4; floor += 1.55) {
        const windows = (i + Math.round(floor)) % 3 ? glass : (side > 0 ? amber : purple);
        box(block,windows,.04,.26,5.2,x-side*2.66,floor,0);
      }
      box(block,i % 4 === 1 ? purple : glass,4.8,.08,.07,x,height-.14,3.92);
    }
    blocks.push(block);
  }

  // The repeated railway and buildings share one instanced draw per material.
  const terrain = new Map();
  for (const segment of [...tiles,...blocks]) {
    for (const mesh of segment.children) {
      if (!terrain.has(mesh.material)) terrain.set(mesh.material,{ entries: [] });
      terrain.get(mesh.material).entries.push({ segment, mesh });
    }
  }
  const unitBox = new THREE.BoxGeometry();
  const matrix = new THREE.Matrix4();
  for (const [material,batch] of terrain) {
    batch.mesh = new THREE.InstancedMesh(unitBox,material,batch.entries.length);
    batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.mesh.frustumCulled = false;
    scene.add(batch.mesh);
  }
  let lastTerrainDistance;
  function positionTerrain(travel) {
    if (travel === lastTerrainDistance) return;
    lastTerrainDistance = travel;
    for (const [segments,step,front] of [[tiles,stripLength,8],[blocks,10,9]]) {
      const length = segments.length * step;
      segments.forEach((segment,index) => {
        const offset = index * step - travel;
        segment.position.z = front - ((offset % length + length) % length);
      });
    }
    for (const batch of terrain.values()) {
      batch.entries.forEach(({ segment,mesh },index) => {
        const { width,height,depth } = mesh.geometry.parameters;
        matrix.makeScale(width,height,depth);
        matrix.setPosition(mesh.position.x,mesh.position.y,mesh.position.z+segment.position.z);
        batch.mesh.setMatrixAt(index,matrix);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  const avatar = new THREE.Group(), body = new THREE.Group();
  avatar.add(body);
  box(body,suit,.63,.64,.39,0,1.05,0);
  box(body,dark,.62,.22,.36,0,.66,0);
  box(body,skin,.40,.39,.37,0,1.57,0);
  box(body,dark,.49,.19,.42,0,1.72,-.015);
  box(body,cyan,.39,.09,.035,0,1.58,-.201);
  box(body,trainTrim,.40,.39,.20,0,1.09,.29);
  box(body,cyan,.27,.047,.032,0,1.18,.41);
  box(body,amber,.13,.045,.03,0,1.02,.41);
  const legs = [], arms = [];
  for (const side of [-1,1]) {
    const leg = new THREE.Group();
    leg.position.set(side*.163,.68,0);
    box(leg,dark,.22,.50,.23,0,-.24,0);
    box(leg,shoes,.25,.14,.37,0,-.57,-.05);
    body.add(leg);
    legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(side*.42,1.27,0);
    box(arm,suit,.18,.40,.22,0,-.18,0);
    box(arm,skin,.18,.14,.20,0,-.43,0);
    body.add(arm);
    arms.push(arm);
  }
  scene.add(avatar);
  const coinGeo = new THREE.CylinderGeometry(.26,.26,.081,20);
  const ringGeo = new THREE.TorusGeometry(.19,.023,7,24);
  const pickupGeo = new THREE.OctahedronGeometry(.39);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({
    color: '#040918', transparent: true, opacity: .6, depthWrite: false
  }));
  shadow.rotation.x = -Math.PI/2;
  shadow.position.y = .02;
  scene.add(shadow);

  function obstacle(type) {
    const group = new THREE.Group();
    if (type === 'train') {
      box(group,trainMat,1.92,2.88,6.6,0,1.5,-3.4);
      box(group,trainTrim,1.93,.24,6.62,0,1.04,-3.4);
      box(group,dark,1.59,.81,.12,0,2.11,-.065);
      box(group,glass,1.38,.56,.04,0,2.16,.016);
      box(group,cyan,1.21,.065,.035,0,2.72,.015);
      for (const side of [-1,1]) {
        box(group,amber,.22,.13,.043,side*.67,.74,.016);
        for (const z of [-1.5,-3.2,-4.9]) box(group,glass,.05,.55,1.23,side*.971,2.15,z);
      }
    } else if (type === 'barrier') {
      box(group,obstacleMat,1.62,.27,.28,0,.70,0);
      box(group,amber,1.52,.07,.29,0,.74,0);
      for (const side of [-1,1]) box(group,dark,.14,.7,.19,side*.64,.35,0);
    } else {
      for (const side of [-1,1]) box(group,dark,.13,1.95,.21,side*.85,.99,0);
      box(group,obstacleMat,1.82,.53,.35,0,1.63,0);
      box(group,purple,1.75,.075,.36,0,1.43,0);
    }
    return group;
  }
  function pickup(type) {
    if (type !== 'coin') return new THREE.Mesh(pickupGeo,type === 'magnet' ? purple : cyan);
    const group = new THREE.Group();
    const coin = new THREE.Mesh(coinGeo,gold);
    coin.rotation.x = Math.PI/2;
    group.add(coin);
    const ring = new THREE.Mesh(ringGeo,amber);
    ring.position.z = .045;
    group.add(ring);
    return group;
  }

  let mode = 'menu', runningDistance = 0, coins = 0, lane = 1, x = 0, y = 0, vy = 0, slide = 0;
  let nextRow = 27, safeLane = 1, row = 0, magnet = 0, shield = false, shake = 0;
  let visualClock = 0, elapsed = 0, frame, hintTime = 0, audio, sound = true;
  const objects = [];
  function addObject(type,index,distance) {
    const isPrize = ['coin','magnet','shield'].includes(type);
    const mesh = isPrize ? pickup(type) : obstacle(type);
    mesh.position.set(lanes[index],isPrize ? .85 : 0,runningDistance-distance);
    scene.add(mesh);
    objects.push({ type, isPrize, distance, mesh, checked: false });
  }
  function removeObject(index) {
    scene.remove(objects[index].mesh);
    objects.splice(index,1);
  }
  function generateRow() {
    row++;
    const possible = [safeLane-1,safeLane,safeLane+1].filter(value => value >= 0 && value <= 2);
    safeLane = possible[Math.floor(Math.random()*possible.length)];
    const other = [0,1,2].filter(index => index !== safeLane);
    const type = row === 1 ? 'train' : ['train','barrier','gate'][Math.floor(Math.random()*3)];
    const blockedLane = other[Math.floor(Math.random()*2)];
    addObject(type,blockedLane,nextRow);
    if (runningDistance > 100 && row % 3 === 0) {
      addObject(row % 2 ? 'barrier' : 'gate',other.find(index => index !== blockedLane),nextRow);
    }
    for (let i = 0; i < 4; i++) addObject('coin',safeLane,nextRow-5+i*1.55);
    if (row % 7 === 0) addObject(row % 14 === 0 ? 'magnet' : 'shield',safeLane,nextRow+2.7);
    nextRow += 16 + Math.min(13,runningDistance*.018);
  }

  function beep(frequency,length,volume=.055,type='sine') {
    if (!sound || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency,now);
    gain.gain.setValueAtTime(volume,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+length);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now+length);
  }
  function enableAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!sound || !Audio) return;
    audio ??= new Audio();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  }

  function show(screen) {
    mode = screen;
    for (const name of ['menu','paused','results']) $(name).hidden = screen !== name;
    $('hud').hidden = screen !== 'running';
    $('run-hint').hidden = screen !== 'running' || hintTime <= 0;
  }
  function reset() {
    if (mode === 'running' || $('start').disabled) return;
    enableAudio();
    for (let i = objects.length-1; i >= 0; i--) removeObject(i);
    runningDistance = coins = x = y = vy = slide = row = magnet = shake = elapsed = 0;
    nextRow = 27;
    lane = safeLane = 1;
    shield = false;
    hintTime = 4;
    lastRun = null;
    adNotice = '';
    for (let i = 0; i < 6; i++) addObject('coin',1,6+i*1.5);
    drawHud();
    show('running');
    canvas.focus();
  }
  function pause() {
    if (mode !== 'running') return;
    show('paused');
    $('resume').focus();
  }
  function resume() {
    if (mode !== 'paused') return;
    enableAudio();
    show('running');
    canvas.focus();
  }
  function finish() {
    if (mode !== 'running') return;
    beep(155,.34,.12,'triangle');
    const meters = Math.floor(runningDistance);
    $('result-label').textContent = wallet.keepBest(meters) ? 'НОВЫЙ РЕКОРД' : 'РЕЗУЛЬТАТ';
    $('final-distance').textContent = meters + ' м';
    lastRun = { id: crypto.randomUUID(), at: Date.now(), coins, distance: meters, bonus: false };
    wallet.enqueue(lastRun);
    paintWallet();
    show('results');
    $('again').focus();
  }
  $('start').addEventListener('click',reset);
  $('restart').addEventListener('click',reset);
  $('again').addEventListener('click',reset);
  $('pause').addEventListener('click',pause);
  $('resume').addEventListener('click',resume);
  try { sound = localStorage.getItem('runner_mute') !== 'yes'; } catch { /* Optional preference. */ }
  function soundLabel() {
    $('sound').textContent = sound ? 'Звук включён' : 'Звук выключен';
    $('sound').setAttribute('aria-pressed',String(sound));
  }
  soundLabel();
  $('sound').addEventListener('click',() => {
    sound = !sound;
    soundLabel();
    try { localStorage.setItem('runner_mute',sound ? 'no' : 'yes'); } catch { /* Optional preference. */ }
    if (sound) enableAudio();
  });

  function input(action) {
    if (mode !== 'running') return;
    if (action === 'left') lane = Math.max(0,lane-1);
    else if (action === 'right') lane = Math.min(2,lane+1);
    else if (action === 'jump' && y === 0) {
      slide = 0;
      vy = 8.1;
      beep(370,.17);
    } else if (action === 'slide') {
      slide = .67;
      if (y > 0) vy = -12;
    }
  }
  const controls = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'slide', KeyS: 'slide' };
  window.addEventListener('keydown',event => {
    if (event.repeat) return;
    if (event.code === 'Escape') {
      if (mode === 'running') pause();
      else resume();
    } else if (!event.target.closest?.('button, a') && controls[event.code] && mode === 'running') {
      event.preventDefault();
      input(controls[event.code]);
    }
  });
  let swipe;
  canvas.addEventListener('pointerdown',event => {
    if (mode !== 'running' || event.pointerType === 'mouse' || swipe) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup',event => {
    if (swipe?.id !== event.pointerId) return;
    const dx = event.clientX-swipe.x, dy = event.clientY-swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) input(dx < 0 ? 'left' : 'right');
    else input(dy < 0 ? 'jump' : 'slide');
  });
  canvas.addEventListener('lostpointercapture',event => { if (swipe?.id === event.pointerId) swipe = null; });
  document.addEventListener('visibilitychange',() => { if (document.hidden) pause(); });
  window.addEventListener('blur',pause);

  function drawHud() {
    $('distance').textContent = Math.floor(runningDistance);
    $('coins').textContent = coins;
    const power = [shield && 'Щит',magnet > 0 && 'Магнит · ' + Math.ceil(magnet) + ' с'].filter(Boolean);
    $('power').hidden = !power.length;
    $('power').textContent = power.join(' · ');
  }

  function step(dt) {
    const speed = Math.min(26,10 + runningDistance*.021);
    elapsed += dt;
    runningDistance += speed*dt;
    hintTime -= dt;
    if (hintTime <= 0) $('run-hint').hidden = true;
    x += (lanes[lane]-x)*(1-Math.exp(-15*dt));
    if (y > 0 || vy > 0) {
      y = Math.max(0,y+vy*dt);
      vy -= 22*dt;
      if (y === 0) vy = 0;
    }
    slide = Math.max(0,slide-dt);
    magnet = Math.max(0,magnet-dt);
    shake = Math.max(0,shake-dt);
    while (nextRow < runningDistance+100) generateRow();

    for (let i = objects.length-1; i >= 0; i--) {
      const item = objects[i];
      const z = item.mesh.position.z = runningDistance-item.distance;
      if (item.isPrize) {
        item.mesh.rotation.y += dt*4.5;
        const nearby = Math.abs(item.mesh.position.x - x) < .77;
        const attracted = item.type === 'coin' && magnet > 0;
        if (z >= -.53 && z < .85 && (attracted || (nearby && y < .92))) {
          if (item.type === 'coin') { coins++; beep(635+(coins%5)*75,.10); }
          else {
            if (item.type === 'magnet') magnet = 9;
            else shield = true;
            beep(1140,.26);
          }
          removeObject(i);
          continue;
        }
      } else if (!item.checked && z >= -.42 && z < (item.type === 'train' ? 6.8 : .73) &&
        Math.abs(item.mesh.position.x-x) < (item.type === 'train' ? 1.14 : .91)) {
        item.checked = true;
        if ((item.type === 'barrier' && y >= .62) || (item.type === 'gate' && slide > 0 && y < .23)) {
          beep(540,.12);
        } else if (shield) {
          shield = false;
          shake = .33;
          bodyFlash();
          beep(249,.24);
          removeObject(i);
          continue;
        } else {
          finish();
          break;
        }
      }
      if (z > (item.type === 'train' ? 10 : 4)) removeObject(i);
    }
    drawHud();
  }

  let flash;
  function bodyFlash() {
    clearTimeout(flash);
    document.body.classList.add('impact');
    flash = setTimeout(() => document.body.classList.remove('impact'),350);
  }

  function draw(now) {
    const dt = frame ? Math.min(.05,(now-frame)/1000) : 0;
    frame = now;
    visualClock += dt;
    if (mode === 'running') step(dt);
    positionTerrain(runningDistance);

    const gait = Math.sin((mode === 'menu' ? visualClock : elapsed) * 13);
    avatar.position.set(x,y,0);
    body.scale.y += ((slide > 0 && y < .2 ? .52 : 1)-body.scale.y) * (1-Math.exp(-18*dt));
    body.rotation.z = (x-lanes[lane])*.10;
    body.rotation.x = slide > 0 && y < .2 ? -.30 : 0;
    legs[0].rotation.x = gait*.64;
    legs[1].rotation.x = -gait*.64;
    arms[0].rotation.x = -gait*.51;
    arms[1].rotation.x = gait*.51;
    shadow.position.x = x;
    shadow.scale.setScalar(1-y*.25);
    const portrait = innerHeight > innerWidth;
    camera.position.set(x*(portrait ? .31 : .19) + Math.sin(visualClock*58)*shake*.25,4.24 + y*.16,portrait ? 8.5 : 7.4);
    camera.lookAt(x*.24, .21, -9);
    renderer.render(scene,camera);
    requestAnimationFrame(draw);
  }

  function resize() {
    camera.aspect = innerWidth / Math.max(1,innerHeight);
    camera.fov = innerHeight > innerWidth ? 61 : 54;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
  window.addEventListener('resize',resize);
  resize();
  requestAnimationFrame(draw);
}
