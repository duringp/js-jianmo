// Deterministic, rendering-independent line controller. Each station owns at
// most one serialised workpiece, including its reserved inbound transfer.
export const LINE_Y = 2.25;
export const STATIONS = [
  { id: "load", name: "上料扫码", x: -59, end: -59, duration: 2.4 },
  { id: "robot1", name: "上料搬运", x: -53, end: -45, duration: 8.8 },
  { id: "press", name: "叠装压合", x: -39, end: -39, duration: 4.8 },
  { id: "connect", name: "母排连接 / 锁付", x: -30, end: -30, duration: 6.2 },
  { id: "robot2", name: "转序搬运", x: -25, end: -17, duration: 8.8 },
  { id: "inspection", name: "EOL 检测", x: -9, end: -9, duration: 8 },
  { id: "sort", name: "检测分流", x: 2, end: 2, duration: 1.2 },
];
export const OUTPUT_SLOTS = {
  good: [
    [12, 25],
    [12, 29],
    [12, 33],
  ],
  reject: [
    [-2, 32],
    [2, 32],
  ],
};
export const ROBOT_TIMES = [
  ["等待", 0.4],
  ["抓取", 1.6],
  ["搬运", 3],
  ["落位", 1.8],
  ["回位", 2],
];
export const ease = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export function robotMotion(t, station) {
  let elapsed = t,
    index = 0;
  while (index < 4 && elapsed >= ROBOT_TIMES[index][1]) {
    elapsed -= ROBOT_TIMES[index][1];
    index++;
  }
  const progress = Math.min(1, elapsed / ROBOT_TIMES[index][1]);
  const z = 25,
    pick = station.x,
    drop = station.end,
    center = (pick + drop) / 2;
  const radius = Math.hypot(4, 5),
    a0 = Math.atan2(5, -4),
    a1 = Math.atan2(5, 4);
  let x = pick,
    y = LINE_Y + 1.5,
    toolZ = z,
    held = false,
    closed = false;
  if (index === 0) y += 1.8;
  if (index === 1) {
    y += 1.8 * (1 - ease(progress / 0.65));
    closed = progress > 0.7;
    held = progress > 0.82;
  }
  if (index === 2) {
    const a = a0 + (a1 - a0) * ease(progress);
    x = center + radius * Math.cos(a);
    toolZ = 20 + radius * Math.sin(a);
    y += 1.8 * Math.sin(Math.PI * progress);
    closed = held = true;
  }
  if (index === 3) {
    x = drop;
    closed = held = progress < 0.4;
  }
  if (index === 4) {
    const a = a1 + (a0 - a1) * ease(progress);
    x = center + radius * Math.cos(a);
    toolZ = 20 + radius * Math.sin(a);
    y += 1.8 * ease(progress * 2);
  }
  return {
    index,
    name: ROBOT_TIMES[index][0],
    progress,
    closed,
    held,
    tool: [x, y, toolZ],
    part: held ? [x, y - 1.5, toolZ] : [index >= 3 ? drop : pick, LINE_Y, z],
  };
}
function travel(points, speed = 2.6) {
  let length = 0;
  const edges = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    edges.push({ a, b, d, start: length });
    length += d;
  }
  return { points, edges, length, duration: Math.max(0.1, length / speed) };
}
export function sampleTravel(path, t) {
  let d = Math.min(1, t / path.duration) * path.length;
  const edge = path.edges.find((e) => d <= e.start + e.d) || path.edges.at(-1);
  if (!edge) return [...path.points[0]];
  const f = edge.d ? (d - edge.start) / edge.d : 1;
  return edge.a.map(
    (v, i) => v + (edge.b[i] - v) * Math.max(0, Math.min(1, f)),
  );
}
export class ProductionLine {
  constructor() {
    this.time = 0;
    this.serial = 0;
    this.issued = 0;
    this.good = 0;
    this.rejected = 0;
    this.shipped = 0;
    this.sentToRework = 0;
    this.stations = STATIONS.map((def) => ({ ...def, job: null }));
    this.jobs = new Map();
    this.history = [];
    this.events = [];
    this.outputPaused = false;
    this.nextFeed = 0;
    this.nextPickup = 20;
    this.nextRework = 36;
    this.bins = { good: [], reject: [] };
    this.reservations = { good: new Set(), reject: new Set() };
  }
  log(job, message) {
    const record = { at: this.time, id: job.id, message };
    this.events.unshift(record);
    this.events.length = Math.min(this.events.length, 12);
    job.trace.push(record);
  }
  create() {
    const id = ++this.serial,
      job = {
        id,
        serial: `BM-${String(id).padStart(5, "0")}`,
        station: 0,
        mode: "process",
        elapsed: 0,
        position: [-59, LINE_Y, 25],
        bus: false,
        lid: false,
        qa: null,
        trace: [],
      };
    this.jobs.set(id, job);
    this.stations[0].job = job;
    this.issued++;
    this.log(job, "上料扫码");
    return job;
  }
  prime(seconds = 38) {
    this.time = -seconds;
    this.nextFeed = this.time;
    this.nextPickup = 20;
    this.nextRework = 36;
    for (let n = 0; n < Math.round(seconds * 60); n++) this.step(1 / 60);
    this.time = 0;
  }
  availableSlot(kind) {
    return OUTPUT_SLOTS[kind].findIndex(
      (_, i) =>
        !this.reservations[kind].has(i) &&
        !this.bins[kind].some((j) => j.slot === i),
    );
  }
  finish(job) {
    this.jobs.delete(job.id);
    this.history.push(job);
    if (this.history.length > 200) this.history.shift();
  }
  step(dt) {
    if (dt <= 0) return;
    this.time += dt;
    // Real departures release storage slots. A paused dispatch is propagated
    // upstream through reservations instead of deleting/recycling material.
    if (!this.outputPaused && this.time >= this.nextPickup) {
      const job = this.bins.good.shift();
      if (job) {
        this.shipped++;
        this.log(job, "合格出库");
        this.finish(job);
      }
      this.nextPickup = this.time + 14;
    }
    if (this.time >= this.nextRework) {
      const job = this.bins.reject.shift();
      if (job) {
        this.sentToRework++;
        this.log(job, "隔离移交返修");
        this.finish(job);
      }
      this.nextRework = this.time + 36;
    }
    for (const job of [...this.jobs.values()]) {
      if (job.mode !== "outbound") continue;
      job.elapsed += dt;
      job.position = sampleTravel(job.path, job.elapsed);
      if (job.elapsed >= job.path.duration) {
        job.mode = "stored";
        this.reservations[job.kind].delete(job.slot);
        this.bins[job.kind].push(job);
        if (job.kind === "good") this.good++;
        else this.rejected++;
        this.log(job, job.kind === "good" ? "合格下线" : "NG 隔离入位");
      }
    }
    for (let i = this.stations.length - 1; i >= 0; i--) {
      const s = this.stations[i],
        j = s.job;
      if (!j) continue;
      if (j.mode === "transfer") {
        j.elapsed += dt;
        j.position = sampleTravel(j.path, j.elapsed);
        if (j.elapsed >= j.path.duration) {
          j.mode = "process";
          j.elapsed = 0;
          j.position = [s.x, LINE_Y, 25];
          this.log(j, s.name);
        }
        continue;
      }
      j.elapsed = Math.min(s.duration, j.elapsed + dt);
      if (s.id.startsWith("robot")) {
        j.motion = robotMotion(j.elapsed, s);
        j.position = [...j.motion.part];
      }
      if (s.id === "connect") {
        if (j.elapsed >= 1.1) j.bus = true;
        if (j.elapsed >= 3.4) j.lid = true;
      }
      if (s.id === "inspection" && j.elapsed >= 5.4 && j.qa === null) {
        j.qa = j.id % 7 === 0 ? "NG" : "PASS";
        this.log(j, j.qa === "PASS" ? "检测通过" : "绝缘异常 · NG");
      }
      if (j.elapsed < s.duration) continue;
      if (i === this.stations.length - 1) {
        const kind = j.qa === "PASS" ? "good" : "reject",
          slot = this.availableSlot(kind);
        if (slot < 0) {
          j.mode = "blocked";
          continue;
        }
        const [x, z] = OUTPUT_SLOTS[kind][slot];
        this.reservations[kind].add(slot);
        j.kind = kind;
        j.slot = slot;
        j.mode = "outbound";
        j.elapsed = 0;
        j.path = travel(
          [
            [s.end, LINE_Y, 25],
            ...(kind === "good"
              ? [
                  [8, LINE_Y, 25],
                  [8, LINE_Y, z],
                ]
              : [
                  [2, LINE_Y, 28],
                  [x, LINE_Y, 28],
                ]),
            [x, LINE_Y, z],
          ],
          2,
        );
        s.job = null;
        this.log(j, kind === "good" ? "送往合格缓存" : "送往隔离区");
        continue;
      }
      const next = this.stations[i + 1];
      if (next.job) {
        j.mode = "blocked";
        continue;
      }
      next.job = j;
      s.job = null;
      j.station = i + 1;
      j.mode = "transfer";
      j.elapsed = 0;
      j.motion = null;
      j.path = travel([
        [s.end, LINE_Y, 25],
        [next.x, LINE_Y, 25],
      ]);
      this.log(j, `转序 → ${next.name}`);
    }
    // Keep the loading envelope reserved until the previous tray has cleared.
    const feedClear = this.active.every(
      (j) =>
        Math.abs(j.position[0] + 59) >= 3.8 ||
        Math.abs(j.position[2] - 25) >= 2.5,
    );
    if (!this.stations[0].job && this.time >= this.nextFeed && feedClear) {
      this.create();
      this.nextFeed = this.time + 11;
    }
  }
  get active() {
    return [...this.jobs.values()];
  }
  get wip() {
    return this.active.filter((j) => j.mode !== "stored").length;
  }
  get tested() {
    return (
      this.good +
      this.rejected +
      this.active.filter((j) => j.qa && j.mode !== "stored").length
    );
  }
  get passed() {
    return (
      this.good +
      this.active.filter((j) => j.qa === "PASS" && j.mode !== "stored").length
    );
  }
  get blocked() {
    return this.stations.filter((s) => s.job?.mode === "blocked").length;
  }
  snapshot() {
    return {
      time: this.time,
      issued: this.issued,
      good: this.good,
      rejected: this.rejected,
      shipped: this.shipped,
      rework: this.sentToRework,
      wip: this.wip,
      blocked: this.blocked,
      active: this.active.map((j) => ({
        id: j.id,
        station: j.station,
        mode: j.mode,
        qa: j.qa,
        position: [...j.position],
      })),
    };
  }
}
