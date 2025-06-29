import * as THREE from "three";
import { loadModel, lightAuto, createDebugGuiFolder } from "../utils/utils.js";
import { COLOR_HP, COLOR_MP, MODEL_CACHES } from "../../../index.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
const addChampion = (
  scene,
  mixer,
  champName = "",
  callback = () => {},
  position = [0, 0, 0],
  championURL = "./assets/models/champions/rengar_(tft_set_14).glb",
  scale = [0.01, 0.01, 0.01]
) => {
  const MODEL_VISIBLE = true;
  const DRAG_MESH_VISIBLE = false;

  const handleLoadModel = (gltf) => {
    const champScene = gltf.scene;
    scene.add(champScene);
    champScene.visible = MODEL_VISIBLE;
    champScene.position.set(...position);
    champScene.scale.set(...scale);
    champScene.rotation.x = -0.5;
    const size = gltf.size;

    // Tạo container để chứa thanh máu và mana
    const statusBarGroup = new THREE.Group();

    // Kích thước thanh
    const barWidth = 2;
    const barHeight = 0.25;
    // console.log(size.y);
    const barYOffset = size.y + (size.y < 2.5 ? 1 : 0.4);
    // đặt trên đầu một chút

    function createBarGroup(
      color,
      tickCount = 0,
      width = barWidth,
      height = barHeight
    ) {
      const group = new THREE.Group();
      // Thanh nền (đen)
      const bgGeometry = new THREE.PlaneGeometry(width, height);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: "black",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
      });
      const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
      group.add(bgBar);
      // Thanh chính (màu HP/MP)
      const fgGeometry = new THREE.PlaneGeometry(width, height);
      const fgMaterial = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
      });
      const fgBar = new THREE.Mesh(fgGeometry, fgMaterial);
      fgBar.position.z = 0.001; // nổi lên nhẹ
      fgBar.renderOrder = 1; // ưu tiên render sau
      group.add(fgBar);

      // Vạch chia
      const tickMaterial = new THREE.MeshBasicMaterial({
        color: "#222",
        side: THREE.DoubleSide,
        depthTest: false, // thêm dòng này!
      });
      const ticks = [];
      for (let i = 1; i < tickCount; i++) {
        const tickGeom = new THREE.PlaneGeometry(0.02, height);
        const tick = new THREE.Mesh(tickGeom, tickMaterial);
        tick.position.x = -width / 2 + (i * width) / tickCount;
        group.add(tick);
        ticks.push(tick);
      }
      // Trả cả group và thanh chính để cập nhật sau
      return { barGroup: group, fgBar, ticks };
    }

    const maxHp = 1000;
    const hpPerTick = 100;
    const tickCount = Math.floor(maxHp / hpPerTick);

    const {
      barGroup: hpBarGroup,
      fgBar: hpBar,
      ticks,
    } = createBarGroup(COLOR_HP, tickCount);
    hpBarGroup.position.set(0, barYOffset, 0);
    hpBar.position.copy(hpBarGroup.position);
    statusBarGroup.add(hpBarGroup);

    const { barGroup: manaBarGroup, fgBar: manaBar } = createBarGroup(COLOR_MP);
    manaBarGroup.position.set(0, barYOffset - 0.15, 0);
    manaBar.position.copy(manaBarGroup.position);
    statusBarGroup.add(manaBarGroup);

    // Xoay các thanh để luôn nhìn camera (hoặc dùng sprite nếu cần billboard)
    statusBarGroup.add(hpBar);
    statusBarGroup.add(manaBar);
    statusBarGroup.position.copy(champScene.position);
    statusBarGroup.rotation.x = -0.5;

    scene.add(statusBarGroup);

    // Tạo dragHelper
    const dragHelper = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ visible: DRAG_MESH_VISIBLE })
    );
    // console.log(size);
    dragHelper.scale.set(size.x, size.y, 1); // Gán đúng kích thước mô hình
    // dragHelper.uuid = champScene.uuid;
    dragHelper.champScene = champScene;
    dragHelper.position.set(...position);
    dragHelper.rotation.copy(champScene.rotation);

    // Gắn vào dragHelper nếu bạn muốn liên kết để di chuyển cùng
    dragHelper.hpBar = hpBar;
    dragHelper.manaBar = manaBar;
    dragHelper.statusGroup = statusBarGroup;
    dragHelper.name = champName;
    dragHelper.scaleData = scale;
    scene.add(dragHelper);
    function updateBar(barMesh, value) {
      barMesh.scale.x = Math.max(0, Math.min(1, value));
      barMesh.position.x = (-(1 - barMesh.scale.x) * barWidth) / 2;
    }
    updateBar(dragHelper.hpBar, 0.6); // HP còn 60%
    updateBar(dragHelper.manaBar, 0.3); // MP còn 30%
    lightAuto(champScene);

    // if (champScene) {
    //   console.log(champScene);
    //   createDebugGuiFolder({
    //     name: champName + " (R)",
    //     object: champScene,
    //     key: "r",
    //     isOpen: false,
    //   });
    // }
    const idleAnimation = gltf.animations.find(
      (anim) =>
        anim.name.toLowerCase().startsWith("idle") &&
        anim.name.toLowerCase() !== "idlein"
    );
    // console.log(idleAnimation);
    mixer = new THREE.AnimationMixer(champScene);
    if (idleAnimation) {
      mixer.clipAction(idleAnimation).play();
    } else {
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    }

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) {
        mixer.update(delta);
      }
    }
    animate();
    callback(dragHelper);
  };

  // console.log(MODEL_CACHES);
  if (MODEL_CACHES[championURL]) {
    const cached = MODEL_CACHES[championURL];
    const clonedScene = clone(cached.scene);
    // Phải clone gltf mới, vì AnimationMixer cần gltf.animations và scene đi kèm
    const clonedGltf = {
      scene: clonedScene,
      animations: cached.animations,
      size: cached.size,
      // nếu bạn có thêm userData hoặc các thuộc tính khác cũng gán vào đây
    };
    // console.log(clonedScene);
    handleLoadModel(clonedGltf);
    return;
  }
  loadModel(
    championURL,
    (gltf) => {
      const champScene = gltf.scene;
      champScene.position.set(...position);
      champScene.scale.set(...scale);
      champScene.rotation.x = -0.5;
      const box = new THREE.Box3().setFromObject(champScene, true);
      const size = new THREE.Vector3();
      box.getSize(size);
      gltf.size = size;
      MODEL_CACHES[championURL] = gltf;
      // console.log(gltf.scene);
      handleLoadModel(gltf);
    },
    (err) => {
      console.error(err);
    },
    null
  );
};

export { addChampion };
