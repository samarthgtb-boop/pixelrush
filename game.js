import * as THREE from "three";


/* =========================================================
   PIXEL RUSH — CITY RACER
========================================================= */


const $ = id => document.getElementById(id);

const canvas = $("game-canvas");
const shell = $("game-shell");


/* =========================================================
   GLOBAL GAME STATE
========================================================= */

let scene;
let camera;
let renderer;
let clock;

let player;
let playerVisual;

let playerHeading = 0;

let velocity = 0;

let cameraYaw = Math.PI;
let cameraPitch = 0.22;
let cameraDistance = 10;

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

let paused = true;
let started = false;

let touchEnabled = false;
let trafficEnabled = true;
let highShadows = true;


/* =========================================================
   INPUT
========================================================= */

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  brake: false
};


/* =========================================================
   WORLD
========================================================= */

let traffic = [];
let colliders = [];
let roads = [];
let buildings = [];

const CITY_SIZE = 240;

const mapWorld = {
  min: -120,
  max: 120
};


/* =========================================================
   LOADING
========================================================= */

function loading(percent, status) {

  $("loader-percent").textContent =
    Math.round(percent) + "%";

  $("loader-bar").style.width =
    percent + "%";

  $("loader-status").textContent =
    status;
}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

  loading(8, "Starting renderer");


  scene = new THREE.Scene();

  scene.background =
    new THREE.Color(0x9fc4df);

  scene.fog =
    new THREE.Fog(
      0x9fc4df,
      120,
      330
    );


  camera =
    new THREE.PerspectiveCamera(
      62,
      2,
      0.1,
      500
    );

  camera.position.set(
    0,
    7,
    10
  );


  renderer =
    new THREE.WebGLRenderer({

      canvas,

      antialias: false,

      powerPreference:
        "high-performance"

    });


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      1.5
    )
  );


  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure =
    1.05;


  clock =
    new THREE.Clock();


  /* LIGHTING */

  const hemisphere =
    new THREE.HemisphereLight(
      0xdceeff,
      0x596354,
      2.2
    );

  scene.add(hemisphere);


  const sun =
    new THREE.DirectionalLight(
      0xfff1d0,
      3.2
    );

  sun.position.set(
    80,
    130,
    40
  );

  sun.castShadow = true;

  sun.shadow.mapSize.set(
    1024,
    1024
  );

  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;

  scene.add(sun);


  loading(20, "Building roads");


  createWorld();


  loading(48, "Building city");


  createPlayer();


  loading(62, "Adding traffic");


  createTraffic();


  loading(80, "Preparing map");


  drawMap();


  resize();


  window.addEventListener(
    "resize",
    resize
  );


  bindInput();


  loading(100, "Ready");


  setTimeout(() => {

    $("loader")
      .classList
      .add("done");

  }, 450);


  requestAnimationFrame(loop);
}


/* =========================================================
   MATERIAL HELPER
========================================================= */

function mat(
  color,
  roughness = 0.8,
  metalness = 0
) {

  return new THREE.MeshStandardMaterial({

    color,

    roughness,

    metalness

  });

}


/* =========================================================
   COLLISION BOX
========================================================= */

function box(
  name,
  x,
  y,
  z,
  width,
  height,
  depth,
  color,
  collide = true
) {

  const mesh =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),

      mat(color)

    );


  mesh.name = name;

  mesh.position.set(
    x,
    y,
    z
  );


  mesh.castShadow = true;
  mesh.receiveShadow = true;


  scene.add(mesh);


  if (collide) {

    colliders.push({

      x,
      z,

      w: width * 0.52,

      d: depth * 0.52

    });

  }


  return mesh;
}


/* =========================================================
   CITY
========================================================= */

