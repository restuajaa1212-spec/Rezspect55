// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Peluru: simulasi lokal di tiap pemain. Pemilik hanya mengirim event tembak;
// kerusakan ke pemain dihitung oleh KORBAN sendiri (me.hit), NPC dihitung lokal.
import * as THREE from 'three';

const GEO = new THREE.SphereGeometry(0.06, 6, 6), MAT = new THREE.MeshBasicMaterial({ color: 0xffe066 });

export class Combat {
  constructor(scene, world) { this.scene = scene; this.world = world; this.list = []; }

  spawn(origin, dir, owner) {
    const m = new THREE.Mesh(GEO, MAT); m.scale.set(1, 1, 6); m.position.copy(origin); m.lookAt(origin.clone().add(dir));
    this.scene.add(m); this.list.push({ m, v: dir.clone().multiplyScalar(90), life: 1.6, owner });
  }

  update(dt, { npcs, me }) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i]; let dead = false; b.life -= dt;
      for (let s = 0; s < 3 && !dead; s++) {               // 3 sub-langkah agar peluru tidak menembus objek
        const p = b.m.position; p.addScaledVector(b.v, dt / 3);
        if (p.y < 0 || p.y > 14) { dead = true; break; }
        for (const c of this.world.colliders) if (p.y < 8 && (c.x - p.x) ** 2 + (c.z - p.z) ** 2 < c.r * c.r) { dead = true; break; }
        if (dead) break;
        for (const n of npcs) if (n.tryHit(p)) { dead = true; break; }
        if (dead) break;
        if (me && b.owner !== me.id && me.alive() && (me.pos.x - p.x) ** 2 + (me.pos.z - p.z) ** 2 < 0.2 && p.y > me.pos.y && p.y < me.pos.y + me.eye + 0.2) { me.hit(b.owner); dead = true; }
      }
      if (dead || b.life <= 0) { this.scene.remove(b.m); this.list.splice(i, 1); }
    }
  }
}
