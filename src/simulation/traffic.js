export function makeRoute(corners, radius = 4) {
  const points = [];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < corners.length; i++) {
    const p = corners[i],
      prev = corners[(i + corners.length - 1) % corners.length],
      next = corners[(i + 1) % corners.length];
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const a = mix(p, prev, radius / dist(p, prev)),
      b = mix(p, next, radius / dist(p, next));
    for (let j = 0; j <= 12; j++) {
      const t = j / 12;
      points.push(mix(mix(a, p, t), mix(p, b, t), t));
    }
  }
  let length = 0;
  const segments = points.map((a, i) => {
    const b = points[(i + 1) % points.length],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const seg = { a, b, len, start: length };
    length += len;
    return seg;
  });
  return {
    segments,
    length,
    sample(s) {
      s = ((s % length) + length) % length;
      const e = segments.find((e) => s < e.start + e.len) || segments.at(-1);
      const t = (s - e.start) / e.len;
      return {
        x: e.a[0] + (e.b[0] - e.a[0]) * t,
        z: e.a[1] + (e.b[1] - e.a[1]) * t,
        angle: Math.atan2(e.b[0] - e.a[0], e.b[1] - e.a[1]),
      };
    },
  };
}
export const routes = [
  makeRoute([
    [-74, -46],
    [66, -46],
    [66, 44],
    [-74, 44],
  ]),
  makeRoute(
    [
      [-59, -5],
      [80, -5],
      [80, 8],
      [-59, 8],
    ],
    2.5,
  ),
];
// Two crossings share one reservation zone: a vehicle must clear both before release.
const zone = { x: 66, z: 1.5, halfX: 7, halfZ: 14 };
const inZone = (p, pad = 0) =>
  Math.abs(p.x - zone.x) < zone.halfX + pad &&
  Math.abs(p.z - zone.z) < zone.halfZ + pad;
export class Traffic {
  constructor() {
    this.time = 0;
    this.owner = null;
    this.cars = Array.from({ length: 8 }, (_, i) => {
      const route = i < 5 ? 0 : 1;
      const s = route === 0 ? i * 77 + 25 : (i - 5) * 67 + 10;
      return {
        id: i,
        route,
        s,
        speed: 0,
        fault: false,
        state: "行驶中",
        ...routes[route].sample(s),
      };
    });
    this.minObservedGap = Infinity;
  }
  step(dt) {
    if (dt <= 0) return;
    this.time += dt;
    const cars = this.cars;
    if (this.owner !== null) {
      const holder = cars[this.owner];
      if (inZone(holder, 2)) this.entered = true;
      if (this.entered && !inZone(holder, 2)) {
        this.owner = null;
        this.entered = false;
      }
    }
    // Deterministic reservations, ordered by waiting duration then id.
    const requests = cars
      .filter((c) => !c.fault && inZone(routes[c.route].sample(c.s + 9), 6))
      .sort((a, b) => (b.wait || 0) - (a.wait || 0) || a.id - b.id);
    if (this.owner === null) {
      const occupant = cars.find((c) => inZone(c, 2));
      const next = occupant || requests[0];
      if (next) {
        this.owner = next.id;
        this.entered = inZone(next, 2);
      }
    }
    for (const c of cars) {
      const route = routes[c.route];
      let allowed = 6.5;
      let state = "行驶中";
      if (c.fault) {
        allowed = 0;
        state = "故障停车";
      }
      const ahead = cars
        .filter((o) => o !== c && o.route === c.route)
        .map((o) => (o.s - c.s + route.length) % route.length);
      const gap = Math.min(...ahead);
      allowed = Math.min(allowed, Math.max(0, (gap - 8) * 1.4));
      if (gap < 10 && !c.fault) state = "跟车等待";
      if (allowed < 0.025) allowed = 0;
      if (this.owner !== c.id && inZone(route.sample(c.s + 7), 6)) {
        allowed = 0;
        if (!c.fault) state = "路口等待";
      }
      // Hard swept-step safety envelope is independent of signal logic.
      c.speed =
        allowed < c.speed
          ? Math.max(allowed, c.speed - dt * 15)
          : Math.min(allowed, c.speed + dt * 3);
      if (allowed === 0) c.speed = 0;
      let travel = c.speed * dt;
      const next = route.sample(c.s + travel);
      for (const o of cars) {
        if (o === c) continue;
        const d = Math.hypot(next.x - o.x, next.z - o.z);
        if (d < 6.6) {
          travel = 0;
          c.speed = 0;
          if (!c.fault) state = "安全等待";
        }
      }
      c.s = (c.s + travel) % route.length;
      Object.assign(c, route.sample(c.s));
      c.state = state;
      c.wait = travel < 0.001 ? (c.wait || 0) + dt : 0;
    }
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++)
        this.minObservedGap = Math.min(
          this.minObservedGap,
          Math.hypot(cars[i].x - cars[j].x, cars[i].z - cars[j].z),
        );
  }
  setFault(id, value) {
    this.cars[id].fault = value;
    if (value) this.cars[id].speed = 0;
  }
}
