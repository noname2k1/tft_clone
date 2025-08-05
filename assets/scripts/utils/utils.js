import * as THREE from "https://esm.sh/three";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { FontLoader } from "https://esm.sh/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://esm.sh/three/examples/jsm/geometries/TextGeometry.js";
import { GLTFLoader } from "https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js";
import { debugFolders, debugObjs } from "~/variables.js";
const loader = new GLTFLoader();

const lightAuto = (model) => {
  model?.traverse((child) => {
    if (child.isMesh) {
      const oldMat = child.material;
      child.material = new THREE.MeshBasicMaterial({
        map: oldMat.map || null,
        color: 0xffffff,
      });
    }
  });
};

function splitModelsFromGLB(url) {
  return new Promise((resolve, reject) => {
    {
      loadModel(
        url,
        (gltf) => {
          const root = gltf.scene;
          console.log(gltf);
          resolve(root.children.map((child) => child.clone()));
        },
        (error) => {
          console.log("error at splitModelsFromGLB: ", error);
          reject({
            error,
            value: [],
          });
        }
      );
    }
  });
}

const loadModel = (
  url,
  onLoad,
  onError = (error) => {
    console.log(error);
  },
  onProgress = null
) => {
  loader.load(url, onLoad, onProgress, onError);
};

const createDebugGuiFolder = (obj, cb = null) => {
  debugObjs.push(obj);
  const gui = new dat.GUI();
  const folder = gui.addFolder(obj.name);
  // Nếu object là THREE.Vector3
  if (obj.object instanceof THREE.Vector3) {
    folder.add(obj.object, "x", -100, 100).onChange(() => obj?.parent.update());
    folder.add(obj.object, "y", -100, 100).onChange(() => obj?.parent.update());
    folder.add(obj.object, "z", -100, 100).onChange(() => obj?.parent.update());
  } else {
    const posFolder = folder.addFolder("Position");
    posFolder.add(obj.object.position, "x", -500, 500).step(0.001);
    posFolder.add(obj.object.position, "y", -500, 500).step(0.001);
    posFolder.add(obj.object.position, "z", -500, 500).step(0.001);
    posFolder.open();

    // Folder con: rotation
    const rotFolder = folder.addFolder("Rotation");
    rotFolder.add(obj.object.rotation, "x", -Math.PI, Math.PI).step(0.001);
    rotFolder.add(obj.object.rotation, "y", -Math.PI, Math.PI).step(0.001);
    rotFolder.add(obj.object.rotation, "z", -Math.PI, Math.PI).step(0.001);
    rotFolder.open();

    // Folder con: scale
    const scaleFolder = folder.addFolder("Scale");
    scaleFolder.add(obj.object.scale, "x", 0, 10).step(0.001);
    scaleFolder.add(obj.object.scale, "y", 0, 10).step(0.001);
    scaleFolder.add(obj.object.scale, "z", 0, 10).step(0.001);
    scaleFolder.open();
  }
  // Folder con: position

  // if (obj.isChampion) {
  //   const posBench = gui.addFolder("Position In Bench");
  //   posBench
  //     .add(currXChamp, "index", 0, xMes.length - 1)
  //     .step(1)
  //     .onChange((val) => {
  //       obj.object.position.x = xMes[val];
  //     });
  //   posBench.open();
  // }

  debugFolders.push({ name: obj.name, folder });

  window.addEventListener("keydown", (e) => {
    if (e.key === obj.key) {
      obj.isOpen = !obj.isOpen;
      if (obj.isOpen) {
        let otherDebugObjs = debugObjs.filter((dObj) => dObj.name !== obj.name);
        const otherDebugFolders = debugFolders.filter(
          (otherFol) => otherFol.name !== obj.name
        );
        otherDebugObjs.forEach((oObj) => {
          oObj.isOpen = false;
        });
        otherDebugFolders.forEach((fol) => {
          fol.folder.close();
        });
        folder.open();
      } else {
        folder.close();
      }
    }
  });

  return folder;
};

