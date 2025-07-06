import * as THREE from "https://esm.sh/three";
import BarrierShaderMaterial from "./barrierShaderMaterial";

export default class TFTCarousel {
  constructor(scene, numPads = 8, radius = 6) {
    this.scene = scene;
    this.numPads = numPads;
    this.radius = radius;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.padBarriers = [];

    this._createCenterRing();
    this._createPads();
    this._createGround();
  }

  _createGround() {
    const radius = this.radius + 2; // +2 để dư ra chút so với pad
    const segments = 64;

    const geometry = new THREE.CircleGeometry(radius, segments);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.3,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.01; // nằm dưới carousel một chút
    circle.receiveShadow = true;

    this.group.add(circle);
  }

  _createCenterRing() {
    const thetaSegments = 30;
    const innerRadius = 7;
    // Vòng nền nâng cao
    const ringBase = new THREE.Mesh(
      new THREE.CylinderGeometry(
        innerRadius,
        innerRadius,
        0.5,
        thetaSegments,
        1,
        true
      ), // ring dày hơn
      new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide,
      })
    );
    ringBase.position.y = 0.2; // nâng cao
    this.group.add(ringBase);

    const ringBase1 = new THREE.Mesh(
      new THREE.CylinderGeometry(
        innerRadius + 2,
        innerRadius + 2,
        0.5,
        thetaSegments,
        1,
        true
      ), // ring dày hơn
      new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide,
      })
    );
    ringBase1.position.y = 0; // nâng cao
    this.group.add(ringBase1);

    // Mặt trên phát sáng
    const ringTop = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, innerRadius + 0.2, thetaSegments),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      })
    );
    ringTop.rotation.x = -Math.PI / 2;
    ringTop.position.y = 0.41; // nằm phía trên phần nền
    this.group.add(ringTop);

    // Tâm carousel
    const centerCircle = new THREE.Mesh(
      new THREE.CircleGeometry(innerRadius, thetaSegments),
      new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.4,
        roughness: 0.6,
      })
    );
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.42;
    this.group.add(centerCircle);
  }

  _createPads() {
    const debug = false;
    const padColors = [
      0xff0000, 0xffa500, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0x800080,
      0xffffff,
    ];

    const hexSize = 3;

    for (let i = 0; i < this.numPads; i++) {
      const angle = (i / this.numPads) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;
      // const color = padColors[i % padColors.length];
      const color = padColors[padColors.length - 1];
      // Bệ hình lục giác
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize, hexSize, 0.2, 6),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.6,
          roughness: 0.3,
        })
      );
      pad.position.set(x, 0.1, z);
      pad.lookAt(new THREE.Vector3(0, pad.position.y, 0)); // hướng về tâm (trục y giữ nguyên)
      pad.rotateY(Math.PI);
      this.group.add(pad);

      // Tướng (giả lập bằng sphere)
      const champ = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      champ.position.set(0, 0.4, 0);
      pad.add(champ);

      // Rào chắn (chỉ cạnh bên, không đáy và đỉnh)
      this.barrierHeight = 1.2;
      this.barrierRadius = hexSize - 1;
      const barrier = new THREE.Mesh(
        new THREE.CylinderGeometry(
          this.barrierRadius,
          this.barrierRadius,
          this.barrierHeight,
          32,
          1,
          true
        ),
        BarrierShaderMaterial.clone()
      );
      barrier.position.set(0, this.barrierHeight / 2 + 0.1, 0);
      pad.add(barrier);
      const boxHelper = new THREE.BoxHelper(barrier, 0xff00ff);
      this.scene.add(boxHelper);
      const worldBox = new THREE.Box3();
      const worldBoxHelper = new THREE.Box3Helper(worldBox, 0x00ffff);
      this.scene.add(worldBoxHelper);
      worldBoxHelper.visible = debug;
      boxHelper.visible = debug;
      this.padBarriers.push({
        mesh: barrier,
        boxHelper,
        worldBox,
        worldBoxHelper,
        active: true,
        deactivate: () => {
          barrier.userData.fadeStart = performance.now() / 1000;
          barrier.userData.fading = true;
        },
      });
    }
  }

  update() {
    this.group.rotation.y += 0.003;
    const elapsedTime = performance.now() / 1000;

    this.padBarriers.forEach((barrierData, i) => {
      const { mesh } = barrierData;

      // Cập nhật hiệu ứng hologram trôi
      if (mesh.material.uniforms) {
        mesh.material.uniforms.u_time.value = elapsedTime;
      }

      barrierData.boxHelper.update();

      // Cập nhật worldBox từ vị trí rào chắn
      barrierData.mesh.updateMatrixWorld(true);
      const shrinkFactor = 0.6;
      const center = barrierData.mesh.getWorldPosition(new THREE.Vector3());
      const size = new THREE.Vector3(
        this.barrierRadius * 2 * shrinkFactor,
        this.barrierHeight * shrinkFactor,
        this.barrierRadius * 2 * shrinkFactor
      );
      barrierData.worldBox.setFromCenterAndSize(center, size);

      // Cập nhật helper
      barrierData.worldBoxHelper.box.copy(barrierData.worldBox);
      barrierData.worldBoxHelper.updateMatrixWorld();

      // Nếu đang fade
      if (mesh.userData.fading) {
        const fadeElapsed = elapsedTime - mesh.userData.fadeStart;
        const fadeDuration = 1.0;
        const alpha = THREE.MathUtils.clamp(
          1.0 - fadeElapsed / fadeDuration,
          0,
          1
        );
        mesh.material.uniforms.u_opacity.value = alpha;
        if (alpha <= 0) {
          mesh.parent.remove(mesh);
          barrierData.active = false;
          mesh.userData.fading = false;
          barrierData.boxHelper.visible = false;
          barrierData.worldBoxHelper.visible = false;
        }
      }
    });
  }

  checkBarrierCollision(champion) {
    if (!champion || !champion.box) return false;

    champion.box.setFromObject(champion);

    for (const barrier of this.padBarriers) {
      if (!barrier.active) continue;

      barrier.mesh.updateMatrixWorld(true);
      const worldBox = barrier.worldBox;

      if (champion.box.intersectsBox(worldBox)) return true;
    }

    return false;
  }

  deactivateBarrier(index) {
    if (
      index >= 0 &&
      index < this.padBarriers.length &&
      this.padBarriers[index].active
    ) {
      this.padBarriers[index].deactivate();
    }
  }

  remove() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
