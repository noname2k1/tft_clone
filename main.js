import * as THREE from "https://esm.sh/three";
import {
  ARENA_DATAS,
  tacticianSpeed,
  LOW_GRAPHICS_MODE,
  CHAMPS_INFOR,
} from "~/variables.js";
import ChampionManager from "~~/objects/ChampionManager.js";
import Model from "~~/objects/Model.js";
import SecretSphere from "~~/objects/SecretSphere.js";
import TFTCarousel from "~~/objects/Carousel.js";
import {
  createBattleField,
  faceToObj,
  moveCharacter,
  moveToOtherObject,
} from "~~/services/services.js";
import initial from "~~/setup/initial.js";
import Team from "./assets/scripts/objects/Team";
import Battle from "./assets/scripts/objects/Battle";

// Globals
let mixer;
const clock = new THREE.Clock();
let bfEnemyCells = [];
let bfEnemies = [];
let bfCells = [];
const itemsOutBag = [];
const tftArguments = [];

let tactician,
  tacticianTarget = null;
let tacticianMixerGlobal;
let tacticianActions = {};
let taticianAnimations;

const arenaId = 0;
const selectedArena = ARENA_DATAS[arenaId];

const debugControls = false;

// initial
let usingSkillScene = false;
const skillSceneAddedObjs = [];
const { scene, renderer, controls, camera } = initial(debugControls);
const skillScene = new THREE.Scene();
skillScene.background = new THREE.Color(0x000000);

const myTeam = new Team(
  scene,
  renderer,
  controls,
  camera,
  selectedArena,
  debugControls,
  "Ninh Nam"
);

const championManager = myTeam.getChampionManager();

bfCells = createBattleField(scene, 4, 7, selectedArena.battlefield);
bfEnemyCells = createBattleField(
  scene,
  4,
  7,
  selectedArena.enemyBattlefield,
  "enemy"
);

// enemy's bench
const startBattleBtn = document.getElementById("start-battle-btn");

// startBattleBtn.classList.replace("hidden", "flex");
function updateEnemyLineup(champNamesOrChampName) {
  const isSingle = typeof champNamesOrChampName === "string";
  // Xóa tướng khi chỉ truyền 1 tên
  if (isSingle) {
    const champIndex = bfEnemies.findIndex(
      (champ) => champ?.userData.name === champNamesOrChampName
    );
    if (champIndex !== -1) {
      championManager.removeChampFromScene(scene, bfEnemies[champIndex]);
      bfEnemies.splice(champIndex, 1);
    }
    // startBattleBtn.classList.replace("flex", "hidden");
    return;
  }
  // Nếu là mảng: cập nhật toàn bộ đội hình
  champNamesOrChampName.forEach((champName, index) => {
    // Xóa tướng cũ (nếu có)
    if (bfEnemies[index]) {
      championManager.removeChampFromScene(scene, bfEnemies[index]);
    }
    // Nếu có tướng mới tại vị trí đó
    if (champName) {
      const pos = bfEnemyCells[index]?.center;
      const safeName = champName
        .toLowerCase()
        .replace(". ", "_")
        .replace(" ", "_")
        .replace("'", "");
      const modelPathUrl = `./assets/models/champions/${safeName}_(tft_set_14).glb`;
      const champData = CHAMPS_INFOR.find((c) => c.name === champName);
      championManager.addChampion(
        {
          position: pos,
          url: modelPathUrl,
          data: champData,
        },
        (dragHelper) => {
          bfEnemies[index] = dragHelper;
          dragHelper.userData.champScene.rotation.x = 0;
          startBattleBtn.classList.replace("hidden", "flex");
        }
      );
    } else {
      // Nếu không có champ ở vị trí này, giữ null
      bfEnemies[index] = null;
    }
  });
}

let startBattleInterval = null;
let allEnemiesDied = false;
const oldBfChamps = [];

function fireBullet(attacker, target, onHit) {
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const bullet = new THREE.Mesh(geometry, material);

  const bbox = new THREE.Box3().setFromObject(attacker.userData.champScene);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  bullet.position.set(attacker.position.x, center.y, attacker.position.z);
  scene.add(bullet);

  const attackSpeed = attacker.userData.data.stats.attackSpeed || 0.5;
  moveCharacter(
    bullet,
    target,
    attackSpeed * 10,
    () => {
      scene.remove(bullet);
      onHit();
    },
    () => {
      if (target.userData.currentHp <= 0) {
        scene.remove(bullet);
      }
    }
  );
}

