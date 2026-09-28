import * as THREE from "three";
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export const ROBOT_PHASES = [
  ["等待", 1.2],
  ["抓取", 1.8],
  ["搬运", 3],
  ["落位", 1.8],
  ["回位", 2.4],
];
export const INSPECTION_PHASES = [
  ["夹紧", 1.2],
  ["探针接触", 1.2],
  ["电性能检测", 3],
  ["结果反馈", 1.3],
  ["释放", 1.3],
];
export function phaseAt(time, phases) {
  const duration = phases.reduce((s, p) => s + p[1], 0);
  let t = time % duration;
  for (let i = 0; i < phases.length; i++) {
    if (t < phases[i][1])
      return {
        index: i,
        name: phases[i][0],
        progress: t / phases[i][1],
        cycle: Math.floor(time / duration),
      };
    t -= phases[i][1];
  }
  return {
    index: 0,
    name: phases[0][0],
    progress: 0,
    cycle: Math.floor(time / duration),
  };
}
function link(mesh, a, b, width) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(width, a.distanceTo(b), width);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
}
export function updateRobot(r, time) {
  const p = phaseAt(time + r.index * 3.5, ROBOT_PHASES),
    u = p.progress;
  let yaw = 0,
    radial = 5,
    height = 5,
    closed = false,
    held = false,
    delivered = false;
  if (p.index === 1) {
    height = 5 + (3.05 - 5) * smooth(u * 1.65);
    closed = u > 0.65;
    held = u > 0.8;
  }
  if (p.index === 2) {
    closed = held = true;
    yaw = (Math.PI / 2) * smooth((u - 0.2) / 0.6);
    height = 3.05 + 2.7 * Math.sin(Math.PI * u);
  }
  if (p.index === 3) {
    yaw = Math.PI / 2;
    height = 3.05;
    closed = u < 0.45;
    held = u < 0.45;
    delivered = !held;
  }
  if (p.index === 4) {
    yaw = (Math.PI / 2) * (1 - smooth(u));
    height = 3.05 + 1.95 * smooth(u * 2);
    delivered = true;
  }
  r.turret.rotation.y = yaw;
  const end = new THREE.Vector3(radial, height - 1.45, 0);
  const L1 = 3.8,
    L2 = 3.8,
    d = Math.hypot(end.x, end.y);
  const a = Math.atan2(end.y, end.x) + Math.acos(Math.min(1, d / (2 * L1)));
  const elbow = new THREE.Vector3(Math.cos(a) * L1, Math.sin(a) * L1, 0);
  link(r.arm1, new THREE.Vector3(), elbow, 0.7);
  link(r.arm2, elbow, end, 0.58);
  r.joint2.position.copy(elbow);
  r.tool.position.copy(end);
  r.fingers[0].position.x = closed ? -1.73 : -2.2;
  r.fingers[1].position.x = closed ? 1.73 : 2.2;
  if (held) {
    if (r.part.group.parent !== r.tool) r.tool.add(r.part.group);
    r.part.group.position.set(0, -1.5, 0);
    r.part.group.rotation.y = 0;
  } else {
    if (r.part.group.parent !== r.group) r.group.add(r.part.group);
    r.part.group.position.set(
      delivered ? 0 : 5,
      r.stationY,
      delivered ? -5 : 0,
    );
    r.part.group.rotation.y = delivered ? Math.PI / 2 : 0;
  }
  r.phase = p;
  r.held = held;
  return p;
}
export function updateInspection(s, time) {
  const p = phaseAt(time, INSPECTION_PHASES);
  let clamp = 0,
    contact = 0;
  if (p.index === 0) clamp = smooth(p.progress);
  if (p.index >= 1 && p.index <= 3) clamp = 1;
  if (p.index === 1) contact = smooth(p.progress);
  if (p.index === 2 || p.index === 3) contact = 1;
  if (p.index === 4) {
    clamp = 1 - smooth(p.progress);
    contact = 1 - smooth(p.progress);
  }
  s.clamps[0].position.x = -2.5 + 0.65 * clamp;
  s.clamps[1].position.x = 2.5 - 0.65 * clamp;
  s.probe.position.y = 4.5 - 0.85 * contact;
  const fail = p.cycle % 13 === 12;
  s.screen.material.color.set(
    p.index === 3
      ? fail
        ? "#e34e36"
        : "#4abe86"
      : p.index === 2
        ? "#f4a33e"
        : "#628d96",
  );
  s.screen.material.emissive.set(p.index === 2 ? "#412711" : "#000000");
  s.phase = p;
  s.result =
    p.index === 3 ? (fail ? "NG · 绝缘异常" : "PASS · 检测通过") : "检测中";
  return p;
}
