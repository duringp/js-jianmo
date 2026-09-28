import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export const VIEWS = {
  overview: { name: "基地总览", target: [10, 0, 0], position: [166, 143, 181] },
  workshop: { name: "装配车间", target: [-24, 1, 28], position: [19, 49, 81] },
  robot: { name: "机械臂工序", target: [-47, 3, 24], position: [-35, 13, 40] },
  inspection: { name: "质量检测", target: [-8, 3, 25], position: [3, 12, 40] },
  port: { name: "智慧港口", target: [96, 5, -13], position: [145, 51, 52] },
  module: { name: "模组拆解", target: [8, 4, 31], position: [17, 12, 45] },
};
export function createController(world, models, onSelect, onView, onCruise) {
  const { camera, renderer, scene } = world;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.overview.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 6;
  controls.maxDistance = 390;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();
  let transition = null,
    cruise = false,
    cruiseTime = 0,
    cruiseIndex = 0,
    selection = null;
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const boxHelper = new THREE.Box3Helper(new THREE.Box3(), 0xf47a36);
  boxHelper.visible = false;
  scene.add(boxHelper);
  function focus(view, key) {
    transition = {
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      to: new THREE.Vector3(...view.position),
      target: new THREE.Vector3(...view.target),
      t: 0,
    };
    onView(key, view.name);
  }
  function select(data, object) {
    selection = object;
    onSelect(data);
    if (data.position) focus(data, data.kind);
    else {
      const p = object.position;
      focus(
        { position: [p.x + 12, 12, p.z + 17], target: [p.x, 2, p.z] },
        "vehicle",
      );
    }
    boxHelper.visible = true;
    boxHelper.box.setFromObject(object);
  }
  function stopCruise() {
    if (cruise) {
      cruise = false;
      onCruise(false);
    }
    transition = null;
  }
  controls.addEventListener("start", stopCruise);
  renderer.domElement.addEventListener("wheel", stopCruise, { passive: true });
  let down = null;
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => (down = { x: e.clientX, y: e.clientY }),
  );
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(models.pickables, true).find((h) => {
      let o = h.object;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
    if (hit) {
      let o = hit.object;
      while (o && !o.userData.selectable) o = o.parent;
      if (o) select(o.userData.selectable, o);
    }
  });
  return {
    controls,
    get cruise() {
      return cruise;
    },
    get selected() {
      return selection;
    },
    go(key) {
      stopCruise();
      focus(VIEWS[key], key);
      if (key === "overview") {
        selection = null;
        boxHelper.visible = false;
        onSelect(null);
      }
    },
    select,
    toggleCruise() {
      cruise = !cruise;
      cruiseTime = 0;
      cruiseIndex = 0;
      onCruise(cruise);
      if (cruise) focus(VIEWS.workshop, "workshop");
    },
    update(dt) {
      if (cruise) {
        cruiseTime += dt;
        if (cruiseTime > 9) {
          cruiseTime = 0;
          const keys = ["workshop", "robot", "inspection", "port", "overview"];
          cruiseIndex = (cruiseIndex + 1) % keys.length;
          focus(VIEWS[keys[cruiseIndex]], keys[cruiseIndex]);
        }
      }
      if (transition) {
        transition.t += dt / 1.7;
        const t = Math.min(transition.t, 1),
          u = t * t * (3 - 2 * t);
        camera.position.lerpVectors(transition.from, transition.to, u);
        controls.target.lerpVectors(
          transition.fromTarget,
          transition.target,
          u,
        );
        if (t === 1) transition = null;
      }
      controls.update();
      if (selection) boxHelper.box.setFromObject(selection);
    },
  };
}
