import * as THREE from "https://esm.sh/three";
import { loadModel, lightAuto, createDebugGuiFolder } from "~~/utils/utils";
import { COLOR_HP, COLOR_MP, MODEL_CACHES, TRAITS_INFOR } from "~/variables.js";
import { clone } from "https://esm.sh/three/examples/jsm/utils/SkeletonUtils.js";
import { champScales } from "~/assets/scripts/data/champs.js";
import { draggableObjects } from "~/main";

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
  champData,
  rotation,
  hpBar,
  manaBar,
  statusBarGroup
) {
  const dragHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dragHelper.scale.set(size.x, size.y, 1);
  dragHelper.champScene = champScene;
  dragHelper.position.set(...champData.position);
  dragHelper.rotation.copy(rotation);
  dragHelper.hpBar = hpBar;
  dragHelper.manaBar = manaBar;
  dragHelper.statusGroup = statusBarGroup;
  dragHelper.name = champData.name;
  dragHelper.traits = champData.traits;
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

const traitListELement = document.getElementById("trait-list");
const addTraitItemToList = ({ trait, champs }) => {
  const champCount = champs.length;
  const traitItemElement = document.createElement("div");
  traitItemElement.className =
    "w-[3vw] cursor-pointer h-[3vw] mb-[0.2vw] relative flex items-center justify-center";
  const traitItemHtml = `
              <div
                class="bg-black/80 rounded-lg h-[80%] absolute left-[1.2vw] flex items-center"
              >
                <div class="flex flex-col justify-center ml-[2.5vw] h-[80%] pr-5">
                  <span class="inline-block text-[1vw] text-white/50 text-nowrap">${trait}</span>
                  <div class="flex text-white/50 text-[0.75vw] mt-[-0.4vw]">
                    <span class="">${champCount}</span>
                    <span class="mx-1">/</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
              <img
                src="./assets/images/style-0.png"
                alt="left-bar-icon"
                class="w-full h-full absolute"
                draggable="true"
                data-item-id="0"
                data-item-name="Lesser_Champion_Duplicator_TFT_item"
              />
              <div
                class="mask-[url('/assets/classes_icons/${trait.replaceAll(
                  " ",
                  "_"
                )}_TFT_icon.svg')] bg-white/30 mask-no-repeat mask-center mask-contain w-[1.2vw] h-[1.2vw] absolute"
              ></div>
        `;
  traitItemElement.innerHTML = traitItemHtml;
  traitListELement?.appendChild(traitItemElement);
};

const renderTraits = () => {
  const champsInBattlefield = draggableObjects.filter(
    (champ) => champ.bfIndex != -1
  );

  const myTraits = {};
  champsInBattlefield.forEach((champ) => {
    champ?.traits.forEach((trait) => {
      if (!myTraits[trait]) {
        myTraits[trait] = [champ.name];
      } else {
        const isChampNameExisted = myTraits[trait].find(
          (cn) => champ.name === cn
        );
        if (!isChampNameExisted) {
          myTraits[trait].push(champ.name);
        }
      }
    });
  });

  // console.log(myTraits);
  const myTraitsArr = Object.entries(myTraits).map(([trait, champs]) => ({
    trait,
    champs,
  }));

  traitListELement?.replaceChildren();
  myTraitsArr.forEach((trait) => {
    addTraitItemToList(trait);
  });
};

const addChampion = (
  scene,
  mixer,
  champData = { name: "", url: "", position: [], traits: [] },
  callback = () => {}
) => {
  const MODEL_VISIBLE = true;
  const scale = getChampionScale(champData.name.replaceAll("_", " "));
  // console.log(champData.name);
  // console.log(scale);

  const handleLoadModel = (gltf) => {
    const champScene = gltf.scene;
    scene.add(champScene);
    champScene.visible = MODEL_VISIBLE;
    champScene.position.set(...champData.position);
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
      champData,
      champScene.rotation,
      hpBar,
      manaBar,
      statusBarGroup
    );

    // Update bars
    updateBar(dragHelper.hpBar, 0.6);
    updateBar(dragHelper.manaBar, 0.3);

    lightAuto(champScene);

    // Animation
    playChampionAnimation(mixer, champScene, gltf.animations);

    callback(dragHelper);
  };

  if (MODEL_CACHES[champData.url]) {
    const cached = MODEL_CACHES[champData.url];
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
    champData.url,
    (gltf) => {
      const champScene = gltf.scene;
      champScene.position.set(...champData.position);
      champScene.scale.set(...scale);
      champScene.rotation.x = -0.5;
      const box = new THREE.Box3().setFromObject(champScene, true);
      const size = new THREE.Vector3();
      box.getSize(size);
      gltf.size = size;
      MODEL_CACHES[champData.url] = gltf;
      handleLoadModel(gltf);
    },
    (err) => {
      console.error(err);
    },
    null
  );
};

export { addChampion, renderTraits };
