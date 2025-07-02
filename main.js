import * as THREE from "https://esm.sh/three";
import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";
import {
  createDebugGuiFolder,
  createImage,
  createText,
  lightAuto,
  loadModel,
} from "~~/utils/utils.js";
import {
  addChampion,
  renderTraits,
} from "./assets/scripts/champion/champion.js";
import {
  COLOR_DELETE_ZONE,
  COLOR_SELECTABLE,
  COLOR_MOVEABLE,
  COLOR_SELECTING,
  COLOR_DELETE_MOVEIN,
  debugOn,
} from "~/variables.js";
import { useItem } from "~~/item/item.js";
import "~/assets/scripts/champion/champion.js";
// Config
const urlMap = "./assets/models/arenas/tft_default_arena.glb";
const zMe = 11.5;
const xMes = Array.from({ length: 9 }, (_, i) => -9 + i * 2.1);

// Scene, Camera, Controls
const scene = new THREE.Scene();
const loader = new THREE.TextureLoader();

loader.load("./bg.jpg", (texture) => (scene.background = texture));
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 30, 25);

const controls = new OrbitControls(camera, document.body);
function setupControls() {
  controls.enableZoom = true;
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.minDistance = 13;
  controls.maxDistance = 21;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, 0, 5);
  controls.update();
}
setupControls();

const renderer = new THREE.WebGLRenderer({ antialias: true });
function setupRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  document.body.appendChild(renderer.domElement);
}
setupRenderer();

// Globals
let squareGroup;
let mixer;
const clock = new THREE.Clock();
let draggableObjects = [];
let bfCells = [];
let benchCells = [];
let deleteZone, textMesh, trashIcon;
const radius = 1.3;

// Utility
function updateStatusBars() {
  draggableObjects.forEach((obj) => {
    if (obj.statusGroup) {
      obj.statusGroup.position.copy(obj.position);
    }
  });
}

// Battle Field
function createBattleField(rows, cols, radius) {
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
  const dis = 1.08;
  const hexWidth = Math.sqrt(3) * radius * dis;
  const hexRowSpacing = 1.5 * radius * dis;
  const startX = -8,
    startZ = 2.7;
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
      bfCells.push({ mesh: hex, center: new THREE.Vector3(x, 0, z), box });
    }
  }
}
createBattleField(4, 7, radius);

// Bench
function createBench(rows, cols, size, gap = 0.2) {
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
      benchCells.push({ mesh: lineSegments, box });
    }
  }
  squareGroup.position.set(-10.05, 0, zMe - 0.65);
  squareGroup.scale.set(1.1, 1, 0.9);
  scene.add(squareGroup);
}
createBench(1, 9, 1.5, 0.45);

function displayGrid(hideBattleField = false, hideBench = false) {
  bfCells.forEach(({ mesh }) => (mesh.visible = !hideBattleField));
  benchCells.forEach(({ mesh }) => (mesh.visible = !hideBench));
}

// Delete Zone
function createDeleteZone() {
  const dzWidth = 20,
    dzDepth = 4;
  deleteZone = new THREE.Mesh(
    new THREE.BoxGeometry(dzWidth, 0.1, dzDepth),
    new THREE.MeshBasicMaterial({
      color: COLOR_DELETE_ZONE,
      opacity: 0.5,
      transparent: true,
    })
  );
  deleteZone.visible = false;
  deleteZone.position.set(0, 0.01, 14.8);
  scene.add(deleteZone);
  createImage(
    scene,
    (m) => (trashIcon = m),
    "./assets/images/trash-icon.png",
    [-3.2, deleteZone.position.y + 0.11, 14.4],
    false,
    [1, 1],
    -Math.PI / 2
  );
  createText(
    scene,
    [-2.5, 0.1, deleteZone.position.z],
    (tm) => (textMesh = tm),
    "Buy Champion",
    0x000000,
    false
  );
}
createDeleteZone();

function displayDeleteZone(isShow = true) {
  deleteZone.visible = isShow;
  textMesh.visible = isShow;
  trashIcon.visible = isShow;
}

function buyChampion(champWantBuy) {
  draggableObjects = draggableObjects.filter(
    (obj) => obj.uuid !== champWantBuy.uuid
  );
  scene.remove(champWantBuy.champScene);
  scene.remove(champWantBuy);
}
const deleteBox = new THREE.Box3().setFromObject(deleteZone);

