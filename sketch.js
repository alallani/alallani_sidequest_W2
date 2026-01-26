// Y-position of the floor (ground level)
let bgMusic;
let musicStarted = false;
let floorY3;

// Player character (soft, animated blob)
let blob3 = {
  // Position (centre of the blob)
  x: 80,
  y: 0,

  // Visual properties
  r: 21, // Base radius
  points: 48, // Number of points used to draw the blob
  wobble: 4, // Edge deformation amount
  wobbleFreq: 0.9,

  // Time values for breathing animation
  t: 0,
  tSpeed: 0.01,

  // Physics: velocity
  vx: 0, // Horizontal velocity
  vy: 0, // Vertical velocity

  // Movement tuning
  accel: 0.3, // Horizontal acceleration
  maxRun: 1.8, // Maximum horizontal speed
  gravity: 0.28, // Downward force
  jumpV: -6.0, // Initial jump impulse

  // State
  onGround: false, // True when standing on a platform

  // Friction
  frictionAir: 0.995, // Light friction in air
  frictionGround: 0.92, // Stronger friction on ground
};

// List of solid platforms the blob can stand on
// Each platform is an axis-aligned rectangle (AABB)
let platforms = [];
let flowers = [];
let clouds = [];

function preload() {
  bgMusic = loadSound("assets/sounds/calm-music.mp3");
}

function setup() {
  createCanvas(640, 360);

  // Define the floor height
  floorY3 = height - 36;

  noStroke();
  textFont("sans-serif");
  textSize(14);

  // Create platforms (floor + steps)
  platforms = [
    // Floor: full-width sand
    { x: 0, y: height * 0.85, w: width, h: height * 0.15, type: "sand" },

    // Lilypads spread out vertically and horizontally
    { x: 100, y: height * 0.68, w: 100, h: 18, type: "lilypad" }, // first lilypad
    { x: 247, y: height * 0.63 - 30, w: 120, h: 18, type: "lilypad" }, // second lilypad
    { x: 385, y: height * 0.38, w: 126, h: 20, type: "lilypad" }, // third lilypad
    { x: 526, y: height * 0.54, w: 90, h: 16, type: "lilypad" }, // fourth lilypad
  ];

  // Start the blob resting on the floor
  blob3.x = 40;
  blob3.y = platforms[0].y - blob3.r - 1;

  // Place a flower on each lilypad
  flowers = platforms
    .filter((p) => p.type === "lilypad")
    .map((p) => ({
      x: p.x + p.w / 2,
      y: p.y - 5,
      bloom: 0, // 0 = invisible, 1 = fully bloomed
      particles: [],
      fullyBloomed: false,
    }));

  // --- Add clouds ---
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(width),
      y: random(height * 0.05, height * 0.25),
      size: random(50, 120),
      speed: random(0.15, 0.25), // slow drift
    });
  }
}

function draw() {
  drawBackground(); // calm beach background

  // --- Draw all platforms ---
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];
    noStroke();

    if (p.type === "sand") {
      fill(245, 230, 180);
      rect(p.x, p.y, p.w, p.h, 8);
    } else if (p.type === "lilypad") {
      fill(120, 200, 140, 220); // soft green
      ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h);
    }
  }

  // --- Input: left/right movement ---
  let move = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) move -= 1; // A or ←
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) move += 1; // D or →
  blob3.vx += blob3.accel * move;

  // --- Apply friction and clamp speed ---
  blob3.vx *= blob3.onGround ? blob3.frictionGround : blob3.frictionAir;
  blob3.vx = constrain(blob3.vx, -blob3.maxRun, blob3.maxRun);

  // --- Apply gravity ---
  blob3.vy += blob3.gravity;

  // Cap fall speed for extra soft landing
  blob3.vy = constrain(blob3.vy, -Infinity, 4.5); // max downward speed 4.5

  // --- Collision representation ---
  // We collide using a rectangle (AABB),
  // even though the blob is drawn as a circle
  let box = {
    x: blob3.x - blob3.r,
    y: blob3.y - blob3.r,
    w: blob3.r * 2,
    h: blob3.r * 2,
  };

  // --- STEP 1: Move horizontally, then resolve X collisions ---
  box.x += blob3.vx;
  for (const s of platforms) {
    if (overlap(box, s)) {
      if (blob3.vx > 0) {
        // Moving right → hit the left side of a platform
        box.x = s.x - box.w;
      } else if (blob3.vx < 0) {
        // Moving left → hit the right side of a platform
        box.x = s.x + s.w;
      }
      blob3.vx = 0;
    }
  }

  // --- STEP 2: Move vertically, then resolve Y collisions ---
  box.y += blob3.vy;
  blob3.onGround = false;

  for (const s of platforms) {
    if (overlap(box, s)) {
      if (blob3.vy > 0) {
        // Falling → land on top of a platform
        box.y = s.y - box.h;
        if (blob3.vy > 0) {
          // Falling → land on top of a platform
          box.y = s.y - box.h;

          // Soft landing: gently absorb downward speed
          blob3.vy *= 0.2; // reduce speed to 20%
          if (abs(blob3.vy) < 0.5) blob3.vy = 0; // stop once slow enough

          blob3.onGround = true;
        }
        blob3.onGround = true;
      } else if (blob3.vy < 0) {
        // Rising → hit the underside of a platform
        box.y = s.y + s.h;
        blob3.vy = 0;
      }
    }
  }

  // --- Convert collision box back to blob centre ---
  blob3.x = box.x + box.w / 2;
  blob3.y = box.y + box.h / 2;

  // --- Flower interaction: touch to bloom ---
  for (let f of flowers) {
    let d = dist(blob3.x, blob3.y, f.x, f.y);

    if (d < blob3.r + 14) {
      f.bloom = min(f.bloom + 0.02, 1);
    }
  }

  // Keep blob inside the canvas horizontally
  blob3.x = constrain(blob3.x, blob3.r, width - blob3.r);

  // --- Draw the animated blob ---
  blob3.t += blob3.tSpeed;
  drawBlobCircle(blob3);

  //Draw flowers on lilypads
  for (let f of flowers) {
    if (f.bloom <= 0) continue; // invisible at first

    let s = f.bloom; // scale from 0 → 1

    // --- Draw petals ---
    noStroke();
    fill(255, 220, 235);
    ellipse(f.x, f.y, 20 * s, 20 * s);
    ellipse(f.x - 9 * s, f.y, 14 * s, 14 * s);
    ellipse(f.x + 9 * s, f.y, 14 * s, 14 * s);
    ellipse(f.x, f.y - 9 * s, 14 * s, 14 * s);
    ellipse(f.x, f.y + 9 * s, 14 * s, 14 * s);

    // --- Draw center ---
    fill(255, 200, 120);
    ellipse(f.x, f.y, 8 * s, 8 * s);

    // --- Spawn particles once bloom is fully done ---
    if (f.bloom >= 1 && !f.fullyBloomed) {
      for (let i = 0; i < 10; i++) {
        // spawn 10 particles at once
        f.particles.push({
          x: f.x + random(-5, 5),
          y: f.y + random(-5, 5),
          vx: random(-0.15, 0.15), // slower horizontal drift
          vy: random(-0.5, -0.2), // slower upward movement
          alpha: 255,
        });
      }
      f.fullyBloomed = true; // mark as done
    }

    // --- Draw and update particles ---
    for (let p of f.particles) {
      fill(255, 255, 180, p.alpha);
      noStroke();
      ellipse(p.x, p.y, 4, 4);

      // move and fade
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 1.5; // slower fade
    }

    // Remove faded particles
    f.particles = f.particles.filter((p) => p.alpha > 0);
  }

  // --- HUD ---
  fill(0);
  text("Move: A/D or ←/→  •  Jump: Space/W/↑  •  Land on platforms", 10, 18);
}