function createWorld() {

  /* GROUND */

  const ground =
    box(
      "ground",
      0,
      -0.35,
      0,
      CITY_SIZE,
      0.5,
      CITY_SIZE,
      0x6f9360,
      false
    );


  ground.receiveShadow = true;


  /* ROADS */

  const roadMaterial =
    mat(0x34383c);

  const ROAD_WIDTH = 13;


  [-75, 0, 75].forEach(x => {

    const road =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          ROAD_WIDTH,
          0.08,
          CITY_SIZE
        ),

        roadMaterial

      );


    road.position.set(
      x,
      0,
      0
    );


    road.receiveShadow = true;

    scene.add(road);


    roads.push({

      axis: "z",

      pos: x,

      width: ROAD_WIDTH

    });


    addRoadLines(
      x,
      "z"
    );

  });


  [-75, 0, 75].forEach(z => {

    const road =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          CITY_SIZE,
          0.08,
          ROAD_WIDTH
        ),

        roadMaterial

      );


    road.position.set(
      0,
      0,
      z
    );


    road.receiveShadow = true;

    scene.add(road);


    roads.push({

      axis: "x",

      pos: z,

      width: ROAD_WIDTH

    });


    addRoadLines(
      z,
      "x"
    );

  });


  /* CURBS */

  [-75, 0, 75].forEach(x => {

    [-1, 1].forEach(side => {

      box(

        "curb",

        x +
        side *
        (ROAD_WIDTH / 2 + 0.7),

        0.12,

        0,

        1.2,
        0.24,
        CITY_SIZE,

        0xa7a79f,

        false

      );

    });

  });


  [-75, 0, 75].forEach(z => {

    [-1, 1].forEach(side => {

      box(

        "curb",

        0,

        0.12,

        z +
        side *
        (ROAD_WIDTH / 2 + 0.7),

        CITY_SIZE,
        0.24,
        1.2,

        0xa7a79f,

        false

      );

    });

  });


  /* BUILDING BLOCKS */

  const blocks = [

    [-112, -88],

    [-62, -13],

    [13, 62],

    [88, 112]

  ];


  for (const [a, b] of blocks) {

    for (const [c, d] of blocks) {

      const centerX =
        (a + b) / 2;

      const centerZ =
        (c + d) / 2;

      const width =
        b - a - 5;

      const depth =
        d - c - 5;


      createBlock(
        centerX,
        centerZ,
        width,
        depth
      );

    }

  }


  /* SPECIAL LOCATIONS */

  createPetrolStation(
    -37,
    37
  );

  createPetrolStation(
    38,
    -38
  );

  createPark(
    -37,
    -37
  );

  createPark(
    37,
    37
  );

  createPlaza(
    105,
    105
  );
}


/* =========================================================
   ROAD MARKINGS
========================================================= */

function addRoadLines(
  position,
  axis
) {

  const lineMaterial =
    mat(0xe6e0b5);


  for (
    let p = -115;
    p <= 115;
    p += 12
  ) {

    const geometry =
      axis === "z"

        ? new THREE.BoxGeometry(
            0.22,
            0.04,
            5
          )

        : new THREE.BoxGeometry(
            5,
            0.04,
            0.22
          );


    const line =
      new THREE.Mesh(
        geometry,
        lineMaterial
      );


    line.position.set(

      axis === "z"
        ? position
        : p,

      0.08,

      axis === "z"
        ? p
        : position

    );


    scene.add(line);

  }

}


/* =========================================================
   BUILDINGS
========================================================= */

