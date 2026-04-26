import * as THREE from 'three';

// First-person player. Holds position, velocity, mode and handles movement against the world.
//
// Coordinate convention: y is up. The player is approximately 1.8 blocks tall;
// camera (eye) sits at y = position.y + EYE_HEIGHT. Position represents the center-bottom (feet).

const PLAYER_HALF_W = 0.3;
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.6;
const GRAVITY = -28;
const JUMP_VELOCITY = 9;
const WALK_SPEED = 5;
const RUN_SPEED = 8;
const FLY_SPEED = 12;
const FLY_VERT = 8;

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    this.position = new THREE.Vector3(0, 40, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;

    this.mode = 'creative'; // 'creative' | 'survival' | 'education'
    this.flying = true;

    this.health = 10;
    this.maxHealth = 10;

    this.input = {
      forward: false, back: false, left: false, right: false,
      jump: false, sneak: false, run: false, flyUp: false, flyDown: false
    };

    // Reusable vectors to avoid GC churn
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._move = new THREE.Vector3();
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'creative') {
      this.flying = true;
      this.health = this.maxHealth;
    } else if (mode === 'survival') {
      this.flying = false;
    } else if (mode === 'education') {
      this.flying = true;
      this.health = this.maxHealth;
    }
  }

  toggleFly() {
    if (this.mode === 'survival') return;
    this.flying = !this.flying;
    this.velocity.y = 0;
  }

  spawnAtSurface() {
    const sy = this.world.surfaceY(0, 0);
    this.position.set(0.5, sy + 2, 0.5);
    this.velocity.set(0, 0, 0);
  }

  // Returns the camera/eye position
  eye() {
    return new THREE.Vector3(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
  }

  rotate(dx, dy) {
    this.yaw -= dx * 0.0025;
    this.pitch -= dy * 0.0025;
    const max = Math.PI / 2 - 0.01;
    if (this.pitch >  max) this.pitch =  max;
    if (this.pitch < -max) this.pitch = -max;
  }

  update(dt) {
    // Compute forward/right vectors on horizontal plane
    const yaw = this.yaw;
    this._forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this._right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    const speed = (this.input.run ? RUN_SPEED : WALK_SPEED);
    const flying = this.flying;
    const accel = flying ? FLY_SPEED : speed;

    this._move.set(0, 0, 0);
    if (this.input.forward) this._move.add(this._forward);
    if (this.input.back)    this._move.addScaledVector(this._forward, -1);
    if (this.input.right)   this._move.add(this._right);
    if (this.input.left)    this._move.addScaledVector(this._right, -1);
    if (this._move.lengthSq() > 0) this._move.normalize();

    if (flying) {
      this.velocity.x = this._move.x * accel;
      this.velocity.z = this._move.z * accel;
      let vy = 0;
      if (this.input.flyUp || this.input.jump) vy += FLY_VERT;
      if (this.input.flyDown || this.input.sneak) vy -= FLY_VERT;
      this.velocity.y = vy;
    } else {
      // Smooth horizontal movement
      const targetX = this._move.x * speed;
      const targetZ = this._move.z * speed;
      const damp = this.onGround ? 12 : 4;
      this.velocity.x += (targetX - this.velocity.x) * Math.min(1, damp * dt);
      this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, damp * dt);

      this.velocity.y += GRAVITY * dt;
      if (this.input.jump && this.onGround) {
        this.velocity.y = JUMP_VELOCITY;
        this.onGround = false;
      }
    }

    // Integrate with collision per-axis
    this._moveAxis('x', this.velocity.x * dt);
    this._moveAxis('z', this.velocity.z * dt);
    this._moveAxis('y', this.velocity.y * dt);

    // Update camera
    const eye = this.eye();
    this.camera.position.copy(eye);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Survival fall damage / void
    if (this.mode === 'survival') {
      if (this.position.y < -10) {
        this.health = 0;
      }
    }
  }

  _aabb(pos) {
    const min = new THREE.Vector3(
      pos.x - PLAYER_HALF_W,
      pos.y,
      pos.z - PLAYER_HALF_W
    );
    const max = new THREE.Vector3(
      pos.x + PLAYER_HALF_W,
      pos.y + PLAYER_HEIGHT,
      pos.z + PLAYER_HALF_W
    );
    return { min, max };
  }

  _moveAxis(axis, delta) {
    if (delta === 0) return;
    const next = this.position.clone();
    next[axis] += delta;
    const { min, max } = this._aabb(next);

    // Slight epsilon to avoid sticking to edges
    const eps = 1e-4;
    min.x += eps; max.x -= eps;
    min.z += eps; max.z -= eps;

    if (this.world.collidesAABB(min, max)) {
      if (axis === 'y') {
        if (delta < 0) this.onGround = true;
        this.velocity.y = 0;
      } else {
        this.velocity[axis] = 0;
      }
      return;
    }

    // No collision -> commit
    if (axis === 'y' && delta < 0) {
      // Check if we'd be on ground after this move (sample slightly below)
      const probe = next.clone();
      probe.y -= 0.05;
      const { min: pmin, max: pmax } = this._aabb(probe);
      this.onGround = this.world.collidesAABB(pmin, pmax);
    } else if (axis === 'y' && delta > 0) {
      this.onGround = false;
    }
    this.position.copy(next);
  }
}
