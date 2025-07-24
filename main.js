import * as THREE from "https://esm.sh/three";
import {
  createDebugGuiFolder,
  lightAuto,
  loadModel,
  transparentMeshs,
} from "~~/utils/utils.js";
import {
  COLOR_DELETE_ZONE,
  COLOR_SELECTABLE,
  COLOR_MOVEABLE,
  COLOR_SELECTING,
  COLOR_DELETE_MOVEIN,
  ARENA_DATAS,
  debugOn,
  tacticianSpeed,
  LOW_GRAPHICS_MODE,
  CHAMPS_INFOR,
} from "~/variables.js";
import { useItem } from "~~/item/item.js";
import ChampionManager from "~~/objects/ChampionManager.js";
import Model from "~~/objects/Model.js";
import { RightClickEffect } from "~~/objects/effects.js";
import SecretSphere from "~~/objects/SecretSphere.js";
import TFTCarousel from "~~/objects/Carousel.js";
import { sendMessageChangeLineupToEnemy } from "~~/utils/callApi.js";
import {
  createBattleField,
  createBench,
  createDeleteZone,
  faceToObj,
  moveCharacter,
  moveToOtherObject,
} from "~~/services/services.js";
import initial from "~~/setup/initial.js";
import { addGold } from "./assets/scripts/others/goldExp";

// Globals
let xMes = [];
let xBenchEnemy = [];
let mySquareGroup;
let enemySquareGroup;
let mixer;
const clock = new THREE.Clock();
let draggableObjects = [];
let bfEnemyCells = [];
let bfEnemies = [];
let benchEnemies = [];
let benchEnemiesCells = [];
let bfCells = [];
let benchCells = [];
let deleteZone;
const itemsOutBag = [];
const objectsOfChamp = [];
const tftArguments = [];
const tacticians = [];
let tactician,
  tacticianTarget = null;
let tacticianMixerGlobal;
let tacticianActions = {};
let taticianAnimations;
let arenaBox;
let rightClickEffect;
let loadingAllPercent = 0;
const selectedArena = ARENA_DATAS[0];
let zMe = selectedArena.bench[0][2];
let zBenchEnemy = 0;
const primaryY = 0;
const disabledOrbitControlsIds = [
  "shop",
  "animations",
  "left-bar",
  "champ-inspect",
  "config",
  "primary-modal",
  "enemy-define",
];

const debugControls = false;

// elements
const loadingAll = document.getElementById("loading-all");
const loadingAssetsProgress = document.getElementById(
  "loading-assets-progress"
);

// initial
let usingSkillScene = false;
const skillSceneAddedObjs = [];
const { scene, renderer, controls, camera } = initial(debugControls);
const skillScene = new THREE.Scene();
skillScene.background = new THREE.Color(0x000000);

const championManager = new ChampionManager(scene, draggableObjects);
// Utility
function updateStatusBars() {
  draggableObjects.forEach((obj) => {
    if (obj.userData.statusBarGroup) {
      obj.userData.statusBarGroup.position.copy(
        obj.userData.champScene.position
      );
    }
  });
}

bfCells = createBattleField(scene, 4, 7, selectedArena.battlefield);
bfEnemyCells = createBattleField(
  scene,
  4,
  7,
  selectedArena.enemyBattlefield,
  "enemy"
);

// enemy's bench
const createEnemyBench = createBench(
  scene,
  1,
  9,
  2,
  selectedArena.benchGap,
  selectedArena.enemyBench[0],
  "enemy"
);
// my bench
const createMyBench = createBench(
  scene,
  1,
  9,
  2,
  selectedArena.benchGap,
  selectedArena.bench[0]
);

enemySquareGroup = createEnemyBench.squareGroup;
xBenchEnemy = createEnemyBench.xBenchEnemy;
zBenchEnemy = createEnemyBench.zBenchEnemy;
benchEnemiesCells = createEnemyBench.benchCells;
mySquareGroup = createMyBench.squareGroup;
xMes = createMyBench.xMes;
zMe = createMyBench.zMe;
benchCells = createMyBench.benchCells;
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

const buyChampion = (selectedObject, gold = 3) => {
  championManager.removeChampFromScene(scene, selectedObject);
  addGold(gold);
};

let startBattleInterval = null;
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

  moveCharacter(bullet, target, 0.2, () => {
    scene.remove(bullet);
    onHit();
  });
}