// Axis-Aligned Bounding Box (AABB) overlap test
// Returns true if rectangles a and b intersect
function overlap(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// --- Calm Beach Background ---
function drawBackground() {
  // Fully opaque background to remove trails
  background(200, 230, 255); // light blue sky base

  // Sky gradient (top 35%) — optional, but make sure it's opaque
  for (let y = 0; y < height * 0.35; y++) {
    stroke(
      lerpColor(
        color(200, 230, 255),
        color(255, 245, 230),
        y / (height * 0.35),
      ),
    );
    line(0, y, width, y);
  }

  noStroke();
  // Water (middle 50%) — make alpha fully opaque or minimal
  fill(180, 220, 255, 255);
  rect(0, height * 0.35, width, height * 0.5);

  // Sand (bottom 15%)
  fill(245, 230, 180, 255);
  rect(0, height * 0.85, width, height * 0.15);

  // Clouds can stay semi-transparent if you want them to be soft
  for (let c of clouds) {
    drawingContext.shadowBlur = 6;
    drawingContext.shadowColor = "rgba(255,255,255,0.08)";
    fill(255, 255, 255, 250);
    ellipse(c.x, c.y, c.size * 0.6, c.size * 0.4);
    ellipse(c.x + c.size * 0.3, c.y + 5, c.size * 0.5, c.size * 0.3);
    ellipse(c.x - c.size * 0.3, c.y + 2, c.size * 0.4, c.size * 0.3);

    c.x += c.speed;
    if (c.x - c.size > width) c.x = -c.size;
  }
  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = "transparent";
}

// Draws the blob using Perlin noise for a soft, breathing effect
function drawBlobCircle(b) {
  fill(200, 180, 240); // pastel purple
  beginShape();

  // Slow, slightly more noticeable breathing
  let breathe = sin(b.t * PI) * 1.1; // size change amplitude

  for (let i = 0; i < b.points; i++) {
    const a = (i / b.points) * TAU;

    // Soft edge wobble
    const n = noise(
      cos(a) * b.wobbleFreq + 100,
      sin(a) * b.wobbleFreq + 100,
      b.t,
    );
    const edgeWobble = map(n, 0, 1, -b.wobble, b.wobble);

    const r = b.r + breathe + edgeWobble;
    vertex(b.x + cos(a) * r, b.y + sin(a) * r);
  }

  endShape(CLOSE);
}

// Jump input (only allowed when grounded)
function keyPressed() {
  // Keys that are allowed to start music
  const movementKey =
    key === "A" ||
    key === "a" ||
    key === "D" ||
    key === "d" ||
    key === "W" ||
    key === "w" ||
    key === " " ||
    keyCode === LEFT_ARROW ||
    keyCode === RIGHT_ARROW ||
    keyCode === UP_ARROW;

  // Start music on first valid movement input
  if (movementKey && !musicStarted) {
    userStartAudio(); // unlock browser audio
    bgMusic.setVolume(0); // start silent
    bgMusic.loop();
    bgMusic.amp(0.1, 4); // fade in over 4 seconds
    musicStarted = true;
  }

  // --- Jump input (unchanged behaviour) ---
  if (
    (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) &&
    blob3.onGround
  ) {
    blob3.vy = blob3.jumpV;
    blob3.onGround = false;
  }
}

/* In-class tweaks for experimentation:
   • Add a new platform:
     platforms.push({ x: 220, y: floorY3 - 150, w: 80, h: 12 });

   • “Ice” feel → frictionGround = 0.95
   • “Sand” feel → frictionGround = 0.80
*/
