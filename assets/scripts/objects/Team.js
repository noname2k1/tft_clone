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
} from "~/variables";
import {
  getNormalizedPointer,
  lightAuto,
  loadModel,
  transparentMeshs,
} from "../utils/utils";
import { RightClickEffect } from "./effects";
import {
  createBattleField,
  createBench,
  createDeleteZone,
  moveCharacter,
} from "../services/services";
import ChampionManager from "./ChampionManager";
import { addGold } from "../others/goldExp";
import Model from "./Model";
import Battle from "./Battle";

export default class Team {
  #arena;
  #championManager;
  tacticianTarget = null;
  rightClickEffect = null;
  objectsOfChamp = [];
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
    let loadingAllPercent = 0;
    const primaryY = 0;
    // elements
    const loadingAll = document.getElementById("loading-all");
    const loadingAssetsProgress = document.getElementById(
      "loading-assets-progress"
    );
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

        let champWantBuy = null;

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
            this.buyChampion(champWantBuy);
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
            this.buyChampion(selectedObject);
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
        this.renderer.domElement.addEventListener("dragover", (event) =>
          event.preventDefault()
        );
        this.renderer.domElement.addEventListener("drop", (event) => {
          event.preventDefault();
          const itemId = event.dataTransfer.getData("itemId");
          const itemName = event.dataTransfer.getData("itemName");
          if (!itemId || !itemName) return;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(
            getNormalizedPointer(event, this.renderer.domElement),
            this.camera
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
                            this.#championManager.addChampion(
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
                                sendMessageChangeLineupToEnemy(
                                  draggableObjects
                                );
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

          new Model(this.scene, {
            name: "virus",
            url: "./assets/models/skills/tft14_virus_bloblet.glb",
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
          url: modelPathUrl,
          position: [xMes[emptyIndex], 0, zMe],
          data: card.data,
        },
        (dragHelper) => {
          dragHelper.benchIndex = emptyIndex;
          dragHelper.bfIndex = -1;
          window.champsBought[index] = 1;
          card.classList.add("invisible");
          this.sendMessageChangeLineupToEnemy(draggableObjects);
          draggableObjects.push(dragHelper);
          addingFlag = false;
        }
      );
    });
  }

  sendMessageChangeLineupToEnemy() {
    console.log(ChampionManager.draggableObjects);
  }

  getTacticianTarget() {
    return this.tacticianTarget;
  }

  updateTacticianTarget(target = null) {
    this.tacticianTarget = target;
  }

  updateAll(frameRate) {
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

  buyChampion = (selectedObject, gold = 3) => {
    this.#championManager.removeChampFromScene(this.scene, selectedObject);
    addGold(gold);
  };
}