function handleDamage(target, dmg, attacker, intervalId) {
  console.log(bfEnemies);
  championManager.damageChampion(target, dmg, () => {
    const index = bfEnemies.findIndex((enemy) => enemy?.uuid === target.uuid);
    if (index != -1) {
      bfEnemies.splice(index, 1);
    }

    const hexEl = document.getElementById("hex-" + index);
    if (hexEl) {
      hexEl.classList.replace("bg-yellow-700", "bg-gray-700");
      hexEl.replaceChildren();
    }
    console.log(bfEnemies);
    if (!bfEnemies.some((bfEnemy) => bfEnemy)) {
      console.log(bfEnemies);
      allEnemiesDied = true;
      clearInterval(startBattleInterval);
      startBattleInterval = null;
      startBattleBtn.classList.replace("flex", "hidden");
      oldBfChamps.forEach(([uuid, pos, rot]) => {
        const champ = scene.getObjectByProperty("uuid", uuid);
        if (champ && pos) {
          champ.mixer.stopAllAction();
          championManager.playChampionAnimation(
            champ.mixer,
            champ.animations,
            "celebration",
            () => {},
            3
          );
          setTimeout(() => {
            champ.position.copy(pos);
            champ.userData?.champScene?.position.copy(pos);
            champ.rotation.copy(rot);
            champ.userData?.champScene?.rotation.copy(rot);
            ChampionManager.updateStatusBars();
            champ.mixer.stopAllAction();
            championManager.playChampionAnimation(
              champ.mixer,
              champ.animations,
              "idle",
              () => {
                allEnemiesDied = false;
              }
            );
          }, 4000);
        }
      });
      allEnemiesDied = false;
    }
  });
}

function startAttacking(attacker, target) {
  if (attacker.userData.isAttacking || allEnemiesDied) return;
  attacker.userData.isAttacking = true;
  const attackSpeed = attacker.userData.data.stats.attackSpeed || 0.5;
  const delay = attackSpeed * 2000;
  const dmg = attacker.userData.data.stats.damage;
  const attackInterval = setInterval(() => {
    console.log(target.userData.currentHp);
    if (target.userData.currentHp <= 0 || !bfEnemies.includes(target)) {
      clearInterval(attackInterval);
      attacker.userData.isAttacking = false;
      return;
    }

    championManager.attack(attacker, () => {
      const isRanged = attacker.userData.data.stats.range > 1;
      if (isRanged) {
        fireBullet(attacker, target, () => {
          handleDamage(target, dmg, attacker, attackInterval);
        });
      } else {
        handleDamage(target, dmg, attacker, attackInterval);
      }
    });
  }, delay);
}

startBattleBtn.addEventListener("click", () => {
  // Clone enemy models to skillScene
  console.log(bfEnemies);
  bfEnemies.forEach((enemy) => {
    if (enemy?.userData) {
      const clone = enemy.userData.champScene.clone();
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.map = null;
          child.material.needsUpdate = true;
        }
      });
      skillSceneAddedObjs.push(clone);
      skillScene.add(clone);
    }
  });

  if (!ChampionManager.draggableObjects.some((obj) => obj.bfIndex !== -1))
    return;
  ChampionManager.draggableObjects.forEach((draggableObject) => {
    if (draggableObject.bfIndex != -1) {
      oldBfChamps.push([
        draggableObject.uuid,
        draggableObject.position.clone(),
        draggableObject.rotation.clone(),
      ]);
    }
  });

  startBattleInterval = setInterval(() => {
    ChampionManager.draggableObjects.forEach((myChamp) => {
      if (myChamp.bfIndex === -1) return;

      const { nearestTarget, dis } = ChampionManager.findNearestTarget(
        myChamp,
        bfEnemies
      );
      if (!nearestTarget || nearestTarget.userData.currentHp <= 0) return;

      faceToObj(
        null,
        myChamp.userData.champScene?.rotation,
        nearestTarget.position,
        myChamp.userData.champScene.position
      );

      const hexSize = 4.5;
      const attackRange = myChamp.userData.data.stats.range * hexSize;
      const currentDistance = myChamp.position.distanceTo(
        nearestTarget.position
      );

      if (currentDistance > attackRange) {
        const direction = new THREE.Vector3()
          .subVectors(nearestTarget.position, myChamp.position)
          .normalize();
        const targetPos = nearestTarget.position
          .clone()
          .addScaledVector(direction, -attackRange + 0.8);
        const isBlocked = championManager.isOccupied(targetPos);

        if (!isBlocked) {
          moveCharacter(
            myChamp.userData.champScene,
            targetPos,
            10,
            () => {
              myChamp.position.copy(targetPos);
              startAttacking(myChamp, nearestTarget);
            },
            ChampionManager.updateStatusBars
          );
        } else {
          // Nếu bị chắn thì vẫn tấn công nếu đủ tầm (khoảng cách thực tế > range nhưng không di chuyển được)
          startAttacking(myChamp, nearestTarget);
        }
      } else {
        startAttacking(myChamp, nearestTarget);
      }

      console.log(
        `nearestTarget of ${myChamp.userData.name}: ${nearestTarget.userData.name} - dis: ${dis}`
      );
    });
  }, 100);
});

