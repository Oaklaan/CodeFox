//! Fox game core. Units are "sprite pixels": 1 unit = 1 pixel of the fox sprite.
//! x grows to the right; y is the height ABOVE the ground (0 = standing on it).

use wasm_bindgen::prelude::*;

const FOX_W: f32 = 18.0;
const WALK_SPEED: f32 = 14.0;
const SPRINT_SPEED: f32 = 46.0;
const JUMP_V: f32 = 75.0;
const GRAVITY: f32 = 220.0;
const HOLD_SECS: f32 = 0.25; // press longer than this => crouch
const DOUBLE_CLICK_SECS: f32 = 0.30;
const SPRINT_SECS: f32 = 1.4;
const SLEEP_AFTER_SECS: f32 = 30.0;

// State ids shared with webview/main.js
// 0 idle, 1 walk, 2 sprint, 3 jump, 4 crouch, 5 sleep

#[wasm_bindgen]
pub struct Fox {
    world_w: f32,
    x: f32,
    y: f32,
    vy: f32,
    facing: f32, // -1.0 or 1.0
    time: f32,
    anim: f32,
    pointer_down_at: Option<f32>,
    last_click: f32,
    last_input: f32,
    crouching: bool,
    walking: bool,
    sleeping: bool,
    sprint_left: f32,
    think_left: f32,
    wander: bool,
    rng: u32,
}

#[wasm_bindgen]
impl Fox {
    #[wasm_bindgen(constructor)]
    pub fn new(world_w: f32, seed: u32) -> Fox {
        Fox {
            world_w,
            x: world_w / 2.0,
            y: 0.0,
            vy: 0.0,
            facing: 1.0,
            time: 0.0,
            anim: 0.0,
            pointer_down_at: None,
            last_click: -10.0,
            last_input: 0.0,
            crouching: false,
            walking: false,
            sleeping: false,
            sprint_left: 0.0,
            think_left: 1.0,
            wander: true,
            rng: seed | 1,
        }
    }

    pub fn set_world_width(&mut self, w: f32) {
        self.world_w = w;
    }

    pub fn set_wander(&mut self, on: bool) {
        self.wander = on;
        if !on {
            self.walking = false;
            self.sleeping = false;
        }
    }

    /// Advance the simulation. `dt_ms` is the frame time in milliseconds.
    pub fn tick(&mut self, dt_ms: f32) {
        let dt = (dt_ms / 1000.0).clamp(0.0, 0.1);
        self.time += dt;
        self.anim += dt;

        // Press-and-hold => crouch
        if let Some(t0) = self.pointer_down_at {
            if !self.crouching && self.grounded() && self.time - t0 >= HOLD_SECS {
                self.crouching = true;
                self.walking = false;
                self.sprint_left = 0.0;
            }
        }

        if self.sprint_left > 0.0 {
            self.sprint_left -= dt;
        }

        // Autonomous behaviour
        if !self.crouching && self.grounded() && self.sprint_left <= 0.0 {
            self.think_left -= dt;
            if self.think_left <= 0.0 {
                self.think();
            }
        }

        // Horizontal movement
        let speed = if self.crouching {
            0.0
        } else if self.sprint_left > 0.0 {
            SPRINT_SPEED
        } else if self.walking {
            WALK_SPEED
        } else {
            0.0
        };
        self.x += self.facing * speed * dt;

        let half = FOX_W / 2.0;
        let max_x = (self.world_w - half).max(half);
        if self.x < half {
            self.x = half;
            self.facing = 1.0;
        } else if self.x > max_x {
            self.x = max_x;
            self.facing = -1.0;
        }

        // Vertical movement
        if self.y > 0.0 || self.vy > 0.0 {
            self.vy -= GRAVITY * dt;
            self.y += self.vy * dt;
            if self.y <= 0.0 {
                self.y = 0.0;
                self.vy = 0.0;
            }
        }
    }

    /// `x` is the pointer x position in world units. The fox turns toward it.
    pub fn pointer_down(&mut self, x: f32) {
        self.wake();
        self.pointer_down_at = Some(self.time);
        self.facing = if x < self.x { -1.0 } else { 1.0 };
    }