function createBlock(
  centerX,
  centerZ,
  width,
  depth
) {

  const types = [

    {
      color: 0xc9b89c,
      height: 8
    },

    {
      color: 0xb6c3cb,
      height: 13
    },

    {
      color: 0xd4d0c4,
      height: 5
    },

    {
      color: 0x9eaaa0,
      height: 18
    },

    {
      color: 0xc2a78f,
      height: 7
    }

  ];


  const type =
    types[
      Math.floor(
        Math.random() *
        types.length
      )
    ];


  const buildingWidth =
    Math.max(
      10,
      width *
      (
        0.35 +
        Math.random() *
        0.45
      )
    );


  const buildingDepth =
    Math.max(
      10,
      depth *
      (
        0.35 +
        Math.random() *
        0.45
      )
    );


  const x =
    centerX +
    (
      Math.random() - 0.5
    ) *
    (
      width -
      buildingWidth
    );


  const z =
    centerZ +
    (
      Math.random() - 0.5
    ) *
    (
      depth -
      buildingDepth
    );


  const building =
    box(

      "building",

      x,

      type.height / 2,

      z,

      buildingWidth,

      type.height,

      buildingDepth,

      type.color,

      true

    );


  buildings.push(building);


  /* SMALL SHOP */

  if (Math.random() > 0.25) {

    const shopWidth =
      7 + Math.random() * 7;

    const shopDepth =
      7 + Math.random() * 7;

    const shopHeight =
      3 + Math.random() * 5;


    box(

      "shop",

      centerX +
      (
        Math.random() - 0.5
      ) *
      width *
      0.6,

      shopHeight / 2,

      centerZ +
      (
        Math.random() - 0.5
      ) *
      depth *
      0.6,

      shopWidth,

      shopHeight,

      shopDepth,

      0xd0b58c,

      true

    );

  }


  /* TREES */

  for (let i = 0; i < 4; i++) {

    createTree(

      centerX +
      (
        Math.random() - 0.5
      ) *
      width *
      0.75,

      centerZ +
      (
        Math.random() - 0.5
      ) *
      depth *
      0.75

    );

  }

}


/* =========================================================
   TREES
========================================================= */

function createTree(
  x,
  z
) {

  const group =
    new THREE.Group();


  const trunk =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        0.25,
        0.35,
        2.4,
        7
      ),

      mat(0x735034)

    );


  trunk.position.y = 1.2;


  const crown =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        1.45,
        8,
        6
      ),

      mat(0x397344)

    );


  crown.position.y = 3;


  group.add(
    trunk,
    crown
  );


  group.position.set(
    x,
    0,
    z
  );


  trunk.castShadow =
    true;

  crown.castShadow =
    true;


  scene.add(group);


  colliders.push({

    x,
    z,

    w: 1.1,
    d: 1.1

  });

}


/* =========================================================
   PETROL STATION
========================================================= */

function createPetrolStation(
  x,
  z
) {

  box(
    "station",
    x,
    2,
    z,
    19,
    4,
    14,
    0xf1eee5,
    true
  );


  box(
    "canopy",
    x,
    4.5,
    z,
    17,
    0.5,
    9,
    0xd83d32,
    false
  );


  [-5, 5].forEach(
    pumpX => {

      box(
        "pump",
        x + pumpX,
        1.3,
        z,
        1.2,
        2.6,
        2,
        0x58616a,
        true
      );

    }
  );


  box(
    "station-sign",
    x,
    7,
    z,
    1,
    5,
    1,
    0xeee2b8,
    true
  );


  box(
    "forecourt",
    x,
    0.04,
    z,
    24,
    0.05,
    18,
    0x55585b,
    false
  );

}


/* =========================================================
   PARK
========================================================= */

function createPark(
  x,
  z
) {

  box(
    "park",
    x,
    0.02,
    z,
    32,
    0.05,
    32,
    0x52835b,
    false
  );


  for (let i = 0; i < 9; i++) {

    createTree(

      x +
      (
        Math.random() - 0.5
      ) * 25,

      z +
      (
        Math.random() - 0.5
      ) * 25

    );

  }

}


/* =========================================================
   PLAZA
========================================================= */

function createPlaza(
  x,
  z
) {

  box(
    "plaza",
    x,
    0.03,
    z,
    25,
    0.06,
    25,
    0x8b8c87,
    false
  );


  for (let i = 0; i < 4; i++) {

    createTree(

      x +
      (i % 2 ? 7 : -7),

      z +
      (i < 2 ? 7 : -7)

    );

  }

}


/* =========================================================
   PLAYER CAR
========================================================= */

