import * as THREE from "three";
import {
  box,
  cyl,
  beam,
  instances,
  label,
  selectable,
  mat,
} from "./primitives.js";
import { robot, inspection, battery, vehicle } from "./equipment.js";
import { batchStatic } from "../scene/batching.js";
import {
  detailBuilding,
  detailedContainer,
  detailCrane,
  detailShip,
} from "./details.js";
import {
  warehouseInterior,
  workshopDetails,
  campusDetails,
} from "./site-details.js";
import {
  sign,
  preprocessing,
  serviceFacilities,
  shapedHull,
  waterDetails,
} from "./industrial-assets.js";
export const BUILDINGS = [
  { x: -34, z: -29, w: 64, d: 23 },
  { x: 35, z: -29, w: 42, d: 23 },
  { x: -23, z: 29, w: 82, d: 24 },
];
export function createBase(scene) {
  const base = new THREE.Group();
  scene.add(base);
  const roofs = [],
    pickables = [],
    robots = [],
    labels = [];
  box(base, [181, 1.6, 123], [-1, -0.8, 0], "concrete");
  box(base, [179, 0.16, 121], [-1, 0.08, 0], "floor");
  box(base, [40, 0.6, 124], [110, -0.42, 0], "water", false);
  const roadRects = [];
  const road = (w, d, x, z) =>
    roadRects.push({
      x0: x - w / 2,
      x1: x + w / 2,
      z0: z - d / 2,
      z1: z + d / 2,
    });
  road(149, 8, -4, -46);
  road(149, 8, -4, 44);
  road(8, 98, -74, -1);
  road(8, 98, 66, -1);
  road(8, 22, 80, 1.5);
  road(143, 7, 10.5, -5);
  road(143, 7, 10.5, 8);
  road(7, 13, -59, 1.5);
  // Build a single planar road union; overlapping road slabs cause depth flicker at junctions.
  const xs = [...new Set(roadRects.flatMap((r) => [r.x0, r.x1]))].sort(
      (a, b) => a - b,
    ),
    zs = [...new Set(roadRects.flatMap((r) => [r.z0, r.z1]))].sort(
      (a, b) => a - b,
    );
  const vertices = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const a = xs[i],
        b = xs[i + 1],
        c = zs[j],
        d = zs[j + 1],
        mx = (a + b) / 2,
        mz = (c + d) / 2;
      if (
        roadRects.some((r) => mx > r.x0 && mx < r.x1 && mz > r.z0 && mz < r.z1)
      )
        vertices.push(
          a,
          0.26,
          c,
          a,
          0.26,
          d,
          b,
          0.26,
          d,
          a,
          0.26,
          c,
          b,
          0.26,
          d,
          b,
          0.26,
          c,
        );
    }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, mat.road);
  roadMesh.receiveShadow = true;
  base.add(roadMesh);
  const marks = [];
  for (let x = -68; x < 64; x += 8)
    for (const z of [-46, 44])
      marks.push({ s: [3, 0.025, 0.17], p: [x, 0.28, z] });
  for (let z = -40; z < 43; z += 8)
    for (const x of [-74, 66])
      if (x !== 66 || Math.min(Math.abs(z + 5), Math.abs(z - 8)) > 5)
        marks.push({ s: [0.17, 0.025, 3], p: [x, 0.28, z] });
  for (let x = -53; x < 81; x += 8)
    for (const z of [-5, 8])
      if (Math.abs(x - 66) > 5)
        marks.push({ s: [3, 0.025, 0.14], p: [x, 0.28, z] });
  instances(base, marks, "white");
  for (const z of [-5, 8]) {
    for (const x of [59, 73])
      for (let i = 0; i < 5; i++)
        box(
          base,
          [0.6, 0.03, 0.45],
          [x, 0.3, z - 1.5 + i * 0.75],
          "white",
          false,
        );
  }
  const curbs = [];
  for (let x = -82; x <= 83; x += 3)
    for (const z of [-56, 55])
      curbs.push({ s: [2.8, 0.35, 0.6], p: [x, 0.3, z] });
  instances(base, curbs, "white");
  function building(x, z, w, d, name, open = false) {
    const g = new THREE.Group();
    g.position.set(x, 0.35, z);
    base.add(g);
    selectable(
      g,
      name,
      name,
      name.startsWith("02")
        ? "warehouse"
        : name.startsWith("03")
          ? "preprocess"
          : "workshop",
      [x, 3, z],
      [x + 37, 34, z + 44],
    );
    pickables.push(g);
    box(g, [w, 0.6, d], [0, 0.3, 0], "white");
    box(g, [w, 7, 0.45], [0, 4, -d / 2], "white");
    box(g, [0.45, 7, d], [-w / 2, 4, 0], "white");
    if (!open) {
      box(g, [0.45, 7, d], [w / 2, 4, 0], "white");
      box(g, [w, 5, 0.5], [0, 4, d / 2], "white");
      box(g, [w - 1, 1, 0.1], [0, 5.3, d / 2 + 0.27], "glass");
    }
    const columns = [];
    for (let xx = -w / 2; xx <= w / 2; xx += 8) {
      columns.push({ s: [0.4, 7, 0.4], p: [xx, 4, d / 2] });
      box(g, [0.16, 7, 0.15], [xx, 4, -d / 2 - 0.3], "steel");
    }
    instances(g, columns, "steel");
    box(g, [w, 0.45, 0.45], [0, 7.4, d / 2], "orange");
    const roof = new THREE.Group();
    g.add(roof);
    box(roof, [w + 1, 0.5, d + 1], [0, 7.8, 0], "roof");
    const strips = [];
    for (let xx = -w / 2 + 3; xx < w / 2; xx += 6)
      strips.push({ s: [0.15, 0.07, d], p: [xx, 8.09, 0] });
    instances(roof, strips, "steel");
    for (let xx = -w / 2 + 6; xx < w / 2; xx += 13) {
      box(roof, [5, 0.8, 3], [xx, 8.4, 0], "concrete");
      box(roof, [4, 0.1, 2.4], [xx, 8.85, 0], "dark");
    }
    roof.visible = !open;
    roofs.push(roof);
    label(roof, name, [0, 8.13, 4], w * 0.6);
    detailBuilding(g, roof, w, d, open);
    if (!open)
      sign(
        g,
        name,
        open ? "ASSEMBLY / AUTOMATION" : "CELLPORT / INDUSTRIAL CAMPUS",
        [0, 6.65, d / 2 + 0.38],
        Math.min(w * 0.55, 20),
        1.05,
      );
    batchStatic(roof);
    batchStatic(g);
    return g;
  }
  const warehouse = building(-34, -29, 64, 23, "02 / 智能仓储");
  warehouseInterior(warehouse);
  const preprocessBuilding = building(35, -29, 42, 23, "03 / 电芯预处理");
  const fanRotors = preprocessing(preprocessBuilding);
  const hall = building(-23, 29, 82, 24, "01 / 模组装配车间", true);
  box(hall, [72, 0.07, 1.8], [0, 0.65, -1], "dark");
  for (let x = -34; x < 36; x += 2)
    box(hall, [0.15, 0.1, 1.7], [x, 0.76, -1], "steel", false);
  for (const x of [-49, -29]) {
    const r = robot(x, 25, robots.length);
    base.add(r.group);
    robots.push(r);
    pickables.push(r.group);
  }
  const inspect = inspection(-8, 25);
  base.add(inspect.group);
  pickables.push(inspect.group);
  const module = battery();
  module.group.position.set(8, 1.7, 31);
  base.add(module.group);
  box(base, [6, 1.4, 5], [8, 1, 31], "white");
  selectable(
    module.group,
    "module",
    "液冷电池模组",
    "module",
    [8, 3, 31],
    [15, 10, 43],
  );
  pickables.push(module.group);
  for (let x = -59; x < 16; x += 8) {
    box(base, [4, 0.04, 2], [x, 0.7, 37], "orange", false);
  }
  label(base, "ASSEMBLY  /  A-01", [-24, 0.75, 39], 30);
  label(base, "LOGISTICS  LOOP", [-20, 0.28, -45], 27, "#d5dedb");
  // Compact administration and landscaped utility strip.
  const office = new THREE.Group();
  base.add(office);
  office.position.set(40, 0.3, 30);
  selectable(
    office,
    "office",
    "能源与控制中心",
    "workshop",
    [40, 4, 30],
    [65, 24, 55],
  );
  pickables.push(office);
  box(office, [27, 6, 20], [0, 3, 0], "white");
  for (const y of [2.2, 4.5])
    box(office, [27.1, 1.2, 20.1], [0, y, 0], "glass");
  box(office, [28, 0.5, 21], [0, 6.3, 0], "roof");
  box(office, [28, 0.3, 1], [0, 6.65, 10], "orange");
  label(office, "CONTROL", [0, 6.6, 0], 16);
  const trees = [];
  for (let x = -65; x < 60; x += 9)
    for (const z of [-54, 53]) {
      cyl(base, 0.16, 1.6, [x, 1, z], "dark");
      trees.push({ s: [2.2, 2.3, 2.2], p: [x, 2.7, z], r: 0.4 });
      box(base, [3.5, 0.15, 3.5], [x, 0.3, z], "grass", false);
    }
  instances(base, trees, "green");
  for (let z = -42; z < 49; z += 18)
    for (const x of [-81, 59]) {
      cyl(base, 0.12, 6, [x, 3, z], "steel");
      box(base, [2, 0.18, 0.7], [x + 0.8, 6, z], "white");
    }
  // Harbor, gantry cranes and stacked intermodal containers.
  const port = new THREE.Group();
  base.add(port);
  selectable(
    port,
    "port",
    "04 / 智慧港口",
    "port",
    [94, 3, -15],
    [128, 42, 36],
  );
  pickables.push(port);
  box(port, [20.8, 1.2, 111], [93.6, 0.1, -2], "concrete");
  const containers = [];
  for (let z = -41; z < 35; z += 11)
    for (let x = 0; x < 2; x++)
      for (let y = 0; y < (z % 3 === 0 ? 2 : 1); y++)
        containers.push({ s: [5, 3, 8], p: [86 + x * 6, 2.22 + y * 3.06, z] });
  containers.forEach((c, i) =>
    detailedContainer(
      port,
      c.s,
      c.p,
      ["orange", "blue", "white", "steel"][i % 4],
      `CP ${2000 + i}`,
    ),
  );
  const cranes = [];
  for (const z of [-30, 18]) {
    const crane = new THREE.Group();
    port.add(crane);
    crane.position.set(93, 0.62, z);
    for (const x of [-7, 7])
      for (const dz of [-5, 5]) {
        beam(crane, [x, 0, dz], [x * 0.65, 20, dz], 0.65);
        box(crane, [3, 0.8, 2], [x, 0.65, dz], "dark");
      }
    box(crane, [30, 0.9, 1.2], [6, 20, -5], "orange");
    box(crane, [30, 0.9, 1.2], [6, 20, 5], "orange");
    beam(crane, [-4, 20, -5], [16, 20, 5], 0.35, "steel");
    beam(crane, [-4, 20, 5], [16, 20, -5], 0.35, "steel");
    const trolley = new THREE.Group();
    crane.add(trolley);
    box(trolley, [3, 0.7, 10], [0, 20, 0], "dark");
    for (const dz of [-3, 3])
      box(trolley, [0.07, 8, 0.07], [0, 15.7, dz], "dark");
    box(trolley, [4, 0.4, 8], [0, 11.7, 0], "orange");
    detailCrane(crane);
    cranes.push(trolley);
  }
  const ship = new THREE.Group();
  ship.position.set(113, -0.1, -15);
  port.add(ship);
  shapedHull(ship);
  box(ship, [10, 5, 8], [0, 4, 21], "white");
  box(ship, [10.3, 1, 8.1], [0, 5.2, 21], "glass");
  for (let z = -19; z < 15; z += 9)
    for (let x = -1; x <= 1; x++)
      detailedContainer(
        ship,
        [3.5, 2.5, 7.8],
        [x * 3.7, 2.8, z],
        ["orange", "blue", "steel"][(x + 4 + Math.floor((z + 21) / 9)) % 3],
        `SEA ${140 + x + z}`,
      );
  detailShip(ship);
  label(base, "04 / PORT", [87, 1, -51], 15);
  const vehicles = Array.from({ length: 8 }, (_, i) => {
    const v = vehicle(i);
    base.add(v.group);
    pickables.push(v.group);
    return v;
  });
  const signals = [];
  for (const z of [-5, 8]) {
    const g = new THREE.Group();
    g.position.set(71, 0, z + 4);
    base.add(g);
    cyl(g, 0.15, 4, [0, 2, 0], "steel");
    const head = box(g, [0.7, 1.3, 0.7], [0, 4, 0], "dark");
    const light = box(g, [0.4, 0.4, 0.75], [0, 4.3, 0], "green");
    light.material = mat.green.clone();
    signals.push(light);
  }
  const conveyorParts = workshopDetails(base, hall);
  campusDetails(base, office);
  serviceFacilities(base, pickables);
  waterDetails(base);
  batchStatic(base);
  batchStatic(port);
  batchStatic(office);
  batchStatic(ship);
  const grid = new THREE.GridHelper(450, 90, 0xc7cecb, 0xdde1dd);
  grid.position.y = -1.63;
  scene.add(grid);
  return {
    base,
    upperStructures: [hall.userData.upperStructure].filter(Boolean),
    conveyorParts,
    fanRotors,
    roofs,
    pickables,
    robots,
    inspect,
    module,
    vehicles,
    cranes,
    ship,
    signals,
    labels,
  };
}
