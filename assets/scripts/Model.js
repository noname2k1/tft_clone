import { lightAuto, loadModel } from "./utils/utils";
import * as THREE from "https://esm.sh/three";

export default class Model {
  modelScene;
  mixer;
  animations = [];
  box = new THREE.Box3();
  helperObj;

  constructor(
    scene,
    {
      name = "",
      url,
      position = [0, 0, 0],
      scale = [0.01, 0.01, 0.01],
      onLoaded = () => {},
    },
    helper = { enabled: false, color: 0xff0000 }
  ) {
    loadModel(url, (gltf) => {
      this.modelScene = gltf.scene;
      this.modelScene.name = name;
      this.setPosition(...position);
      this.setScale(...scale);

      // Add to scene
      scene.add(this.modelScene);

      // Animation
      if (gltf.animations.length > 0) {
        this.animations = gltf.animations;
        this.mixer = new THREE.AnimationMixer(this.modelScene);
        const idleAnim = gltf.animations.find((a) =>
          a.name.toLowerCase().startsWith("idle")
        );
        if (idleAnim) {
          this.mixer.clipAction(idleAnim).play();
        } else this.mixer.clipAction(gltf.animations[0]).play();
      }

      // Initial bounding box
      this.updateBox();

      // Initial helper
      if (helper.enabled) {
        this.helperObj = new THREE.Box3Helper(this.box, helper.color);
        scene.add(this.helperObj);
      }
      onLoaded(this);
    });
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

  checkCollision(otherModel) {
    if (!otherModel || !otherModel.box) return false;
    return this.box.intersectsBox(otherModel.box);
  }

  removeFromScene(scene) {
    if (this.modelScene && scene) {
      scene.remove(this.modelScene);
      if (this.helperObj) {
        scene.remove(this.helperObj);
      }
    }
  }
}
