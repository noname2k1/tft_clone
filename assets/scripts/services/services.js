import * as THREE from "https://esm.sh/three";
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

export { createDeleteZone };
