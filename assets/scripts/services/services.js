import * as THREE from "https://esm.sh/three";
import { COLOR_DELETE_ZONE, COLOR_MOVEABLE, debugOn } from "~/variables";
function createDeleteZone(
  scene,
  width = 35,
  depth = 5,
  color = COLOR_DELETE_ZONE,
  pos = [0, 0, 0]
) {
  const deleteZone = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.1, depth),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.5,
      transparent: true,
    })
  );
  deleteZone.visible = false;
  deleteZone.position.set(...pos);
  deleteZone.updateMatrixWorld();
  scene.add(deleteZone);
  return deleteZone;
}

// Battle Field
function createBattleField(
  scene,
  rows,
  cols,
  data = { radius: 0, startX: 0, startZ: 0 },
  owner = "me"
) {
  const bfCells = [];
  const bfEnemyCells = [];
  const { radius, startX, startZ } = data;
  const hexMaterial = new THREE.LineBasicMaterial({
    color: COLOR_MOVEABLE,
    linewidth: 100,
  });
  const angleOffset = Math.PI / 6;
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (i === 0) hexShape.moveTo(x, z);
    else hexShape.lineTo(x, z);
  }
  hexShape.closePath();
  const hexPoints = hexShape.getPoints();
  const hexGeometry = new THREE.BufferGeometry().setFromPoints(
    hexPoints.map((p) => new THREE.Vector3(p.x, 0.01, p.y))
  );
  const dis = 1.2;
  const hexWidth = Math.sqrt(3) * radius * dis;
  const hexRowSpacing = 1.5 * radius * dis;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * (hexWidth / 2);
      const x = startX + col * hexWidth + offsetX;
      const z = startZ + row * hexRowSpacing;
      const hex = new THREE.Line(hexGeometry, hexMaterial.clone());
      hex.position.set(x, 0, z);
      scene.add(hex);
      hex.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(hex);
      if (owner === "me") {
        hex.visible = false;
        bfCells.push({ mesh: hex, center: new THREE.Vector3(x, 0, z), box });
      } else {
        hex.visible = false;
        bfEnemyCells.push({
          mesh: hex,
          center: new THREE.Vector3(x, 0, z),
          box,
        });
      }
    }
  }

  return owner === "me" ? bfCells : bfEnemyCells;
}

// Bench
function createBench(
  scene,
  rows,
  cols,
  size,
  gap = 0.2,
  position,
  owner = "me"
) {
  const xMes = [];
  const xBenchEnemy = [];
  let zMe, zBenchEnemy;
  const squareGroup = new THREE.Group();
  const benchCells = [];
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const step = size + gap;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step,
        z = row * step;
      const points = [
        new THREE.Vector3(x, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineSegments = new THREE.LineSegments(
        geometry,
        lineMaterial.clone()
      );
      lineSegments.visible = false;
      squareGroup.add(lineSegments);
      const box = new THREE.Box3(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + size, 1, z + size)
      );

      if (owner === "me") {
        xMes[col] = x + position[0] + (size - 1);
        benchCells.push({ mesh: lineSegments, box });
      } else {
        xBenchEnemy[col] = x + position[0] + (size - 1);
      }
    }
    if (owner === "me") {
      zMe = position[2] + (size - 1);
    } else {
      zBenchEnemy = position[2] + (size - 1);
    }
  }
  squareGroup.updateMatrixWorld();
  squareGroup.position.set(...position);
  scene.add(squareGroup);
  if (debugOn) {
    const objectDebug = {
      name: owner + "'s SquareGroup (" + owner.charAt(0).toUpperCase() + ")",
      object: squareGroup,
      key: owner.charAt(0),
      isOpen: false,
    };
    createDebugGuiFolder(objectDebug);
  }
  return owner === "me"
    ? { squareGroup, xMes, zMe, benchCells }
    : { squareGroup, xBenchEnemy, zBenchEnemy, benchCells };
}

function moveToOtherObject(
  fromObj,
  targetObj,
  speed,
  afterMoveCallBack = () => {},
  state = { isRunning: false },
  fromObjAnimations = { idle: null, run: null }
) {
  // Utility: Get actual position reference
  const getPosition = (obj) =>
    obj?.position ||
    obj?.modelScene?.position ||
    obj?.userData?.champScene?.position ||
    obj;

  // Utility: Get actual rotation reference
  const getRotation = (obj) =>
    obj?.rotation ||
    obj?.modelScene?.rotation ||
    obj?.userData?.champScene?.rotation;

  // Utility: Apply position
  const setPosition = (obj, pos) => {
    if (obj?.position) obj.position.copy(pos);
    else if (obj?.modelScene?.position) obj.modelScene.position.copy(pos);
    else if (obj?.userData?.champScene?.position)
      obj.userData.champScene.position.copy(pos);
  };

  const pos = getPosition(fromObj);
  const targetPos = getPosition(targetObj);
  const rot = getRotation(fromObj);

  if (!pos || !targetPos) return;

  // Animation fallback (if not provided)
  const animations = { ...fromObjAnimations };
  if ((!animations.idle || !animations.run) && fromObj?.animations) {
    const findAnim = (keyword) =>
      fromObj.animations.find((anim) =>
        anim.name.toLowerCase().includes(keyword)
      );
    animations.idle = fromObj.mixer?.clipAction(findAnim("idle"));
    animations.run = fromObj.mixer?.clipAction(findAnim("run"));
  }

  // Direction + movement
  const dir = new THREE.Vector3().subVectors(targetPos, pos);
  dir.y = 0;
  const distance = dir.length();

  if (distance > 0.1) {
    if (!state.isRunning) {
      animations.idle?.stop();
      animations.run?.play();
      state.isRunning = true;
    }

    dir.normalize();
    if (rot) rot.y = Math.atan2(dir.x, dir.z);
    pos.add(dir.multiplyScalar(speed));
  } else {
    setPosition(fromObj, targetPos);

    if (state.isRunning) {
      animations.run?.stop();
      animations.idle?.play();
      state.isRunning = false;
    }

    afterMoveCallBack();
  }
}

export { createDeleteZone, createBattleField, createBench, moveToOtherObject };
