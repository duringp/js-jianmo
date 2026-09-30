import { Traffic } from "./traffic.js";
import { updateRobot, updateInspection } from "./process.js";
import { ProductionLine } from "./production-line.js";
import { renderProduction } from "./production-renderer.js";
export class Simulation {
  constructor(models) {
    this.models = models;
    this.traffic = new Traffic();
    this.time = 0;
    this.paused = false;
    this.speed = 1;
    this.accumulator = 0;
    this.explode = 0;
    this.explodeTarget = 0;
    this.line = models.production ? new ProductionLine() : null;
    if (this.line) this.line.prime();
    this.total = 0;
    this.step(0);
  }
  update(realDt) {
    if (!this.paused) {
      this.accumulator += Math.min(realDt, 0.1) * this.speed;
      while (this.accumulator >= 1 / 60) {
        this.time += 1 / 60;
        this.step(1 / 60);
        this.accumulator -= 1 / 60;
      }
      this.explode +=
        (this.explodeTarget - this.explode) * Math.min(1, realDt * 6);
      this.models.module.setExplode(this.explode);
    }
  }
  step(dt) {
    const m = this.models;
    this.traffic.step(dt);
    if (this.line) {
      this.line.step(dt);
      renderProduction(m, this.line);
    } else {
      m.robots.forEach((r) => updateRobot(r, this.time));
      updateInspection(m.inspect, this.time);
    }
    this.traffic.cars.forEach((c, i) => {
      const v = m.vehicles[i];
      v.group.position.set(c.x, 0.09, c.z);
      v.group.rotation.y = c.angle;
      v.wheels?.forEach((w) => (w.rotation.x += (c.speed * dt) / 0.48));
      v.beacon.material.color.set(
        c.fault
          ? Math.sin(this.time * 9) > 0
            ? "#ef3e23"
            : "#5d2820"
          : "#68a78c",
      );
    });
    m.signals.forEach((s) =>
      s.material.color.set(this.traffic.owner !== null ? "#f59b3a" : "#54ad85"),
    );
    m.cranes.forEach(
      (c, i) => (c.position.x = 5 + 6 * Math.sin(this.time * 0.16 + i)),
    );
    m.fanRotors?.forEach(
      (r, i) => (r.rotation.y = this.time * (1.4 + i * 0.04)),
    );
    m.conveyorParts?.forEach(
      (p, i) => (p.position.x = -57 + ((i * 10 + this.time * 1.4) % 68)),
    );
    m.ship.position.y = -0.1 + Math.sin(this.time * 0.5) * 0.07;
    this.total = this.line?.good || 0;
  }
  get faults() {
    return this.traffic.cars.filter((c) => c.fault).length;
  }
  toggleFault() {
    const car = this.traffic.cars[0];
    this.traffic.setFault(0, !car.fault);
    this.step(0);
    return car.fault;
  }
}