function handleDamage(target, dmg, attacker, intervalId) {
  championManager.damageChampion(target, dmg, () => {
    const index = bfEnemies.findIndex((enemy) => enemy === target);
    bfEnemies.splice(index, 1);

    const hexEl = document.getElementById("hex-" + index);
    if (hexEl) {
      hexEl.classList.replace("bg-yellow-700", "bg-gray-700");
      hexEl.replaceChildren();
    }

    if (!bfEnemies.some((bfEnemy) => bfEnemy)) {
      championManager.playChampionAnimation(
        attacker.mixer,
        attacker.animations,
        "celebration",
        () => {},
        3
      );

      setTimeout(() => {
        clearInterval(startBattleInterval);
        startBattleInterval = null;
        startBattleBtn.classList.replace("flex", "hidden");
        oldBfChamps.forEach(([uuid, pos, rot]) => {
          const champ = scene.getObjectByProperty("uuid", uuid);
          if (champ && pos) {
            champ.position.copy(pos);
            champ.userData?.champScene?.position.copy(pos);
            champ.rotation.copy(rot);
            champ.userData?.champScene?.rotation.copy(rot);
            updateStatusBars();
            championManager.playChampionAnimation(
              attacker.mixer,
              attacker.animations,
              "idle",
              () => {}
            );
          }
        });
      }, 3000);
    }
  });
}

function startAttacking(attacker, target, dmg = 100) {
  if (attacker.userData.isAttacking) return;
  attacker.userData.isAttacking = true;

  const attackInterval = setInterval(() => {
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
  }, 1000);
}

startBattleBtn.addEventListener("click", () => {
  // Clone enemy models to skillScene
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

  if (!draggableObjects.some((obj) => obj.bfIndex !== -1)) return;
  draggableObjects.forEach((draggableObject) => {
    if (draggableObject.bfIndex != -1) {
      oldBfChamps.push([
        draggableObject.uuid,
        draggableObject.position.clone(),
        draggableObject.rotation.clone(),
      ]);
    }
  });

  startBattleInterval = setInterval(() => {
    draggableObjects.forEach((obj) => {
      if (obj.bfIndex === -1) return;

      const { nearestTarget, dis } = championManager.findNearestTarget(
        obj,
        bfEnemies
      );
      if (!nearestTarget) return;

      faceToObj(
        null,
        obj.userData.champScene?.rotation,
        nearestTarget.position,
        obj.userData.champScene.position
      );

      const hexSize = 4.5;
      const attackRange = obj.userData.data.stats.range * hexSize;
      const currentDistance = obj.position.distanceTo(nearestTarget.position);

      if (currentDistance > attackRange) {
        const direction = new THREE.Vector3()
          .subVectors(nearestTarget.position, obj.position)
          .normalize();
        const targetPos = nearestTarget.position
          .clone()
          .addScaledVector(direction, -attackRange + 0.8);
        const isBlocked = championManager.isOccupied(targetPos);

        if (!isBlocked) {
          moveCharacter(
            obj.userData.champScene,
            targetPos,
            0.1,
            () => {
              obj.position.copy(targetPos);
              startAttacking(obj, nearestTarget);
            },
            updateStatusBars
          );
        } else {
          // Nếu bị chắn thì vẫn tấn công nếu đủ tầm (khoảng cách thực tế > range nhưng không di chuyển được)
          startAttacking(obj, nearestTarget);
        }
      } else {
        startAttacking(obj, nearestTarget);
      }

      console.log(
        `nearestTarget of ${obj.userData.name}: ${nearestTarget.userData.name} - dis: ${dis}`
      );
    });
  }, 1000);
});

function displayGrid(hideBattleField = false, hideBench = false) {
  bfCells.forEach(({ mesh }) => (mesh.visible = !hideBattleField));
  benchCells.forEach(({ mesh }) => (mesh.visible = !hideBench));
}

// Delete Zone
deleteZone = createDeleteZone(scene, 35, 5, COLOR_DELETE_ZONE, [
  0 - selectedArena.arena[2][0],
  0.01,
  19,
]);

function displayDeleteZone(isShow = true) {
  deleteZone.visible = isShow;
}

