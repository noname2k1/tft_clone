import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createDebugGuiFolder,
  createImage,
  createText,
  lightAuto,
  loadModel,
} from "./assets/scripts/utils/utils.js";
import { addChampion } from "./assets/scripts/champion/champion.js";

import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import {
  COLOR_DELETE_ZONE,
  COLOR_SELECTABLE,
  COLOR_MOVEABLE,
  COLOR_SELECTING,
  COLOR_DELETE_MOVEIN,
  COLOR_ORANGE,
  COLOR_SPECIAL,
  debugOn,
} from "./index.js";
import { useItem } from "./assets/scripts/item/item.js";

//config
const urlMap = "./assets/models/arenas/tft_default_arena.glb";

// Scene, Camera, Controls
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x87ceeb);
const loader = new THREE.TextureLoader();
loader.load("./bg.jpg", function (texture) {
  scene.background = texture;
});
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 30, 25);

// camera.lookAt(0, 0, 0);

const mapBoxHelper = false;

const controls = new OrbitControls(camera, document.body);
const controlConfig = () => {
  controls.enableZoom = true; // Cho phép zoom
  controls.enableRotate = false; // Tắt xoay
  controls.enablePan = true; // Tắt di chuyển ngang/dọc

  controls.minDistance = 13; // zoom min
  controls.maxDistance = 21; // zoom max
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, 0, 5);
  controls.update();
};
controlConfig();
// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
const rendererConfig = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  document.body.appendChild(renderer.domElement);
};
rendererConfig();

// GLB Loader
let model;
let squareGroup;
let mixer;
const clock = new THREE.Clock();

// coordinates
const zMe = 11.5;
const xMes = Array.from({ length: 9 }, (_, i) => -9 + i * 2.1);

// debug
let draggableObjects = [];

function updateStatusBars() {
  draggableObjects.forEach((obj) => {
    if (obj.statusGroup) {
      obj.statusGroup.position.copy(obj.position);
      // .add(new THREE.Vector3(0, obj.scale.y, 0));
    }
  });
}

// battle field
let bfCells = []; // Để lưu từng ô lục giác
function createBattleField(rows, cols, radius) {
  const hexMaterial = new THREE.LineBasicMaterial({
    color: COLOR_MOVEABLE,
    linewidth: 100,
  });

  const angleOffset = Math.PI / 6; // Góc xoay 30 độ, tương đương 0.5 rad

  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (i === 0) {
      hexShape.moveTo(x, z);
    } else {
      hexShape.lineTo(x, z);
    }
  }
  hexShape.closePath();

  const hexPoints = hexShape.getPoints();
  const hexGeometry = new THREE.BufferGeometry().setFromPoints(
    hexPoints.map((p) => new THREE.Vector3(p.x, 0.01, p.y))
  );
  hexGeometry.computeBoundingBox();

  const dis = 1.08;
  const hexWidth = Math.sqrt(3) * radius * dis;
  const hexRowSpacing = 1.5 * radius * dis;

  const startX = -8; // Gốc X
  const startZ = 2.7; // Gốc Z

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

      bfCells.push({
        mesh: hex,
        center: new THREE.Vector3(x, 0, z),
        box,
      });
    }
  }
}
const radius = 1.3;
createBattleField(4, 7, radius);
// 3 hàng, 7 cột, mỗi ô 2x2 đơn vị