function createPlayer() {

  player =
    new THREE.Group();


  player.position.set(
    0,
    0.35,
    18
  );


  playerVisual =
    new THREE.Group();


  player.add(
    playerVisual
  );


  /* MATERIALS */

  const body =
    mat(
      0xc82f32,
      0.35,
      0.25
    );


  const dark =
    mat(
      0x171b20,
      0.3,
      0.45
    );


  const glass =
    mat(
      0x315064,
      0.12,
      0.2
    );


  const headlights =
    mat(
      0xf6e9c9,
      0.2,
      0.1
    );


  const tail =
    mat(
      0xb81720,
      0.3,
      0.1
    );


  /* BODY */

  const lower =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.4,
        0.65,
        6
      ),

      body

    );


  lower.position.y =
    0.55;

  lower.castShadow =
    true;

  playerVisual.add(
    lower
  );


  /* HOOD */

  const hood =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.1,
        0.32,
        1.65
      ),

      body

    );


  hood.position.set(
    0,
    0.92,
    -2.05
  );


  playerVisual.add(
    hood
  );


  /* CABIN */

  const cabin =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.75,
        1.05,
        2.7
      ),

      dark

    );


  cabin.position.set(
    0,
    1.18,
    0.25
  );


  cabin.castShadow =
    true;

  playerVisual.add(
    cabin
  );


  /* WINDSHIELD */

  const windshield =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.5,
        0.62,
        0.08
      ),

      glass

    );


  windshield.position.set(
    0,
    1.37,
    -1.12
  );


  windshield.rotation.x =
    -0.16;


  playerVisual.add(
    windshield
  );


  /* REAR GLASS */

  const rear =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.5,
        0.62,
        0.08
      ),

      glass

    );


  rear.position.set(
    0,
    1.37,
    1.58
  );


  rear.rotation.x =
    0.16;


  playerVisual.add(
    rear
  );


  /* ROOF */

  const roof =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.65,
        0.12,
        2.55
      ),

      body

    );


  roof.position.set(
    0,
    1.75,
    0.25
  );


  playerVisual.add(
    roof
  );


  /* SPOILER */

  const spoiler =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.15,
        0.12,
        0.65
      ),

      dark

    );


  spoiler.position.set(
    0,
    1.28,
    2.95
  );


  playerVisual.add(
    spoiler
  );


  /* SPOILER SUPPORTS */

  [-1, 1].forEach(
    side => {

      const support =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.13,
            0.65,
            0.13
          ),

          dark

        );


      support.position.set(
        side * 1.35,
        1.6,
        2.95
      );


      playerVisual.add(
        support
      );

    }
  );


  /* WHEELS */

  [-1, 1].forEach(
    x => {

      [-1, 1].forEach(
        z => {

          const wheel =
            new THREE.Mesh(

              new THREE.CylinderGeometry(
                0.48,
                0.48,
                0.32,
                16
              ),

              dark

            );


          wheel.rotation.z =
            Math.PI / 2;


          wheel.position.set(
            x * 1.72,
            0.45,
            z * 2
          );


          wheel.castShadow =
            true;


          playerVisual.add(
            wheel
          );

        }
      );

    }
  );


  /* LIGHTS */

  [-1, 1].forEach(
    x => {

      const headlight =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.5,
            0.22,
            0.08
          ),

          headlights

        );


      headlight.position.set(
        x * 1.05,
        0.88,
        -3.01
      );


      playerVisual.add(
        headlight
      );


      const taillight =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.55,
            0.2,
            0.08
          ),

          tail

        );


      taillight.position.set(
        x * 1.05,
        0.84,
        3.01
      );


      playerVisual.add(
        taillight
      );

    }
  );


  scene.add(
    player
  );

}


/* =========================================================
   TRAFFIC
========================================================= */