function getNormalizedPointer(event, domElement) {
  const rect = domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

// Map Loader & Drag Logic
function loadArena() {
  loadModel(
    selectedArena.url,
    (gltf) => {
      let rightClickTo3dObject = false;
      const arena = gltf.scene;
      arena.name = selectedArena.name;
      arena.position.set(...selectedArena.arena[0]);
      arena.scale.set(...selectedArena.arena[2]);
      arenaBox = new THREE.Box3().setFromObject(arena);
      rightClickEffect = new RightClickEffect(scene, "#c9f73d");
      // console.log(arena);
      // addHelper(scene, arenaBox);
      lightAuto(arena);
      if (debugOn) {
        const debugObjects = [
          { name: "arena (A)", object: arena, key: "a", isOpen: false },

          { name: "Camera (C)", object: camera, key: "c", isOpen: false },
          {
            name: "Delete Zone (D)",
            object: deleteZone,
            key: "d",
            isOpen: false,
          },
          {
            name: "Controls (V)",
            object: controls.target,
            parent: controls,
            key: "v",
            isOpen: false,
          },
        ];
        debugObjects.forEach(createDebugGuiFolder);
      }
      scene.add(arena);
      transparentMeshs(arena);
      arena.receiveShadow = true;
      mixer = new THREE.AnimationMixer(arena);
      if (gltf.animations.length > 0) {
        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer(arena);
        const firstAnimation = animations[0];
        mixer.clipAction(firstAnimation).play();
      }
      // Drag logic
      let isDragging = false,
        selectedObject = null,
        dragOffset = new THREE.Vector3();
      let dragBenchIndex = -1,
        dragBfIndex = -1,
        currPos = null,
        currBenchIndex = -1,
        currBfIndex = -1;
      const raycaster = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      const shop = document.getElementById("shop");
      function disabledOrbitControls() {
        disabledOrbitControlsIds.forEach((id) => {
          const element = document.getElementById(id);
          if (element) {
            element.addEventListener("contextmenu", function (e) {
              e.preventDefault();
            });
            element.addEventListener(
              "mouseenter",
              () => (controls.enabled = false)
            );
            element.addEventListener(
              "mousemove",
              () => (controls.enabled = false)
            );
            element.addEventListener(
              "mouseleave",
              () => (controls.enabled = true)
            );
          }
        });

        if (debugOn) {
          const debugContainer = document.querySelector(".dg.ac");
          debugContainer.addEventListener(
            "mouseenter",
            () => (controls.enabled = false)
          );
          debugContainer.addEventListener(
            "mousemove",
            () => (controls.enabled = false)
          );
          debugContainer.addEventListener(
            "mouseleave",
            () => (controls.enabled = true)
          );
        }
      }
      disabledOrbitControls();

      renderer.domElement.addEventListener("pointerdown", (event) => {
        if (event.button === 0) {
          championManager.displayChampInfor(false);
        }
        if (event.button === 2 && debugControls) {
          raycaster.setFromCamera(
            getNormalizedPointer(event, renderer.domElement),
            camera
          );

          const intersectPoint = new THREE.Vector3();
          raycaster.ray.intersectPlane(plane, intersectPoint);

          console.log("📌 Tọa độ 3D chuột phải:", intersectPoint);
        }
        if (!debugControls) {
          controls.enabled = false;
        }
        raycaster.setFromCamera(
          getNormalizedPointer(event, renderer.domElement),
          camera
        );
        const intersects = raycaster.intersectObjects(draggableObjects, true);
        if (intersects.length > 0) {
          selectedObject = intersects[0].object;
          if (!selectedObject.bfIndex && !selectedObject.benchIndex) {
            selectedObject = null;
            return;
          }
          // display champion infor
          if (event.button === 2 && selectedObject) {
            rightClickTo3dObject = true;
            championManager.displayChampInfor(true, selectedObject);
            setTimeout(() => {
              rightClickTo3dObject = false;
            }, 150);
          } else {
            currPos = { ...selectedObject.position };
            currBenchIndex = selectedObject.benchIndex;
            currBfIndex = selectedObject.bfIndex;
            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersection);
            dragOffset.copy(intersection).sub(selectedObject.position);
            displayGrid(false, false);
            isDragging = true;
          }
          if (isDragging) {
            displayDeleteZone();
            shop.classList.replace("bottom-1", "bottom-[-20vh]");
          }
        }
      });

      let champWantBuy = null;

      renderer.domElement.addEventListener("mousemove", (event) => {
        if (!controls.enabled) {
          controls.enabled = true;
        }

        raycaster.setFromCamera(
          getNormalizedPointer(event, renderer.domElement),
          camera
        );
        const intersects = raycaster.intersectObjects(draggableObjects, true);

        renderer.domElement.style.cursor =
          intersects.length > 0
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default";

        if (intersects.length === 1) {
          champWantBuy = intersects[0].object; // lưu object đang hover
        } else {
          champWantBuy = null;
        }

        if (selectedObject) {
          const worldPos = selectedObject.position.clone();
          const deleteBox = new THREE.Box3().setFromObject(deleteZone);
          deleteZone.material.color.set(
            deleteBox.containsPoint(worldPos)
              ? COLOR_DELETE_MOVEIN
              : COLOR_DELETE_ZONE
          );
        }
      });

      // buy champion buy press "e"
      window.addEventListener("keyup", function (e) {
        if (e.key === "e" && champWantBuy) {
          buyChampion(champWantBuy);
        }
      });

      renderer.domElement.addEventListener("pointermove", (event) => {
        if (!isDragging || !selectedObject) return;
        raycaster.setFromCamera(
          getNormalizedPointer(event, renderer.domElement),
          camera
        );
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        const newPosition = intersection.sub(dragOffset);
        newPosition.y = 0;
        selectedObject.position.copy(newPosition);
        selectedObject.userData.champScene.position.copy(newPosition);

        const worldPos = selectedObject.position.clone();
        let highlighted = false;
        bfCells.forEach(({ mesh }) => mesh.material.color.set(COLOR_MOVEABLE));
        benchCells.forEach(({ mesh }) =>
          mesh.material.color.set(COLOR_MOVEABLE)
        );
        for (let i = 0; i < bfCells.length; i++) {
          const { mesh, center } = bfCells[i];
          const dist = center.distanceTo(worldPos);
          if (dist < selectedArena.battlefield.radius * 0.95) {
            mesh.material.color.set(COLOR_SELECTABLE);
            highlighted = true;
            dragBfIndex = i;
          } else {
            mesh.material.color.set(COLOR_MOVEABLE);
          }
        }
        if (!highlighted) {
          for (let i = 0; i < benchCells.length; i++) {
            const { mesh, box } = benchCells[i];
            const localPos = mySquareGroup?.worldToLocal(worldPos.clone());
            if (box.containsPoint(localPos)) {
              mesh.material.color.set(COLOR_SELECTABLE);
              dragBenchIndex = i;
              highlighted = true;
              break;
            }
          }
        }
        updateStatusBars();
      });

      renderer.domElement.addEventListener("pointerup", () => {
        if (!selectedObject) return;
        let deleting = false;
        displayDeleteZone(false);
        shop.classList.replace("bottom-[-20vh]", "bottom-1");
        controls.enabled = true;
        const worldPos = selectedObject.position.clone();
        let nearestCell = null,
          nearestType = null,
          minDistance = Infinity;
        bfCells.forEach(({ mesh, center }) => {
          const dist = center.distanceTo(worldPos);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCell = center.clone();
            nearestType = "bf";
          }
        });
        benchCells.forEach(({ box }, index) => {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const worldCenter = mySquareGroup?.localToWorld(center.clone());
          const dist = worldCenter.distanceTo(worldPos);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCell = worldCenter.clone();
            nearestType = "bench";
          }
        });
        let highlightMesh = null;
        const deleteBox = new THREE.Box3().setFromObject(deleteZone);
        if (deleteBox.containsPoint(worldPos)) {
          buyChampion(selectedObject);
          // add coin to my bag
          console.log("buy champion");
          nearestType = null;
          deleting = true;
        }
        if (!deleting && !rightClickTo3dObject && selectedObject) {
          let isBench = nearestType === "bench";
          let targetIndex = isBench ? dragBenchIndex : dragBfIndex;
          let currTargetIndex = isBench ? currBenchIndex : currBfIndex;
          let indexKey = isBench ? "benchIndex" : "bfIndex";
          let otherIndexKey = isBench ? "bfIndex" : "benchIndex";
          let cells = isBench ? benchCells : bfCells;

          const existObj = draggableObjects.find(
            (champ) => champ[indexKey] === targetIndex
          );
          if (existObj) {
            existObj.position.copy(currPos);
            existObj.userData.champScene.position.copy(currPos);
            existObj[indexKey] = currTargetIndex;
            existObj[otherIndexKey] = isBench ? currBfIndex : currBenchIndex;
          }

          selectedObject[indexKey] = targetIndex;
          selectedObject[otherIndexKey] = -1;

          cells.forEach(({ mesh, box, center }) => {
            let worldCenter = center;
            if (isBench && box) {
              worldCenter = new THREE.Vector3();
              box.getCenter(worldCenter);
              worldCenter = mySquareGroup.localToWorld(worldCenter);
            }
            if (worldCenter.distanceTo(nearestCell) < 0.01) {
              highlightMesh = mesh;
              highlightMesh.material.color.set(COLOR_SELECTING);
            }
          });
        }

        if (nearestCell) {
          selectedObject.position.set(nearestCell.x, 0.1, nearestCell.z);
          selectedObject.userData.champScene.position.set(
            nearestCell.x,
            0.1,
            nearestCell.z
          );
          updateStatusBars();
        }
        displayGrid(true, true);
        deleting = false;
        dragBenchIndex = -1;
        currPos = null;
        selectedObject = null;
        isDragging = false;
        // reload my traits
        championManager.renderTraits();
      });

      renderer.domElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (!tactician) return;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(
          getNormalizedPointer(event, renderer.domElement),
          camera
        );

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        if (selectedObject) {
          console.log(selectedObject);
        }

        if (arenaBox && arenaBox.containsPoint(intersection)) {
          // console.log("righclick");
          if (!rightClickTo3dObject) {
            rightClickEffect.trigger(intersection);
            tacticianTarget = intersection;
          }
        }
      });

      // Equipment drag & drop
      const equipmentBar = document.getElementById("equipment-bar");
      let draggingEquipImg = null;
      equipmentBar.childNodes.forEach((el) => {
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("itemId", e.target.dataset.itemId);
          e.dataTransfer.setData("itemName", e.target.dataset.itemName);
          draggingEquipImg = e.target;
        });
      });
      renderer.domElement.addEventListener("dragover", (event) =>
        event.preventDefault()
      );
      renderer.domElement.addEventListener("drop", (event) => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData("itemId");
        const itemName = event.dataTransfer.getData("itemName");
        if (!itemId || !itemName) return;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(
          getNormalizedPointer(event, renderer.domElement),
          camera
        );
        const intersects = raycaster.intersectObjects(draggableObjects, true);
        if (intersects.length > 0) {
          const targetObject = intersects[0].object;
          useItem(itemId, itemName, targetObject.uuid, (data) => {
            if (data.champUuid === targetObject.uuid) {
              const item = data.item;
              const [num, stat] = item.stat.split("_");
              let consumableItem = false,
                found = false;
              switch (item.type) {
                case "consumable":
                  alert(
                    `Bạn đã sử dụng ${item.name} cho tướng ${targetObject.name}`
                  );
                  switch (stat) {
                    case "champion":
                      const modelPathUrl =
                        "./assets/models/champions/" +
                        targetObject.userData.name
                          .toLowerCase()
                          .replace(". ", "_")
                          .replace(" ", "_")
                          .replace("'", "") +
                        "_(tft_set_14).glb";
                      for (let i = 0; i < xMes.length; i++) {
                        const spotTaken = draggableObjects.some(
                          (champ) =>
                            champ.bfIndex === -1 && champ.benchIndex === i
                        );
                        if (!spotTaken) {
                          found = true;
                          championManager.addChampion(
                            {
                              position: [xMes[i], 0.1, zMe],
                              url: modelPathUrl,
                              data: targetObject.userData.data,
                            },
                            (dragHelper) => {
                              dragHelper.benchIndex = i;
                              dragHelper.bfIndex = -1;
                              addingFlag = false;
                              draggableObjects.push(dragHelper);
                              sendMessageChangeLineupToEnemy(draggableObjects);
                            }
                          );
                          consumableItem = true;
                          break;
                        }
                      }
                      if (!found) alert("Hàng chờ đầy, không thể thêm tướng");
                      break;
                    default:
                      break;
                  }
                  break;
                case "item":
                  alert(
                    `Bạn đã trang bị ${item.name} cho tướng ${targetObject.name}`
                  );
                  break;
                case "component":
                  alert(
                    `Bạn đã trang bị ${item.name} (component) cho tướng ${targetObject.name}`
                  );
                  break;
              }
              if (consumableItem) {
                draggingEquipImg?.remove();
                draggingEquipImg = null;
              }
            }
          });
        }
      });
    },
    (e) => {
      console.log("error when load arena: ", e);
    },
    (progress) => {
      if (progress) {
        loadingAllPercent = (progress.loaded / progress.total) * 100;
        loadingAssetsProgress.style.width = loadingAllPercent + "%";
        if (loadingAllPercent >= 100) {
          setTimeout(() => {
            loadingAll.style.visibility = "hidden";
          }, 100);
        }
      } else {
        loadingAll.style.visibility = "hidden";
      }
    }
  );
}

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
  tacticians.push(tacticianModel);

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
  loadArena();
};
LoadAllModel();

