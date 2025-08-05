import * as THREE from "https://esm.sh/three";
import {
  COLOR_DELETE_ZONE,
  COLOR_DELETE_MOVEIN,
  COLOR_HP,
  COLOR_MOVEABLE,
  COLOR_MP,
  COLOR_ORANGE,
  COLOR_SELECTABLE,
  COLOR_SELECTING,
  COLOR_SPECIAL,
  debugOn,
  tacticianSpeed,
  MODEL_CACHES,
  CHAMPS_INFOR,
} from "~/variables";
import {
  addHelper,
  generateIconURLFromRawCommunityDragon,
  getNormalizedPointer,
  lightAuto,
  loadModel,
  ObserverElementChange,
  preloadImage,
  transparentMeshs,
} from "../utils/utils";
import { RightClickEffect } from "./effects";
import {
  createBattleField,
  createBench,
  createDeleteZone,
  injectVariables,
  moveCharacter,
  onTooltip,
} from "../services/services";
import ChampionManager from "./ChampionManager";
import { addGold } from "../others/goldExp";
import Model from "./Model";
import Battle from "./Battle";
import { customFetch } from "../utils/callApi";

export default class Team {
  #arena;
  #championManager;
  tacticianTarget = null;
  rightClickEffect = null;
  objectsOfChamp = [];
  draggingItem = null;
  champWantBuy = null;

  constructor(
    scene,
    renderer,
    controls,
    camera,
    selectedArena,
    debugControls,
    teamName
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.controls = controls;
    this.camera = camera;
    this.selectedArena = selectedArena;
    this.#championManager = new ChampionManager(scene);
    this.debugControls = debugControls;
    this.teamName = teamName;
    this.teamId = Battle.addTeam(teamName).uuid;
    this.loadArena();
  }

  onFirstLoad(progress) {
    // if (progress) {
    // } else {
    //   loadingAll.style.visibility = "hidden";
    // }
  }

  loadArena() {
    const bfCells = createBattleField(
      this.scene,
      4,
      7,
      this.selectedArena.battlefield
    );
    const bfEnemyCells = createBattleField(
      this.scene,
      4,
      7,
      this.selectedArena.enemyBattlefield,
      "enemy"
    );

    const createEnemyBench = createBench(
      this.scene,
      1,
      9,
      2,
      this.selectedArena.benchGap,
      this.selectedArena.enemyBench[0],
      "enemy"
    );
    // my bench
    const createMyBench = createBench(
      this.scene,
      1,
      9,
      2,
      this.selectedArena.benchGap,
      this.selectedArena.bench[0]
    );

    const enemySquareGroup = createEnemyBench.squareGroup;
    const xBenchEnemy = createEnemyBench.xBenchEnemy;
    const zBenchEnemy = createEnemyBench.zBenchEnemy;
    const benchEnemiesCells = createEnemyBench.benchCells;
    const mySquareGroup = createMyBench.squareGroup;
    const xMes = createMyBench.xMes;
    const zMe = createMyBench.zMe;
    const benchCells = createMyBench.benchCells;

    function displayGrid(hideBattleField = false, hideBench = false) {
      bfCells.forEach(({ mesh }) => (mesh.visible = !hideBattleField));
      benchCells.forEach(({ mesh }) => (mesh.visible = !hideBench));
    }

    // variables
    const draggableObjects = ChampionManager.draggableObjects;
    let mixer;
    let arenaBox;
    const primaryY = 0;
    // elements
    const disabledOrbitControlsIds = [
      "shop",
      "animations",
      "left-bar",
      "champ-inspect",
      "config",
      "primary-modal",
      "enemy-define",
    ];

    // Delete Zone
    const deleteZone = createDeleteZone(this.scene, 35, 5, COLOR_DELETE_ZONE, [
      0 - this.selectedArena.arena[2][0],
      0.01,
      19,
    ]);

    const displayDeleteZone = (isShow = true) => {
      deleteZone.visible = isShow;
    };
    // Map Loader & Drag Logic
    loadModel(
      this.selectedArena.url,
      (gltf) => {
        let rightClickTo3dObject = false;
        const arena = gltf.scene;
        arena.name = this.selectedArena.name;
        arena.position.set(...this.selectedArena.arena[0]);
        arena.scale.set(...this.selectedArena.arena[2]);
        arenaBox = new THREE.Box3().setFromObject(arena);
        this.rightClickEffect = new RightClickEffect(this.scene, "#c9f73d");
        // console.log(arena);
        // addHelper(scene, arenaBox);
        lightAuto(arena);
        if (debugOn) {
          const debugObjects = [
            { name: "arena (A)", object: arena, key: "a", isOpen: false },

            {
              name: "Camera (C)",
              object: this.camera,
              key: "c",
              isOpen: false,
            },
            {
              name: "Delete Zone (D)",
              object: deleteZone,
              key: "d",
              isOpen: false,
            },
            {
              name: "Controls (V)",
              object: this.controls.target,
              parent: this.controls,
              key: "v",
              isOpen: false,
            },
          ];
          debugObjects.forEach(createDebugGuiFolder);
        }
        this.scene.add(arena);
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
        const disabledOrbitControls = () => {
          disabledOrbitControlsIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
              element.addEventListener("contextmenu", function (e) {
                e.preventDefault();
              });
              element.addEventListener(
                "mouseenter",
                () => (this.controls.enabled = false)
              );
              element.addEventListener(
                "mousemove",
                () => (this.controls.enabled = false)
              );
              element.addEventListener(
                "mouseleave",
                () => (this.controls.enabled = true)
              );
            }
          });

          if (debugOn) {
            const debugContainer = document.querySelector(".dg.ac");
            debugContainer.addEventListener(
              "mouseenter",
              () => (this.controls.enabled = false)
            );
            debugContainer.addEventListener(
              "mousemove",
              () => (this.controls.enabled = false)
            );
            debugContainer.addEventListener(
              "mouseleave",
              () => (this.controls.enabled = true)
            );
          }
        };
        disabledOrbitControls();