    pub fn pointer_up(&mut self) {
        self.pointer_down_at = None;
        self.wake();

        if self.crouching {
            self.crouching = false;
            self.think_left = 0.8;
            return;
        }

        if self.time - self.last_click < DOUBLE_CLICK_SECS {
            // double click => sprint toward the clicked side
            self.sprint_left = SPRINT_SECS;
            self.walking = false;
            self.last_click = -10.0;
        } else {
            if self.grounded() {
                self.vy = JUMP_V;
            }
            self.last_click = self.time;
        }
    }

    /// Pointer left / was interrupted: release crouch without triggering a click.
    pub fn pointer_cancel(&mut self) {
        self.pointer_down_at = None;
        self.crouching = false;
    }

    pub fn x(&self) -> f32 {
        self.x
    }
    pub fn y(&self) -> f32 {
        self.y
    }
    pub fn facing(&self) -> f32 {
        self.facing
    }

    /// 0 idle, 1 walk, 2 sprint, 3 jump, 4 crouch, 5 sleep
    pub fn state(&self) -> u8 {
        if self.crouching {
            4
        } else if !self.grounded() {
            3
        } else if self.sprint_left > 0.0 {
            2
        } else if self.walking {
            1
        } else if self.sleeping {
            5
        } else {
            0
        }
    }

    /// Animation frame 0..3 for walk/sprint cycles.
    pub fn frame(&self) -> u32 {
        let rate = if self.sprint_left > 0.0 { 14.0 } else { 7.0 };
        ((self.anim * rate) as u32) % 4
    }
}

impl Fox {
    fn grounded(&self) -> bool {
        self.y <= 0.0 && self.vy <= 0.0
    }

    fn wake(&mut self) {
        self.sleeping = false;
        self.last_input = self.time;
        self.think_left = self.think_left.max(1.0);
    }

    fn rand(&mut self) -> f32 {
        let mut s = self.rng;
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        self.rng = s;
        s as f32 / u32::MAX as f32
    }

    fn think(&mut self) {
        if !self.wander {
            self.walking = false;
            self.think_left = 1.0;
            return;
        }
        if self.time - self.last_input > SLEEP_AFTER_SECS {
            self.sleeping = true;
            self.walking = false;
            self.think_left = 2.0;
            return;
        }
        self.sleeping = false;
        let r = self.rand();
        let dur = 1.5 + self.rand() * 3.0;
        if r < 0.45 {
            self.walking = false;
        } else {
            self.walking = true;
            self.facing = if self.rand() < 0.5 { -1.0 } else { 1.0 };
        }
        self.think_left = dur;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn click_makes_fox_jump() {
        let mut f = Fox::new(200.0, 1);
        f.tick(16.0);
        f.pointer_down(10.0);
        f.tick(50.0);
        f.pointer_up();
        f.tick(16.0);
        assert_eq!(f.state(), 3);
    }

    #[test]
    fn hold_makes_fox_crouch_then_release_stands() {
        let mut f = Fox::new(200.0, 1);
        f.pointer_down(10.0);
        for _ in 0..3 {
            f.tick(100.0);
        }
        assert_eq!(f.state(), 4);
        f.pointer_up();
        f.tick(16.0);
        assert_ne!(f.state(), 4);
    }

    #[test]
    fn double_click_starts_sprint() {
        let mut f = Fox::new(200.0, 1);
        f.pointer_down(10.0);
        f.pointer_up();
        f.pointer_down(10.0);
        f.pointer_up();
        assert!(f.sprint_left > 0.0);
    }

    #[test]
    fn fox_stays_inside_world() {
        let mut f = Fox::new(60.0, 7);
        f.pointer_down(0.0);
        f.pointer_up();
        f.pointer_down(0.0);
        f.pointer_up();
        for _ in 0..600 {
            f.tick(16.0);
            assert!(f.x() >= FOX_W / 2.0 - 0.001 && f.x() <= 60.0 - FOX_W / 2.0 + 0.001);
        }
    }
}
