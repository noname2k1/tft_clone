import { lightAuto, loadModel } from "./utils/utils";
import * as THREE from "https://esm.sh/three";

export default class Model {
  modelScene;
  mixer;
  animations = [];
  box = new THREE.Box3();
  helperObj;
  name = "";

  constructor(
    scene,
    {
      name = "",
      url,
      position = [0, 0, 0],
      scale = [0.01, 0.01, 0.01],
      onLoaded = () => {},
    },
    glow = { enabled: false, color: "0xffff00" },
    helper = { enabled: false, color: 0xff0000 }
  ) {
    const default_colors = {
      glow: 0xffff00,
      helper: 0xff0000,
    };
    loadModel(url, (gltf) => {
      this.modelScene = gltf.scene;
      this.modelScene.name = name;
      this.name = name;
      this.setPosition(...position);
      this.setScale(...scale);

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
        this.helperObj = new THREE.Box3Helper(
          this.box,
          helper.color ? helper.color : default_colors.helper
        );
        scene.add(this.helperObj);
      }

      if (glow.enabled) {
        const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: glow.color ? glow.color : default_colors.glow,
          transparent: true,
          opacity: 0.4,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(this.modelScene.clone().position);
        this.modelScene["glow"] = glowMesh;
        scene.add(glowMesh);
      }
      onLoaded(this);
      // Add to scene
      scene.add(this.modelScene);
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
      scene.remove(this.modelScene.glow);
      scene.remove(this.modelScene);
      if (this.helperObj) {
        scene.remove(this.helperObj);
      }
    }
  }
}