        this.renderer.domElement.addEventListener("pointerdown", (event) => {
          if (event.button === 0) {
            this.#championManager.displayChampInfor(false);
          }
          if (event.button === 2 && this.debugControls) {
            raycaster.setFromCamera(
              getNormalizedPointer(event, this.renderer.domElement),
              this.camera
            );

            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersectPoint);

            console.log("📌 Tọa độ 3D chuột phải:", intersectPoint);
          }
          if (!this.debugControls) {
            this.controls.enabled = false;
          }
          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
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
              this.#championManager.displayChampInfor(true, selectedObject);
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

        this.renderer.domElement.addEventListener("mousemove", (event) => {
          if (!this.controls.enabled) {
            this.controls.enabled = true;
          }

          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
          );
          const intersects = raycaster.intersectObjects(draggableObjects, true);

          this.renderer.domElement.style.cursor =
            intersects.length > 0
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default";

          if (intersects.length === 1) {
            if (this.champWantBuy) {
              this.champWantBuy.hover.visible = false;
            }
            this.champWantBuy = intersects[0].object; // lưu object đang hover
            if (this.champWantBuy) {
              this.champWantBuy.hover.visible = true;
            }
          } else {
            if (this.champWantBuy) {
              this.champWantBuy.hover.visible = false;
            }
            this.champWantBuy = null;
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
        window.addEventListener("keyup", (e) => {
          if (e.key === "e" && champWantBuy) {
            Team.buyChampion(this.scene, champWantBuy);
            champWantBuy.hover.visible = false;
            champWantBuy = null;
          }
        });

        this.renderer.domElement.addEventListener("pointermove", (event) => {
          if (!isDragging || !selectedObject) return;
          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
          );
          const intersection = new THREE.Vector3();
          raycaster.ray.intersectPlane(plane, intersection);
          const newPosition = intersection.sub(dragOffset);
          newPosition.y = 0;
          selectedObject.position.copy(newPosition);
          selectedObject.userData.champScene.position.copy(newPosition);

          const worldPos = selectedObject.position.clone();
          let highlighted = false;
          bfCells.forEach(({ mesh }) =>
            mesh.material.color.set(COLOR_MOVEABLE)
          );
          benchCells.forEach(({ mesh }) =>
            mesh.material.color.set(COLOR_MOVEABLE)
          );
          for (let i = 0; i < bfCells.length; i++) {
            const { mesh, center } = bfCells[i];
            const dist = center.distanceTo(worldPos);
            if (dist < this.selectedArena.battlefield.radius * 0.95) {
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
          ChampionManager.updateStatusBars();
        });

        this.renderer.domElement.addEventListener("pointerup", () => {
          if (!selectedObject) return;
          let deleting = false;
          displayDeleteZone(false);
          shop.classList.replace("bottom-[-20vh]", "bottom-1");
          this.controls.enabled = true;
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
            Team.buyChampion(this.scene, selectedObject);
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
            ChampionManager.updateStatusBars();
          }
          displayGrid(true, true);
          deleting = false;
          dragBenchIndex = -1;
          currPos = null;
          selectedObject = null;
          isDragging = false;
          // reload my traits
          this.#championManager.renderTraits();
        });

        this.renderer.domElement.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
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
              this.rightClickEffect.trigger(intersection);
              this.tacticianTarget = intersection;
            }
          }
        });

        this.renderer.domElement.addEventListener("dragover", (event) =>
          event.preventDefault()
        );
        this.renderer.domElement.addEventListener("drop", (event) => {
          event.preventDefault();
          const itemData = this.draggingItem.data;
          if (!itemData) return;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
          );
          const intersects = raycaster.intersectObjects(draggableObjects, true);
          if (intersects.length > 0) {
            const targetObject = intersects[0].object;
            console.log(itemData);
            console.log(targetObject);
            this.draggingItem = null;
          }
        });
      },
      (e) => {
        console.log("error when load arena: ", e);
      },
      (progress) => {
        this.onFirstLoad(progress);
      }
    );

    // Shop logic
    const champShopList = document.getElementById("champ-shop-list");
    let addingFlag = false;

    // add champion by put orbs
    new ObserverElementChange(
      document.getElementById("add-champion-notice"),
      (mutation) => {
        if (mutation.type === "childList") {
          const champData = CHAMPS_INFOR.find(
            (champInfor) => champInfor.name === mutation.target.textContent
          );
          if (!champData) return;
          addingFlag = true;
          // Tìm vị trí trống trong bench
          const emptyIndex = xMes.findIndex(
            (_, i) =>
              !draggableObjects.some(
                (c) => c.bfIndex === -1 && c.benchIndex === i
              )
          );

          const existedChampSameName = [];
          ChampionManager.getMyTeam().forEach((champEx) => {
            if (
              champEx.userData.name === champData.name &&
              champEx.userData.level === 1
            ) {
              existedChampSameName.push(champEx);
            }
          });

          if (emptyIndex === -1 && existedChampSameName.length < 2) {
            // alert("Hàng chờ đầy, không thể thêm tướng");
            addGold(champData.cost);
            addingFlag = false;
            return;
          }

          // Mua tướng bình thường
          this.#championManager.addChampion(
            {
              position:
                existedChampSameName.length === 2
                  ? [0, 0, 0]
                  : [xMes[emptyIndex], 0, zMe],
              data: champData,
            },
            (dragHelper) => {
              dragHelper.benchIndex = emptyIndex;
              dragHelper.bfIndex = -1;
              draggableObjects.push(dragHelper);
              this.sendMessageChangeLineupToEnemy(ChampionManager.getMyTeam());
              addingFlag = false;
              // addHelper(this.scene, dragHelper);
            }
          );
        }
      }
    );

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

      // Tìm vị trí trống trong bench
      const emptyIndex = xMes.findIndex(
        (_, i) =>
          !draggableObjects.some((c) => c.bfIndex === -1 && c.benchIndex === i)
      );

      const existedChampSameName = [];
      ChampionManager.getMyTeam().forEach((champEx) => {
        if (
          champEx.userData.name === champData.name &&
          champEx.userData.level === 1
        ) {
          existedChampSameName.push(champEx);
        }
      });

      if (emptyIndex === -1 && existedChampSameName.length < 2) {
        alert("Hàng chờ đầy, không thể mua thêm tướng");
        addingFlag = false;
        return;
      }

      // Nếu là bloblet của Zac (mua 14)
      if (card.zacBloblet) {
        const zac = draggableObjects.find((obj) => obj.userData.name === "Zac");
        if (zac?.bfIndex !== -1) {
          const overlay = card.querySelector(".overlay-shop-champ");
          overlay?.classList.replace("opacity-100", "opacity-0");
          card.zacBloblet = false;

          new Model(this.scene, {
            name: "virus",
            url: "/models/skills/tft14_virus_bloblet.glb",
            position: [
              Math.random() * 20 - 10,
              zac.position.y,
              Math.random() < 0.5 ? 15 : -11,
            ],
            scale: [0.02, 0.02, 0.02],
            onLoaded: (virusModel) => {
              this.objectsOfChamp.push(virusModel);
              moveCharacter(virusModel, zac, 10, () => {
                virusModel.removeFromScene();
                this.#championManager.highlight(mixer, zac);
                this.objectsOfChamp.splice(
                  this.objectsOfChamp.findIndex((obj) => obj === virusModel),
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
      this.#championManager.addChampion(
        {
          position:
            existedChampSameName.length === 2
              ? [0, 0, 0]
              : [xMes[emptyIndex], 0, zMe],
          data: card.data,
        },
        (dragHelper) => {
          dragHelper.benchIndex = emptyIndex;
          dragHelper.bfIndex = -1;
          window.champsBought[index] = 1;
          card.classList.add("invisible");
          draggableObjects.push(dragHelper);
          this.sendMessageChangeLineupToEnemy(ChampionManager.getMyTeam());
          addingFlag = false;
          addGold(-dragHelper.userData.data.cost);
          // addHelper(this.scene, dragHelper);
        }
      );
    });
  }

  sendMessageChangeLineupToEnemy() {
    console.log(
      "sendMessageChangeLineupToEnemy: ",
      ChampionManager.getMyTeam()
    );
  }

  getTacticianTarget() {
    return this.tacticianTarget;
  }

  updateTacticianTarget(target = null) {
    this.tacticianTarget = target;
  }

  updateAll(frameRate) {
    // Equipment drag & drop
    const equipmentBar = document.getElementById("equipment-bar");
    // equipments, items using
    equipmentBar.childNodes.forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        this.draggingItem = el;
      });
    });
    if (this.objectsOfChamp.length > 0) {
      this.objectsOfChamp.forEach((obj) => {
        if (obj.mixer && obj.update) {
          obj.update(frameRate);
        }
      });
    }
    if (this.rightClickEffect) this.rightClickEffect.update();
  }

  loadSettings() {}

  getChampionManager() {
    return this.#championManager;
  }

  static buyChampion = (scene, champ) => {
    ChampionManager.removeChampFromScene(scene, champ);
    addGold(champ.userData.data.cost * Math.pow(3, champ.userData.level - 1));
  };

  static addItem(item) {
    if (!item) return;
    // console.log(item);
    const equipbarWrapper = document.getElementById("equipment-bar");
    const equiItem = document.createElement("img");
    equiItem.className =
      "w-[2vw] cursor-pointer h-[2vw] mb-[0.98vw] border-yellow-500 border";
    equiItem.src = generateIconURLFromRawCommunityDragon(item.icon);
    equiItem.alt = "equip " + item.name;
    equiItem.data = item;
    onTooltip(
      equiItem,
      (tooltip) => {
        tooltip.style.maxWidth = "unset";
        const newDesc = injectVariables(
          item.desc,
          Object.entries(item.effects).map(([key, value]) => ({
            name: key,
            value: [value],
          })),
          {},
          1,
          "item"
        );
        // console.log(newDesc);
        const imgHtml = `<div class="flex">
            <img
              src="${generateIconURLFromRawCommunityDragon(item?.icon)}"
              class="w-[5vw] h-[5vw]"
              alt="${item.name}-skill"
            />
            <div class="flex flex-col pl-[0.5vw] ">
              <h2 class="font-semibold text-[1.2vw]">${item.name}</h2>
              <p class="font-medium text-[0.875vw] max-w-[20vw] break-words whitespace-pre-wrap">${newDesc}</p>
            </div>
          </div>`;
        tooltip.insertAdjacentHTML("beforeend", imgHtml);
      },
      "top,right"
    );
    equipbarWrapper.appendChild(equiItem);
  }
}