// open tactician's animations panel
window.addEventListener("keydown", (e) => {
  if (e.key === "a") {
    const animations = document.getElementById("animations");
    animations.classList.remove("hidden");
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

          animations.classList.add("hidden");

          // Lắng nghe sự kiện 'finished' từ mixer
          const onFinished = (e) => {
            if (e.action === action) {
              tacticianActions.idle?.play();
              tacticianMixerGlobal.removeEventListener("finished", onFinished);
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
const tacticianState = { isRunning: false, isAttacking: false };
// Animate
try {
  const slowFactor = 0.5;
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta * slowFactor);
    draggableObjects.forEach((draggableObject) => {
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
    tacticians.forEach((tactician) => {
      tactician.update(delta * slowFactor);
    });

    // carousel.update();

    if (tactician && tacticianTarget) {
      moveToOtherObject(
        tactician,
        tacticianTarget,
        tacticianSpeed,
        () => {
          tacticianTarget = null;
        },
        tacticianState,
        tacticianActions
      );
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
      itemsOutBag.forEach((item, index) => {
        if (item.checkCollision(tactician)) {
          itemsOutBag.splice(index, 1);
          console.log("nhặt " + item.name);
          item.removeFromScene();
        }
      });
      // mixer.update(delta * slowFactor);
      if (tacticianMixerGlobal) tacticianMixerGlobal.update(delta * slowFactor);
    }
    // right click effect
    if (rightClickEffect) rightClickEffect.update();
    if (objectsOfChamp.length > 0) {
      objectsOfChamp.forEach((obj) => {
        if (obj.mixer && obj.update) {
          obj.update(delta * slowFactor);
        }
      });
    }
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

// Shop logic
const champShopList = document.getElementById("champ-shop-list");
let addingFlag = false;

champShopList.addEventListener("click", async (e) => {
  if (addingFlag) return;
  const card = e.target.closest(".champ-card-shop");
  if (!card) return;

  const index = card.indexInRoll;
  const champData = window.champsInRoll?.[index];
  if (!champData || window.champsBought[index] === 1) {
    alert(
      "Bạn đã mua tướng này rồi! nghịch devtools admin sẽ ban acc của bạn =))))"
    );
    return;
  }

  addingFlag = true;

  // Xác định tên và đường dẫn model
  const champName = champData.name
    .toLowerCase()
    .replace(". ", "_")
    .replace(" ", "_")
    .replace("'", "");
  const modelPathUrl = `./assets/models/champions/${champName}_(tft_set_14).glb`;

  // Tìm vị trí trống trong bench
  const emptyIndex = xMes.findIndex(
    (_, i) =>
      !draggableObjects.some((c) => c.bfIndex === -1 && c.benchIndex === i)
  );

  if (emptyIndex === -1) {
    alert("Hàng chờ đầy, không thể mua thêm tướng");
    addingFlag = false;
    return;
  }

  // Nếu là bloblet của Zac
  if (card.zacBloblet) {
    const zac = draggableObjects.find((obj) => obj.userData.name === "Zac");
    if (zac?.bfIndex !== -1) {
      const overlay = card.querySelector(".overlay-shop-champ");
      overlay?.classList.replace("opacity-100", "opacity-0");
      card.zacBloblet = false;

      new Model(scene, {
        name: "virus",
        url: "./assets/models/skills/tft14_virus_bloblet.glb",
        position: [Math.random() * 20 - 10, zac.position.y, 15],
        scale: [0.02, 0.02, 0.02],
        onLoaded: (virusModel) => {
          objectsOfChamp.push(virusModel);
          moveCharacter(virusModel, zac, 0.1, () => {
            virusModel.removeFromScene();
            championManager.highlight(mixer, zac);
            objectsOfChamp.splice(
              objectsOfChamp.findIndex((obj) => obj === virusModel),
              1
            );
          });
        },
        debug: false,
      });
    }
    addingFlag = false;
    return;
  }

  // Mua tướng bình thường
  championManager.addChampion(
    {
      url: modelPathUrl,
      position: [xMes[emptyIndex], 0, zMe],
      data: card.data,
    },
    (dragHelper) => {
      dragHelper.benchIndex = emptyIndex;
      dragHelper.bfIndex = -1;
      window.champsBought[index] = 1;
      card.classList.add("invisible");
      sendMessageChangeLineupToEnemy(draggableObjects);
      draggableObjects.push(dragHelper);
      addingFlag = false;
    }
  );
});

export { draggableObjects, updateEnemyLineup };