// Map Loader & Drag Logic
function loadMap() {
  loadModel(urlMap, (gltf) => {
    const map = gltf.scene;
    lightAuto(map);
    if (debugOn) {
      [
        { name: "Map (M)", object: map, key: "m", isOpen: false },
        {
          name: "SquareGrid (S)",
          object: squareGroup,
          key: "s",
          isOpen: false,
        },
        { name: "Camera (C)", object: camera, key: "c", isOpen: false },
        {
          name: "Delete Zone (D)",
          object: deleteZone,
          key: "d",
          isOpen: false,
        },
        { name: "TM (T)", object: trashIcon, key: "t", isOpen: false },
        {
          name: "Controls (V)",
          object: controls.target,
          parent: controls,
          key: "v",
          isOpen: false,
        },
      ].forEach(createDebugGuiFolder);
    }
    scene.add(map);
    map.position.set(0, -1, 0);
    map.rotation.y = -0.3;
    mixer = new THREE.AnimationMixer(map);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());

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
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    function getPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    const shop = document.getElementById("shop");
    function disabledOrbitControls() {
      shop.addEventListener("mouseenter", () => (controls.enabled = false));
      shop.addEventListener("mousemove", () => (controls.enabled = false));
      shop.addEventListener("mouseleave", () => (controls.enabled = true));
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
      controls.enabled = false;
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(draggableObjects, true);
      if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        currPos = { ...selectedObject.position };
        currBenchIndex = selectedObject.benchIndex;
        currBfIndex = selectedObject.bfIndex;
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        dragOffset.copy(intersection).sub(selectedObject.position);
        displayGrid(false, false);
        isDragging = true;
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
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(draggableObjects, true);
      renderer.domElement.style.cursor =
        intersects.length > 0 ? (isDragging ? "grabbing" : "grab") : "default";
      if (selectedObject) {
        const worldPos = selectedObject.position.clone();
        deleteZone.material.color.set(
          deleteBox.containsPoint(worldPos)
            ? COLOR_DELETE_MOVEIN
            : COLOR_DELETE_ZONE
        );
      }
    });

    renderer.domElement.addEventListener("pointermove", (event) => {
      if (!isDragging || !selectedObject) return;
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      const newPosition = intersection.sub(dragOffset);
      newPosition.y = 0;
      selectedObject.position.copy(newPosition);
      selectedObject.champScene.position.copy(newPosition);

      const worldPos = selectedObject.position.clone();
      let highlighted = false;
      bfCells.forEach(({ mesh }) => mesh.material.color.set(COLOR_MOVEABLE));
      benchCells.forEach(({ mesh }) => mesh.material.color.set(COLOR_MOVEABLE));
      for (let i = 0; i < bfCells.length; i++) {
        const { mesh, center } = bfCells[i];
        const dist = center.distanceTo(worldPos);
        if (dist < radius * 0.95) {
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
          const localPos = squareGroup.worldToLocal(worldPos.clone());
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
        const worldCenter = squareGroup.localToWorld(center.clone());
        const dist = worldCenter.distanceTo(worldPos);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCell = worldCenter.clone();
          nearestType = "bench";
        }
      });
      let highlightMesh = null;
      if (deleteBox.containsPoint(worldPos)) {
        buyChampion(selectedObject);
        nearestType = null;
      }
      if (nearestType === "bf") {
        const existObjInBfIndex = draggableObjects.find(
          (champ) => champ.bfIndex === dragBfIndex
        );
        if (existObjInBfIndex) {
          existObjInBfIndex.position.copy(currPos);
          existObjInBfIndex.champScene.position.copy(currPos);
          existObjInBfIndex.benchIndex = currBenchIndex;
          existObjInBfIndex.bfIndex = currBfIndex;
        }
        selectedObject.bfIndex = dragBfIndex;
        selectedObject.benchIndex = -1;
        bfCells.forEach(({ mesh, center }) => {
          if (center.distanceTo(nearestCell) < 0.01) {
            highlightMesh = mesh;
            highlightMesh.material.color.set(COLOR_SELECTING);
          }
        });
      } else if (nearestType === "bench") {
        // console.log({ dragBenchIndex });
        selectedObject.bfIndex = -1;
        const existObjInBenchIndex = draggableObjects.find(
          (champ) => champ.benchIndex === dragBenchIndex
        );
        if (existObjInBenchIndex) {
          existObjInBenchIndex.position.copy(currPos);
          existObjInBenchIndex.champScene.position.copy(currPos);
          existObjInBenchIndex.benchIndex = currBenchIndex;
          existObjInBenchIndex.bfIndex = currBfIndex;
        }
        selectedObject.benchIndex = dragBenchIndex;
        benchCells.forEach(({ box, mesh }) => {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const worldCenter = squareGroup.localToWorld(center.clone());
          if (worldCenter.distanceTo(nearestCell) < 0.01) {
            highlightMesh = mesh;
            highlightMesh.material.color.set(COLOR_SELECTING);
          }
        });
      }
      // console.log({
      //   bfIndex: selectedObject.bfIndex,
      //   benchIndex: selectedObject.benchIndex,
      // });
      renderTraits();
      if (nearestCell) {
        selectedObject.position.set(nearestCell.x, 0.1, nearestCell.z);
        selectedObject.champScene.position.set(
          nearestCell.x,
          0.1,
          nearestCell.z
        );
        updateStatusBars();
      }
      displayGrid(false, true);
      dragBenchIndex = -1;
      currPos = null;
      selectedObject = null;
      isDragging = false;
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
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
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
                      targetObject.name +
                      "_(tft_set_14).glb";
                    for (let i = 0; i < xMes.length; i++) {
                      const spotTaken = draggableObjects.some(
                        (champ) =>
                          champ.bfIndex === -1 && champ.benchIndex === i
                      );
                      if (!spotTaken) {
                        found = true;
                        addChampion(
                          scene,
                          mixer,
                          {
                            name: targetObject.name,
                            position: [xMes[i], 0.1, zMe],
                            url: modelPathUrl,
                            traits: targetObject.traits,
                          },
                          (dragHelper) => {
                            dragHelper.benchIndex = i;
                            dragHelper.bfIndex = -1;
                            draggableObjects.push(dragHelper);
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
  });
}
loadMap();

// Animate
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
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
        addChampion(
          scene,
          mixer,
          {
            name: champName,
            position: [xMes[i], 0.1, zMe],
            url: modelPathUrl,
            traits: rollList[indexCard].traits,
          },
          (dragHelper) => {
            dragHelper.benchIndex = i;
            dragHelper.bfIndex = -1;
            draggableObjects.push(dragHelper);
            addingFlag = false;
            champsBought[indexCard] = 1;
            target.classList.add("invisible");
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

function updateDOM() {
  const el = document.querySelector("#app");
  el.innerHTML = "";
}

updateDOM();

// Vite HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    updateDOM(); // cập nhật lại UI thay vì reload
  });
}