// hàng chờ
let benchCells = []; // Lưu thông tin các ô để kiểm tra highlight
function createBench(rows, cols, size, gap = 0.2) {
  if (squareGroup) {
    scene.remove(squareGroup);
  }
  squareGroup = new THREE.Group();
  benchCells = []; // reset danh sách ô

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const step = size + gap;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step;
      const z = row * step;

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

      // Lưu bounding box cho ô này
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
// Gọi tạo grid 1 hàng 9 cột, mỗi ô 1.8, khoảng cách 0.2
createBench(1, 9, 1.5, 0.45);

const displayGrid = (hideBattleField = false, hideBench = false) => {
  bfCells.forEach(({ mesh }) => {
    mesh.visible = !hideBattleField;
  });

  benchCells.forEach(({ mesh }) => {
    mesh.visible = !hideBench;
  });
};

// deleteZone - buy champion area
let deleteZone;
let textMesh;
let trashIcon;
const createDeleteZone = () => {
  const dzWidth = 20;
  const dzDepth = 4;
  deleteZone = new THREE.Mesh(
    new THREE.BoxGeometry(dzWidth, 0.1, dzDepth),
    new THREE.MeshBasicMaterial({
      color: COLOR_DELETE_ZONE,
      opacity: 0.5,
      transparent: true,
    })
  );
  deleteZone.visible = false;
  deleteZone.position.set(0, 0.01, 14.8); // vị trí bên phải góc dưới hoặc bất kỳ đâu bạn muốn
  scene.add(deleteZone);
  createImage(
    scene,
    (m) => {
      trashIcon = m;
    },
    "./assets/images/trash-icon.png",
    [-3.2, deleteZone.position.y + 0.11, 14.4],
    false,
    [1, 1],
    -Math.PI / 2
  );
  createText(
    scene,
    [-2.5, 0.1, deleteZone.position.z],
    (tm) => {
      // console.log(textMesh);
      textMesh = tm;
    },
    "Buy Champion",
    0x000000,
    false
  );
};
createDeleteZone();

const displayDeleteZone = (isShow = true) => {
  deleteZone.visible = isShow;
  textMesh.visible = isShow;
  trashIcon.visible = isShow;
};

const buyChampion = (champWantBuy) => {
  draggableObjects = draggableObjects.filter(
    (obj) => obj.uuid !== champWantBuy.uuid
  );
  scene.remove(champWantBuy.champScene);
  scene.remove(champWantBuy);
}; // Tạo bounding box để kiểm tra va chạm
const deleteBox = new THREE.Box3().setFromObject(deleteZone);

const loadMap = () => {
  loadModel(urlMap, (gltf) => {
    const map = gltf.scene;
    lightAuto(map);
    if (debugOn) {
      // GUI - DEBUG
      const objs = [
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
      ];
      objs.forEach((obj) => {
        createDebugGuiFolder(obj);
      });
    }

    scene.add(map);
    map.position.set(0, -1, 0);
    map.rotation.y = -0.3;

    if (mapBoxHelper) {
      const boxHelper = new THREE.BoxHelper(map, 0xff0000);
      const axesHelper = new THREE.AxesHelper(5);
      map.add(boxHelper);
      map.add(axesHelper);
    }

    // run the animation
    mixer = new THREE.AnimationMixer(map);
    //   console.log({ gltfAnimations: gltf.animations });

    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });

    let dragInBench = false;
    let dragInBattleField = false;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // mặt đất (XZ)

    let isDragging = false;
    let selectedObject = null;
    let dragOffset = new THREE.Vector3();
    let dragBenchIndex = -1;
    let dragBfIndex = -1;

    function getPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    const shop = document.getElementById("shop");

    const disabledOrbitControls = () => {
      shop.addEventListener("mouseenter", function () {
        controls.enabled = false;
      });
      shop.addEventListener("mousemove", function () {
        controls.enabled = false;
      });
      shop.addEventListener("mouseleave", function () {
        controls.enabled = true;
      });

      if (debugOn) {
        const debugContainer = document.querySelector(".dg.ac");
        debugContainer.addEventListener("mouseenter", function () {
          controls.enabled = false;
        });
        debugContainer.addEventListener("mousemove", function () {
          controls.enabled = false;
        });
        debugContainer.addEventListener("mouseleave", function () {
          controls.enabled = true;
        });
      }
    };
    disabledOrbitControls();

    let currPos = null;
    let currBenchIndex = -1;
    let currBfIndex = -1;
    renderer.domElement.addEventListener("pointerdown", (event) => {
      controls.enabled = false;
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);

      const intersects = raycaster.intersectObjects(draggableObjects, true);
      if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        currPos = {
          ...selectedObject.position,
        };
        currBenchIndex = selectedObject.benchIndex;
        currBfIndex = selectedObject.bfIndex;
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        dragOffset.copy(intersection).sub(selectedObject.position);
        displayGrid(false, false); // Hiện tất cả ô

        isDragging = true;
        if (isDragging) {
          displayDeleteZone();
          shop.classList.replace("bottom-1", "bottom-[-20vh]");
        }
      }
    });

    renderer.domElement.addEventListener("mousemove", function (event) {
      // Tính vị trí chuột chuẩn hóa (-1 đến 1)
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Cập nhật raycaster
      raycaster.setFromCamera(pointer, camera);

      // Kiểm tra va chạm
      const intersects = raycaster.intersectObjects(draggableObjects, true);

      if (intersects.length > 0) {
        // console.log(intersects[0].object);
        renderer.domElement.style.cursor = isDragging ? "grabbing" : "grab"; // hoặc "grab"
      } else {
        renderer.domElement.style.cursor = "default";
      }

      // Kiểm tra nếu model đang nằm trong vùng delete
      if (selectedObject) {
        const worldPos = selectedObject.position.clone();
        if (deleteBox.containsPoint(worldPos)) {
          deleteZone.material.color.set(COLOR_DELETE_MOVEIN); // highlight đỏ khi đang nằm trong vùng
        } else {
          deleteZone.material.color.set(COLOR_DELETE_ZONE); // về lại màu mặc định
        }
      }
    });

    renderer.domElement.addEventListener("pointermove", (event) => {
      // console.log("pointermove");
      if (!isDragging || !selectedObject) return;
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);

      // Kiểm tra va chạm
      // const intersects = raycaster.intersectObjects(draggableObjects, true);
      // console.log(intersects[0].object);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      // Cập nhật raycaster
      raycaster.setFromCamera(pointer, camera);

      const newPosition = intersection.sub(dragOffset);
      newPosition.y = 0;
      selectedObject.position.copy(newPosition);
      selectedObject.champScene.position.copy(newPosition);

      // Highlight logic giống cũ
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
          console.log(i);
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
      // if (!highlighted) {
      //   dragBenchIndex = -1;
      // }
    });

    // nhả chuột
    renderer.domElement.addEventListener("pointerup", () => {
      if (!selectedObject) return;
      displayDeleteZone(false);
      shop.classList.replace("bottom-[-20vh]", "bottom-1");
      controls.enabled = true;

      const worldPos = selectedObject.position.clone();

      let nearestCell = null;
      let nearestType = null; // "bf" hoặc "bench"
      let minDistance = Infinity;

      // Kiểm tra bfCells
      bfCells.forEach(({ mesh, center }) => {
        const dist = center.distanceTo(worldPos);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCell = center.clone();
          nearestType = "bf";
        }
      });

      // Kiểm tra benchCells
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

      let highlightMesh = null; // Bạn nên lưu biến này ở ngoài nếu muốn reset lại sau
      // Kiểm tra nếu model đang nằm trong vùng delete
      if (deleteBox.containsPoint(worldPos)) {
        buyChampion(selectedObject);
        // console.log("draggableObjects: ", draggableObjects);
        nearestType = null;
      }
      if (nearestType === "bf") {
        // console.log(dragBfIndex);
        const existObjInBfIndex = draggableObjects.find(
          (champ) => champ.bfIndex === dragBfIndex
        );
        if (existObjInBfIndex) {
          // console.log(existObjInBfIndex);
          existObjInBfIndex.position.copy(currPos);
          existObjInBfIndex.champScene.position.copy(currPos);
          // console.log("benchIndex: ", currBenchIndex);
          existObjInBfIndex.benchIndex = currBenchIndex;
          existObjInBfIndex.bfIndex = currBfIndex;
        }
        selectedObject.bfIndex = dragBfIndex;
        selectedObject.benchIndex = -1;
        bfCells.forEach(({ mesh, center }) => {
          if (center.distanceTo(nearestCell) < 0.01) {
            // console.log("snap bf");
            highlightMesh = mesh;
            highlightMesh.material.color.set(COLOR_SELECTING); // màu sáng
            // highlightMesh.material.emissiveIntensity = 0.6;
          }
        });
      } else if (nearestType === "bench") {
        selectedObject.bfIndex = -1;
        // console.log({ dragBenchIndex });
        // console.log({ currPos });
        // console.log(draggableObjects.map((c) => [c.benchIndex, c.name]));
        const existObjInBenchIndex = draggableObjects.find(
          (champ) => champ.benchIndex === dragBenchIndex
        );
        if (existObjInBenchIndex) {
          // console.log(existObjInBenchIndex);
          existObjInBenchIndex.position.copy(currPos);
          existObjInBenchIndex.champScene.position.copy(currPos);
          // console.log("benchIndex: ", currBenchIndex);
          existObjInBenchIndex.benchIndex = currBenchIndex;
          existObjInBenchIndex.bfIndex = currBfIndex;
          selectedObject.benchIndex = dragBenchIndex;
        }
        benchCells.forEach(({ box, mesh }) => {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const worldCenter = squareGroup.localToWorld(center.clone());
          if (worldCenter.distanceTo(nearestCell) < 0.01) {
            highlightMesh = mesh;
            highlightMesh.material.color.set(COLOR_SELECTING);
            // highlightMesh.material.emissiveIntensity = 0.6;
          }
        });
      }

      // Snap về ô gần nhất
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

    const equipmentBar = document.getElementById("equipment-bar");

    let draggingEquipImg = null;
    equipmentBar.childNodes.forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("itemId", e.target.dataset.itemId);
        e.dataTransfer.setData("itemName", e.target.dataset.itemName);
        draggingEquipImg = e.target;
      });
    });

    renderer.domElement.addEventListener("dragover", (event) => {
      event.preventDefault(); // Bắt buộc để drop hoạt động
    });

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

      // Lấy object đại diện tướng (ví dụ: champScene hoặc bounding box group)
      const intersects = raycaster.intersectObjects(draggableObjects, true);

      if (intersects.length > 0) {
        const targetObject = intersects[0].object;
        console.log(targetObject);
        useItem(itemId, itemName, targetObject.uuid, (data) => {
          if (data.champUuid === targetObject.uuid) {
            const item = data.item;
            const [num, stat] = item.stat.split("_");
            let consumableItem = false;
            let found = false;
            switch (item.type) {
              case "consumable":
                alert(
                  `Bạn đã sử dụng ${item.name} cho tướng ${targetObject.name}`
                );
                console.log(targetObject);
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
                          targetObject.name,
                          (dragHelper) => {
                            dragHelper.benchIndex = i;
                            dragHelper.bfIndex = -1;
                            draggableObjects.push(dragHelper);
                          },
                          [xMes[i], 0.1, zMe],
                          modelPathUrl,
                          targetObject.scaleData
                        );
                        consumableItem = true;
                        break;
                      }
                    }
                    if (!found) {
                      alert("Hàng chờ đầy, không thể thêm tướng");
                    }
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
};
loadMap();

// Update debug info
function updateDebug() {
  const pos = camera.position;
  document.getElementById("debug").innerText = `Camera → x: ${pos.x.toFixed(
    2
  )}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}`;
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  // updateDebug();
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }
  renderer.render(scene, camera);
}
animate();

const champShopList = document.getElementById("champ-shop-list");
let addingFlag = false;

champShopList.addEventListener("click", function (e) {
  if (!addingFlag) {
    const rollList = window.champsInRoll;
    addingFlag = true;
    const target = e.target.closest(".champ-card-shop");
    if (target) {
      // hackable
      const indexCard = target.indexInRoll;
      if (window.champsBought[indexCard] === 1) {
        alert(
          "Bạn đã mua tướng này rồi! nghịch devtools admin sẽ ban acc của bạn =))))"
        );
        addingFlag = false;
        return;
      }
      // console.log(rollList[indexCard]);
      const champName =
        rollList[indexCard].name
          .toLowerCase()
          .replace(". ", "_")
          .replace(" ", "_")
          .replace("'", "") || target.champName;
      const scale = target.scaleData;
      // const

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
            champName,
            (dragHelper) => {
              dragHelper.benchIndex = i;
              dragHelper.bfIndex = -1;
              draggableObjects.push(dragHelper);
              addingFlag = false;
              champsBought[indexCard] = 1;
              target.classList.add("invisible");
            },
            [xMes[i], 0.1, zMe],
            modelPathUrl,
            scale
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
  }
});