function createTraffic() {

  const colors = [

    0x2d6cdf,
    0xf0b429,
    0x2f9e68,
    0x9b59b6,
    0xe67e22,
    0xe8e8e8,
    0x22252a

  ];


  for (let i = 0; i < 22; i++) {

    const axis =
      i % 2
        ? "x"
        : "z";


    const road =
      [-75, 0, 75][
        Math.floor(
          Math.random() * 3
        )
      ];


    const position =
      -108 +
      Math.random() *
      216;


    const car =
      new THREE.Mesh(

        new THREE.BoxGeometry(

          axis === "x"
            ? 4
            : 2.4,

          0.8,

          axis === "x"
            ? 2.4
            : 4

        ),

        mat(
          colors[
            i % colors.length
          ],
          0.55,
          0.15
        )

      );


    car.position.set(

      axis === "x"
        ? position
        : road,

      0.65,

      axis === "x"
        ? road
        : position

    );


    car.castShadow =
      true;


    scene.add(
      car
    );


    traffic.push({

      mesh: car,

      axis,

      dir:
        Math.random() > 0.5
          ? 1
          : -1,

      speed:
        0.20 +
        Math.random() *
        0.18,

      road

    });

  }

}


/* =========================================================
   TRAFFIC UPDATE
========================================================= */

function updateTraffic(dt) {

  if (!trafficEnabled) {

    traffic.forEach(
      car => {
        car.mesh.visible = false;
      }
    );

    return;

  }


  traffic.forEach(car => {

    car.mesh.visible = true;


    const step =
      car.speed *
      dt *
      60 *
      car.dir;


    if (car.axis === "x") {

      car.mesh.position.x += step;

    } else {

      car.mesh.position.z += step;

    }


    if (
      car.axis === "x" &&
      Math.abs(
        car.mesh.position.x
      ) > 118
    ) {

      car.mesh.position.x =
        -Math.sign(
          car.mesh.position.x
        ) * 118;

    }


    if (
      car.axis === "z" &&
      Math.abs(
        car.mesh.position.z
      ) > 118
    ) {

      car.mesh.position.z =
        -Math.sign(
          car.mesh.position.z
        ) * 118;

    }


    const dx =
      player.position.x -
      car.mesh.position.x;


    const dz =
      player.position.z -
      car.mesh.position.z;


    const distance =
      Math.hypot(
        dx,
        dz
      );


    if (distance < 5.2) {

      car.speed =
        Math.max(
          0.08,
          car.speed - 0.02
        );

    } else {

      car.speed =
        Math.min(
          0.28,
          car.speed + 0.004
        );

    }

  });

}


/* =========================================================
   COLLISION DETECTION
========================================================= */

function collisionAt(
  x,
  z
) {

  /* BUILDINGS / OBJECTS */

  for (const collider of colliders) {

    if (

      Math.abs(
        x - collider.x
      ) < collider.w + 1.45 &&

      Math.abs(
        z - collider.z
      ) < collider.d + 2

    ) {

      return true;

    }

  }


  /* TRAFFIC */

  if (trafficEnabled) {

    for (const car of traffic) {

      if (

        Math.hypot(

          x -
          car.mesh.position.x,

          z -
          car.mesh.position.z

        ) < 3.2

      ) {

        return true;

      }

    }

  }


  return false;

}


/* =========================================================
   DRIVING PHYSICS
========================================================= */

function updatePhysics(dt) {

  const throttle =
    keys.up ? 1 : 0;

  const reverse =
    keys.down ? 1 : 0;


  /* BRAKING */

  if (keys.brake) {

    velocity *=
      Math.pow(
        0.72,
        dt * 60
      );

  }


  /* ACCELERATION */

  else if (throttle) {

    velocity +=
      (
        1.25 -
        velocity * 0.13
      ) * dt;

  }


  /* REVERSE */

  else if (reverse) {

    velocity -=
      (
        0.9 +
        Math.abs(velocity) * 0.08
      ) * dt;

  }


  /* NATURAL DRAG */

  else {

    velocity *=
      Math.pow(
        0.985,
        dt * 60
      );

  }


  velocity =
    THREE.MathUtils.clamp(
      velocity,
      -0.7,
      2.55
    );


  /* STEERING */

  const steering =

    (keys.right ? 1 : 0) -
    (keys.left ? 1 : 0);


  const steeringFactor =
    Math.min(
      1,
      Math.abs(velocity) / 0.25
    );


  playerHeading -=

    steering *
    0.042 *
    steeringFactor *
    dt *
    60 *
    (
      velocity >= 0
        ? 1
        : -1
    );


  /* MOVEMENT */

  const dx =
    Math.sin(
      playerHeading
    ) *
    velocity *
    dt *
    60;


  const dz =
    Math.cos(
      playerHeading
    ) *
    velocity *
    dt *
    60;


  const nextX =
    player.position.x +
    dx;


  const nextZ =
    player.position.z +
    dz;


  /* COLLISION */

  if (
    !collisionAt(
      nextX,
      nextZ
    )
  ) {

    player.position.x =
      THREE.MathUtils.clamp(
        nextX,
        -117,
        117
      );


    player.position.z =
      THREE.MathUtils.clamp(
        nextZ,
        -117,
        117
      );

  } else {

    /* CRASH RESPONSE */

    velocity *= -0.12;

  }


  player.rotation.y =
    playerHeading;


  /* BODY LEAN */

  playerVisual.rotation.z =
    THREE.MathUtils.lerp(

      playerVisual.rotation.z,

      -steering *
      0.045 *
      steeringFactor,

      0.16

    );

}


