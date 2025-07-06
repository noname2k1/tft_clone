import * as THREE from "https://esm.sh/three";
import { FontLoader } from "https://esm.sh/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://esm.sh/three/examples/jsm/geometries/TextGeometry.js";

export default class SecretSphere {
  #sphereColor = 0xffffff;
  #questionMarkColor = 0x000000;
  #effect;
  constructor(
    scene,
    position = [0, 0.5, 0],
    sphereColor = 0xffffff,
    questionMarkColor = 0x000000,
    effect = false
  ) {
    this.name = "lucky orb";
    this.scene = scene;
    this.#questionMarkColor = questionMarkColor;
    this.#sphereColor = sphereColor;
    this.position = new THREE.Vector3(...position);
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);
    this.#effect = effect;
    this.orbMesh = null;
    this.box = new THREE.Box3(); // bounding box của quả cầu

    this._createOrb();
    this._createQuestionMark();
  }

  _createOrb() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.#sphereColor,
      transparent: true,
      opacity: 0.6,
    });
    this.orbMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.orbMesh);

    // Cập nhật bounding box
    geometry.computeBoundingBox();
    this.box
      .copy(this.orbMesh.geometry.boundingBox)
      .applyMatrix4(this.orbMesh.matrixWorld);
  }

  _createQuestionMark() {
    const loader = new FontLoader();
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      (font) => {
        const geometry = new TextGeometry("?", {
          font,
          size: 1,
          height: 0.01,
        });
        geometry.center();
        const material = new THREE.MeshStandardMaterial({
          color: this.#questionMarkColor,
          emissive: this.#questionMarkColor,
          emissiveIntensity: 1,
        });
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.scale.z = 0;
        this.group.add(textMesh);
      }
    );
  }

  /**
   * Hàm kiểm tra va chạm với object khác có thuộc tính .box (Box3) hoặc là Mesh
   */
  checkCollision(target) {
    if (!this.orbMesh) return false;

    this.orbMesh.updateMatrixWorld(true);
    this.box
      .copy(this.orbMesh.geometry.boundingBox)
      .applyMatrix4(this.orbMesh.matrixWorld);

    let targetBox = null;

    if (target instanceof THREE.Mesh && target.geometry?.boundingBox) {
      target.updateMatrixWorld(true);
      targetBox = target.geometry.boundingBox
        .clone()
        .applyMatrix4(target.matrixWorld);
    } else if (target.box instanceof THREE.Box3) {
      targetBox = target.box;
    } else {
      return false;
    }

    return this.box.intersectsBox(targetBox);
  }

  /**
   * Gọi mỗi frame, truyền elapsedTime (tính bằng clock.getElapsedTime())
   */
  update(elapsedTime = 0) {
    // Quay tròn
    this.group.rotation.y += 0.01;

    // Lấp lánh bằng cách thay đổi emissiveIntensity và opacity
    if (this.orbMesh && this.orbMesh.material) {
      const pulse = 0.2 + 0.1 * Math.sin(elapsedTime * 3);
      this.orbMesh.material.emissiveIntensity = pulse;

      const opacityPulse = 0.5 + 0.1 * Math.sin(elapsedTime * 2);
      this.orbMesh.material.opacity = opacityPulse;
    }
  }

  removeFromScene() {
    if (typeof this.#effect === "function") {
      this.#effect();
    }
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
