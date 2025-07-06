import { ARGUMENTS_CACHES } from "~/variables";
import { createDebugGuiFolder, lightAuto, loadModel } from "./utils/utils";
import * as THREE from "https://esm.sh/three";

export default class Model {
  modelScene;
  mixer;
  animations = [];
  box = new THREE.Box3();
  helperObj;
  name = "";
  scene;
  #isItem;

  constructor(
    scene,
    modelData = {
      name: "",
      url,
      position: [0, 0, 0],
      scale: [0.01, 0.01, 0.01],
      onLoaded: () => {},
      debug: false,
    },
    glow = { enabled: false, color: "0xffff00" },
    helper = { enabled: false, color: 0xff0000 },
    isItem = false
  ) {
    this.#isItem = isItem;
    const { name, url, position, scale, onLoaded, debug, ...rest } = modelData;
    this.scene = scene;

    // Nếu model đã tồn tại, không load lại
    const modelExisted = ARGUMENTS_CACHES.find((arg) => arg.name === name);
    if (modelExisted) {
      this.#loadScene({
        modelExisted,
        name,
        position,
        scale,
        debug,
        onLoaded,
        rest,
        glow,
        helper,
      });
    } else {
      loadModel(url, (gltf) => {
        this.#loadScene({
          gltf,
          name,
          position,
          scale,
          debug,
          onLoaded,
          rest,
          glow,
          helper,
        });
      });
    }
  }

  #loadScene({
    gltf,
    name,
    position,
    scale,
    debug,
    onLoaded,
    rest,
    glow,
    helper,
  }) {
    const default_colors = {
      glow: 0xffff00,
      helper: 0xff0000,
    };

    this.modelScene = gltf.scene;
    this.name = name;
    this.modelScene.name = name;

    if (position) this.setPosition(...position);
    if (scale) this.setScale(...scale);

    this.debug = debug;
    if (debug) this.#createDatGuiDebug();

    this.modelScene.castShadow = true;
    this.modelScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Animation
    if (gltf.animations.length > 0) {
      this.animations = gltf.animations;
      this.mixer = new THREE.AnimationMixer(this.modelScene);
      const idleAnim = gltf.animations.find((a) =>
        a.name.toLowerCase().startsWith("idle")
      );
      this.mixer.clipAction(idleAnim || gltf.animations[0]).play();
    }

    this.updateBox();

    if (helper?.enabled) {
      this.helperObj = new THREE.Box3Helper(
        this.box,
        helper.color ?? default_colors.helper
      );
      this.scene.add(this.helperObj);
    }

    if (glow?.enabled) {
      const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: glow.color ?? default_colors.glow,
        transparent: true,
        opacity: 0.4,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(this.modelScene.position);
      this.modelScene["glow"] = glowMesh;
      this.scene.add(glowMesh);
    }

    Object.entries(rest).forEach(([key, value]) => {
      this.modelScene[key] = value;
    });

    this.scene.add(this.modelScene);
    ARGUMENTS_CACHES.push(gltf);
    if (onLoaded) onLoaded(this);
  }

  setPosition(x, y, z) {
    if (this.modelScene) {
      this.modelScene.position.set(x, y, z);
    }
  }

  setScale(x, y, z) {
    if (this.modelScene) {
      this.modelScene.scale.set(x, y, z);
    }
  }

  playAnimation(name) {
    if (!this.mixer || !this.animations.length) return;
    const clip = this.animations.find((c) => c.name === name);
    if (clip) {
      this.mixer.stopAllAction();
      this.mixer.clipAction(clip).play();
    }
  }

  update(deltaTime) {
    if (this.mixer) this.mixer.update(deltaTime);
    this.updateBox();
  }

  updateBox() {
    if (this.modelScene) {
      this.box.setFromObject(this.modelScene);
    }
  }

  rotate() {
    if (this.modelScene) {
      this.modelScene.rotate.x -= 0.02;
    }
  }

  checkCollision(otherModel) {
    if (!otherModel || !otherModel.box) return false;
    return this.box.intersectsBox(otherModel.box);
  }

  #createDatGuiDebug() {
    const data = {
      name: this.name + "(" + this.name.charAt(0) + ")",
      object: this.modelScene,
      key: this.name.charAt(0),
      isOpen: false,
    };
    createDebugGuiFolder(data);
  }

  removeFromScene() {
    if (!this.modelScene || !this.scene) return;

    this.scene.remove(this.modelScene.glow);
    this.scene.remove(this.modelScene);
    if (this.helperObj) {
      this.scene.remove(this.helperObj);
    }

    const index = ARGUMENTS_CACHES.findIndex((arg) => arg.name === this.name);
    if (index > -1) ARGUMENTS_CACHES.splice(index, 1);

    if (typeof this.#isItem === "function") {
      this.#isItem();
    }
  }
}
