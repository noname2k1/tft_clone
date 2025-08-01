import * as THREE from "https://esm.sh/three";
import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";
import { bgUrl } from "~/variables";
export default (debugControls) => {
  // Scene, Camera, Controls
  const scene = new THREE.Scene();
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
    renderer.sortObjects = true;
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
  }
  setupRenderer();

  return { scene, renderer, controls, camera };
};
