import * as THREE from "https://esm.sh/three";
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import { FontLoader } from "https://esm.sh/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://esm.sh/three/examples/jsm/geometries/TextGeometry.js";
const loader = new GLTFLoader();
import { GLTFLoader } from "https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js";
import { debugFolders, debugObjs } from "~/variables.js";

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
    posFolder.add(obj.object.position, "x", -500, 500).step(0.1);
    posFolder.add(obj.object.position, "y", -500, 500).step(0.1);
    posFolder.add(obj.object.position, "z", -500, 500).step(0.1);
    posFolder.open();

    // Folder con: rotation
    const rotFolder = folder.addFolder("Rotation");
    rotFolder.add(obj.object.rotation, "x", -Math.PI, Math.PI).step(0.01);
    rotFolder.add(obj.object.rotation, "y", -Math.PI, Math.PI).step(0.01);
    rotFolder.add(obj.object.rotation, "z", -Math.PI, Math.PI).step(0.01);
    rotFolder.open();

    // Folder con: scale
    const scaleFolder = folder.addFolder("Scale");
    scaleFolder.add(obj.object.scale, "x", 0, 10).step(0.01);
    scaleFolder.add(obj.object.scale, "y", 0, 10).step(0.01);
    scaleFolder.add(obj.object.scale, "z", 0, 10).step(0.01);
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
  rotationX = -Math.PI / 2
) => {
  const loader = new THREE.TextureLoader();
  loader.load(imageURL, function (texture) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false, // tránh icon che mất hoặc bị che
      alphaTest: 0.5, // loại bỏ các pixel trong suốt
    });
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = isVisible;
    mesh.position.set(...position);
    mesh.rotation.x = rotationX;
    mesh.renderOrder = 999;
    scene.add(mesh);

    onLoad(mesh); // callback khi load xong
  });
};

export { loadModel, lightAuto, createText, createImage, createDebugGuiFolder };
