import * as THREE from "https://esm.sh/three";
import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";
import {
  addHelper,
  createDebugGuiFolder,
  createImage,
  createText,
  lightAuto,
  loadModel,
  splitModelsFromGLB,
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
  bgUrl,
  LOW_GRAPHICS_MODE,
} from "~/variables.js";
import { useItem } from "~~/item/item.js";
import ChampionManager from "~~/objects/ChampionManager.js";
import Model from "~~/objects/Model.js";
import { RightClickEffect } from "~~/objects/effects.js";
import SecretSphere from "~~/objects/SecretSphere.js";
import TFTCarousel from "~~/objects/Carousel.js";
import {
  customFetch,
  sendMessageChangeLineupToEnemy,
} from "~~/utils/callApi.js";
import { createDeleteZone } from "./assets/scripts/services/services.js";

// Config
let xMes = [];
let xBenchEnemy = [];
// Globals
let mySquareGroup;
let enemySquareGroup;
let mixer;
const clock = new THREE.Clock();
let draggableObjects = [];
let bfEnemyCells = [];
let benchEnemiesCells = [];
let bfCells = [];
let benchCells = [];
let deleteZone, textMesh, trashIcon;
const itemsOutBag = [];
const tftArguments = [];
const tacticians = [];
let tactician,
  tacticianTarget = null;
let tacticianMixerGlobal;
let tacticianActions = {};
let taticianAnimations;
let isRunning = false;
const primaryY = 0;
let arenaBox;
let rightClickEffect;
let loadingAllPercent = 0;
const selectedArena = ARENA_DATAS[0];
let zMe = selectedArena.bench[0][2];
let zBenchEnemy = 0;

const debugControls = false;

// elements
const loadingAll = document.getElementById("loading-all");
const loadingAssetsProgress = document.getElementById(
  "loading-assets-progress"
);
// Scene, Camera, Controls
const scene = new THREE.Scene();
const championManager = new ChampionManager(scene, draggableObjects);
const loader = new THREE.TextureLoader();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 30, 25);
// background
loader.load(bgUrl, (texture) => (scene.background = texture));

const controls = new OrbitControls(camera, document.body);
function setupControls(rotate = false, zoom = true, pan = true) {
  controls.enableZoom = zoom;
  controls.enableRotate = rotate; // ✅ bật xoay
  controls.enablePan = pan;
  controls.minDistance = debugControls ? 5 : 15;
  controls.maxDistance = debugControls ? 50 : 25;

  // ✅ Cho phép xoay lên/xuống toàn phần
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // ✅ Cho phép xoay ngang toàn phần
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;

  controls.target.set(0, 2, 6);
  controls.update();
}
setupControls(debugControls);

const setupLight = () => {
  // const light = new THREE.DirectionalLight(0xffffff, 2); // tăng từ 1 → 1.5
  // light.position.set(10, 10, 10);
  // scene.add(light);

  // const ambient = new THREE.AmbientLight(0xffffff, 1); // tăng từ 0.5 → 0.8
  // scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(10, 10, 10);
  light.castShadow = true;

  // Tùy chỉnh chất lượng bóng
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 50;
  light.shadow.camera.left = -20;
  light.shadow.camera.right = 20;
  light.shadow.camera.top = 20;
  light.shadow.camera.bottom = -20;

  scene.add(light);
};
setupLight();

const renderer = new THREE.WebGLRenderer({ antialias: true });
function setupRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
}
setupRenderer();

// Utility
function updateStatusBars() {
  draggableObjects.forEach((obj) => {
    if (obj.userData.statusBarGroup) {
      obj.userData.statusBarGroup.position.copy(obj.position);
    }
  });
}