const createText = (
  scene,
  pos = [0, 0, 0],
  callback = () => {},
  text = "Delete",
  color = "0xffffff",
  isVisible = true,
  fontURL = "./assets/fonts/helvetiker_regular.typeface.json",
  fontSize = 0.7,
  Horizontal = true
) => {
  // text
  const fontLoader = new FontLoader();
  fontLoader.load(fontURL, function (font) {
    const textGeo = new TextGeometry(text, {
      font: font,
      size: fontSize,
      height: 0.01,
    });

    const textMat = new THREE.MeshBasicMaterial({ color, color });
    const textMesh = new THREE.Mesh(textGeo, textMat);

    textGeo.computeBoundingBox();

    textMesh.position.set(pos[0], pos[1], pos[2]);
    // xoay chữ nằm ngang
    if (Horizontal) textMesh.rotation.x = -Math.PI / 2;
    textMesh.scale.z = 0;
    textMesh.visible = isVisible;
    scene.add(textMesh);
    callback(textMesh);
  });
};

const createImage = (
  scene,
  onLoad = () => {},
  imageURL = "./assets/images/trash-icon.png",
  position = [0, 0, 0],
  isVisible = true,
  size = [1, 1],
  rotationX = 0
) => {
  const loader = new THREE.TextureLoader();
  loader.load(imageURL, function (texture) {
    texture.encoding = THREE.sRGBEncoding;
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // thử bật/tắt nếu bị mờ nền
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = isVisible;
    mesh.position.set(...position);
    mesh.rotation.x = rotationX; //  -Math.PI / 2
    mesh.renderOrder = 999;
    scene.add(mesh);

    onLoad(mesh); // callback khi load xong
  });
};

const addHelper = (scene, objec3d, color = 0x0fffff) => {
  const box = new THREE.Box3().setFromObject(objec3d);
  const newHelper = new THREE.Box3Helper(box, color);
  scene.add(newHelper);
  return newHelper;
};

const transparentMeshs = (obj) => {
  obj.traverse((child) => {
    if (child.isMesh && child.material && child.name === "optga") {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((mat) => {
        if (mat.map) {
          mat.transparent = true; // Cho phép trong suốt
          mat.alphaTest = 0.8; // Cắt bỏ vùng rìa mờ (tránh trắng đục)
          mat.side = THREE.DoubleSide; // Tùy chọn, nếu cần nhìn cả 2 mặt
          mat.depthWrite = true; // Giữ thứ tự vẽ đúng
        }
      });
    }
  });
};

function lerpAngle(a, b, t) {
  const delta =
    ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + delta * t;
}

function capitalizeFirstLetter(str) {
  if (typeof str !== "string" || str.length === 0) {
    return str; // Handle non-string or empty input
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

class ObserverElementChange {
  observer = null;
  constructor(
    htmlNode,
    callback,
    opts = {
      subtree: true, // theo dõi cả các node con
      characterData: true, // theo dõi nội dung văn bản
      childList: true, // theo dõi việc thêm/xóa node con
    }
  ) {
    if (!htmlNode) return;
    this.observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        callback(mutation);
      }
    });
    this.observer?.observe(htmlNode, opts);
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

function getNormalizedPointer(event, domElement) {
  const rect = domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

function generateIconURLFromRawCommunityDragon(icon) {
  try {
    const safeIcon = icon.replace("tex", "png").toLowerCase();
    return `${import.meta.env.VITE_RAW_COMMUNITYDRAGON}${safeIcon}`;
  } catch (error) {
    console.error("Lỗi trong generateIconURLFromRawCommunityDragon:", error);
    return ""; // fallback an toàn
  }
}

function generateModelUrl(champName) {
  const setFolder = "Set15";
  const beforeFix = "(tft_set_15)";
  const safeName = champ.name
    .toLowerCase()
    .replace(". ", "_")
    .replace(" ", "_")
    .replace("'", "");
  return `./assets/models/champions/${setFolder}/${safeName}_${beforeFix}.glb`;
}

const preloadImage = (url) => {
  try {
    const img = new Image();
    img.src = `${
      import.meta.env.VITE_SERVER_PREFIX
    }api/proxy?url=${encodeURIComponent(url)}`;
    // ảnh sẽ được tải từ proxy, không lỗi CORS
  } catch (error) {
    console.error("preloadImage error: ", error);
  }
};

// delay for/of
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  loadModel,
  lightAuto,
  createText,
  createImage,
  createDebugGuiFolder,
  splitModelsFromGLB,
  addHelper,
  transparentMeshs,
  lerpAngle,
  capitalizeFirstLetter,
  ObserverElementChange,
  getNormalizedPointer,
  generateIconURLFromRawCommunityDragon,
  generateModelUrl,
  preloadImage,
  delay,
};
