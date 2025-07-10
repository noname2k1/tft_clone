import * as THREE from "https://esm.sh/three";
import {
  loadModel,
  lightAuto,
  createDebugGuiFolder,
  capitalizeFirstLetter,
} from "~~/utils/utils";
import { COLOR_HP, COLOR_MP, MODEL_CACHES, TRAITS_INFOR } from "~/variables.js";
import { clone } from "https://esm.sh/three/examples/jsm/utils/SkeletonUtils.js";
import { champScales, costGradients } from "~~/data/champs.js";
import { draggableObjects } from "~/main";

export default class ChampionManager {
  scene;
  traitListElement;
  draggableObjects;
  constructor(scene, draggableObjects) {
    this.scene = scene;
    this.traitListElement = document.getElementById("trait-list");
    this.draggableObjects = draggableObjects;
  }

  getChampionScale(champName) {
    return (
      champScales.find((c) => c.name === champName)?.scale || [0.01, 0.01, 0.01]
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
    dragHelper.position.set(...champData.position);
    dragHelper.rotation.copy(rotation);
    dragHelper.scale.set(size.x, size.y, 1);
    // save data
    dragHelper.userData.level = 1;
    dragHelper.userData.maxHp = champData.data.stats.hp;
    dragHelper.userData.currentHp = dragHelper.userData.maxHp;
    dragHelper.userData.maxMp = champData.data.stats.mana;
    dragHelper.userData.currentMp = champData.data.stats.initialMana;
    dragHelper.userData.champScene = champScene;
    dragHelper.userData.hpBar = hpBar;
    dragHelper.userData.manaBar = manaBar;
    dragHelper.userData.statusBarGroup = statusBarGroup;
    dragHelper.userData.name = champData.data.name;
    dragHelper.userData.data = champData.data;
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
      <div class="mask-[url('/assets/images/classes_icons/${trait.replaceAll(
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
      champ.userData.data.traits.forEach((trait) => {
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
    console.log("addChampion: ", champData);
    const scale = this.getChampionScale(
      champData.data.name.replaceAll("_", " ")
    );
    const handleLoad = (gltf) => {
      // console.log({ scene: gltf.scene });
      const champScene = gltf.scene;
      this.scene.add(champScene);
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
      this.upgrade(dragHelper);
      this.updateBar(dragHelper.userData.hpBar, 1);
      this.updateBar(dragHelper.userData.manaBar, 1, "mp");
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
      // console.log(champData);
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
    if (dragHelper.userData.currentHp == null) {
      dragHelper.userData.maxHp = 1000;
      dragHelper.userData.currentHp = dragHelper.maxHp;
    }

    dragHelper.userData.currentHp -= damageAmount;
    dragHelper.userData.currentHp = Math.max(0, dragHelper.userData.currentHp);

    const hpRatio = dragHelper.userData.currentHp / dragHelper.userData.maxHp;
    this.updateBar(dragHelper.userData.hpBar, hpRatio, "hp");

    if (dragHelper.userData.currentHp <= 0) {
      console.log(`${dragHelper.userData.name} has died.`);
      this.removeChampFromScene(this.scene, dragHelper);
    }
  }

  removeChampFromScene(scene, dragHelper) {
    const index = this.draggableObjects.findIndex(
      (obj) => obj.uuid === dragHelper.uuid
    );
    if (index > -1) {
      this.draggableObjects.splice(index, 1);
      scene.remove(dragHelper.userData.champScene);
      scene.remove(dragHelper.userData.statusBarGroup);
      scene.remove(dragHelper);
    }
  }

  upgrade(dragHelper, level = 1) {
    function applyStarEffect(model, starLevel = 1) {
      const config = {
        1: { color: 0xffffff, intensity: 0 },
        2: { color: 0xfffff0, intensity: 0.3 },
        3: { color: 0xffd700, intensity: 0.3 },
        4: { color: 0xffc000, intensity: 0.3 },
      };

      const { color, intensity } = config[starLevel] || config[1];

      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;

        const matName = child.material.name.toLowerCase();
        // console.log({ matName, mat: child.material });
        const isBody =
          matName.includes("body") ||
          matName.includes("mat") ||
          matName.includes("hair") ||
          level === 1;
        const newMaterial = isBody
          ? new THREE.MeshBasicMaterial({
              map: child.material.map || null,
              color: 0xffffff,
            })
          : new THREE.MeshStandardMaterial({
              color,
              metalness: 0.8,
              roughness: 0.2,
              emissive: color,
              emissiveIntensity: intensity,
            });

        child.material = newMaterial;
        child.material.needsUpdate = true;
      });
    }
    const userData = dragHelper.userData;
    applyStarEffect(userData.champScene, level);
    userData.level = level;
    // console.log(userData);
  }

  displayChampInfor(display, champ = null) {
    if (champ) console.log("displayChampInfor: ", champ);
    const champInspect = document.getElementById("champ-inspect");
    if (champInspect) {
      champInspect.classList.toggle("hidden", !display);
      champInspect.replaceChildren();
      if (!display) return;
      const champImage = document.createElement("img");
      champImage.className =
        "absolute top-[2.1vw] right-[0vw] h-[auto] w-[89%]";
      champImage.src =
        "./assets/images/champs/bgs/" +
        capitalizeFirstLetter(champ.userData.name) +
        ".png";
      champInspect.appendChild(champImage);
      champInspect.insertAdjacentHTML(
        "beforeend",
        `  <img
        src="./assets/images/champ_infor.png"
        alt="champ_infor_img"
        class="h-full object-fill"
      />`
      );
      const costGradient = costGradients.find(
        (cg) => cg.cost === champ.userData.data.cost
      );
      champInspect.insertAdjacentHTML(
        "beforeend",
        ` <div
        class="absolute h-[1.65vw] w-[12vw] top-[9.15vw] right-0 bg-gradient-to-r from-[${
          costGradient.from
        }] via-[${costGradient.via}] to-[${
          costGradient.to
        }] flex items-center justify-end px-[1vw] text-white text-[0.75vw]"
      >
        <span class="mr-auto" id="champ-name">${capitalizeFirstLetter(
          champ.userData.name
        )}</span>
        <img
          src="./assets/images/TFT_Gold.png"
          class="w-[0.8vw] h-[0.8vw]"
          alt="gold_img"
        />
        <span class="inline-block ml-[0.5vw]" id="champ-cost">${
          champ.userData.data.cost
        }</span>
      </div>`
      );
      champInspect.insertAdjacentHTML(
        "beforeend",
        `<img
        src="./assets/images/champs/skill_icons/${capitalizeFirstLetter(
          champ.userData.name
        )}.png"
        class="absolute top-[13.9vw] left-[2.45vw] w-[3vw] h-[3vw]"
        alt=""
        id="champ-inspect-skill"
      />`
      );
      champInspect.insertAdjacentHTML(
        "beforeend",
        `<div class="top-[22.6vw] w-[10.1vw] h-[1.7vw] left-[2.5vw] absolute flex items-center justify-center text-white"><img class="w-[1vw] h-[1vw] mr-auto ml-[0.45vw]" src="./assets/images/roles/${champ.userData.data.role.replace(
          "HighMana",
          ""
        )}.png"/><span class="text-[0.8vw] ml-[1vw] mr-auto text-nowrap">${
          champ.userData.data.role
            .slice(0, 2)
            .replace("AP", "Magic ")
            .replace("AD", "Physical ") +
          champ.userData.data.role.slice(2).replace("HighMana", "")
        }</span></div>`
      );
      const stats = champ.userData.data.stats;
      const currData = champ.userData?.currData ?? {};
      const row1 = [
        currData.damage ?? stats.damage,
        currData.magic ?? stats.damage,
        currData.armor ?? stats.armor,
        currData.magicResist ?? stats.magicResist,
        currData.attackSpeed ?? +stats.attackSpeed.toFixed(2),
      ];
      const row2 = [
        currData.critChance ?? +stats.critChance.toFixed(2) * 10,
        currData.critMultiplier ?? +stats.critMultiplier.toFixed(2) * 10,
        currData.omnivamp ?? 0,
        currData.damageAmp ?? 0,
        currData.durability ?? 0,
      ];
      const statsHtml = `<div
        id="stats-row-0"
        class="absolute flex bottom-[8vw] left-[2.9vw] min-w-[9.5vw] items-center text-white text-[0.7vw]"
      >
      ${row1.reduce(
        (prevValue, currValue, currIndex, arr) =>
          prevValue + `<span class="mr-[1.3vw]">${currValue}</span>`,
        ""
      )}
      </div><div
        id="stats-row-1"
        class="absolute flex bottom-[5vw] left-[2.8vw] min-w-[9.5vw] items-center text-white text-[0.7vw]"
      >${row2.reduce(
        (prevValue, currValue, currIndex, arr) =>
          prevValue +
          `<span class="${
            currValue.toString().length >= 2 ? "mr-[0.78vw]" : "mr-[1.8vw]"
          }">${currValue + `${currValue != 0 ? "%" : ""}`}</span>`,
        ""
      )}</div>`;
      champInspect.insertAdjacentHTML("beforeend", statsHtml);
      // button buy champion
      const buyChampionBtnHtml = `<button
        class="absolute bottom-[2.15vw] flex items-center justify-center left-[3.3vw] cursor-pointer hover:brightness-150 duration-150 w-[8.5vw] h-[2vw]"
        id="buy-champion-btn"
      >
        <img
          src="./assets/images/champ_inspect_btn.png"
          class="w-full h-full absolute top-0 left-0"
          alt="champ_insp_img"
        />
        <div class="absolute text-[0.75vw] text-white w-[60%] flex items-center justify-between">
          <span class="">Buy</span>
          <span>10</span>
        </div>
      </button>`;
      champInspect.insertAdjacentHTML("beforeend", buyChampionBtnHtml);
      const buyChampionBtn = document.getElementById("buy-champion-btn");
      buyChampionBtn.addEventListener("click", (e) => {
        this.removeChampFromScene(this.scene, champ);
        // add coin to bag
        champInspect.classList.add("hidden");
      });
    }
  }

  attack() {}
  useSkill() {}
  useItem() {}
}