// add champion to enemy grid when receive a msg from server
const updateEnemyChamps = async () => {
  // console.log({ benchEnemiesCells, bfEnemyCells });
  // benchEnemiesCells.forEach((benchEnemy, index) => {
  //   console.log({ [index]: benchEnemy });
  // });
  // await customFetch("champs", (data) => {
  //   console.log(data);
  // });
  // championManager.addChampion(
  //   mixer,
  //   {
  //     name: champName,
  //     position: [xBenchEnemy[xBenchEnemy.length - 1 - i], 0, zBenchEnemy],
  //     url: modelPathUrl,
  //     traits: rollList[indexCard].traits,
  //   },
  //   (dragHelper) => {}
  // );
};
updateEnemyChamps();

// Battle Field
function createBattleField(
  rows,
  cols,
  data = { radius: 0, startX: 0, startZ: 0 },
  owner = "me"
) {
  const { radius, startX, startZ } = data;
  const hexMaterial = new THREE.LineBasicMaterial({
    color: COLOR_MOVEABLE,
    linewidth: 100,
  });
  const angleOffset = Math.PI / 6;
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (i === 0) hexShape.moveTo(x, z);
    else hexShape.lineTo(x, z);
  }
  hexShape.closePath();
  const hexPoints = hexShape.getPoints();
  const hexGeometry = new THREE.BufferGeometry().setFromPoints(
    hexPoints.map((p) => new THREE.Vector3(p.x, 0.01, p.y))
  );
  const dis = 1.2;
  const hexWidth = Math.sqrt(3) * radius * dis;
  const hexRowSpacing = 1.5 * radius * dis;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * (hexWidth / 2);
      const x = startX + col * hexWidth + offsetX;
      const z = startZ + row * hexRowSpacing;
      const hex = new THREE.Line(hexGeometry, hexMaterial.clone());
      hex.position.set(x, 0, z);
      scene.add(hex);
      hex.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(hex);
      if (owner === "me") {
        hex.visible = false;
        bfCells.push({ mesh: hex, center: new THREE.Vector3(x, 0, z), box });
      } else {
        hex.visible = false;
        bfEnemyCells.push({
          mesh: hex,
          center: new THREE.Vector3(x, 0, z),
          box,
        });
      }
    }
  }
}
createBattleField(4, 7, selectedArena.battlefield);
createBattleField(4, 7, selectedArena.enemyBattlefield, "enemy");

// Bench
function createBench(rows, cols, size, gap = 0.2, position, owner = "me") {
  let squareGroup =
    owner === "me" && owner !== "enemy" ? mySquareGroup : enemySquareGroup;
  if (squareGroup) scene.remove(squareGroup);
  squareGroup = new THREE.Group();

  benchCells = [];
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const step = size + gap;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step,
        z = row * step;
      const points = [
        new THREE.Vector3(x, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineSegments = new THREE.LineSegments(
        geometry,
        lineMaterial.clone()
      );
      lineSegments.visible = false;
      squareGroup.add(lineSegments);
      const box = new THREE.Box3(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + size, 1, z + size)
      );

      if (owner === "me") {
        xMes[col] = x + position[0] + (size - 1);
        benchCells.push({ mesh: lineSegments, box });
      } else {
        xBenchEnemy[col] = x + position[0] + (size - 1);
      }
    }
    if (owner === "me") {
      zMe = position[2] + (size - 1);
    } else {
      zBenchEnemy = position[2] + (size - 1);
    }
  }
  squareGroup.updateMatrixWorld();
  squareGroup.position.set(...position);
  scene.add(squareGroup);
  if (debugOn) {
    const objectDebug = {
      name: owner + "'s SquareGroup (" + owner.charAt(0).toUpperCase() + ")",
      object: squareGroup,
      key: owner.charAt(0),
      isOpen: false,
    };
    createDebugGuiFolder(objectDebug);
  }
  return squareGroup;
}

// enemy's bench
enemySquareGroup = createBench(
  1,
  9,
  2,
  selectedArena.benchGap,
  selectedArena.enemyBench[0],
  "enemy"
);