/* =========================================================
   FREE CAMERA
========================================================= */

function updateCamera() {

  const target =
    new THREE.Vector3(

      player.position.x,

      1.2,

      player.position.z

    );


  const cameraPitchCos =
    Math.cos(
      cameraPitch
    );


  const cameraPitchSin =
    Math.sin(
      cameraPitch
    );


  const offset =
    new THREE.Vector3(

      Math.sin(
        cameraYaw
      ) *
      cameraPitchCos *
      cameraDistance,

      6 *
      cameraPitchSin +
      2.2,

      Math.cos(
        cameraYaw
      ) *
      cameraPitchCos *
      cameraDistance

    );


  camera.position.lerp(

    target
      .clone()
      .add(offset),

    0.12

  );


  camera.lookAt(
    target
  );

}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

  const kmh =
    Math.round(
      Math.abs(velocity) *
      46
    );


  $("speed")
    .textContent =
    kmh;


  $("speed-fill")
    .style.width =
    Math.min(
      100,
      kmh / 120 * 100
    ) + "%";


  /* COMPASS */

  let degrees =

    (
      playerHeading *
      180 /
      Math.PI +
      180
    ) % 360;


  const directions = [

    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW"

  ];


  $("compass")
    .textContent =

    directions[
      Math.round(
        degrees / 45
      ) % 8
    ];

}


/* =========================================================
   MAP
========================================================= */

function worldToMap(
  x,
  z,
  width,
  height
) {

  return {

    x:
      (
        x -
        mapWorld.min
      ) /
      (
        mapWorld.max -
        mapWorld.min
      ) *
      width,

    y:
      (
        z -
        mapWorld.min
      ) /
      (
        mapWorld.max -
        mapWorld.min
      ) *
      height

  };

}


function drawMap() {

  const maps = [

    $("mini-map"),

    $("full-map")

  ];


  maps.forEach(canvas => {

    const ctx =
      canvas.getContext(
        "2d"
      );


    const width =
      canvas.clientWidth;


    const height =
      canvas.clientHeight;


    if (!width || !height) {
      return;
    }


    canvas.width =
      width *
      devicePixelRatio;


    canvas.height =
      height *
      devicePixelRatio;


    ctx.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );


    /* BACKGROUND */

    ctx.fillStyle =
      "#15191e";

    ctx.fillRect(
      0,
      0,
      width,
      height
    );


    /* ROADS */

    ctx.strokeStyle =
      "#555d65";

    ctx.lineWidth = 5;


    [-75, 0, 75].forEach(
      position => {

        const vertical =
          worldToMap(
            position,
            -120,
            width,
            height
          );


        const verticalEnd =
          worldToMap(
            position,
            120,
            width,
            height
          );


        ctx.beginPath();

        ctx.moveTo(
          vertical.x,
          0
        );

        ctx.lineTo(
          verticalEnd.x,
          height
        );

        ctx.stroke();


        const horizontal =
          worldToMap(
            -120,
            position,
            width,
            height
          );


        const horizontalEnd =
          worldToMap(
            120,
            position,
            width,
            height
          );


        ctx.beginPath();

        ctx.moveTo(
          0,
          horizontal.y
        );

        ctx.lineTo(
          width,
          horizontalEnd.y
        );

        ctx.stroke();

      }
    );


    /* BUILDINGS */

    ctx.fillStyle =
      "#73877b";


    buildings.forEach(
      building => {

        const position =
          worldToMap(

            building.position.x,

            building.position.z,

            width,

            height

          );


        ctx.fillRect(

          position.x - 3,

          position.y - 3,

          6,

          6

        );

      }
    );


    /* PLAYER */

    ctx.fillStyle =
      "#d83d32";


    const playerPosition =
      worldToMap(

        player?.position.x || 0,

        player?.position.z || 0,

        width,

        height

      );


    ctx.beginPath();


    ctx.arc(

      playerPosition.x,

      playerPosition.y,

      6,

      0,

      Math.PI * 2

    );


    ctx.fill();

  });

}


