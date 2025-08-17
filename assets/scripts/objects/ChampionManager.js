import * as THREE from "https://esm.sh/three";
import {
  loadModel,
  lightAuto,
  createDebugGuiFolder,
  capitalizeFirstLetter,
  addHelper,
  generateIconURLFromRawCommunityDragon,
  createImage,
  createSpriteObject,
} from "~~/utils/utils";
import {
  CHAMPS_INFOR,
  COLOR_HP,
  COLOR_MP,
  COLOR_ORANGE,
  debugOn,
  MODEL_CACHES,
  TRAITS_INFOR,
} from "~/variables.js";
import { clone } from "https://esm.sh/three/examples/jsm/utils/SkeletonUtils.js";
import { champScales, costGradients, itemScales } from "~~/data/champs.js";
import {
  injectVariables,
  onTooltip,
  statsCalculate,
} from "../services/services";
import Team from "./Team";

export default class ChampionManager {
  scene;
  traitListElement;
  static draggableObjects = [];
  maxTraitDisplay = 10;
  attack1 = {};
  static galioData = null;
  static levelIconDetails = {
    1: { size: [0.5, 0.5], url: "/images/icon-lv1.png", posX: -1.2 },
    2: { size: [1, 1], url: "/images/icon-lv2.png", posX: -1.4 },
    3: { size: [1, 1], url: "/images/icon-lv3.png", posX: -1.2 },
    4: { size: [1, 1], url: "/images/icon-lv4.png", posX: -1.2 },
  };