// my bench
mySquareGroup = createBench(
  1,
  9,
  2,
  selectedArena.benchGap,
  selectedArena.bench[0]
);

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

      const disabledOrbitControlsIds = ["shop", "animations", "left-bar"];

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
          championManager.removeChampFromScene(scene, selectedObject);
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

        // reload my traits
        championManager.renderTraits();
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
                            mixer,
                            {
                              position: [xMes[i], 0.1, zMe],
                              url: modelPathUrl,
                              data: targetObject.userData.data,
                            },
                            (dragHelper) => {
                              dragHelper.benchIndex = i;
                              dragHelper.bfIndex = -1;
                              addingFlag = false;
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

// Animate
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  itemsOutBag.forEach((item) => {
    item.update(delta);
  });
  tftArguments.forEach((item) => {
    item.update(delta);
  });
  tacticians.forEach((tactician) => {
    tactician.update(delta);
  });

  // carousel.update();

  if (tactician && tacticianTarget) {
    const pos = tactician.position;
    const dir = new THREE.Vector3().subVectors(tacticianTarget, pos);
    dir.y = 0;
    const distance = dir.length();
    if (distance > 0.1) {
      if (!isRunning) {
        tacticianActions.idle?.stop();
        tacticianActions.run?.play();
        isRunning = true;
      }
      dir.normalize();
      // console.log(dir.multiplyScalar(tacticianSpeed));
      tactician.rotation.y = Math.atan2(dir.x, dir.z);
      tactician.position.add(dir.multiplyScalar(tacticianSpeed));
      // tactician.position.y = 4;
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
    } else {
      tactician.position.copy(tacticianTarget);
      tacticianTarget = null;
      if (isRunning) {
        tacticianActions.run?.stop();
        tacticianActions.idle?.play();
        isRunning = false;
      }
    }

    itemsOutBag.forEach((item, index) => {
      if (item.checkCollision(tactician)) {
        itemsOutBag.splice(index, 1);
        console.log("nhặt " + item.name);
        item.removeFromScene();
      }
    });

    if (tacticianMixerGlobal) tacticianMixerGlobal.update(clock.getDelta());
  }

  // right click effect
  if (rightClickEffect) rightClickEffect.update();
}
animate();

// Shop logic
const champShopList = document.getElementById("champ-shop-list");
let addingFlag = false;
champShopList.addEventListener("click", function (e) {
  if (addingFlag) return;
  const rollList = window.champsInRoll;
  addingFlag = true;
  const target = e.target.closest(".champ-card-shop");
  if (target) {
    const indexCard = target.indexInRoll;
    if (window.champsBought[indexCard] === 1) {
      alert(
        "Bạn đã mua tướng này rồi! nghịch devtools admin sẽ ban acc của bạn =))))"
      );
      addingFlag = false;
      return;
    }
    const champName =
      rollList[indexCard].name
        .toLowerCase()
        .replace(". ", "_")
        .replace(" ", "_")
        .replace("'", "") || target.champName;
    const modelPathUrl =
      "./assets/models/champions/" + champName + "_(tft_set_14).glb";
    let found = false;
    for (let i = 0; i < xMes.length; i++) {
      const spotTaken = draggableObjects.some(
        (champ) => champ.bfIndex === -1 && champ.benchIndex === i
      );
      if (!spotTaken) {
        found = true;
        championManager.addChampion(
          mixer,
          {
            url: modelPathUrl,
            position: [xMes[i], 0, zMe],
            data: target.data,
          },
          (dragHelper) => {
            dragHelper.benchIndex = i;
            dragHelper.bfIndex = -1;
            addingFlag = false;
            champsBought[indexCard] = 1;
            target.classList.add("invisible");
            sendMessageChangeLineupToEnemy(draggableObjects);
          }
        );

        break;
      }
    }
    if (!found) {
      alert("Hàng chờ đầy, không thể mua thêm tướng");
      addingFlag = false;
    }
  } else {
    addingFlag = false;
  }
});

export { draggableObjects };
