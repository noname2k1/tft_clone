import * as THREE from "https://esm.sh/three";

class RightClickEffect {
  constructor(scene) {
    this.scene = scene;
    this.clock = new THREE.Clock();
    this.effectMesh = this.createEffectMesh();
    this.scene.add(this.effectMesh);
    this.active = false;
  }

  createEffectMesh() {
    const geometry = new THREE.RingGeometry(0.3, 0.35, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    return mesh;
  }

  trigger(position) {
    this.effectMesh.position.set(position.x, 0.02, position.z);
    this.effectMesh.visible = true;
    this.active = true;
    this.startTime = this.clock.getElapsedTime();
  }

  update() {
    if (!this.active) return;
    const elapsed = this.clock.getElapsedTime() - this.startTime;
    if (elapsed > 0.5) {
      this.effectMesh.visible = false;
      this.active = false;
    } else {
      const scale = 1 + elapsed * 3;
      this.effectMesh.scale.set(scale, scale, scale);
      this.effectMesh.material.opacity = 1 - elapsed * 2;
    }
  }
}

export { RightClickEffect };