const LoadAllModel = () => {
  // load tactician
  const tacticianModel = new Model(
    scene,
    {
      name: "Ninh Nam",
      url: "./assets/models/tacticians/abyssia.glb",
      scale: [0.02, 0.02, 0.02],
      position: selectedArena.tactacianFirstPos,
      onLoaded: (tacticianObj) => {
        taticianAnimations = tacticianObj.animations;
        // console.log(tacticianObj.modelScene);
        tactician = tacticianObj.modelScene;
        tactician.rotation.x = -0.5;
        tactician.box = tacticianObj.box;
        tacticianActions = {
          idle: tacticianObj.mixer.clipAction(
            tacticianObj.animations.find(
              (anim) =>
                anim.name.toLowerCase().startsWith("idle") ||
                anim.name.toLowerCase() !== "idlein"
            )
          ),
          run: tacticianObj.mixer.clipAction(
            tacticianObj.animations.find((a) => a.name.includes("Run_Haste"))
          ),
        };
        tacticianMixerGlobal = tacticianObj.mixer;
        tacticianActions.idle.play();
      },
    },
    { enabled: false, color: "blue" },
    { enabled: false }
  );
  Battle.tacticians.push(tacticianModel);
  // load coin (ex)
  const itemOutBagY = 1;
  const coinCount = 10;
  Array.from({ length: coinCount }).forEach(() => {
    const coin = new Model(
      scene,
      {
        name: "coin",
        url: "./assets/models/items/coin.glb",
        scale: [0.06, 0.06, 0.06],
        position: [Math.random() * 10, itemOutBagY, Math.random() * 10],
        onLoaded: (model) => {},
      },
      { enabled: true }
      // { enabled: true, color: "blue" }
    );
    itemsOutBag.push(coin);
  });

  // load arguments
  const swordPositions = [
    [-12.5, 0, 0],
    [12, 0, 0],
  ];
  swordPositions.forEach((pos) => {
    const sword = new Model(scene, {
      name: "argument sword",
      url: "./assets/models/arguments/sword.glb",
      position: pos,
      scale: [0.018, 0.018, 0.018],
      onLoaded: (_this) => {},
      debug: false,
    });
    tftArguments.push(sword);
  });
  // load eye-catching things
  if (!LOW_GRAPHICS_MODE) {
    if (selectedArena.arguments.includes("fire")) {
      const firePositions = [
        [-15.6, 2, 16.8],
        [13.2, 2, 16.8],
        [-13.8, 2, -18],
        [15, 2, -18],
      ];
      // load fire
      firePositions.forEach((firePos) => {
        const fireBall = new Model(scene, {
          name: "fire ball",
          url: "./assets/models/others/fire_animation.glb",
          position: firePos,
          scale: [0.8, 0.4, 0.6],
          interact: false,
          debug: false,
        });
        tftArguments.push(fireBall);
      });
    }
  }

  // load secret sphere
  const orb = new SecretSphere(scene, [3, itemOutBagY, 3], "#F4F4F4");
  const itemOrb = new SecretSphere(scene, [9, itemOutBagY, 9], "blue", "white");
  itemsOutBag.push(orb);
  itemsOutBag.push(itemOrb);
  // load carousel
  // const carousel = new TFTCarousel(scene, 8, 12);
  // setTimeout(() => carousel.deactivateBarrier(2), 3000);
};
LoadAllModel();

