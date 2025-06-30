import * as THREE from "three";
import { loadModel, lightAuto, createDebugGuiFolder } from "../utils/utils.js";
import { COLOR_HP, COLOR_MP, MODEL_CACHES } from "../../../index.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { champScales } from "../data/champs.js";

function getChampionScale(champName) {
  return (
    champScales.find(
      (champScale) => champScale.name.toLowerCase() === champName
    )?.scale || [0.01, 0.01, 0.01]
  );
}

function createBarGroup(color, tickCount = 0, width = 2, height = 0.25) {
  const group = new THREE.Group();

  // Background bar
  const bgBar = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: "black",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    })
  );
  group.add(bgBar);

  // Foreground bar
  const fgBar = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    })
  );
  fgBar.position.z = 0.001;
  fgBar.renderOrder = 1;
  group.add(fgBar);

  // Ticks
  const ticks = [];
  const tickMaterial = new THREE.MeshBasicMaterial({
    color: "#222",
    side: THREE.DoubleSide,
    depthTest: false,
  });
  for (let i = 1; i < tickCount; i++) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.02, height),
      tickMaterial
    );
    tick.position.x = -width / 2 + (i * width) / tickCount;
    group.add(tick);
    ticks.push(tick);
  }

  return { barGroup: group, fgBar, ticks };
}

function updateBar(barMesh, value, barWidth = 2) {
  barMesh.scale.x = Math.max(0, Math.min(1, value));
  barMesh.position.x = (-(1 - barMesh.scale.x) * barWidth) / 2;
}

function setupStatusBars(scene, champScene, size) {
  const statusBarGroup = new THREE.Group();
  const barWidth = 2;
  const barHeight = 0.25;
  const barYOffset = size.y + (size.y < 2.5 ? 1 : 0.4);

  const maxHp = 1000;
  const hpPerTick = 100;
  const tickCount = Math.floor(maxHp / hpPerTick);

  const { barGroup: hpBarGroup, fgBar: hpBar } = createBarGroup(
    COLOR_HP,
    tickCount,
    barWidth,
    barHeight
  );
  hpBarGroup.position.set(0, barYOffset, 0);
  hpBar.position.copy(hpBarGroup.position);
  statusBarGroup.add(hpBarGroup);

  const { barGroup: manaBarGroup, fgBar: manaBar } = createBarGroup(
    COLOR_MP,
    0,
    barWidth,
    barHeight
  );
  manaBarGroup.position.set(0, barYOffset - 0.15, 0);
  manaBar.position.copy(manaBarGroup.position);
  statusBarGroup.add(manaBarGroup);

  statusBarGroup.add(hpBar);
  statusBarGroup.add(manaBar);
  statusBarGroup.position.copy(champScene.position);
  statusBarGroup.rotation.x = -0.5;

  scene.add(statusBarGroup);

  return { statusBarGroup, hpBar, manaBar };
}

function setupDragHelper(
  scene,
  champScene,
  size,
  position,
  rotation,
  hpBar,
  manaBar,
  statusBarGroup,
  champName,
  scale
) {
  const dragHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dragHelper.scale.set(size.x, size.y, 1);
  dragHelper.champScene = champScene;
  dragHelper.position.set(...position);
  dragHelper.rotation.copy(rotation);
  dragHelper.hpBar = hpBar;
  dragHelper.manaBar = manaBar;
  dragHelper.statusGroup = statusBarGroup;
  dragHelper.name = champName;
  dragHelper.scaleData = scale;
  scene.add(dragHelper);
  return dragHelper;
}

function playChampionAnimation(mixer, champScene, animations) {
  const idleAnimation = animations.find(
    (anim) =>
      anim.name.toLowerCase().startsWith("idle") &&
      anim.name.toLowerCase() !== "idlein"
  );
  mixer = new THREE.AnimationMixer(champScene);
  if (idleAnimation) {
    mixer.clipAction(idleAnimation).play();
  } else {
    animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  }
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
  }
  animate();
}

const addChampion = (
  scene,
  mixer,
  champName = "",
  callback = () => {},
  position = [0, 0, 0],
  championURL = "./assets/models/champions/rengar_(tft_set_14).glb"
) => {
  const MODEL_VISIBLE = true;
  const scale = getChampionScale(champName);
  // console.log(champName);
  // console.log(scale);

  const handleLoadModel = (gltf) => {
    const champScene = gltf.scene;
    scene.add(champScene);
    champScene.visible = MODEL_VISIBLE;
    champScene.position.set(...position);
    champScene.scale.set(...scale);
    champScene.rotation.x = -0.5;
    const size = gltf.size;

    // Status bars
    const { statusBarGroup, hpBar, manaBar } = setupStatusBars(
      scene,
      champScene,
      size
    );

    // Drag helper
    const dragHelper = setupDragHelper(
      scene,
      champScene,
      size,
      position,
      champScene.rotation,
      hpBar,
      manaBar,
      statusBarGroup,
      champName,
      scale
    );

    // Update bars
    updateBar(dragHelper.hpBar, 0.6);
    updateBar(dragHelper.manaBar, 0.3);

    lightAuto(champScene);

    // Animation
    playChampionAnimation(mixer, champScene, gltf.animations);

    callback(dragHelper);
  };

  if (MODEL_CACHES[championURL]) {
    const cached = MODEL_CACHES[championURL];
    const clonedScene = clone(cached.scene);
    const clonedGltf = {
      scene: clonedScene,
      animations: cached.animations,
      size: cached.size,
    };
    handleLoadModel(clonedGltf);
    return;
  }

  loadModel(
    championURL,
    (gltf) => {
      const champScene = gltf.scene;
      champScene.position.set(...position);
      champScene.scale.set(...scale);
      champScene.rotation.x = -0.5;
      const box = new THREE.Box3().setFromObject(champScene, true);
      const size = new THREE.Vector3();
      box.getSize(size);
      gltf.size = size;
      MODEL_CACHES[championURL] = gltf;
      handleLoadModel(gltf);
    },
    (err) => {
      console.error(err);
    },
    null
  );
};

export { addChampion };