  constructor(scene) {
    this.scene = scene;
    this.traitListElement = document.getElementById("trait-list");
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

  static updateBar(barMesh, value, type = "hp", barWidth = 2) {
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

    const { barGroup: mpBarGroup, fgBar: mpBar } = this.createBarGroup(
      COLOR_MP,
      0,
      barWidth,
      barHeight
    );
    mpBarGroup.position.set(0, barYOffset - 0.15, 0);
    mpBar.position.copy(mpBarGroup.position);
    statusBarGroup.add(mpBarGroup);

    statusBarGroup.add(hpBar);
    statusBarGroup.add(mpBar);
    statusBarGroup.position.copy(champScene.position);
    statusBarGroup.rotation.x = -0.5;

    const level = 1;
    createImage(
      this.scene,
      (mesh) => {
        mesh.userData.name = "icon-level";
        statusBarGroup.add(mesh);
      },
      ChampionManager.levelIconDetails[level].url,
      [ChampionManager.levelIconDetails[level].posX, barYOffset, 0],
      true,
      ChampionManager.levelIconDetails[level].size
    );
    this.scene.add(statusBarGroup);

    return { statusBarGroup, hpBar, mpBar };
  }

  setupDragHelper(
    champScene,
    size,
    champData,
    rotation,
    hpBar = null,
    mpBar = null,
    statusBarGroup = null
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
    dragHelper.userData.maxHp =
      champData.data.stats.hp === 1 ? 1044 : champData.data.stats.hp;
    dragHelper.userData.currentHp = dragHelper.userData.maxHp;
    dragHelper.userData.maxMp = champData.data.stats.mana;
    dragHelper.userData.currentMp = champData.data.stats.initialMana;
    dragHelper.userData.champScene = champScene;
    if (hpBar && mpBar && statusBarGroup) {
      dragHelper.userData.hpBar = hpBar;
      dragHelper.userData.mpBar = mpBar;
      dragHelper.userData.statusBarGroup = statusBarGroup;
    }
    dragHelper.userData.name = champData.data.name;
    dragHelper.userData.data = champData.data;
    dragHelper.userData.data.stats.hp =
      champData.data.stats.hp === 1 ? 1044 : champData.data.stats.hp;
    dragHelper.userData.champData = champData;
    this.scene.add(dragHelper);
    const ring = new THREE.RingGeometry(1.3, 1.4, 64);
    const material = new THREE.MeshBasicMaterial({
      color: COLOR_ORANGE,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(ring, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(dragHelper.position);
    mesh.visible = false;
    dragHelper.hover = mesh;
    this.scene.add(mesh);
    return dragHelper;
  }

  isOccupied = function (pos) {
    return ChampionManager.draggableObjects.some(
      (obj) => obj.position.distanceTo(pos) < 1
    );
  };

  playChampionAnimation(
    mixer,
    animations,
    name = "idle",
    callBack = () => {},
    loopTimes = THREE.LoopRepeat,
    fireBulletWhen = "before",
    onFinish = () => {}
  ) {
    if (!mixer || !animations) return;
    let testAnim = 0;
    const testCeleAnim = ["celebration", "dance_in", "dance"];
    let anim = animations.find(
      (a) =>
        (name === "idle" && a.name.toLowerCase() === "idle1") ||
        (a.name.toLowerCase().includes(name) &&
          a.name.toLowerCase() !== "idlein" &&
          !a.name.toLowerCase().includes("idle_in"))
    );
    if (name === testCeleAnim[0]) {
      while (testAnim < testCeleAnim.length && !anim) {
        console.log("can't find anim: ", testCeleAnim[testAnim]);
        testAnim++;
        anim = animations.find((a) =>
          a.name.toLowerCase().includes(testCeleAnim[testAnim])
        );
      }
    }
    if (!anim) {
      return;
    }
    console.log("anim: ", anim);
    const action = mixer.clipAction(anim);
    mixer.stopAllAction(); // Dừng trước
    action.reset();

    action.setLoop(loopTimes);
    action.clampWhenFinished = true;
    if (name === "spell" && anim.duration >= 5) {
      action.timeScale = 3;
    } else action.timeScale = 1;
    action.play();
    // console.log("play anim: " + anim.name);
    if (loopTimes === THREE.LoopRepeat) return;
    // console.log("anim.duration: ", anim.duration);
    const delay =
      fireBulletWhen === "before"
        ? (anim.duration * 1000) / 8
        : (anim.duration * 1000) / 3;
    setTimeout(() => {
      callBack();
    }, delay);
    const onFinished = (e) => {
      mixer.removeEventListener("finished", onFinished);
      console.log("anim " + anim.name + " finished!");
      onFinish();
      const idle = animations.find(
        (a) =>
          a.name.toLowerCase().includes("idle") &&
          a.name.toLowerCase() !== "idlein"
      );
      if (idle) {
        const act = mixer.clipAction(idle);
        mixer.stopAllAction();
        act.reset().play();
      }
    };
    mixer.addEventListener("finished", onFinished);
  }

  addTraitItemToList(
    { name, champs, data, effect, nextEffect },
    index,
    totalTraits,
    lastIndex,
    viewMore
  ) {
    // console.log(data);
    if (index <= this.maxTraitDisplay - 1) {
      // console.log({ data });
      const champCount = champs.length;
      // console.log({ effect, nextEffect });
      // console.log({ champCount });
      const div = document.createElement("div");
      div.className = effect
        ? "w-[3.5vw] cursor-pointer h-[3.5vw] mb-[0.2vw] relative flex items-center justify-center"
        : "w-[3vw] cursor-pointer h-[3vw] mb-[0.2vw] relative flex items-center justify-center";
      div.innerHTML = `
      <div class="bg-black/80 rounded-lg h-[80%] absolute left-[1.2vw] flex items-center">
      ${
        effect
          ? `<div
          class="rounded-md bg-white/20 ml-[2.5vw] h-[80%] px-[0.5vw] border border-white flex items-center justify-center"
        >
          ${champCount}
        </div>`
          : ""
      }
        <div class="flex flex-col justify-center ml-[${
          effect ? "1vw" : "2.5vw"
        }] h-[80%] pr-5">
          <span class="inline-block text-[1vw] text-white/50 text-nowrap mt-[-0.3vw]">${name}</span>
          <div class="flex text-white/50 text-[0.75vw] mt-[-0.4vw]">
            ${
              effect
                ? data.effects.reduce((prev, curr, index) => {
                    return (
                      prev +
                      `<span class="${
                        (effect && champCount >= curr.minUnits) || !nextEffect
                          ? `text-white`
                          : ""
                      }">${curr.minUnits}</span>` +
                      (index < data.effects.length - 1
                        ? `<span class="mx-1">></span>`
                        : "")
                    );
                  }, "")
                : `<span>${champCount}</span><span class="mx-1">/</span><span>${nextEffect.minUnits}</span>`
            }
          </div>
        </div>
      </div>
      <img src="/images/style-${
        effect ? effect.style : 0
      }.png" class="w-full h-full absolute"/>
      ${
        effect
          ? `<div
        class="z-[11] mask-[url('${generateIconURLFromRawCommunityDragon(
          data.icon
        )}')] bg-black mask-no-repeat mask-center mask-contain w-[1.5vw] h-[1.5vw] absolute"
      >`
          : `<div class="mask-[url('${generateIconURLFromRawCommunityDragon(
              data.icon
            )}')] bg-white/30 mask-no-repeat mask-center mask-contain w-[1.2vw] h-[1.2vw] absolute"></div>`
      }
    `;
      this.traitListElement?.appendChild(div);
      if (
        name === "Mighty Mech" &&
        import.meta.env.VITE_SET_KEY === "TFT_Set15"
      ) {
        const changeLevelGalio = (existedGalio) => {
          existedGalio.mixer.stopAllAction();
          this.playChampionAnimation(
            existedGalio.mixer,
            existedGalio.animations,
            "spawn",
            () => {
              console.log(effect.variables.NumItems);
              ChampionManager.upgrade(existedGalio, effect.variables.NumItems);
            },
            THREE.LoopOnce,
            "before",
            () => {
              existedGalio.mixer.stopAllAction();
              this.playChampionAnimation(
                existedGalio.mixer,
                existedGalio.animations,
                "idle",
                () => {},
                THREE.LoopRepeat
              );
            }
          );
        };
        if (effect) {
          // console.log(effect.variables.NumItems);
          if (effect.variables.NumItems < ChampionManager.galioData?.NumItems) {
            // downgrade
            const existedGalio = ChampionManager.getMyTeam().find(
              (c) => c.userData.name === "The Mighty Mech"
            );
            if (existedGalio) {
              changeLevelGalio(existedGalio);
              ChampionManager.galioData = effect.variables;
            }
          } else if (
            effect.variables.NumItems === ChampionManager.galioData?.NumItems
          ) {
          } else {
            console.log("myteam: ", ChampionManager.getMyTeam());
            ChampionManager.galioData = effect.variables;
            const existedGalio = ChampionManager.getMyTeam().find(
              (c) => c.userData.name === "The Mighty Mech"
            );
            if (existedGalio) {
              changeLevelGalio(existedGalio);
            } else {
              Team.addChampion("The Mighty Mech");
            }
          }
        } else {
          const existedGalio = ChampionManager.getMyTeam().find(
            (c) => c.userData.name === "The Mighty Mech"
          );
          if (existedGalio) {
            ChampionManager.galioData = null;
            ChampionManager.removeChampFromScene(this.scene, existedGalio);
          }
        }
      }
      onTooltip(
        div,
        (tt) => {
          console.log(data);
          tt.style["max-width"] = "30vw";
          // console.log({ name, champs, data, effect, nextEffect });
          const eff = effect ?? {};
          eff.champs = champs;
          eff.allChamps = CHAMPS_INFOR.filter((champ) =>
            champ.traits.includes(name)
          ).sort((prev, curr) => (prev.cost < curr.cost ? -1 : 1));
          const html = `
            <h2 class="text-[1.5vw] font-semibold">${name}</h2>
            <p class="text-[1vw] font-medium whitespace-pre-wrap break-words">${injectVariables(
              data.desc,
              data.effects,
              eff,
              1,
              "trait"
            )}</p>
          `;
          tt.insertAdjacentHTML("beforeend", html);
        },
        "bottom,right",
        true
      );
      if (
        lastIndex &&
        ((viewMore && totalTraits - this.maxTraitDisplay > 0) || !viewMore)
      ) {
        const viewMoreBtn = document.createElement("button");
        viewMoreBtn.className = "relative w-[3vw] h-[3vw] cursor-pointer";
        viewMoreBtn.insertAdjacentHTML(
          "beforeend",
          `<img src="/images/view-more.png" class="h-full w-full"/>
          <span class="absolute top-[20%] left-[50%] text-[1vw]">${
            viewMore
              ? totalTraits - this.maxTraitDisplay
              : totalTraits - (totalTraits - this.maxTraitDisplay)
          }</span>`
        );
        viewMoreBtn.addEventListener("click", (e) => {
          this.renderTraits(viewMore);
        });
        this.traitListElement.appendChild(viewMoreBtn);
      }
    }
  }

  renderTraits(viewMore = false) {
    const champsInBf = ChampionManager.draggableObjects.filter(
      (c) => c.bfIndex != -1
    );
    const traitsMap = {};

    champsInBf.forEach((champ) => {
      if (champ.userData.data.traits) {
        champ?.userData?.data?.traits.forEach((trait) => {
          if (!traitsMap[trait]) traitsMap[trait] = [champ.userData.name];
          else if (!traitsMap[trait].includes(champ.userData.name))
            traitsMap[trait].push(champ.userData.name);
        });
      }
    });

    const traitsArray = Object.entries(traitsMap).map(([name, champs]) => ({
      name,
      champs,
    }));

    // console.log(TRAITS_INFOR);
    traitsArray.forEach((trait) => {
      const champCount = trait.champs.length;
      const data = TRAITS_INFOR.find(
        (traitInfor) => traitInfor.name === trait.name
      );
      const effect = data.effects.find((ef) => {
        return ef.maxUnits >= champCount && ef.minUnits <= champCount;
      });
      const nextEffect = data.effects.find((ef) => {
        return champCount < ef.minUnits;
      });
      trait.data = data;
      trait.effect = effect;
      trait.nextEffect = nextEffect;
    });
    traitsArray.sort((prev, curr) => {
      if (
        (prev.effect && !curr.effect) ||
        (prev.effect && curr.effect && prev.effect.style > curr.effect.style) ||
        (prev.effect &&
          curr.effect &&
          prev.effect.style === curr.effect.style &&
          prev.champs.length > curr.champs.length) ||
        (!prev.effect &&
          !curr.effect &&
          prev.champs.length > curr.champs.length)
      ) {
        return -1;
      } else {
        return 1;
      }
    });

    this.traitListElement?.replaceChildren();
    if (viewMore) {
      if (traitsArray.length > this.maxTraitDisplay) {
        const chunkedTraitsArray = traitsArray.slice(
          this.maxTraitDisplay,
          traitsArray.length
        );
        // console.log(chunkedTraitsArray);
        chunkedTraitsArray.forEach((trait, index) => {
          this.addTraitItemToList(
            trait,
            index,
            traitsArray.length,
            index ===
              Math.min(this.maxTraitDisplay, chunkedTraitsArray.length) - 1,
            !viewMore
          );
        });
      }
    } else {
      traitsArray.forEach((trait, index) => {
        this.addTraitItemToList(
          trait,
          index,
          traitsArray.length,
          index === this.maxTraitDisplay - 1,
          !viewMore
        );
      });
    }
  }

  addChampion(champData, callback = () => {}) {
    console.log("addChampion: ", champData);
    let url, scale;
    const isItem = champData.data?.type === "item";
    if (!isItem) {
      const setFolder = "Set15";
      const beforeFix = "(tft_set_15)";
      const safeName = champData.data.name
        .toLowerCase()
        .replace(". ", "_")
        .replace(" ", "_")
        .replace("'", "");
      url = `/models/champions/${setFolder}/${safeName}_${beforeFix}.glb`;
      scale = this.getChampionScale(champData.data.name.replaceAll("_", " "));
    } else {
      const spriteUrl = `/images/${champData.data.name
        .toLowerCase()
        .replaceAll(" ", "-")}.png`;
      // console.log(spriteUrl);
      createSpriteObject(spriteUrl, (spriteMesh) => {
        // console.log(spriteMesh);
        spriteMesh.position.set(...champData.position);
        spriteMesh.rotation.x = -0.5;
        const itemScale =
          itemScales[champData.data.name.toLowerCase().replaceAll(" ", "-")];
        spriteMesh.scale.set(...(itemScale ? itemScale : [3, 3, 3]));
        spriteMesh.userData.champScene = spriteMesh;
        const ring = new THREE.RingGeometry(1.3, 1.4, 64);
        const material = new THREE.MeshBasicMaterial({
          color: COLOR_ORANGE,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(ring, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(spriteMesh.position);
        mesh.visible = false;
        spriteMesh.hover = mesh;
        this.scene.add(mesh);
        spriteMesh.userData.isItem = true;
        spriteMesh.userData.name = champData.data.name;
        spriteMesh.userData.data = champData.data;
        this.scene.add(spriteMesh);
        callback(spriteMesh);
      });

      return;
    }
    const handleLoad = (gltf) => {
      // console.log({ scene: gltf.scene });
      const champScene = gltf.scene;
      this.scene.add(champScene);
      champScene.position.set(...champData.position);
      champScene.scale.set(...scale);
      champScene.rotation.set(-0.5, 0, 0);
      // console.log(champScene.rotation);
      const box = new THREE.Box3().setFromObject(gltf.scene, true);
      const size = new THREE.Vector3();
      box.getSize(size);
      // gltf.size = size;
      // const size = gltf.size;

      if (debugOn) {
        const objectDebug = {
          name: "champion (C)",
          object: champScene,
          key: "c",
          isOpen: true,
        };
        createDebugGuiFolder(objectDebug);
      }

      const { statusBarGroup, hpBar, mpBar } = this.setupStatusBars(
        champScene,
        size
      );
      const dragHelper = this.setupDragHelper(
        champScene,
        size,
        champData,
        champScene.rotation,
        hpBar,
        mpBar,
        statusBarGroup
      );
      ChampionManager.upgrade(dragHelper);
      ChampionManager.updateBar(dragHelper.userData.hpBar, 1);
      const mpRatio = dragHelper.userData.currentMp / dragHelper.userData.maxMp;
      ChampionManager.updateBar(dragHelper.userData.mpBar, mpRatio, "mp");
      const mixerChamp = new THREE.AnimationMixer(champScene);
      this.playChampionAnimation(
        mixerChamp,
        gltf.animations,
        champData.data.name === "The Mighty Mech" ? "spawn" : "idle",
        () => {},
        champData.data.name === "The Mighty Mech"
          ? THREE.LoopOnce
          : THREE.LoopRepeat,
        "before",
        () => {
          if (champData.data.name === "The Mighty Mech") {
            this.playChampionAnimation(
              mixerChamp,
              gltf.animations,
              "idle",
              () => {},
              THREE.LoopRepeat
            );
          }
        }
      );
      dragHelper.animations = gltf.animations;
      dragHelper.mixer = mixerChamp;
      dragHelper.userData.champScene.animations = gltf.animations;
      dragHelper.userData.champScene.mixer = mixerChamp;
      dragHelper.position.y = 1;
      dragHelper.rotation.y = -0.5;
      dragHelper.scale.x += 0.5;
      dragHelper.scale.y += 2;
      dragHelper.scale.z += 0.5;
      callback(dragHelper);
    };

    if (!isItem) {
      if (MODEL_CACHES[url]) {
        const cached = MODEL_CACHES[url];
        const cloned = clone(cached.scene);
        const clonedGltf = {
          scene: cloned,
          animations: cached.animations,
          size: cached.size,
        };
        handleLoad(clonedGltf);
      } else {
        console.log("model dont loaded: ", champData.data.name);
        loadModel(url, (gltf) => {
          const champScene = gltf.scene;
          champScene.position.set(...champData.position);
          champScene.scale.set(...scale);
          champScene.rotation.x = -0.5;
          const box = new THREE.Box3().setFromObject(gltf.scene, true);
          const size = new THREE.Vector3();
          box.getSize(size);
          gltf.size = size;
          MODEL_CACHES[url] = gltf;
          handleLoad(gltf);
        });
      }
    }
  }

  static findNearestTarget(dragHelper, objs) {
    // console.log(objs);
    let nearestTarget = null;
    let dis;
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      if (obj?.userData.currentHp <= 0 || obj === null) continue;
      dis = dragHelper.position.distanceTo(obj.position);
      if (
        !nearestTarget ||
        (nearestTarget &&
          dis < dragHelper.position.distanceTo(nearestTarget.position))
      )
        nearestTarget = obj;
    }
    return { nearestTarget, dis };
  }

  attack(attacker, afterAnimationCallback = () => {}) {
    // console.log("attack");
    if (this.attack1[attacker.uuid] != undefined) {
      this.attack1[attacker.uuid] = !this.attack1[attacker.uuid];
    } else {
      this.attack1[attacker.uuid] = false;
    }
    const fireBulletAfterAnimationChamps = ["Kalista"];
    if (
      attacker.userData.currentMp < attacker.userData.maxMp ||
      attacker.userData.maxMp === 0
    ) {
      attacker.userData.currentMp += 5;
      this.playChampionAnimation(
        attacker.mixer,
        attacker.animations,
        this.attack1[attacker.uuid] ? "attack1" : "attack2",
        () => {
          afterAnimationCallback();
        },
        THREE.LoopOnce,
        fireBulletAfterAnimationChamps.includes(attacker.userData.name)
          ? "after"
          : "before"
      );
    } else if (attacker.userData.maxMp != 0) {
      if (!attacker.isUsingSkill) {
        this.useSkill(attacker, afterAnimationCallback);
      }
      attacker.isUsingSkill = true;
    }
    // console.log(attacker);
    const mpRatio = attacker.userData.currentMp / attacker.userData.maxMp;
    ChampionManager.updateBar(attacker.userData.mpBar, mpRatio, "mp");
  }

  useSkill(champion, callback) {
    console.log(champion.userData.name + " use skill");
    this.playChampionAnimation(
      champion.mixer,
      champion.animations,
      "spell",
      () => {
        callback();
        champion.isUsingSkill = false;
        champion.userData.currentMp = 0;
        ChampionManager.updateBar(champion.userData.mpBar, 0, "mp");
      },
      THREE.LoopOnce
    );
  }

  damageChampion(dragHelper, damageAmount, afterTargetDied = () => {}) {
    // Giả sử dragHelper có thuộc tính currentHp và maxHp
    if (dragHelper.userData.currentHp == null) {
      dragHelper.userData.maxHp = 1000;
      dragHelper.userData.currentHp = dragHelper.maxHp;
    }

    dragHelper.userData.currentHp -= damageAmount;
    dragHelper.userData.currentHp = Math.max(0, dragHelper.userData.currentHp);
    if (dragHelper.userData.currentMp < dragHelper.userData.maxMp) {
      dragHelper.userData.currentMp += 5;
    }
    const hpRatio = dragHelper.userData.currentHp / dragHelper.userData.maxHp;
    ChampionManager.updateBar(dragHelper.userData.hpBar, hpRatio, "hp");
    const mpRatio = dragHelper.userData.currentMp / dragHelper.userData.maxMp;
    ChampionManager.updateBar(dragHelper.userData.mpBar, mpRatio, "mp");

    if (dragHelper.userData.currentHp <= 0) {
      console.log(`${dragHelper.userData.name} has died.`);
      this.playChampionAnimation(
        dragHelper.mixer,
        dragHelper.animations,
        "death",
        () => {
          setTimeout(() => {
            ChampionManager.removeChampFromScene(this.scene, dragHelper);
            delete this.attack1[dragHelper.uuid];
            afterTargetDied();
          }, 500);
        },
        THREE.LoopOnce
      );
    }
  }

  static removeChampFromScene(scene, dragHelper, callback = () => {}) {
    const index = ChampionManager.draggableObjects.findIndex(
      (obj) => obj.uuid === dragHelper.uuid
    );
    if (index > -1) {
      ChampionManager.draggableObjects.splice(index, 1);
    }
    scene.remove(dragHelper.userData.champScene);
    scene.remove(dragHelper.userData.statusBarGroup);
    scene.remove(dragHelper);
    console.log("removeChampFromScene: %s", dragHelper.userData.name);
    callback();
  }

  highlight(mixer, dragHelper, duration = 150) {
    dragHelper.userData?.champScene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const oldMat = child.material;
      const newMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffd700,
        emissiveIntensity: 1.5,
      });
      child.material = newMat;
      child.material.needsUpdate = true;
      let animId = null;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const clock = new THREE.Clock();
        const delta = clock.getDelta();
        if (mixer) mixer.update(delta);
      };
      animate();
      setTimeout(() => {
        child.material = oldMat;
        child.material.needsUpdate = true;
        cancelAnimationFrame(animId);
      }, duration);
    });
  }

  static updateLevelIcon(levelIconMesh, level) {
    if (!levelIconMesh) return;
    const levelIconDetail = ChampionManager.levelIconDetails[level];
    levelIconMesh.geometry.dispose();
    const loader = new THREE.TextureLoader();
    loader.load(levelIconDetail.url, (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      tex.colorSpace = THREE.SRGBColorSpace;
      levelIconMesh.material.map = tex;
      levelIconMesh.material.needsUpdate = true;
    });
    levelIconMesh.geometry = new THREE.PlaneGeometry(
      levelIconDetail.size[0],
      levelIconDetail.size[1]
    );
    levelIconMesh.position.x = levelIconDetail.posX;
  }

  static upgrade(dragHelper, level = 1) {
    const userData = dragHelper?.userData;
    const model = userData?.champScene;
    // function applyStarEffect(model, starLevel = 1) {
    //   const config = {
    //     1: { color: 0xffffff, intensity: 0 },
    //     2: { color: 0xfffff0, intensity: 0.3 },
    //     3: { color: 0xffd700, intensity: 0.3 },
    //     4: { color: 0xffc000, intensity: 0.3 },
    //   };

    //   const { color, intensity } = config[starLevel] || config[1];

    model?.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      // const matName = child.material.name.toLowerCase();
      // console.log({ matName, mat: child.material });
      // const isBody =
      //   matName.includes("body") ||
      //   matName.includes("mat") ||
      //   matName.includes("hair") ||
      //   level === 1;
      const newMaterial =
        // isBody?
        new THREE.MeshBasicMaterial({
          map: child.material.map || null,
          color: 0xffffff,
        });
      // : new THREE.MeshStandardMaterial({
      //     color,
      //     metalness: 0.8,
      //     roughness: 0.2,
      //     emissive: color,
      //     emissiveIntensity: intensity,
      //   });

      child.material = newMaterial;
      child.material.needsUpdate = true;
    });
    // }
    // applyStarEffect(userData.champScene, level);
    userData.level = level;
    if (level > 0) {
      const meshLevelIcon = dragHelper.userData.statusBarGroup.children.find(
        (child) => child.userData.name === "icon-level"
      );
      console.log(meshLevelIcon);
      ChampionManager.updateLevelIcon(meshLevelIcon, level);
    }
  }

  displayChampInfor(display, champ = null) {
    if (champ) console.log("displayChampInfor: ", champ);
    const champInspect = document.getElementById("champ-inspect");
    try {
      if (champInspect) {
        champInspect.classList.toggle("hidden", !display);
        champInspect.replaceChildren();
        if (!display) return;
        // bg champs
        if (champ.userData.data.icon) {
          const champImage = document.createElement("img");
          champImage.className =
            "absolute top-[2.1vw] right-[0vw] h-[7.5vw] w-[89%]";
          champImage.src = generateIconURLFromRawCommunityDragon(
            champ.userData.data.icon
          );
          champInspect.appendChild(champImage);
        }
        champInspect.insertAdjacentHTML(
          "beforeend",
          `  <img
        src="/images/champ_infor.png"
        alt="champ_infor_img"
        class="h-full object-fill"
      />`
        );
        // cost
        let costGradient = costGradients.find(
          (cg) => cg.cost === champ.userData.data.cost
        );
        if (!costGradient) costGradient = costGradients[0];
        const baseCost = Number(champ.userData?.data?.cost ?? 0);
        const level = Number(champ.userData?.level ?? 1);
        const cost = baseCost * Math.pow(3, level - 1);
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
          src="/images/TFT_Gold.png"
          class="w-[0.8vw] h-[0.8vw]"
          alt="gold_img"
        />
        <span class="inline-block ml-[0.5vw]" id="champ-cost">${cost}</span>
      </div>`
        );
        // hp/mp
        if (
          champ.userData.currentHp &&
          champ.userData.maxHp &&
          champ.userData.currentMp &&
          champ.userData.maxMp
        ) {
          champInspect.insertAdjacentHTML(
            "beforeend",
            `<div
          id="hp-mp"
          class="absolute right-0 top-[10.8vw] w-[11.8vw] flex flex-col text-white font-light text-[0.85vw]"
        >
          <div class="w-full h-[1.65vh] xl:h-[2.4vh] flex items-center justify-center relative">
            <div class="bg-[#00782A] w-full absolute left-0 h-full"  style="width: ${
              (champ.userData.currentHp / champ.userData.maxHp) * 100
            }%"></div>
            <span class="absolute">${champ.userData.currentHp}/${
              champ.userData.maxHp
            }</span>
          </div>
          <div class="w-full h-[1.65vh] xl:h-[2.4vh] flex justify-center items-center relative -ml-[0.005vw]">
            <div class="bg-[#00B8FF] w-full absolute left-0 h-full"  style="width: ${
              (champ.userData.currentMp / champ.userData.maxMp) * 100
            }%"></div>
            <span class="absolute">${champ.userData.currentMp}/${
              champ.userData.maxMp
            }</span>
          </div> 
        </div>`
          );
        }

        // skill img
        if (champ.userData.data.ability?.icon) {
          champInspect.insertAdjacentHTML(
            "beforeend",
            `<img
          src="${generateIconURLFromRawCommunityDragon(
            champ.userData.data.ability.icon
          )}"
          class="absolute top-[13.9vw] left-[2.45vw] w-[3vw] h-[3vw]"
          alt=""
          id="champ-inspect-skill"
        />`
          );
          onTooltip(
            document.getElementById("champ-inspect-skill"),
            (tooltip) => {
              tooltip.style.maxWidth = "unset";
              // console.log(card.data);
              const ability = champ.userData.data.ability;
              // console.log(ability);
              const newDesc = injectVariables(
                ability.desc,
                ability.variables,
                champ.userData.data.stats,
                1
              );
              // console.log(newDesc);
              const cardImgHtml = `<div class="flex">
            <img
              src="${generateIconURLFromRawCommunityDragon(ability?.icon)}"
              class="w-[5vw] h-[5vw]"
              alt="${champ.userData.data.name}-skill"
            />
            <div class="flex flex-col pl-[0.5vw] ">
              <h2 class="font-semibold text-[1.2vw]">${ability.name}</h2>
              <p class="font-medium text-[0.875vw] max-w-[20vw] break-words whitespace-pre-wrap">${newDesc}</p>
            </div>
          </div>`;
              tooltip.insertAdjacentHTML("beforeend", cardImgHtml);
              document.addEventListener("keydown", (e) => {
                if (["d", "đ"].includes(e.key.toLowerCase())) {
                  tooltip.replaceChildren();
                }
              });
            },
            "top,left"
          );
        }
        // pos
        if (champ.userData.data?.stats?.range) {
          champInspect.insertAdjacentHTML(
            "beforeend",
            `<img
          src="/images/${
            champ.userData.data.stats.range > 1 ? "back" : "front"
          }.png"
          class="absolute top-[14vw] left-[6vw] h-[2vw] w-[2.8vw]"
          alt=""
          id="champ-position"
        /> <span class="absolute top-[15.5vw] left-[6.3vw] text-white text-[1vw] capitalize">${
          champ.userData.data.stats.range > 1 ? "back" : "front"
        }</span> <span class="absolute top-[15.5vw] left-[10vw] text-white text-[0.8vw] capitalize">${
              champ.userData.data.stats.range
            } Hex</span>`
          );
        }
        // roles
        if (champ.userData.data.role) {
          champInspect.insertAdjacentHTML(
            "beforeend",
            `<div class="top-[22.6vw] w-[10.1vw] h-[1.7vw] left-[2.5vw] absolute flex items-center justify-center text-white"><img class="w-[1vw] h-[1vw] mr-auto ml-[0.45vw]" src="/images/roles/${champ.userData.data.role.replace(
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
        }

        // stats
        const result = statsCalculate(champ);
        if (result) {
          const { row1, row2 } = result;
          if (row1 && row2) {
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
          }
        }
        // button buy champion
        const buyChampionBtnHtml = `<button
        class="absolute bottom-[2.15vw] flex items-center justify-center left-[3.3vw] cursor-pointer hover:brightness-150 duration-150 w-[8.5vw] h-[2vw]"
        id="buy-champion-btn"
      >
        <img
          src="/images/champ_inspect_btn.png"
          class="w-full h-full absolute top-0 left-0"
          alt="champ_insp_img"
        />
        <div class="absolute text-[0.75vw] mt-[-0.25vw] text-white w-[60%] flex items-center justify-between">
          <span class="">Buy</span>
          <span>${cost}</span>
        </div>
      </button>`;
        champInspect.insertAdjacentHTML("beforeend", buyChampionBtnHtml);
        const buyChampionBtn = document.getElementById("buy-champion-btn");
        buyChampionBtn.addEventListener("click", (e) => {
          ChampionManager.removeChampFromScene(this.scene, champ);
          Team.buyChampion(this.scene, champ);
          champInspect.classList.add("hidden");
        });
      }
    } catch (error) {
      console.error("displayChampInfor erorr: ", error);
    }
  }

  static getMyTeam() {
    return ChampionManager.draggableObjects.filter(
      (obj) => obj.bfIndex || obj.benchIndex
    );
  }

  static getCountMyBench() {
    return ChampionManager.draggableObjects.filter((obj) => obj.benchIndex)
      .length;
  }

  useItem() {}

  static update(scene) {
    const countMap = new Map();

    ChampionManager.draggableObjects.forEach((obj) => {
      if ((obj.bfIndex || obj.benchIndex) && !obj.userData.isItem) {
        const key = `${obj.userData.name}_${obj.userData.level}`;
        const entry = countMap.get(key) || { count: 0, objs: [] };
        entry.count += 1;
        entry.objs.push(obj);
        countMap.set(key, entry);
      }
    });

    // In ra các tướng trùng nhau
    for (const [key, value] of countMap.entries()) {
      if (value.count >= 3) {
        const champ = value.objs[0];
        const currentLevel = Number(key.split("_")[1]);
        const newLevel = currentLevel < 4 ? currentLevel + 1 : currentLevel;
        ChampionManager.upgrade(champ, newLevel);
        ChampionManager.removeChampFromScene(scene, value.objs[1]);
        ChampionManager.removeChampFromScene(scene, value.objs[2]);
        countMap.delete(key);
      }
    }
  }

  static resetAfterBattle(champ, pos, rot) {
    champ.position.copy(pos);
    champ.userData?.champScene?.position.copy(pos);
    champ.rotation.copy(rot);
    champ.userData?.champScene?.rotation.copy(rot);
    champ.userData.champScene.rotation.x = -0.5;
    champ.userData.champScene.rotation.y = 0;
    ChampionManager.updateStatusBars();
    ChampionManager.updateBar(champ.userData.hpBar, 1, "hp");
    const mpRatio =
      champ.userData.data.stats.initialMana / champ.userData.maxMp;
    ChampionManager.updateBar(champ.userData.mpBar, mpRatio, "mp");
    champ.userData.currentHp = champ.userData.data.stats.hp;
    champ.userData.currentMp = champ.userData.data.stats.initialMana;
    champ.mixer.stopAllAction();
  }
  static updateStatusBars() {
    ChampionManager.draggableObjects.forEach((obj) => {
      if (obj.userData.statusBarGroup) {
        obj.userData.statusBarGroup.position.copy(
          obj.userData.champScene.position
        );
      }
      if (obj.hover) {
        obj.hover.position.copy(obj.position);
      }
    });
  }
}
