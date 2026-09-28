import { Vector3 } from "three";
// Microgeometry has no useful silhouette in the campus view. Keep the large
// forms visible and restore fasteners/hoses/rings automatically in close-ups.
export function createDetailCulling(scene, camera) {
  const items = [];
  scene.traverse((o) => {
    if (o.userData.detailRange) items.push(o);
  });
  const position = new Vector3();
  let elapsed = 1;
  return {
    update(dt) {
      elapsed += dt;
      if (elapsed < 0.2) return;
      elapsed = 0;
      for (const object of items) {
        object.getWorldPosition(position);
        const range = object.userData.detailRange;
        object.visible =
          position.distanceToSquared(camera.position) < range * range;
      }
    },
  };
}
