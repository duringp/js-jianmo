import * as THREE from "three";
// Never bake articulated meshes or meshes carrying children into a static batch.
// Existing static instances are coalesced too, so adding many container ribs,
// fasteners or façade segments does not add one draw call per detail group.
export function batchStatic(parent) {
  const batches = new Map();
  for (const child of [...parent.children]) {
    if (
      !child.isMesh ||
      child.userData.selectable ||
      child.userData.dynamic ||
      child.userData.detailRange ||
      child.children.length ||
      child.material.transparent
    )
      continue;
    const key = `${child.geometry.uuid}:${child.material.uuid}:${child.castShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(child);
  }
  const local = new THREE.Matrix4(),
    world = new THREE.Matrix4();
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const first = objects[0],
      count = objects.reduce(
        (n, o) => n + (o.isInstancedMesh ? o.count : 1),
        0,
      );
    const mesh = new THREE.InstancedMesh(first.geometry, first.material, count);
    let index = 0;
    for (const object of objects) {
      object.updateMatrix();
      if (object.isInstancedMesh) {
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, local);
          world.multiplyMatrices(object.matrix, local);
          mesh.setMatrixAt(index++, world);
        }
      } else mesh.setMatrixAt(index++, object.matrix);
      parent.remove(object);
    }
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    parent.add(mesh);
  }
}