/* =========================================================
   RESIZE
========================================================= */

function resize() {

  const width =
    shell.clientWidth;


  const height =
    shell.clientHeight;


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width / height;


  camera.updateProjectionMatrix();


  drawMap();

}


/* =========================================================
   INPUT
========================================================= */

function bindInput() {

  /* KEYBOARD DOWN */

  const keyDown =
    event => {

      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          " "
        ].includes(
          event.key
        )
      ) {

        event.preventDefault();

      }


      if (
        event.key === "w" ||
        event.key === "ArrowUp"
      ) {

        keys.up = true;

      }


      if (
        event.key === "s" ||
        event.key === "ArrowDown"
      ) {

        keys.down = true;

      }


      if (
        event.key === "a" ||
        event.key === "ArrowLeft"
      ) {

        keys.left = true;

      }


      if (
        event.key === "d" ||
        event.key === "ArrowRight"
      ) {

        keys.right = true;

      }


      if (event.key === " ") {

        keys.brake = true;

      }


      if (
        event.key.toLowerCase() === "r"
      ) {

        resetCar();

      }


      if (
        event.key === "Escape" &&
        started
      ) {

        togglePause();

      }

    };


  /* KEYBOARD UP */

  const keyUp =
    event => {

      if (
        event.key === "w" ||
        event.key === "ArrowUp"
      ) {

        keys.up = false;

      }


      if (
        event.key === "s" ||
        event.key === "ArrowDown"
      ) {

        keys.down = false;

      }


      if (
        event.key === "a" ||
        event.key === "ArrowLeft"
      ) {

        keys.left = false;

      }


      if (
        event.key === "d" ||
        event.key === "ArrowRight"
      ) {

        keys.right = false;

      }


      if (event.key === " ") {

        keys.brake = false;

      }

    };


  window.addEventListener(
    "keydown",
    keyDown
  );


  window.addEventListener(
    "keyup",
    keyUp
  );


  /* =====================================================
     FREE CAMERA MOUSE
  ===================================================== */

  canvas.addEventListener(
    "mousedown",
    event => {

      mouseDown = true;

      lastMouseX =
        event.clientX;

      lastMouseY =
        event.clientY;

    }
  );


  window.addEventListener(
    "mouseup",
    () => {

      mouseDown = false;

    }
  );


  window.addEventListener(
    "mousemove",
    event => {

      if (
        !mouseDown ||
        !started ||
        paused
      ) {

        return;

      }


      cameraYaw -=
        (
          event.clientX -
          lastMouseX
        ) *
        0.008;


      cameraPitch =
        THREE.MathUtils.clamp(

          cameraPitch +

          (
            event.clientY -
            lastMouseY
          ) *
          0.004,

          -0.05,

          0.8

        );


      lastMouseX =
        event.clientX;


      lastMouseY =
        event.clientY;

    }
  );


  /* CAMERA ZOOM */

  canvas.addEventListener(
    "wheel",
    event => {

      cameraDistance =
        THREE.MathUtils.clamp(

          cameraDistance +
          event.deltaY *
          0.012,

          5,

          18

        );

    },
    {
      passive: true
    }
  );


  /* =====================================================
     BUTTONS
  ===================================================== */

  $("play-btn")
    .onclick =
    startGame;


  $("nav-play")
    .onclick = () => {

      document
        .querySelector("#racer")
        .scrollIntoView();


      startGame();

    };


  $("settings-btn")
    .onclick = () => {

      $("settings-panel")
        .classList
        .remove("hidden");

    };


  $("settings-close")
    .onclick = () => {

      $("settings-panel")
        .classList
        .add("hidden");

    };


  $("pause-btn")
    .onclick =
    togglePause;


  $("resume-btn")
    .onclick =
    togglePause;


  $("restart-btn")
    .onclick = () => {

      resetCar();

      paused = false;

      $("pause-overlay")
        .classList
        .add("hidden");

    };


  /* FULLSCREEN */

  $("fullscreen-btn")
    .onclick = () => {

      if (
        !document.fullscreenElement
      ) {

        shell.requestFullscreen?.();

      } else {

        document.exitFullscreen?.();

      }

    };


  /* MINI MAP */

  $("map-button")
    .onclick = () => {

      $("map-overlay")
        .classList
        .remove("hidden");

      drawMap();

    };


  $("map-close")
    .onclick = () => {

      $("map-overlay")
        .classList
        .add("hidden");

    };


  /* SETTINGS */

  $("touch-toggle")
    .onchange =
    event => {

      touchEnabled =
        event.target.checked;


      $("touch-controls")
        .classList
        .toggle(
          "hidden",
          !touchEnabled
        );

    };


  $("traffic-toggle")
    .onchange =
    event => {

      trafficEnabled =
        event.target.checked;

    };


  $("shadow-toggle")
    .onchange =
    event => {

      highShadows =
        event.target.checked;


      renderer.shadowMap.enabled =
        highShadows;

    };


  /* =====================================================
     TOUCH BUTTONS
  ===================================================== */

  document
    .querySelectorAll(
      "[data-control]"
    )
    .forEach(button => {

      const control =
        button.dataset.control;


      const setControl =
        value => {

          if (
            control === "left"
          ) {

            keys.left = value;

          }


          if (
            control === "right"
          ) {

            keys.right = value;

          }


          if (
            control === "accelerate"
          ) {

            keys.up = value;

          }


          if (
            control === "reverse"
          ) {

            keys.down = value;

          }


          if (
            control === "brake"
          ) {

            keys.brake = value;

          }

        };


      button.addEventListener(
        "pointerdown",
        event => {

          event.preventDefault();

          setControl(true);

        }
      );


      button.addEventListener(
        "pointerup",
        event => {

          event.preventDefault();

          setControl(false);

        }
      );


      button.addEventListener(
        "pointercancel",
        () => {

          setControl(false);

        }
      );


      button.addEventListener(
        "pointerleave",
        () => {

          setControl(false);

        }
      );

    });

}


/* =========================================================
   GAME CONTROL
========================================================= */

function startGame() {

  started = true;

  paused = false;


  $("start-overlay")
    .classList
    .add("hidden");


  $("pause-overlay")
    .classList
    .add("hidden");


  $("hud")
    .classList
    .remove("hidden");


  canvas.focus?.();

}


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

  if (!started) {
    return;
  }


  paused = !paused;


  $("pause-overlay")
    .classList
    .toggle(
      "hidden",
      !paused
    );

}


/* =========================================================
   RESET
========================================================= */

function resetCar() {

  player.position.set(
    0,
    0.35,
    18
  );


  playerHeading = 0;

  velocity = 0;

}


/* =========================================================
   MAIN GAME LOOP
========================================================= */

function loop() {

  const dt =
    Math.min(
      clock.getDelta(),
      0.035
    );


  if (
    started &&
    !paused
  ) {

    updatePhysics(dt);

    updateTraffic(dt);

    updateCamera();

    updateHUD();

    drawMap();

  }


  renderer.render(
    scene,
    camera
  );


  requestAnimationFrame(
    loop
  );

}


/* =========================================================
   START
========================================================= */

init();