// open tactician's animations panel
let animationsPanelShowed = false;
window.addEventListener("keydown", (e) => {
  if (e.key.toLocaleLowerCase() === "a") {
    const animations = document.getElementById("animations");
    animationsPanelShowed = !animationsPanelShowed;
    animations.classList.toggle("hidden", !animationsPanelShowed);
    if (taticianAnimations) {
      // console.log(taticianAnimations);
      taticianAnimations.forEach((ani) => {
        const animationItem = document.createElement("li");
        animationItem.className =
          "hover:text-white cursor-pointer text-center p-1 hover:bg-black/50";
        animationItem.innerHTML = ani.name.replaceAll("_", " ");
        animationItem.addEventListener("click", function (e) {
          const action = tacticianMixerGlobal?.clipAction(ani);
          if (!action) return;
          // Dừng các animation đang chạy
          tacticianMixerGlobal.stopAllAction();
          // Chạy animation được chọn
          action.reset();
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.play();

          // Lắng nghe sự kiện 'finished' từ mixer
          const onFinished = (e) => {
            if (e.action === action) {
              tacticianMixerGlobal.stopAllAction();
              tacticianActions?.idle?.play();
              tacticianMixerGlobal.removeEventListener("finished", onFinished);
              animations.classList.add("hidden");
              animationsPanelShowed = false;
            }
          };
          tacticianMixerGlobal.addEventListener("finished", onFinished);
        });
        animations.appendChild(animationItem);
      });
    }
  }
});

let animationId = null;
const tacticianState = { isRunning: false, isAttack: false };
// Animate
try {
  const slowFactor = 0.5;
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta * slowFactor);
    ChampionManager.draggableObjects.forEach((draggableObject) => {
      draggableObject.mixer?.update(delta * slowFactor);
      draggableObject.userData.champScene?.mixer.update(delta * slowFactor);
    });
    bfEnemies.forEach((bfEnemy) => {
      bfEnemy?.mixer?.update(delta * slowFactor);
      bfEnemy?.userData.champScene?.mixer.update(delta * slowFactor);
    });
    if (usingSkillScene) {
      renderer.render(skillScene, camera);
    } else {
      if (skillSceneAddedObjs.length > 0) {
        skillSceneAddedObjs.forEach((obj) => {
          skillScene.remove(obj);
        });
      }
      renderer.render(scene, camera);
    }
    itemsOutBag.forEach((item) => {
      item.update(delta * slowFactor);
    });
    tftArguments.forEach((item) => {
      item.update(delta * slowFactor);
    });
    Battle.tacticians.forEach((tactician) => {
      tactician.update(delta * slowFactor);
    });
    tacticianTarget = myTeam.getTacticianTarget();
    if (tactician && tacticianTarget) {
      moveToOtherObject(
        tactician,
        tacticianTarget,
        tacticianSpeed,
        () => {
          myTeam.updateTacticianTarget();
        },
        tacticianState,
        tacticianActions
      );
      itemsOutBag.forEach((item, index) => {
        if (item.checkCollision(tactician)) {
          itemsOutBag.splice(index, 1);
          console.log("nhặt " + item.name);
          item.removeFromScene();
        }
      });

      // carousel.update();
      // if (!carousel.checkBarrierCollision(tactician)) {
      //   // ✅ Được di chuyển
      //   tactician.position.add(dir.multiplyScalar(tacticianSpeed));
      //   tactician.position.y = selectedArena.tactacianFirstPos[1];;
      // } else {
      //   // Đẩy ngược lại 1 đoạn nhỏ
      //   const pushBack = dir.clone().negate().multiplyScalar(0.2);
      //   tactician.position.add(pushBack);
      //   tactician.position.y = selectedArena.tactacianFirstPos[1];;
      //   tactician.rotation.y = Math.atan2(dir.x, dir.z); // xoay theo hướng di chuyển
      // }
    }
    myTeam.updateAll(delta * slowFactor);
  }
  animate();
} catch (err) {
  console.error("Animation loop error:", err);
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
    console.warn("Animation loop stopped due to error.");
  }
}

export { updateEnemyLineup };
