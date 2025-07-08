import * as THREE from "https://esm.sh/three";
import { loadModel, lightAuto, createDebugGuiFolder } from "~~/utils/utils";
import { COLOR_HP, COLOR_MP, MODEL_CACHES, TRAITS_INFOR } from "~/variables.js";
import { clone } from "https://esm.sh/three/examples/jsm/utils/SkeletonUtils.js";
import { champScales } from "~~/data/champs.js";
import { draggableObjects } from "~/main";

export default class ChampionManager {
  constructor(scene, draggableObjects) {
    this.scene = scene;
    this.traitListElement = document.getElementById("trait-list");
    this.draggableObjects = draggableObjects;
  }

  getChampionScale(champName) {
    return (
      champScales.find((c) => c.name.toLowerCase() === champName)?.scale || [
        0.01, 0.01, 0.01,
      ]
    ).map((num) => num + 0.005);
  }

  createBarGroup(color, tickCount = 0, width = 2, height = 0.25) {
    const group = new THREE.Group();

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

  updateBar(barMesh, value, type = "hp", barWidth = 2) {
    const clamped = Math.max(0, Math.min(1, value));
    barMesh.scale.x = clamped;
    barMesh.position.x = (-(1 - barMesh.scale.x) * barWidth) / 2;

    // Chuyển màu từ xanh → vàng → đỏ
    // Xanh (0,1,0), Vàng (1,1,0), Đỏ (1,0,0)

    if (type === "hp") {
      let r, g;
      if (clamped > 0.5) {
        // Xanh → Vàng: tăng red
        r = (1 - clamped) * 2; // 0 → 1 khi clamped: 1 → 0.5
        g = 1;
      } else {
        // Vàng → Đỏ: giảm green
        r = 1;
        g = clamped * 2; // 1 → 0 khi clamped: 0.5 → 0
      }

      barMesh.material.color.setRGB(r, g, 0);
    }
  }

  setupStatusBars(champScene, size) {
    const statusBarGroup = new THREE.Group();
    const barWidth = 2;
    const barHeight = 0.25;

    const barYOffset = 4.5;

    const maxHp = 1000;
    const tickCount = Math.floor(maxHp / 100);

    const { barGroup: hpBarGroup, fgBar: hpBar } = this.createBarGroup(
      COLOR_HP,
      tickCount,
      barWidth,
      barHeight
    );
    hpBarGroup.position.set(0, barYOffset, 0);
    hpBar.position.copy(hpBarGroup.position);
    statusBarGroup.add(hpBarGroup);

    const { barGroup: manaBarGroup, fgBar: manaBar } = this.createBarGroup(
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

    this.scene.add(statusBarGroup);

    return { statusBarGroup, hpBar, manaBar };
  }

  setupDragHelper(
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
    dragHelper.maxHp = champData.maxHp ?? 1000;
    dragHelper.currentHp = dragHelper.maxHp;
    dragHelper.scale.set(size.x, size.y, 1);
    dragHelper.champScene = champScene;
    dragHelper.position.set(...champData.position);
    dragHelper.rotation.copy(rotation);
    dragHelper.hpBar = hpBar;
    dragHelper.manaBar = manaBar;
    dragHelper.statusBarGroup = statusBarGroup;
    dragHelper.name = champData.name;
    dragHelper.traits = champData.traits;
    this.scene.add(dragHelper);
    return dragHelper;
  }

  playChampionAnimation(mixer, champScene, animations) {
    const idle = animations.find(
      (a) =>
        a.name.toLowerCase().startsWith("idle") &&
        a.name.toLowerCase() !== "idlein"
    );
    mixer = new THREE.AnimationMixer(champScene);
    if (idle) {
      mixer.clipAction(idle).play();
    } else {
      animations.forEach((clip) => mixer.clipAction(clip).play());
    }

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
    };
    animate();
  }

  addTraitItemToList({ trait, champs }) {
    const champCount = champs.length;
    const div = document.createElement("div");
    div.className =
      "w-[3vw] cursor-pointer h-[3vw] mb-[0.2vw] relative flex items-center justify-center";
    div.innerHTML = `
      <div class="bg-black/80 rounded-lg h-[80%] absolute left-[1.2vw] flex items-center">
        <div class="flex flex-col justify-center ml-[2.5vw] h-[80%] pr-5">
          <span class="inline-block text-[1vw] text-white/50 text-nowrap">${trait}</span>
          <div class="flex text-white/50 text-[0.75vw] mt-[-0.4vw]">
            <span>${champCount}</span><span class="mx-1">/</span><span>5</span>
          </div>
        </div>
      </div>
      <img src="./assets/images/style-0.png" class="w-full h-full absolute"
        data-item-id="0" data-item-name="Lesser_Champion_Duplicator_TFT_item" />
      <div class="mask-[url('/assets/classes_icons/${trait.replaceAll(
        " ",
        "_"
      )}_TFT_icon.svg')] bg-white/30 mask-no-repeat mask-center mask-contain w-[1.2vw] h-[1.2vw] absolute"></div>
    `;
    this.traitListElement?.appendChild(div);
  }

  renderTraits() {
    const champsInBf = draggableObjects.filter((c) => c.bfIndex != -1);
    const traitsMap = {};

    champsInBf.forEach((champ) => {
      champ.traits.forEach((trait) => {
        if (!traitsMap[trait]) traitsMap[trait] = [champ.name];
        else if (!traitsMap[trait].includes(champ.name))
          traitsMap[trait].push(champ.name);
      });
    });

    const traitsArray = Object.entries(traitsMap).map(([trait, champs]) => ({
      trait,
      champs,
    }));

    this.traitListElement?.replaceChildren();
    traitsArray.forEach((trait) => this.addTraitItemToList(trait));
  }

  addChampion(mixer, champData, callback = () => {}) {
    const scale = this.getChampionScale(champData.name.replaceAll("_", " "));
    const handleLoad = (gltf) => {
      const champScene = gltf.scene;
      this.scene.add(champScene);
      // champScene.visible = true;
      champScene.position.set(...champData.position);
      champScene.scale.set(...scale);
      champScene.rotation.x = -0.5;
      const size = gltf.size;

      const { statusBarGroup, hpBar, manaBar } = this.setupStatusBars(
        champScene,
        size
      );
      const dragHelper = this.setupDragHelper(
        champScene,
        size,
        champData,
        champScene.rotation,
        hpBar,
        manaBar,
        statusBarGroup
      );
      this.updateBar(dragHelper.hpBar, 1);
      this.updateBar(dragHelper.manaBar, 1, "mp");
      lightAuto(champScene);
      this.playChampionAnimation(mixer, champScene, gltf.animations);
      this.draggableObjects.push(dragHelper);
      callback(dragHelper);
    };

    if (MODEL_CACHES[champData.url]) {
      const cached = MODEL_CACHES[champData.url];
      const cloned = clone(cached.scene);
      const clonedGltf = {
        scene: cloned,
        animations: cached.animations,
        size: cached.size,
      };
      handleLoad(clonedGltf);
    } else {
      loadModel(
        champData.url,
        (gltf) => {
          const champScene = gltf.scene;
          champScene.position.set(...champData.position);
          champScene.scale.set(...scale);
          champScene.rotation.x = -0.5;
          const box = new THREE.Box3().setFromObject(gltf.scene, true);
          const size = new THREE.Vector3();
          box.getSize(size);
          gltf.size = size;
          MODEL_CACHES[champData.url] = gltf;
          handleLoad(gltf);
        },
        (err) => console.error(err),
        null
      );
    }
  }

  damageChampion(dragHelper, damageAmount) {
    // Giả sử dragHelper có thuộc tính currentHp và maxHp
    if (dragHelper.currentHp == null) {
      dragHelper.maxHp = 1000;
      dragHelper.currentHp = dragHelper.maxHp;
    }

    dragHelper.currentHp -= damageAmount;
    dragHelper.currentHp = Math.max(0, dragHelper.currentHp);

    const hpRatio = dragHelper.currentHp / dragHelper.maxHp;
    this.updateBar(dragHelper.hpBar, hpRatio, "hp");

    if (dragHelper.currentHp <= 0) {
      console.log(`${dragHelper.name} has died.`);
      this.removeChampFromScene(this.scene, dragHelper);
    }
  }

  removeChampFromScene(scene, dragHelper) {
    const index = this.draggableObjects.findIndex(
      (obj) => obj.uuid === dragHelper.uuid
    );
    if (index > -1) {
      this.draggableObjects.splice(index, 1);
      scene.remove(dragHelper.champScene);
      scene.remove(dragHelper.statusBarGroup);
      scene.remove(dragHelper);
    }
  }

  attack() {}
  useSkill() {}
}
