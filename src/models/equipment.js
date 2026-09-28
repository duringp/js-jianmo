import * as THREE from "three";
import { box, cyl, beam, mat, selectable, instances } from "./primitives.js";
import {
  rounded,
  ring,
  pipe,
  bolts,
  pallet,
  cabinet,
  safetyEdge,
} from "./details.js";
import { batchStatic } from "../scene/batching.js";

export function battery() {
  const g = new THREE.Group();
  const layers = [];
  const base = new THREE.Group();
  g.add(base);
  rounded(base, [3.3, 0.3, 2.2], [0, 0.15, 0], "dark");
  box(base, [3.03, 0.06, 1.93], [0, 0.33, 0], "steel");
  for (let z = -0.78; z < 0.9; z += 0.22)
    box(base, [2.8, 0.045, 0.07], [0, 0.385, z], "copper", false);
  for (const x of [-1.55, 1.55])
    box(base, [0.13, 0.55, 2.16], [x, 0.32, 0], "dark");
  bolts(
    base,
    [
      [-1.5, 0.63, -0.97],
      [1.5, 0.63, -0.97],
      [-1.5, 0.63, 0.97],
      [1.5, 0.63, 0.97],
    ],
    0.055,
  );
  layers.push(base);
  const cells = new THREE.Group();
  g.add(cells);
  const items = [];
  for (let x = 0; x < 8; x++)
    for (let z = 0; z < 3; z++)
      items.push({
        s: [0.32, 0.72, 0.56],
        p: [-1.35 + x * 0.385, 0.68, -0.64 + z * 0.64],
      });
  instances(cells, items, "steel");
  const terminals = [];
  const separators = [];
  for (let x = 0; x < 8; x++)
    for (let z = 0; z < 3; z++) {
      const xx = -1.35 + x * 0.385,
        zz = -0.64 + z * 0.64;
      for (const dx of [-0.095, 0.095])
        terminals.push({ s: [0.075, 0.07, 0.14], p: [xx + dx, 1.075, zz] });
      separators.push({ s: [0.017, 0.63, 0.52], p: [xx + 0.169, 0.7, zz] });
    }
  instances(cells, terminals, "copper");
  instances(cells, separators, "black");
  layers.push(cells);
  const bus = new THREE.Group();
  g.add(bus);
  for (let z = -0.65; z <= 0.65; z += 0.65)
    box(bus, [2.9, 0.08, 0.13], [0, 1.09, z], "orange");
  for (const x of [-1.38, 1.38])
    box(bus, [0.17, 0.12, 1.75], [x, 1.12, 0], "copper");
  box(bus, [0.75, 0.1, 0.32], [0, 1.1, 0.88], "green");
  for (let i = 0; i < 6; i++)
    box(
      bus,
      [0.075, 0.05, 0.15],
      [-0.27 + i * 0.1, 1.18, 0.88],
      "black",
      false,
    );
  layers.push(bus);
  const lid = new THREE.Group();
  g.add(lid);
  rounded(lid, [3.3, 0.16, 2.2], [0, 1.28, 0], "white");
  box(lid, [1.4, 0.025, 0.55], [0, 1.375, 0], "orange");
  for (const z of [-0.93, 0.93])
    box(lid, [2.9, 0.025, 0.035], [0, 1.374, z], "dark", false);
  const screws = [];
  for (const x of [-1.48, 1.48])
    for (const z of [-0.9, 0, 0.9]) screws.push([x, 1.38, z]);
  bolts(lid, screws, 0.045);
  box(lid, [0.55, 0.026, 0.28], [-0.92, 1.376, 0], "dark", false);
  for (let i = 0; i < 9; i++)
    box(
      lid,
      [0.018, 0.03, 0.19],
      [-1.15 + i * 0.055, 1.398, 0],
      "white",
      false,
    );
  layers.push(lid);
  layers.forEach(batchStatic);
  return {
    group: g,
    layers,
    setExplode(v) {
      layers.forEach((l, i) => (l.position.y = i * v * 1.5));
    },
  };
}
export function robot(x, z, index = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0.7, z);
  selectable(
    g,
    `robot-${index}`,
    "工业搬运机械臂",
    "robot",
    [x, 3, z],
    [x + 10, 12, z + 15],
  );
  rounded(g, [4, 0.5, 4], [0, 0.25, 0], "dark");
  bolts(
    g,
    [
      [-1.6, 0.55, -1.6],
      [1.6, 0.55, -1.6],
      [-1.6, 0.55, 1.6],
      [1.6, 0.55, 1.6],
    ],
    0.13,
  );
  ring(g, 0.99, [0, 0.65, 0], "steel", "y");
  cabinet(g, -2.9, 0.25, -1.3, 1.25, 1.65);
  pipe(
    g,
    [
      [-2.3, 0.55, -1.3],
      [-1.5, 0.55, -1.5],
      [-0.65, 0.65, -0.5],
    ],
    0.09,
    "black",
  );
  cyl(g, 1.05, 1.1, [0, 1, 0], "orange");
  const turret = new THREE.Group();
  turret.position.y = 1.45;
  g.add(turret);
  cyl(turret, 0.7, 0.8, [0, 0, 0], "dark");
  const arm1 = beam(turret, [0, 0, 0], [2, 3, 0], 0.7);
  const arm2 = beam(turret, [2, 3, 0], [5, 2, 0], 0.58);
  const joint1 = cyl(turret, 0.48, 0.9, [0, 0, 0], "dark");
  joint1.rotation.x = Math.PI / 2;
  ring(turret, 0.39, [0, 0, 0.5]);
  const joint2 = new THREE.Group();
  joint2.position.set(2, 3, 0);
  turret.add(joint2);
  const elbowCase = cyl(joint2, 0.52, 0.9, [0, 0, 0], "dark");
  elbowCase.rotation.x = Math.PI / 2;
  for (const z of [-0.48, 0.48]) {
    const cap = cyl(joint2, 0.4, 0.09, [0, 0, z], "steel");
    cap.rotation.x = Math.PI / 2;
    ring(joint2, 0.32, [0, 0, z + Math.sign(z) * 0.05], "orange");
  }
  for (const arm of [arm1, arm2]) {
    // Details are expressed in the normalized link coordinates and inherit the live IK pose.
    for (const z of [-0.53, 0.53]) {
      rounded(arm, [0.72, 0.78, 0.1], [0, 0, z], "orangeLight");
      box(
        arm,
        [0.35, 0.22, 0.025],
        [0, 0.1, z + Math.sign(z) * 0.07],
        "dark",
        false,
      );
    }
    pipe(
      arm,
      [
        [0.6, -0.42, 0],
        [0.83, -0.2, 0],
        [0.83, 0.2, 0],
        [0.6, 0.43, 0],
      ],
      0.085,
      "black",
    );
    batchStatic(arm);
  }
  const tool = new THREE.Group();
  turret.add(tool);
  rounded(tool, [4.5, 0.35, 1.1], [0, 0, 0], "dark");
  cyl(tool, 0.35, 0.36, [0, 0.3, 0], "steel");
  ring(tool, 0.35, [0, 0.4, 0], "orange", "y");
  box(tool, [3.9, 0.09, 0.12], [0, 0.23, 0.3], "steel");
  box(tool, [3.9, 0.09, 0.12], [0, 0.23, -0.3], "steel");
  rounded(tool, [1, 0.35, 0.8], [0, 0.36, 0], "orange");
  for (const x of [-1.85, 1.85])
    box(tool, [0.12, 0.14, 0.2], [x, 0.27, 0.47], "green", false);
  const fingers = [
    box(tool, [0.16, 0.8, 1], [0, -0.45, 0], "steel"),
    box(tool, [0.16, 0.8, 1], [0, -0.45, 0], "steel"),
  ];
  for (const finger of fingers) {
    box(finger, [1.1, 0.5, 0.76], [0, -0.12, 0], "black", false);
    batchStatic(finger);
  }
  const part = battery();
  g.add(part.group);
  const stationY = 1.55;
  for (const p of [
    [5, 0],
    [0, -5],
  ]) {
    box(g, [4, 0.15, 3], [p[0], stationY - 0.24, p[1]], "steel");
    for (let dz = -1.3; dz <= 1.3; dz += 0.32) {
      const roller = cyl(
        g,
        0.1,
        3.7,
        [p[0], stationY - 0.1, p[1] + dz],
        "steel",
      );
      roller.rotation.z = Math.PI / 2;
    }
    for (const dx of [-1.94, 1.94])
      box(g, [0.12, 0.2, 3], [p[0] + dx, stationY - 0.12, p[1]], "orange");
    for (const a of [-1.4, 1.4])
      box(g, [0.2, 1.3, 0.2], [p[0] + a, 0.7, p[1]], "dark");
  }
  const beacon = cyl(g, 0.18, 0.3, [-2.9, 2.35, -1.3], "green");
  safetyEdge(g, 0, 0, 4.5, 4.5, 0.29);
  batchStatic(g);
  return {
    group: g,
    turret,
    arm1,
    arm2,
    joint2,
    tool,
    fingers,
    part,
    beacon,
    stationY,
    index,
  };
}
export function inspection(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.7, z);
  selectable(
    g,
    "inspection",
    "模组 EOL 检测站",
    "inspection",
    [x, 3, z],
    [x + 9, 10, z + 14],
  );
  box(g, [7, 0.6, 5], [0, 1, 0], "white");
  box(g, [6, 0.2, 4], [0, 1.4, 0], "dark");
  for (const v of [-2.8, 2.8]) box(g, [0.45, 4, 0.45], [v, 3, -1.8], "steel");
  box(g, [6.2, 0.45, 0.6], [0, 5, -1.8], "orange");
  for (const x of [-2.6, 2.6])
    for (const z of [-1.7, 1.7]) cyl(g, 0.2, 0.5, [x, 0.48, z], "dark");
  for (const x of [-2.25, 2.25]) {
    cyl(g, 0.12, 3.2, [x, 3.15, -1.6], "steel");
    box(g, [0.35, 3, 0.4], [x, 3.2, -1.6], "dark");
  }
  cabinet(g, -4, 0.25, 0, 1.3, 2.4);
  pipe(
    g,
    [
      [-3.8, 2.1, -0.2],
      [-3.3, 2.5, -1.9],
      [-2, 4.8, -2],
      [1, 4.8, -2],
    ],
    0.065,
    "black",
  );
  for (const x of [-2.8, 2.8])
    for (let y = 2; y < 4.7; y += 0.23)
      box(g, [0.15, 0.045, 0.06], [x, y, -1.55], "orange", false);
  const probe = new THREE.Group();
  g.add(probe);
  box(probe, [3.2, 0.4, 2], [0, 0, 0], "white");
  for (const x of [-1, 0, 1])
    for (const z of [-0.55, 0.55])
      cyl(probe, 0.08, 0.6, [x, -0.48, z], "steel");
  rounded(probe, [1.1, 0.55, 0.9], [0, 0.48, -0.5], "orange");
  for (const x of [-1.3, 1.3]) {
    box(probe, [0.16, 0.75, 0.16], [x, 0.55, -0.65], "steel");
    cyl(probe, 0.1, 0.3, [x, -0.22, 0], "copper");
  }
  bolts(
    probe,
    [
      [-1.4, 0.24, -0.8],
      [1.4, 0.24, -0.8],
      [-1.4, 0.24, 0.8],
      [1.4, 0.24, 0.8],
    ],
    0.075,
  );
  batchStatic(probe);
  const clamps = [
    box(g, [0.35, 1, 2.4], [-2.5, 2, 0], "orange"),
    box(g, [0.35, 1, 2.4], [2.5, 2, 0], "orange"),
  ];
  const part = battery();
  part.group.position.y = 1.5;
  g.add(part.group);
  for (const clamp of clamps) {
    clamp.userData.dynamic = true;
    box(clamp, [0.65, 0.55, 0.7], [0, -0.2, 0], "dark");
    box(clamp, [0.9, 0.18, 0.7], [0, -0.5, 0], "steel");
  }
  cyl(g, 0.09, 2.5, [3.3, 2, 1.5], "steel");
  rounded(g, [1.9, 1.45, 0.3], [3.3, 3.5, 1.47], "dark");
  const screen = box(g, [1.6, 1.1, 0.05], [3.3, 3.5, 1.65], "green");
  const screenLines = [];
  for (let i = 0; i < 4; i++)
    screenLines.push({
      s: [0.8 - i * 0.13, 0.035, 0.02],
      p: [3.1, 3.78 - i * 0.17, 1.687],
    });
  instances(g, screenLines, "white").castShadow = false;
  cyl(g, 0.1, 0.08, [3.75, 2.68, 1.5], "red");
  for (const x of [-1.7, 1.7])
    for (const z of [-1.5, 1.5]) cyl(g, 0.065, 0.2, [x, 1.57, z], "steel");
  screen.userData.dynamic = true;
  batchStatic(g);
  screen.material = mat.green.clone();
  return { group: g, probe, clamps, part, screen };
}
export function vehicle(index) {
  const g = new THREE.Group(),
    type = index % 3;
  const kind = ["智能箱式物流车", "低位托盘 AGV", "电动牵引车"][type];
  rounded(g, [2.75, 0.65, 4.65], [0, 0.94, 0], type === 1 ? "orange" : "white");
  box(g, [2.6, 0.13, 4.3], [0, 0.53, 0], "dark");
  const wheels = [];
  for (const x of [-1.4, 1.4])
    for (const z of [-1.5, 1.5]) {
      const axle = new THREE.Group();
      axle.position.set(x, 0.65, z);
      g.add(axle);
      const wheel = cyl(axle, 0.48, 0.27, [0, 0, 0], "black");
      wheel.rotation.z = Math.PI / 2;
      const hub = cyl(axle, 0.24, 0.29, [0, 0, 0], "steel");
      hub.rotation.z = Math.PI / 2;
      ring(axle, 0.36, [Math.sign(x) * 0.15, 0, 0], "dark").rotation.y =
        Math.PI / 2;
      wheels.push(axle);
    }
  if (type === 0) {
    rounded(g, [2.5, 1.45, 1.5], [0, 1.95, 1.25], "white");
    box(g, [2.18, 0.72, 0.055], [0, 2.18, 2.025], "glass");
    for (const x of [-1.26, 1.26]) {
      box(g, [0.03, 0.62, 0.93], [x, 2.13, 1.16], "glass");
      box(g, [0.045, 0.1, 0.4], [x, 1.65, 1.13], "dark");
    }
    rounded(g, [2.5, 1.55, 2.7], [0, 1.98, -0.82], "orange");
    for (let z = -2; z < 0.5; z += 0.3)
      for (const x of [-1.26, 1.26])
        box(g, [0.04, 1.25, 0.055], [x, 1.98, z], "orangeLight", false);
    for (const x of [-0.6, 0.6]) {
      box(g, [1.1, 1.38, 0.04], [x, 1.98, -2.2], "white");
      box(g, [0.05, 1.12, 0.06], [x, 1.98, -2.24], "steel");
    }
  } else if (type === 1) {
    pallet(g, 0, 1.29, -0.25, 2.35, 3.6);
    for (const z of [-1.15, 0.65]) {
      rounded(g, [2, 1.05, 1.45], [0, 2.12, z], "steel");
      for (const x of [-0.63, 0.63])
        box(g, [0.12, 1.1, 1.49], [x, 2.12, z], "dark", false);
    }
    cyl(g, 0.26, 0.18, [0, 1.5, 1.98], "dark");
    cyl(g, 0.23, 0.055, [0, 1.62, 1.98], "blue");
  } else {
    rounded(g, [2.15, 1.25, 1.5], [0, 1.83, 1.2], "orange");
    box(g, [1.84, 0.75, 0.05], [0, 2, 1.98], "glass");
    box(g, [2.35, 0.17, 2.5], [0, 1.35, -0.85], "dark");
    for (const z of [-1.65, -0.4]) {
      pallet(g, 0, 1.43, z, 2.1, 1.15);
      rounded(g, [1.8, 0.83, 1], [0, 2.15, z], "wood");
      for (const x of [-0.5, 0.5])
        box(g, [0.08, 0.87, 1.02], [x, 2.15, z], "white", false);
    }
  }
  for (const x of [-0.92, 0.92]) {
    box(g, [0.42, 0.18, 0.075], [x, 1.05, 2.36], "light", false);
    box(g, [0.27, 0.15, 0.075], [x, 0.97, -2.36], "red", false);
  }
  for (let x = -1.1; x < 1.2; x += 0.4) {
    const strip = box(
      g,
      [0.16, 0.16, 0.035],
      [x, 0.73, 2.355],
      "orange",
      false,
    );
    strip.rotation.z = -0.45;
  }
  batchStatic(g);
  const beacon = box(
    g,
    [0.4, 0.17, 0.38],
    [0, type === 1 ? 1.85 : 2.78, 1.2],
    "green",
  );
  beacon.material = mat.green.clone();
  selectable(
    g,
    `vehicle-${index}`,
    `${kind} AGV-${String(index + 1).padStart(2, "0")}`,
    "vehicle",
    null,
    null,
  );
  return { group: g, beacon, wheels, type };
}
