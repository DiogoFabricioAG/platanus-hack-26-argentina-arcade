const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PENALTIES_PER_SIDE = 5;
const DECISION_TIME_MS = 6200;
const AIM_X_MIN = -3;
const AIM_X_MAX = 3;
const AIM_Y_MIN = 0;
const AIM_Y_MAX = 4;
const AIM_Y_CENTER = Math.floor((AIM_Y_MIN + AIM_Y_MAX) / 2);

const COLORS = {
  bg: 0x08130d,
  bgDark: 0x030705,
  panel: 0x102117,
  panel2: 0x173021,
  frame: 0x3f7f4f,
  accent: 0xe8ff6a,
  accentSoft: 0xb2c957,
  text: 0xf3ffe9,
  subtext: 0x8fb18e,
  danger: 0xff7f7f,
  goal: 0x5dff89,
  save: 0x7ec4ff,
  miss: 0xffb06a,
  turf: 0x1f5f35,
  turf2: 0x2f7f45,
  line: 0xdfffd4,
  shadow: 0x0a120e,
};

const TEAMS = [
  {
    code: "ARG",
    name: "Argentina",
    primary: 0x78cdfc,
    secondary: 0xffffff,
    attack: 0.09,
    keep: 0.02,
    clutch: 0.07,
    trait: "Precision alta",
  },
  {
    code: "BRA",
    name: "Brasil",
    primary: 0xfde047,
    secondary: 0x0a6e3a,
    attack: 0.08,
    keep: 0.01,
    clutch: 0.04,
    trait: "Tiro impredecible",
  },
  {
    code: "URU",
    name: "Uruguay",
    primary: 0x93c5fd,
    secondary: 0x0f172a,
    attack: 0.05,
    keep: 0.03,
    clutch: 0.05,
    trait: "Potencia de disparo",
  },
  {
    code: "COL",
    name: "Colombia",
    primary: 0xfacc15,
    secondary: 0x1d4ed8,
    attack: 0.04,
    keep: 0.04,
    clutch: 0.03,
    trait: "Balance total",
  },
  {
    code: "MEX",
    name: "Mexico",
    primary: 0x22c55e,
    secondary: 0xffffff,
    attack: 0.05,
    keep: 0.02,
    clutch: 0.09,
    trait: "Crece bajo presion",
  },
  {
    code: "USA",
    name: "Estados Unidos",
    primary: 0x60a5fa,
    secondary: 0xef4444,
    attack: 0.03,
    keep: 0.08,
    clutch: 0.03,
    trait: "Arquero estable",
  },
  {
    code: "FRA",
    name: "Francia",
    primary: 0x2563eb,
    secondary: 0xf8fafc,
    attack: 0.07,
    keep: 0.03,
    clutch: 0.04,
    trait: "Lectura dificil",
  },
  {
    code: "ESP",
    name: "Espana",
    primary: 0xdc2626,
    secondary: 0xfacc15,
    attack: 0.06,
    keep: 0.04,
    clutch: 0.04,
    trait: "Colocacion tecnica",
  },
];

const SHOOTER_POWERS = ["COMETA", "ARCO XL"];
const KEEPER_POWERS = ["AUTOBUS", "AURA", "ORACULO"];

const BACK_CODES = ["P1_6", "P2_6"];

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ["w"],
  P1_D: ["s"],
  P1_L: ["a"],
  P1_R: ["d"],
  P1_1: ["u"],
  P1_2: ["i"],
  P1_3: ["o"],
  P1_4: ["j"],
  P1_5: ["k"],
  P1_6: ["l"],
  P2_U: ["ArrowUp"],
  P2_D: ["ArrowDown"],
  P2_L: ["ArrowLeft"],
  P2_R: ["ArrowRight"],
  P2_1: ["r"],
  P2_2: ["t"],
  P2_3: ["y"],
  P2_4: ["f"],
  P2_5: ["g"],
  P2_6: ["h"],
  START1: ["Enter"],
  START2: ["2"],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-root",
  backgroundColor: "#08130d",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: {
    preload,
    create,
    update,
  },
};

new Phaser.Game(config);

function preload() {}

function create() {
  const scene = this;

  scene.state = {
    phase: "loading",
    playerCount: 1,
    menu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    finalMenu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    select: {
      playerCount: 1,
      currentPlayer: 1,
      pickedTeams: [],
      cursor: 0,
      cooldown: 0,
      lastAxisX: 0,
      lastAxisY: 0,
      message: "",
    },
    tournament: null,
    match: null,
    finalContext: "menu",
    finalOptions: ["MENU"],
    finalPayload: null,
  };

  createBackground(scene);
  createControls(scene);
  createMenuScreen(scene);
  createTeamSelectScreen(scene);
  createBracketScreen(scene);
  createMatchScreen(scene);
  createFinalScreen(scene);

  hideAllScreens(scene);
  showMenu(scene);
}

function update(time) {
  const scene = this;
  if (!scene.state) {
    return;
  }

  updateDecisionTimer(scene, time);

  if (scene.state.phase === "menu") {
    handleMenuInput(scene, time);
    return;
  }

  if (scene.state.phase === "teamSelect") {
    handleTeamSelectInput(scene, time);
    return;
  }

  if (scene.state.phase === "bracket") {
    handleBracketInput(scene);
    return;
  }

  if (scene.state.phase === "matchInput") {
    handleMatchInput(scene, time);
    return;
  }

  if (scene.state.phase === "matchReveal") {
    handleMatchReveal(scene, time);
    return;
  }

  if (scene.state.phase === "matchResult") {
    handleMatchResult(scene, time);
    return;
  }

  if (scene.state.phase === "final") {
    handleFinalInput(scene, time);
  }
}

function updateDecisionTimer(scene, time) {
  if (!scene.decisionTimer || !scene.state) {
    return;
  }

  const match = scene.state.match;
  const show = scene.state.phase === "matchInput" && Boolean(match?.pending);

  scene.decisionTimer.band.setVisible(show);
  scene.decisionTimer.text.setVisible(show);

  if (!show) {
    return;
  }

  const pending = match.pending;
  const remainingMs = Math.max(0, pending.lockDeadline - time);
  const seconds = (remainingMs / 1000).toFixed(1);
  const isShooterStage = pending.stage === "shooter";
  const activeSide = isShooterStage ? pending.shooterSide : pending.keeperSide;
  const playerTag = getSidePlayerTag(match, activeSide);
  const phaseLabel = isShooterStage ? "DISPARO" : "ATAJADA";

  scene.decisionTimer.text.setText(
    `${phaseLabel} ${playerTag}  TIEMPO: ${seconds}s`,
  );

  let color = "#b8ff8c";
  if (remainingMs < 1800) {
    color = "#ff8e8e";
  } else if (remainingMs < 3200) {
    color = "#ffd37a";
  }
  scene.decisionTimer.text.setColor(color);
}

function createBackground(scene) {
  ensureCrowdTexture(scene);

  scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    COLORS.bg,
  );

  scene.add
    .ellipse(GAME_WIDTH / 2, 158, 732, 268, 0x0e1812, 0.96)
    .setStrokeStyle(2, 0x1f2d24, 0.45);

  scene.add
    .image(GAME_WIDTH / 2, 112, "crowd-blur")
    .setDisplaySize(610, 66)
    .setAlpha(0.24);
  const standMid = scene.add
    .image(GAME_WIDTH / 2, 136, "crowd-blur")
    .setDisplaySize(684, 98)
    .setAlpha(0.32);
  const standTop = scene.add
    .image(GAME_WIDTH / 2, 168, "crowd-blur")
    .setDisplaySize(708, 134)
    .setAlpha(0.45);

  scene.tweens.add({
    targets: standTop,
    alpha: 0.53,
    duration: 1700,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  scene.tweens.add({
    targets: standMid,
    alpha: 0.39,
    duration: 2100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  const lightXs = [144, 284, 516, 656];
  for (let i = 0; i < lightXs.length; i += 1) {
    const x = lightXs[i];
    scene.add.rectangle(x, 92, 4, 44, 0xdde5de, 0.3);
    scene.add.rectangle(x, 68, 58, 8, 0xf8fff1, 0.6);
    const glow = scene.add
      .ellipse(x, 106, 132, 84, 0xf8fff1, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: glow,
      alpha: 0.15,
      duration: 1200 + i * 210,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 560, COLORS.bgDark, 0.78)
    .setStrokeStyle(4, COLORS.frame, 0.82);

  scene.add
    .rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 94,
      684,
      352,
      COLORS.turf,
      0.94,
    )
    .setStrokeStyle(2, COLORS.line, 0.45);
  scene.add
    .ellipse(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 118, 560, 280, 0xdfffcc, 0.06)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.add.rectangle(92, GAME_HEIGHT / 2 + 90, 112, 350, 0x07110b, 0.42);
  scene.add.rectangle(
    GAME_WIDTH - 92,
    GAME_HEIGHT / 2 + 90,
    112,
    350,
    0x07110b,
    0.42,
  );

  scene.add
    .rectangle(GAME_WIDTH / 2, 234, 548, 138, COLORS.turf2, 0.24)
    .setStrokeStyle(2, COLORS.line, 0.38);
  scene.add.rectangle(GAME_WIDTH / 2, 158, 314, 18, COLORS.shadow, 0.34);

  const stripeColor = 0x2a7a47;
  for (let i = 0; i < 8; i += 1) {
    scene.add.rectangle(
      140 + i * 74,
      GAME_HEIGHT / 2 + 94,
      36,
      350,
      stripeColor,
      i % 2 === 0 ? 0.22 : 0.08,
    );
  }

  const timerBand = scene.add
    .rectangle(GAME_WIDTH / 2, 22, 432, 30, 0x0b1710, 0.88)
    .setStrokeStyle(2, 0x3b7c4f, 0.85)
    .setDepth(40)
    .setVisible(false);

  const timerText = scene.add
    .text(GAME_WIDTH / 2, 22, "", {
      fontFamily: "monospace",
      fontSize: "17px",
      color: "#b8ff8c",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(41)
    .setVisible(false);

  scene.decisionTimer = {
    band: timerBand,
    text: timerText,
  };

  updateDecisionTimer(scene, 0);
}

function ensureCrowdTexture(scene) {
  if (scene.textures.exists("crowd-blur")) {
    return;
  }

  const w = 360;
  const h = 120;
  const g = scene.make.graphics({ add: false });

  g.fillStyle(0x101a12, 1);
  g.fillRect(0, 0, w, h);

  for (let i = 0; i < 640; i += 1) {
    const x = (i * 37) % w;
    const y = (i * 61) % h;
    let color = 0x5f6f67;
    if (i % 3 === 0) {
      color = 0xc4d3c9;
    } else if (i % 3 === 1) {
      color = 0x8ea39a;
    }
    const alpha = 0.14 + (i % 5) * 0.04;
    const radius = i % 7 === 0 ? 2 : 1;
    g.fillStyle(color, alpha);
    g.fillCircle(x, y, radius);
  }

  for (let i = 0; i < 14; i += 1) {
    g.fillStyle(0x000000, 0.06);
    g.fillRect(0, 8 + i * 8, w, 3);
  }

  g.generateTexture("crowd-blur", w, h);
  g.destroy();
}

function ensureMatchSpriteTextures(scene) {
  if (!scene.textures.exists("keeper-sprite")) {
    const g = scene.make.graphics({ add: false });
    const w = 52;
    const h = 34;

    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(16, 13, 20, 13, 3);
    g.fillCircle(26, 8, 5);
    g.fillRoundedRect(8, 15, 8, 4, 2);
    g.fillRoundedRect(36, 15, 8, 4, 2);
    g.fillCircle(8, 17, 3);
    g.fillCircle(44, 17, 3);
    g.fillRect(20, 25, 5, 7);
    g.fillRect(27, 25, 5, 7);

    g.fillStyle(0x102117, 0.28);
    g.fillRect(18, 19, 16, 2);
    g.fillCircle(24, 7, 1);
    g.fillCircle(28, 7, 1);

    g.lineStyle(1, 0x0b1b12, 0.7);
    g.strokeRoundedRect(16, 13, 20, 13, 3);
    g.strokeCircle(26, 8, 5);

    g.generateTexture("keeper-sprite", w, h);
    g.destroy();
  }

  if (!scene.textures.exists("ball-sprite")) {
    const g = scene.make.graphics({ add: false });
    const w = 24;
    const h = 24;

    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 9);
    g.lineStyle(1, 0x203227, 0.8);
    g.strokeCircle(12, 12, 9);

    g.fillStyle(0x1a2d20, 0.45);
    g.fillCircle(12, 12, 3);
    g.fillCircle(8, 8, 2);
    g.fillCircle(16, 8, 2);
    g.fillCircle(9, 16, 2);
    g.fillCircle(16, 15, 2);

    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(9, 9, 2);

    g.generateTexture("ball-sprite", w, h);
    g.destroy();
  }
}

function createMenuScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(20);
  const dim = scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    0x020806,
    0.4,
  );
  const card = scene.add
    .rectangle(GAME_WIDTH / 2, 316, 610, 402, 0x102418, 0.88)
    .setStrokeStyle(2, 0x6ea27a, 0.85);
  const cardInner = scene.add
    .rectangle(GAME_WIDTH / 2, 316, 574, 366, 0x0d1d14, 0.72)
    .setStrokeStyle(2, 0x2d5d41, 0.8);
  const heroBand = scene.add
    .rectangle(GAME_WIDTH / 2, 184, 508, 74, 0x193725, 0.86)
    .setStrokeStyle(2, 0x7fa16b, 0.9);
  const heroGlow = scene.add
    .ellipse(GAME_WIDTH / 2, 184, 540, 78, 0xe8ff6a, 0.08)
    .setBlendMode(Phaser.BlendModes.ADD);
  const accentLine = scene.add.rectangle(
    GAME_WIDTH / 2,
    230,
    490,
    2,
    0x79b788,
    0.42,
  );
  const infoPill = scene.add
    .rectangle(GAME_WIDTH / 2, 476, 436, 34, 0x13281c, 0.88)
    .setStrokeStyle(1, 0x2f6348, 0.9);

  const cursorLight = scene.add
    .ellipse(GAME_WIDTH / 2, 266, 430, 68, COLORS.accent, 0.12)
    .setBlendMode(Phaser.BlendModes.ADD);

  const titleMain = scene.add
    .text(GAME_WIDTH / 2, 168, "ROAD TO THE TROPHY", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#f3ffe9",
      fontStyle: "bold",
      align: "center",
    })
    .setOrigin(0.5);

  const titleSub = scene.add
    .text(GAME_WIDTH / 2, 198, "Secret penalties, loud stadium, one champion", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#a8c89f",
      align: "center",
    })
    .setOrigin(0.5);

  scene.menuScreen = {
    container: c,
    buttons: [],
    cursorLight,
    heroGlow,
    titleMain,
    subtitle: scene.add
      .text(GAME_WIDTH / 2, 236, "Selecciona opcion", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#b2c957",
      })
      .setOrigin(0.5),
    info: scene.add
      .text(GAME_WIDTH / 2, 476, "5 tiros por lado  +  muerte subita", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#9ac08f",
      })
      .setOrigin(0.5),
    footer: scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "MOVE  CONFIRM  B1/B2/START", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#8fb18e",
      })
      .setOrigin(0.5),
  };

  c.add(dim);
  c.add(card);
  c.add(cardInner);
  c.add(heroGlow);
  c.add(heroBand);
  c.add(titleMain);
  c.add(titleSub);
  c.add(accentLine);
  c.add(scene.menuScreen.subtitle);
  c.add(cursorLight);

  const labels = ["TOURNAMENT", "PLAYERS 1"];
  for (let i = 0; i < labels.length; i += 1) {
    const y = 281 + i * 70;
    const bg = scene.add
      .rectangle(GAME_WIDTH / 2, y, 354, 52, 0x153523, 0.96)
      .setStrokeStyle(2, 0x2e6a4a, 0.88);
    const label = scene.add
      .text(GAME_WIDTH / 2, y, labels[i], {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    scene.menuScreen.buttons.push({ bg, label });
    c.add(bg);
    c.add(label);
  }

  c.add(infoPill);
  c.add(scene.menuScreen.info);
  c.add(scene.menuScreen.footer);

  scene.tweens.add({
    targets: heroGlow,
    alpha: 0.18,
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  scene.tweens.add({
    targets: titleMain,
    scaleX: 1.02,
    scaleY: 1.02,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  scene.tweens.add({
    targets: cursorLight,
    alpha: 0.19,
    duration: 950,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  c.setVisible(false);
}

function showMenu(scene) {
  hideAllScreens(scene);
  const container = scene.menuScreen.container;
  container.setVisible(true);
  container.setAlpha(0);
  container.y = 16;

  scene.tweens.killTweensOf(container);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    y: 0,
    duration: 260,
    ease: "Cubic.easeOut",
  });

  scene.state.phase = "menu";
  scene.state.menu = { cursor: 0, cooldown: 0, lastAxis: 0 };
  refreshMenuLabels(scene);
  updateMenuHighlight(scene);
  clearPressed(scene);
}

function updateMenuHighlight(scene) {
  const cursor = scene.state.menu.cursor;
  for (let i = 0; i < scene.menuScreen.buttons.length; i += 1) {
    const button = scene.menuScreen.buttons[i];
    const active = i === cursor;
    button.bg.setFillStyle(
      active ? COLORS.accent : 0x153523,
      active ? 1 : 0.96,
    );
    button.bg.setStrokeStyle(
      2,
      active ? COLORS.text : 0x2e6a4a,
      active ? 1 : 0.88,
    );
    button.bg.setScale(active ? 1.02 : 1);
    button.label.setColor(active ? "#0d1f12" : "#f3ffe9");
    button.label.setScale(active ? 1.03 : 1);
  }

  const selected = scene.menuScreen.buttons[cursor];
  scene.menuScreen.cursorLight.setPosition(selected.bg.x, selected.bg.y);
}

function refreshMenuLabels(scene) {
  const count = Phaser.Math.Clamp(
    scene.state.playerCount || 1,
    1,
    TEAMS.length,
  );
  scene.state.playerCount = count;
  const labels = ["TOURNAMENT", `PLAYERS ${count}`];
  for (let i = 0; i < scene.menuScreen.buttons.length; i += 1) {
    scene.menuScreen.buttons[i].label.setText(labels[i]);
  }
  scene.menuScreen.info.setText(
    `5 tiros por lado  +  muerte subita  |  ${count} jugador${count === 1 ? "" : "es"}`,
  );
}

function handleMenuInput(scene, time) {
  const menu = scene.state.menu;
  const axisY = getVerticalMenuAxis(scene.controls);

  if (time >= menu.cooldown && axisY !== 0 && axisY !== menu.lastAxis) {
    menu.cursor = Phaser.Math.Wrap(
      menu.cursor + axisY,
      0,
      scene.menuScreen.buttons.length,
    );
    menu.cooldown = time + 160;
    menu.lastAxis = axisY;
    updateMenuHighlight(scene);
    playSound(scene, "click");
  }

  if (axisY === 0) {
    menu.lastAxis = 0;
  }

  if (
    consumeAnyPressedControl(scene, [
      "P1_1",
      "P2_1",
      "P1_2",
      "P2_2",
      "START1",
      "START2",
    ])
  ) {
    playSound(scene, "select");
    if (menu.cursor === 0) {
      startTeamSelect(scene);
      return;
    }
    scene.state.playerCount =
      scene.state.playerCount >= TEAMS.length ? 1 : scene.state.playerCount + 1;
    refreshMenuLabels(scene);
    playSound(scene, "click");
  }
}

function createTeamSelectScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(21);
  const title = scene.add
    .text(GAME_WIDTH / 2, 100, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#e8ff6a",
      fontStyle: "bold",
      align: "center",
    })
    .setOrigin(0.5);

  const stepLabel = scene.add
    .text(GAME_WIDTH / 2, 132, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#8fb18e",
    })
    .setOrigin(0.5);

  const info = scene.add
    .text(GAME_WIDTH / 2, 388, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#f3ffe9",
      align: "center",
      lineSpacing: 4,
    })
    .setOrigin(0.5, 0);

  const message = scene.add
    .text(GAME_WIDTH / 2, 474, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffb06a",
      align: "center",
    })
    .setOrigin(0.5);

  const help = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "MOVE  CONFIRM  BACK=B6", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#8fb18e",
    })
    .setOrigin(0.5);

  scene.teamScreen = {
    container: c,
    title,
    stepLabel,
    info,
    message,
    help,
    cells: [],
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 430, COLORS.panel, 0.92)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(title);
  c.add(stepLabel);

  for (let i = 0; i < TEAMS.length; i += 1) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 190 + col * 140;
    const y = 210 + row * 86;

    const bg = scene.add
      .rectangle(x, y, 128, 66, COLORS.panel2, 0.96)
      .setStrokeStyle(2, COLORS.frame, 0.9);
    const code = scene.add
      .text(x, y + 2, TEAMS[i].code, {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const flag = createFlagImage(scene, i, x, y - 20, 36, 22);
    const name = scene.add
      .text(x, y + 22, TEAMS[i].name, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#8fb18e",
      })
      .setOrigin(0.5);

    scene.teamScreen.cells.push({ bg, code, flag, name, index: i });
    c.add(bg);
    c.add(flag);
    c.add(code);
    c.add(name);
  }

  c.add(info);
  c.add(message);
  c.add(help);
  c.setVisible(false);
}

function startTeamSelect(scene) {
  const playerCount = Phaser.Math.Clamp(
    scene.state.playerCount || 1,
    1,
    TEAMS.length,
  );

  scene.state.select = {
    playerCount,
    currentPlayer: 1,
    pickedTeams: [],
    cursor: 0,
    cooldown: 0,
    lastAxisX: 0,
    lastAxisY: 0,
    message: "",
  };

  hideAllScreens(scene);
  scene.teamScreen.container.setVisible(true);
  scene.state.phase = "teamSelect";
  refreshTeamSelectScreen(scene);
  clearPressed(scene);
}

function refreshTeamSelectScreen(scene) {
  const select = scene.state.select;
  const team = TEAMS[select.cursor];
  const pickedText = select.pickedTeams.length
    ? select.pickedTeams.map(teamCode).join(" ")
    : "NINGUNO";

  scene.teamScreen.title.setText("TOURNAMENT MODE");
  scene.teamScreen.stepLabel.setText(
    `JUGADOR ${select.currentPlayer} ELIGE EQUIPO (${select.pickedTeams.length}/${select.playerCount})`,
  );
  scene.teamScreen.message.setText(select.message || "");

  scene.teamScreen.help.setText("P1/P2 MOVE  CONFIRM=B1/B2/START  BACK=B6");

  scene.teamScreen.info.setText(
    `${team.name} (${team.code})\n${team.trait}\nSELECCIONADOS: ${pickedText}`,
  );

  for (let i = 0; i < scene.teamScreen.cells.length; i += 1) {
    const cell = scene.teamScreen.cells[i];
    const isCursor = i === select.cursor;
    const unavailable = select.pickedTeams.includes(i);
    const teamColor = TEAMS[i].primary;

    if (isCursor && !unavailable) {
      cell.bg.setFillStyle(COLORS.accent, 1);
      cell.bg.setStrokeStyle(2, COLORS.text, 1);
      cell.code.setColor("#102117");
      cell.name.setColor("#173021");
      cell.flag.setAlpha(1);
    } else if (unavailable) {
      cell.bg.setFillStyle(teamColor, 0.36);
      cell.bg.setStrokeStyle(2, COLORS.text, 0.75);
      cell.code.setColor("#f3ffe9");
      cell.name.setColor("#f3ffe9");
      cell.flag.setAlpha(1);
    } else {
      cell.bg.setFillStyle(COLORS.panel2, unavailable ? 0.35 : 0.96);
      cell.bg.setStrokeStyle(2, COLORS.frame, 0.9);
      cell.code.setColor(unavailable ? "#6d7f6c" : "#f3ffe9");
      cell.name.setColor(unavailable ? "#6d7f6c" : "#8fb18e");
      cell.flag.setAlpha(unavailable ? 0.35 : 1);
    }
  }
}

function handleTeamSelectInput(scene, time) {
  const select = scene.state.select;
  const axis = {
    x: getHorizontalMenuAxis(scene.controls),
    y: getVerticalMenuAxis(scene.controls),
  };

  if (
    time >= select.cooldown &&
    (axis.x !== 0 || axis.y !== 0) &&
    (axis.x !== select.lastAxisX || axis.y !== select.lastAxisY)
  ) {
    const colCount = 4;
    const rowCount = 2;
    let row = Math.floor(select.cursor / colCount);
    let col = select.cursor % colCount;

    if (axis.x !== 0) {
      col = Phaser.Math.Wrap(col + axis.x, 0, colCount);
    }
    if (axis.y !== 0) {
      row = Phaser.Math.Wrap(row + axis.y, 0, rowCount);
    }

    select.cursor = row * colCount + col;
    select.cooldown = time + 150;
    select.lastAxisX = axis.x;
    select.lastAxisY = axis.y;
    select.message = "";
    refreshTeamSelectScreen(scene);
    playSound(scene, "click");
  }

  if (axis.x === 0 && axis.y === 0) {
    select.lastAxisX = 0;
    select.lastAxisY = 0;
  }

  if (consumeAnyPressedControl(scene, BACK_CODES)) {
    playSound(scene, "click");
    showMenu(scene);
    return;
  }

  if (
    !consumeAnyPressedControl(scene, [
      "P1_1",
      "P2_1",
      "P1_2",
      "P2_2",
      "START1",
      "START2",
    ])
  ) {
    return;
  }

  if (select.pickedTeams.includes(select.cursor)) {
    select.message = "Ese equipo ya fue elegido";
    refreshTeamSelectScreen(scene);
    playSound(scene, "miss");
    return;
  }

  playSound(scene, "select");
  select.pickedTeams.push(select.cursor);

  if (select.pickedTeams.length >= select.playerCount) {
    startTournament(scene);
    return;
  }

  const nextPlayer = select.currentPlayer + 1;
  select.currentPlayer = nextPlayer;
  select.cursor = findNextAvailableTeamIndex(
    select.pickedTeams,
    select.cursor + 1,
  );
  select.message = `JUGADOR ${nextPlayer - 1} LOCKED: ${teamCode(select.pickedTeams[select.pickedTeams.length - 1])}`;
  refreshTeamSelectScreen(scene);
}

function findNextAvailableTeamIndex(pickedTeams, startIndex) {
  for (let i = 0; i < TEAMS.length; i += 1) {
    const candidate = Phaser.Math.Wrap(startIndex + i, 0, TEAMS.length);
    if (!pickedTeams.includes(candidate)) {
      return candidate;
    }
  }
  return 0;
}

function createBracketScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(22);
  scene.bracketScreen = {
    container: c,
    title: scene.add
      .text(GAME_WIDTH / 2, 94, "TOURNAMENT BRACKET", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#e8ff6a",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
    subtitle: scene.add
      .text(GAME_WIDTH / 2, 126, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#8fb18e",
        align: "center",
      })
      .setOrigin(0.5),
    list: scene.add
      .text(GAME_WIDTH / 2, 160, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f3ffe9",
        align: "left",
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0),
    footer: scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 24,
        "START/B1/B2 TO CONTINUE  BACK=B6",
        {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#8fb18e",
        },
      )
      .setOrigin(0.5),
    tutorialTab: scene.add
      .rectangle(GAME_WIDTH / 2, 486, 286, 116, 0x142a1d, 0.92)
      .setStrokeStyle(1, 0x3f7f4f, 0.95),
    tutorialText: scene.add
      .text(
        GAME_WIDTH / 2,
        486,
        "COMO JUGAR\nMUEVE: PALANCA\nROJA=DELANTERO\nAMARILLA=PORTERO\nB1(U/R): PODER\nB4(J/F): CONFIRMA",
        {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#b2c957",
          align: "center",
          lineSpacing: 3,
        },
      )
      .setOrigin(0.5),
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 660, 470, COLORS.panel, 0.94)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(scene.bracketScreen.title);
  c.add(scene.bracketScreen.subtitle);
  c.add(scene.bracketScreen.list);
  c.add(scene.bracketScreen.tutorialTab);
  c.add(scene.bracketScreen.tutorialText);
  c.add(scene.bracketScreen.footer);
  c.setVisible(false);
}

function startTournament(scene) {
  const humanTeams = scene.state.select.pickedTeams.slice();
  scene.state.tournament = createTournament(humanTeams);
  showBracket(scene, "PRESS START TO PLAY NEXT ROUND");
}

function showBracket(scene, subtitle) {
  hideAllScreens(scene);
  scene.bracketScreen.container.setVisible(true);
  scene.state.phase = "bracket";
  renderBracket(scene, subtitle);
  clearPressed(scene);
}

function renderBracket(scene, subtitle) {
  const tournament = scene.state.tournament;
  if (!tournament) {
    scene.bracketScreen.list.setText("No tournament data.");
    return;
  }

  const hasPlayedHumanMatch = tournament.rounds.some((round) =>
    round.matches.some((match) => match.isPlayer && match.winner !== null),
  );
  const introVisible = !hasPlayedHumanMatch;
  scene.bracketScreen.tutorialTab.setVisible(introVisible);
  scene.bracketScreen.tutorialText.setVisible(introVisible);

  scene.bracketScreen.subtitle.setText(subtitle || "");

  const lines = [];
  for (let r = 0; r < tournament.rounds.length; r += 1) {
    const round = tournament.rounds[r];
    lines.push(round.name);
    for (let i = 0; i < round.matches.length; i += 1) {
      const match = round.matches[i];
      const left = teamCode(match.a);
      const right = teamCode(match.b);
      const winner = match.winner === null ? "--" : teamCode(match.winner);
      const marker = match.isPlayer ? ">" : " ";
      lines.push(`${marker} ${left} vs ${right} -> ${winner}`);
    }
    if (r < tournament.rounds.length - 1) {
      lines.push("");
    }
  }

  scene.bracketScreen.list.setText(lines.join("\n"));
}

function handleBracketInput(scene) {
  if (consumeAnyPressedControl(scene, BACK_CODES)) {
    showMenu(scene);
    return;
  }

  if (
    !consumeAnyPressedControl(scene, [
      "START1",
      "START2",
      "P1_1",
      "P2_1",
      "P1_2",
      "P2_2",
    ])
  ) {
    return;
  }

  playSound(scene, "select");
  startNextTournamentMatch(scene);
}

function startNextTournamentMatch(scene) {
  const tournament = scene.state.tournament;
  if (!tournament) {
    showMenu(scene);
    return;
  }

  let next = findNextPlayerMatch(tournament);
  if (!next) {
    const resolvedRound = resolveNextCpuRound(tournament);
    if (resolvedRound) {
      showBracket(scene, `${resolvedRound} UPDATE - PRESS START`);
      return;
    }

    if (typeof tournament.champion === "number") {
      showTournamentResult(scene, tournament, tournament.champion, "");
      return;
    }

    showBracket(scene, "BRACKET UPDATE - PRESS START");
    return;
  }

  tournament.currentRound = next.roundIndex;
  tournament.currentMatch = next.matchIndex;
  const slot = tournament.rounds[next.roundIndex].matches[next.matchIndex];
  const humanA = getHumanPlayerIndex(tournament, slot.a);
  const humanB = getHumanPlayerIndex(tournament, slot.b);

  const match = createShootoutMatch({
    mode: "tournament",
    roundName: tournament.rounds[next.roundIndex].name,
    teamA: slot.a,
    teamB: slot.b,
    controlA: humanA > 0 ? "human" : "cpu",
    controlB: humanB > 0 ? "human" : "cpu",
    humanA,
    humanB,
  });

  startMatch(scene, match);
}

function createMatchScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(23);
  ensureMatchSpriteTextures(scene);

  const panel = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 560, 0x07120b, 0.8)
    .setStrokeStyle(2, COLORS.frame, 0.45);
  const goalBack = scene.add
    .rectangle(GAME_WIDTH / 2, 186, 332, 110, 0x163f25, 0.72)
    .setStrokeStyle(2, COLORS.line, 0.6);
  const goalFrame = scene.add.rectangle(
    GAME_WIDTH / 2,
    132,
    332,
    8,
    0xf2fff2,
    0.95,
  );
  const goalLeft = scene.add.rectangle(
    GAME_WIDTH / 2 - 166,
    184,
    8,
    104,
    0xf2fff2,
    1,
  );
  const goalRight = scene.add.rectangle(
    GAME_WIDTH / 2 + 166,
    184,
    8,
    104,
    0xf2fff2,
    1,
  );
  const shooterShadow = scene.add.ellipse(
    GAME_WIDTH / 2,
    GAME_HEIGHT - 30,
    210,
    26,
    COLORS.shadow,
    0.55,
  );
  const reticle = scene.add.container(GAME_WIDTH / 2, 168);
  const reticleRing = scene.add.circle(0, 0, 16, COLORS.accent, 0);
  reticleRing.setStrokeStyle(2, COLORS.accent, 1);
  const reticleH = scene.add.rectangle(0, 0, 28, 2, COLORS.accent, 1);
  const reticleV = scene.add.rectangle(0, 0, 2, 28, COLORS.accent, 1);
  reticle.add([reticleRing, reticleH, reticleV]);

  const keeperShadow = scene.add.ellipse(
    GAME_WIDTH / 2,
    220,
    66,
    14,
    COLORS.shadow,
    0.35,
  );

  const keeper = scene.add
    .image(GAME_WIDTH / 2, 207, "keeper-sprite")
    .setTint(0x7ec4ff);
  const ball = scene.add.image(GAME_WIDTH / 2, 516, "ball-sprite");
  const crowdFlash = scene.add
    .rectangle(GAME_WIDTH / 2, 124, 704, 146, 0xf8fff1, 0)
    .setBlendMode(Phaser.BlendModes.ADD);
  const goalBurst = scene.add
    .circle(GAME_WIDTH / 2, 186, 14, 0xffffff, 0)
    .setStrokeStyle(2, COLORS.goal, 1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0);
  const crowdFx = scene.add.container(0, 0);

  scene.matchScreen = {
    container: c,
    panel,
    goalBack,
    goalFrame,
    goalLeft,
    goalRight,
    shooterShadow,
    keeperShadow,
    reticle,
    reticleRing,
    reticleH,
    reticleV,
    keeper,
    ball,
    crowdFlash,
    goalBurst,
    crowdFx,
    title: scene.add
      .text(GAME_WIDTH / 2, 86, "MATCH", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#e8ff6a",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
    score: scene.add
      .text(GAME_WIDTH / 2, 114, "00 : 00", {
        fontFamily: "monospace",
        fontSize: "38px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
    leftFlag: createFlagImage(scene, 0, 94, 116, 36, 22),
    leftTeam: scene.add
      .text(136, 116, "AAA", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5),
    rightFlag: createFlagImage(scene, 1, GAME_WIDTH - 94, 116, 36, 22),
    rightTeam: scene.add
      .text(GAME_WIDTH - 136, 116, "BBB", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5),
    shotsA: scene.add
      .text(120, 154, "○○○○○", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#b2c957",
      })
      .setOrigin(0, 0.5),
    shotsB: scene.add
      .text(GAME_WIDTH - 120, 154, "○○○○○", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#b2c957",
      })
      .setOrigin(1, 0.5),
    turn: scene.add
      .text(GAME_WIDTH / 2, 154, "KICK 1 / 5", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8fb18e",
      })
      .setOrigin(0.5),
    prompt: scene.add
      .text(GAME_WIDTH / 2, 520, "SET YOUR CHOICE", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#f3ffe9",
        align: "center",
      })
      .setOrigin(0.5),
    phaseHint: scene.add
      .text(GAME_WIDTH / 2, 544, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#b2c957",
        align: "center",
      })
      .setOrigin(0.5),
    event: scene.add
      .text(GAME_WIDTH / 2, 568, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffb06a",
        align: "center",
      })
      .setOrigin(0.5),
    secretHint: scene.add
      .text(GAME_WIDTH / 2, 494, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#8fb18e",
        align: "center",
      })
      .setOrigin(0.5),
  };

  for (let i = -2; i <= 2; i += 1) {
    const netV = scene.add.rectangle(
      GAME_WIDTH / 2 + i * 66,
      186,
      2,
      110,
      COLORS.line,
      0.16,
    );
    c.add(netV);
  }
  for (let i = 0; i < 4; i += 1) {
    const netH = scene.add.rectangle(
      GAME_WIDTH / 2,
      146 + i * 26,
      332,
      2,
      COLORS.line,
      0.14,
    );
    c.add(netH);
  }

  c.add(panel);
  c.add(goalBack);
  c.add(goalFrame);
  c.add(goalLeft);
  c.add(goalRight);
  c.add(shooterShadow);
  c.add(keeperShadow);
  c.add(reticle);
  c.add(keeper);
  c.add(ball);
  c.add(crowdFlash);
  c.add(goalBurst);
  c.add(crowdFx);
  c.add(scene.matchScreen.title);
  c.add(scene.matchScreen.score);
  c.add(scene.matchScreen.leftFlag);
  c.add(scene.matchScreen.leftTeam);
  c.add(scene.matchScreen.rightFlag);
  c.add(scene.matchScreen.rightTeam);
  c.add(scene.matchScreen.shotsA);
  c.add(scene.matchScreen.shotsB);
  c.add(scene.matchScreen.turn);
  c.add(scene.matchScreen.secretHint);
  c.add(scene.matchScreen.prompt);
  c.add(scene.matchScreen.phaseHint);
  c.add(scene.matchScreen.event);

  c.setVisible(false);
}

function createShootoutMatch(options) {
  return {
    mode: options.mode,
    roundName: options.roundName,
    teamA: options.teamA,
    teamB: options.teamB,
    controlA: options.controlA,
    controlB: options.controlB,
    humanA: options.humanA || 0,
    humanB: options.humanB || 0,
    scoreA: 0,
    scoreB: 0,
    takenA: 0,
    takenB: 0,
    marksA: [],
    marksB: [],
    historyA: [],
    historyB: [],
    turn: 0,
    pending: null,
    nextAttemptAt: 0,
    resolving: false,
    winnerSide: null,
  };
}

function startMatch(scene, match) {
  scene.state.match = match;
  hideAllScreens(scene);
  scene.matchScreen.container.setVisible(true);
  scene.state.phase = "matchInput";

  setupNextAttempt(scene, scene.time.now);
  updateMatchHud(scene);
  clearPressed(scene);
}

function setupNextAttempt(scene, time) {
  const match = scene.state.match;
  if (!match) {
    return;
  }

  const shooterSide = match.turn % 2 === 0 ? "A" : "B";
  const keeperSide = shooterSide === "A" ? "B" : "A";
  let weather = "clear";
  let windX = 0;
  const weatherRoll = Math.random();
  if (weatherRoll < 0.24) {
    weather = "wind";
    windX =
      (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.FloatBetween(0.6, 1.15);
  } else if (weatherRoll < 0.46) {
    weather = "rain";
  }

  match.pending = {
    shooterSide,
    keeperSide,
    stage: "shooter",
    activeX: 0,
    activeY: AIM_Y_CENTER,
    shooter: { x: 0, y: AIM_Y_CENTER, power: 0, locked: false },
    keeper: { x: 0, y: AIM_Y_CENTER, power: 1, locked: false },
    revealAt: 0,
    stageStartedAt: time,
    lockDeadline: time + DECISION_TIME_MS,
    cpuReadyAt: time + Phaser.Math.Between(300, 680),
    weather,
    windX,
  };

  match.resolving = false;

  scene.matchScreen.ball
    .setPosition(GAME_WIDTH / 2, 516)
    .setScale(1)
    .setAngle(0)
    .setAlpha(1);
  scene.matchScreen.keeper
    .setPosition(GAME_WIDTH / 2, 207)
    .setScale(1)
    .setAngle(0)
    .setAlpha(1)
    .setTint(TEAMS[getTeamIndexBySide(match, keeperSide)].primary);
  scene.matchScreen.keeperShadow
    .setPosition(GAME_WIDTH / 2, 220)
    .setScale(1, 1)
    .setAlpha(0.35);
  scene.matchScreen.reticle.setVisible(true);
  scene.matchScreen.event.setText("");
  scene.matchScreen.phaseHint.setText("");
  scene.matchScreen.secretHint.setText("");
  scene.matchScreen.crowdFlash.setAlpha(0);
  scene.matchScreen.goalBurst.setAlpha(0).setScale(1);
  scene.matchScreen.goalBack.setAlpha(0.72);
  scene.matchScreen.crowdFx.removeAll(true);

  setAimCursor(scene, match, 0, AIM_Y_CENTER);
  setReticleRoleColor(scene, true);

  updateMatchHud(scene);
}

function updateMatchHud(scene) {
  const match = scene.state.match;
  if (!match || !match.pending) {
    return;
  }

  const shooterSide = match.pending.shooterSide;
  const shooterTeam = getTeamIndexBySide(match, shooterSide);
  const shooterName = teamCode(shooterTeam);
  const weatherTag = weatherLabel(match.pending);

  scene.matchScreen.title.setText(`${match.roundName} - SHOOTER POV`);
  scene.matchScreen.leftFlag.setTexture(flagTextureKey(match.teamA));
  scene.matchScreen.leftTeam.setText(teamCode(match.teamA));
  scene.matchScreen.leftTeam.setColor(colorHex(TEAMS[match.teamA].primary));
  scene.matchScreen.rightFlag.setTexture(flagTextureKey(match.teamB));
  scene.matchScreen.rightTeam.setText(teamCode(match.teamB));
  scene.matchScreen.rightTeam.setColor(colorHex(TEAMS[match.teamB].primary));
  scene.matchScreen.score.setText(
    `${String(match.scoreA).padStart(2, "0")} : ${String(match.scoreB).padStart(2, "0")}`,
  );
  scene.matchScreen.shotsA.setText(markersText(match.marksA));
  scene.matchScreen.shotsB.setText(markersText(match.marksB));

  const kickCount = Math.floor(match.turn / 2) + 1;
  const sudden =
    match.takenA >= PENALTIES_PER_SIDE && match.takenB >= PENALTIES_PER_SIDE;
  scene.matchScreen.turn.setText(
    sudden
      ? `SUDDEN DEATH ${Math.max(1, kickCount - PENALTIES_PER_SIDE)}`
      : `${shooterName} KICK ${Math.min(kickCount, PENALTIES_PER_SIDE)} / ${PENALTIES_PER_SIDE}`,
  );

  if (scene.state.phase === "matchInput") {
    const isShooterStage = match.pending.stage === "shooter";
    const activeSide = isShooterStage
      ? match.pending.shooterSide
      : match.pending.keeperSide;
    const activeTag = getSidePlayerTag(match, activeSide);
    const activeControl = activeSide === "A" ? match.controlA : match.controlB;

    scene.matchScreen.prompt.setText(
      `${activeTag} ${isShooterStage ? "DELANTERO" : "PORTERO"}: APUNTA Y BLOQUEA`,
    );

    const choice = isShooterStage
      ? match.pending.shooter
      : match.pending.keeper;
    const powerList = isShooterStage ? SHOOTER_POWERS : KEEPER_POWERS;
    const powerIndex = Phaser.Math.Clamp(
      choice.power || 0,
      0,
      powerList.length - 1,
    );
    const powerValue = powerList[powerIndex];
    const controlsHint =
      activeControl === "human1"
        ? "U CAMBIA  J CONFIRMA"
        : activeControl === "human2"
          ? "R CAMBIA  F CONFIRMA"
          : "U/R CAMBIA  J/F CONFIRMA";

    scene.matchScreen.phaseHint.setText(
      activeControl === "cpu"
        ? `CPU ELIGIENDO...  ${weatherTag}`
        : `PODER ${powerValue}  ${weatherTag}  ${controlsHint}`,
    );
    setReticleRoleColor(scene, isShooterStage);

    scene.matchScreen.secretHint.setText(
      isShooterStage
        ? "PORTERO: APARTA LA MIRADA"
        : "DELANTERO: APARTA LA MIRADA",
    );
  } else if (scene.state.phase === "matchReveal") {
    scene.matchScreen.prompt.setText("REVEALING...");
    scene.matchScreen.phaseHint.setText(weatherTag);
    scene.matchScreen.secretHint.setText("");
  }
}

function markersText(list) {
  const base = [];
  for (let i = 0; i < PENALTIES_PER_SIDE; i += 1) {
    if (i < list.length) {
      base.push(list[i] === "goal" ? "●" : "x");
    } else {
      base.push("○");
    }
  }

  if (list.length > PENALTIES_PER_SIDE) {
    base.push(`+${list.length - PENALTIES_PER_SIDE}`);
  }

  return base.join(" ");
}

function handleMatchInput(scene, time) {
  const match = scene.state.match;
  if (!match || !match.pending) {
    return;
  }

  if (consumeAnyPressedControl(scene, BACK_CODES)) {
    playSound(scene, "click");
    showMenu(scene);
    return;
  }

  const isShooterStage = match.pending.stage === "shooter";
  const activeSide = isShooterStage
    ? match.pending.shooterSide
    : match.pending.keeperSide;

  handleSideChoice(scene, match, activeSide, isShooterStage, time);

  const pending = match.pending;
  if (time >= pending.lockDeadline) {
    lockCurrentStage(scene, match, time);
    playSound(scene, "click");
  }

  updateMatchHud(scene);
}

function lockCurrentStage(scene, match, time) {
  const pending = match.pending;
  if (!pending) {
    return;
  }

  if (pending.stage === "shooter") {
    if (!pending.shooter.locked) {
      pending.shooter.x = pending.activeX;
      pending.shooter.y = pending.activeY;
      pending.shooter.locked = true;
    }

    pending.stage = "keeper";
    pending.stageStartedAt = time;
    pending.lockDeadline = time + DECISION_TIME_MS;
    pending.cpuReadyAt = time + Phaser.Math.Between(320, 760);

    setAimCursor(scene, match, 0, AIM_Y_CENTER);
    setReticleRoleColor(scene, false);
    clearPressed(scene);
    return;
  }

  if (!pending.keeper.locked) {
    pending.keeper.x = pending.activeX;
    pending.keeper.y = pending.activeY;
    pending.keeper.locked = true;
  }

  pending.revealAt = time + 360;
  scene.state.phase = "matchReveal";
  scene.matchScreen.reticle.setVisible(false);
  scene.matchScreen.prompt.setText("REVEALING...");
  scene.matchScreen.phaseHint.setText("");
  scene.matchScreen.secretHint.setText("");
}

function handleSideChoice(scene, match, side, isShooterStage, time) {
  const pending = match.pending;
  const choice = isShooterStage ? pending.shooter : pending.keeper;
  const control = side === "A" ? match.controlA : match.controlB;

  if (control === "cpu") {
    if (time < pending.cpuReadyAt) {
      return;
    }
    applyCpuChoice(match, side, isShooterStage);
    choice.locked = true;
    lockCurrentStage(scene, match, time);
    return;
  }

  let moveLeft = ["P1_L", "P2_L"];
  let moveRight = ["P1_R", "P2_R"];
  let moveUp = ["P1_U", "P2_U"];
  let moveDown = ["P1_D", "P2_D"];
  let powerCycle = ["P1_1", "P2_1"];
  let confirm = ["P1_4", "P2_4"];

  if (control === "human1") {
    moveLeft = ["P1_L"];
    moveRight = ["P1_R"];
    moveUp = ["P1_U"];
    moveDown = ["P1_D"];
    powerCycle = ["P1_1"];
    confirm = ["P1_4"];
  } else if (control === "human2") {
    moveLeft = ["P2_L"];
    moveRight = ["P2_R"];
    moveUp = ["P2_U"];
    moveDown = ["P2_D"];
    powerCycle = ["P2_1"];
    confirm = ["P2_4"];
  }

  let moved = false;

  if (consumeAnyPressedControl(scene, moveLeft)) {
    pending.activeX -= 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, moveRight)) {
    pending.activeX += 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, moveUp)) {
    pending.activeY -= 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, moveDown)) {
    pending.activeY += 1;
    moved = true;
  }

  if (moved) {
    setAimCursor(scene, match, pending.activeX, pending.activeY);
    playSound(scene, "click");
  }

  if (consumeAnyPressedControl(scene, powerCycle)) {
    const powerCount = isShooterStage
      ? SHOOTER_POWERS.length
      : KEEPER_POWERS.length;
    choice.power = Phaser.Math.Wrap((choice.power || 0) + 1, 0, powerCount);
    playSound(scene, "click");
  }

  if (consumeAnyPressedControl(scene, confirm)) {
    choice.x = pending.activeX;
    choice.y = pending.activeY;
    choice.locked = true;
    playSound(scene, "select");
    lockCurrentStage(scene, match, time);
  }
}

function applyCpuChoice(match, side, isShooter) {
  const pending = match.pending;
  const choice = isShooter ? pending.shooter : pending.keeper;

  const teamIdx = getTeamIndexBySide(match, side);
  const enemySide = side === "A" ? "B" : "A";
  const enemyTeamIdx = getTeamIndexBySide(match, enemySide);
  const team = TEAMS[teamIdx];
  const enemyHist = enemySide === "A" ? match.historyA : match.historyB;

  if (isShooter) {
    let x = Phaser.Math.Between(AIM_X_MIN, AIM_X_MAX);
    let y = Phaser.Math.Between(AIM_Y_MIN, AIM_Y_MAX);
    if (isPressureKick(match) && Math.random() < 0.45) {
      y = AIM_Y_CENTER;
    }
    if (team.attack > 0.07 && Math.random() < 0.35) {
      x = Math.random() < 0.5 ? AIM_X_MIN : AIM_X_MAX;
      y = Phaser.Math.Between(AIM_Y_MIN, Math.min(AIM_Y_CENTER, AIM_Y_MAX));
    }
    choice.x = x;
    choice.y = y;
    choice.power = Math.random() < (isPressureKick(match) ? 0.5 : 0.38) ? 0 : 1;
  } else {
    let guessX = Phaser.Math.Between(AIM_X_MIN, AIM_X_MAX);
    let guessY = Phaser.Math.Between(AIM_Y_MIN, AIM_Y_MAX);
    if (enemyHist.length >= 2) {
      const last = enemyHist[enemyHist.length - 1];
      const prev = enemyHist[enemyHist.length - 2];
      if (last && prev && last.x === prev.x && Math.random() < 0.65) {
        guessX = last.x;
      }
      if (last && prev && last.y === prev.y && Math.random() < 0.45) {
        guessY = last.y;
      }
    }
    if (isPressureKick(match) && Math.random() < 0.3) {
      guessX = 0;
      guessY = AIM_Y_CENTER;
    }
    if (TEAMS[enemyTeamIdx].attack > 0.07 && Math.random() < 0.22) {
      guessX = Math.random() < 0.5 ? AIM_X_MIN : AIM_X_MAX;
    }
    choice.x = guessX;
    choice.y = guessY;
    choice.power = Math.random() < 0.36 ? 0 : Math.random() < 0.7 ? 1 : 2;
  }
}

function setAimCursor(scene, match, x, y) {
  if (!match || !match.pending) {
    return;
  }

  match.pending.activeX = Phaser.Math.Clamp(x, AIM_X_MIN, AIM_X_MAX);
  match.pending.activeY = Phaser.Math.Clamp(y, AIM_Y_MIN, AIM_Y_MAX);
  syncReticle(scene, match.pending.activeX, match.pending.activeY);
}

function syncReticle(scene, x, y) {
  scene.matchScreen.reticle.setPosition(aimToWorldX(x), aimToWorldY(y));
}

function setReticleRoleColor(scene, isShooterStage) {
  const color = isShooterStage ? 0xff4b4b : 0xe8ff6a;
  scene.matchScreen.reticleRing.setStrokeStyle(2, color, 1);
  scene.matchScreen.reticleH.setFillStyle(color, 1);
  scene.matchScreen.reticleV.setFillStyle(color, 1);
}

function aimToWorldX(x) {
  const ratio = (x - AIM_X_MIN) / (AIM_X_MAX - AIM_X_MIN);
  return GAME_WIDTH / 2 - 164 + ratio * 328;
}

function aimToWorldY(y) {
  const ratio = (y - AIM_Y_MIN) / (AIM_Y_MAX - AIM_Y_MIN);
  return 132 + ratio * 118;
}

function keeperToWorldY(y) {
  const ratio = (y - AIM_Y_MIN) / (AIM_Y_MAX - AIM_Y_MIN);
  return 170 + ratio * 68;
}

function getSidePlayerTag(match, side) {
  const control = side === "A" ? match.controlA : match.controlB;
  if (control === "cpu") {
    return "CPU";
  }
  if (control === "human") {
    const playerIndex = side === "A" ? match.humanA : match.humanB;
    return playerIndex > 0 ? `J${playerIndex}` : "HUM";
  }
  return control === "human1" ? "P1" : "P2";
}

function weatherLabel(pending) {
  if (!pending) {
    return "CALMO";
  }
  if (pending.weather === "wind") {
    return pending.windX > 0 ? "VIENTO >" : "VIENTO <";
  }
  return pending.weather === "rain" ? "LLUVIA" : "CALMO";
}

function handleMatchReveal(scene, time) {
  const match = scene.state.match;
  if (!match || !match.pending || match.resolving) {
    return;
  }

  if (time < match.pending.revealAt) {
    return;
  }

  match.resolving = true;
  const outcome = resolvePenalty(match);
  animateOutcome(scene, match, outcome, () => {
    applyOutcome(scene, match, outcome);
    match.resolving = false;
  });
}

function resolvePenalty(match) {
  const pending = match.pending;
  const shooterSide = pending.shooterSide;
  const keeperSide = pending.keeperSide;
  const shooterTeam = TEAMS[getTeamIndexBySide(match, shooterSide)];
  const keeperTeam = TEAMS[getTeamIndexBySide(match, keeperSide)];
  const shot = pending.shooter;
  const keep = pending.keeper;
  const weather = pending.weather || "clear";
  const windX = weather === "wind" ? pending.windX || 0 : 0;
  const shotX = Phaser.Math.Clamp(shot.x + windX, AIM_X_MIN, AIM_X_MAX);
  const shotY = shot.y;
  const rain = weather === "rain";
  const shooterPower = Phaser.Math.Clamp(
    shot.power || 0,
    0,
    SHOOTER_POWERS.length - 1,
  );
  const keeperPower = Phaser.Math.Clamp(
    keep.power || 0,
    0,
    KEEPER_POWERS.length - 1,
  );

  const fireShot = shooterPower === 0;
  const goalXL = shooterPower === 1;
  const busWall = keeperPower === 0;
  const auraSave = keeperPower === 1;
  const oracleSave = keeperPower === 2;

  let keepX = keep.x;
  const oracleShift =
    oracleSave &&
    shotX !== 0 &&
    Math.sign(shotX) !== Math.sign(keepX) &&
    Math.random() < 0.56;
  if (oracleShift) {
    keepX = Math.sign(shotX) * Math.max(1, Math.abs(keepX));
  }

  let goalChance = 0.69;
  goalChance += shooterTeam.attack * 0.55;
  goalChance -= keeperTeam.keep * 0.55;

  let missChance = 0.06;

  if (rain) {
    goalChance -= 0.05;
    missChance += 0.08;
  }

  const dx = shotX - keepX;
  const dy = shotY - keep.y;
  const dist = Math.hypot(dx, dy);
  const directionMatch =
    shotX === 0 ? Math.abs(keepX) <= 1 : Math.sign(shotX) === Math.sign(keepX);
  const verticalRead = Math.abs(shotY - keep.y) <= 1;
  const keeperRead = directionMatch && verticalRead;
  const wideShot = Math.abs(shotX) >= AIM_X_MAX - 1;
  const highShot = shotY <= AIM_Y_MIN + 1;
  const lowShot = shotY >= AIM_Y_MAX - 1;
  const centerLane = Math.abs(shotX) <= 1;

  let savePressure = 0;
  if (dist < 0.85) {
    savePressure += 0.35;
  } else if (dist < 1.7 && keeperRead) {
    savePressure += 0.18;
  } else if (dist < 2.2 && keeperRead) {
    savePressure += 0.08;
  }

  if (busWall && wideShot) {
    savePressure += directionMatch ? (highShot || lowShot ? 0.32 : 0.24) : 0.1;
  } else if (busWall) {
    savePressure += 0.12;
  }
  if (auraSave) {
    savePressure += dist < 1.2 ? 0.24 : dist < 2 ? 0.12 : 0.04;
  }
  if (oracleSave) {
    savePressure += directionMatch ? 0.18 : oracleShift ? 0.12 : 0;
  }

  if (!directionMatch) {
    goalChance += 0.01;
  }

  goalChance -= savePressure;

  if (wideShot) {
    missChance += 0.03;
  }
  if (highShot) {
    missChance += 0.03;
  }
  if (centerLane && !highShot && !lowShot) {
    goalChance += 0.04;
  }

  if (fireShot) {
    goalChance += 0.12;
    missChance += 0.04;
  }
  if (goalXL) {
    goalChance += 0.07;
    missChance -= 0.02;
  }

  let postChance = 0.02;
  if (goalXL) {
    postChance -= 0.01;
  }
  if (busWall) {
    postChance += 0.01;
  }
  let event = "";

  if (isPressureKick(match) && Math.random() < 0.16) {
    const roll = Math.random();
    if (roll < 0.2) {
      event = "RESBALON";
      goalChance -= 0.14;
      missChance += 0.07;
    } else if (roll < 0.42) {
      event = "GUANTE HEROICO";
      goalChance -= 0.12;
    } else if (roll < 0.64) {
      event = "BALON CON EFECTO";
      goalChance += 0.09;
    } else if (roll < 0.84) {
      event = "REBOTE EN EL POSTE";
      postChance += 0.1;
    } else {
      event = "PENAL LEGENDARIO";
      goalChance += shooterTeam.clutch * 0.85 + 0.08;
    }
  }

  goalChance = Phaser.Math.Clamp(goalChance, 0.08, 0.9);
  missChance = Phaser.Math.Clamp(missChance, 0.01, 0.25);
  postChance = Phaser.Math.Clamp(postChance, 0.01, 0.23);

  let result = "goal";
  const roll = Math.random();
  if (roll < missChance) {
    result = "miss";
  } else if (roll < missChance + postChance) {
    result =
      event === "REBOTE EN EL POSTE" && Math.random() < 0.68
        ? "postIn"
        : "postOut";
  } else if (roll > goalChance) {
    result = "save";
  }

  let goalValue = result === "goal" || result === "postIn" ? 1 : 0;

  if (event === "RESBALON") {
    result = "miss";
    goalValue = 0;
  }

  if (fireShot && result === "save") {
    result = "goal";
    goalValue = Math.max(goalValue, 1);
    event = event || "COMETA IMPARABLE";
  }

  if (!event) {
    if (fireShot) {
      event = "COMETA EN LLAMAS";
    } else if (goalXL) {
      event = "ARCO XL";
    } else if (busWall) {
      event = "AUTOBUS DEFENSIVO";
    } else if (auraSave) {
      event = "AURA DE ATAJADA";
    } else if (oracleSave) {
      event = "ORACULO ACTIVO";
    }
  }

  let postSign = shotX >= 0 ? 1 : -1;
  if (shotX === 0) {
    postSign = Math.random() < 0.5 ? -1 : 1;
  }

  let missVisual = event === "RESBALON" ? "sky" : "default";
  if (result === "miss" && missVisual === "default") {
    if (wideShot || Math.abs(shotX) >= 2 || lowShot) {
      missVisual = "wide";
    } else if (highShot || (fireShot && Math.random() < 0.4)) {
      missVisual = "over";
    } else {
      missVisual = Math.random() < 0.6 ? "wide" : "over";
    }
  }

  const text =
    result === "goal"
      ? "GOAL!"
      : result === "save"
        ? "SAVED!"
        : result === "postIn"
          ? "POST AND IN!"
          : result === "postOut"
            ? "POST OUT!"
            : "MISS!";

  return {
    shooterSide,
    keeperSide,
    shotX,
    shotY,
    keepX,
    keepY: keep.y,
    shooterPower,
    keeperPower,
    result,
    goal: result === "goal" || result === "postIn",
    goalValue,
    weather,
    windX,
    event,
    keeperRead,
    postSign,
    missVisual,
    text,
  };
}

function animateOutcome(scene, match, outcome, onDone) {
  const ball = scene.matchScreen.ball;
  const keeper = scene.matchScreen.keeper;
  const keeperShadow = scene.matchScreen.keeperShadow;

  let targetX = aimToWorldX(outcome.shotX);
  let targetY = aimToWorldY(outcome.shotY);
  const keeperX = aimToWorldX(outcome.keepX);
  const keeperY = keeperToWorldY(outcome.keepY);
  const keeperDir = Phaser.Math.Clamp(outcome.keepX, -1, 1);
  let keeperYBias = 0;
  if (outcome.keepY <= AIM_Y_MIN + 1) {
    keeperYBias = -6;
  } else if (outcome.keepY >= AIM_Y_MAX - 1) {
    keeperYBias = 6;
  }
  const keeperAngle = keeperDir * 16 + keeperYBias;
  const keeperScaleX = keeperDir === 0 ? 1 : 1.14;
  const keeperScaleY = keeperDir === 0 ? 1 : 0.9;
  const ballSpin = outcome.shooterPower === 0 ? 700 : 430;
  const ballScale =
    outcome.result === "save" ? 0.88 : outcome.shooterPower === 0 ? 0.68 : 0.72;
  const postX = GAME_WIDTH / 2 + (outcome.postSign || 1) * 164;
  const postY = Phaser.Math.Clamp(targetY, 136, 236);
  const saveCatchX = keeperX;
  const saveCatchY = keeperY - 4;

  if (outcome.result === "miss") {
    const missDir = outcome.postSign || 1;
    if (outcome.missVisual === "sky" || outcome.missVisual === "over") {
      targetX = Phaser.Math.Clamp(
        targetX + missDir * Phaser.Math.Between(10, 34),
        GAME_WIDTH / 2 - 222,
        GAME_WIDTH / 2 + 222,
      );
      targetY = Phaser.Math.Between(70, 102);
    } else {
      targetX = GAME_WIDTH / 2 + missDir * Phaser.Math.Between(214, 246);
      targetY = Phaser.Math.Between(126, 236);
    }
  }

  let ballY = targetY;
  if (outcome.result === "save") {
    ballY = keeperY;
  } else if (outcome.result === "postOut") {
    ballY = targetY - 12;
  }

  scene.tweens.killTweensOf(ball);
  scene.tweens.killTweensOf(keeper);
  scene.tweens.killTweensOf(keeperShadow);
  scene.tweens.killTweensOf(scene.matchScreen.crowdFlash);
  scene.tweens.killTweensOf(scene.matchScreen.goalBurst);
  scene.tweens.killTweensOf(scene.matchScreen.reticle);

  if (outcome.shooterPower === 1) {
    scene.tweens.add({
      targets: [scene.matchScreen.goalBack, scene.matchScreen.goalFrame],
      scaleX: 1.08,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeOut",
    });
  }

  if (outcome.keeperPower === 1) {
    const aura = scene.add
      .ellipse(keeperX, keeperY, 128, 64, 0x7ec4ff, 0.18)
      .setStrokeStyle(2, 0xb9e6ff, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.matchScreen.crowdFx.add(aura);
    scene.tweens.add({
      targets: aura,
      scaleX: 1.3,
      scaleY: 1.18,
      alpha: 0,
      duration: 260,
      ease: "Sine.easeOut",
      onComplete: () => {
        aura.destroy();
      },
    });
  } else if (outcome.keeperPower === 0) {
    const c = TEAMS[getTeamIndexBySide(match, outcome.keeperSide)].primary;
    for (let i = -1; i <= 1; i += 2) {
      const wall = scene.add.rectangle(
        GAME_WIDTH / 2 + i * 118,
        190,
        18,
        88,
        c,
        0.78,
      );
      scene.matchScreen.crowdFx.add(wall);
      scene.tweens.add({
        targets: wall,
        alpha: 0,
        y: wall.y + 18,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => {
          wall.destroy();
        },
      });
    }
  } else if (outcome.keeperPower === 2) {
    const beam = scene.add
      .rectangle(keeperX, 186, 12, 108, 0xe8ff6a, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.matchScreen.crowdFx.add(beam);
    scene.tweens.add({
      targets: beam,
      alpha: 0,
      scaleX: 1.8,
      duration: 220,
      ease: "Sine.easeOut",
      onComplete: () => {
        beam.destroy();
      },
    });
  }

  if (outcome.shooterPower === 0) {
    const flame = scene.add
      .ellipse(GAME_WIDTH / 2, 516, 26, 14, 0xff8a2c, 0.52)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.matchScreen.crowdFx.add(flame);
    scene.tweens.add({
      targets: flame,
      x: targetX,
      y: ballY,
      scaleX: 2.3,
      scaleY: 1.2,
      alpha: 0,
      duration: 300,
      ease: "Cubic.easeOut",
      onComplete: () => {
        flame.destroy();
      },
    });
  }

  const finalizeOutcome = () => {
    if (outcome.result === "goal" || outcome.result === "postIn") {
      playGoalCelebration(scene, match, outcome, ball.x, ball.y);
      scene.cameras.main.shake(120, 0.0035);
    }

    if (isPressureKick(match)) {
      scene.cameras.main.zoomTo(1.03, 140);
      scene.time.delayedCall(160, () => {
        scene.cameras.main.zoomTo(1, 220);
      });
    }

    scene.matchScreen.prompt.setText(outcome.text);
    scene.matchScreen.phaseHint.setText("");
    const climateEvent =
      outcome.weather === "wind"
        ? outcome.windX > 0
          ? "VIENTO A DERECHA"
          : "VIENTO A IZQUIERDA"
        : outcome.weather === "rain"
          ? "LLUVIA"
          : "";
    scene.matchScreen.event.setText(outcome.event || climateEvent);

    if (outcome.result === "goal" || outcome.result === "postIn") {
      playSound(scene, "goal");
    } else if (outcome.result === "save") {
      playSound(scene, "save");
    } else {
      playSound(scene, "miss");
    }

    scene.time.delayedCall(520, onDone);
  };

  scene.tweens.add({
    targets: keeper,
    x: keeperX,
    y: keeperY,
    angle: keeperAngle,
    scaleX: keeperScaleX,
    scaleY: keeperScaleY,
    duration: 220,
    ease: "Cubic.easeOut",
  });
  scene.tweens.add({
    targets: keeperShadow,
    x: keeperX,
    scaleX: keeperScaleX * 1.08,
    alpha: 0.28,
    duration: 220,
    ease: "Cubic.easeOut",
  });

  if (outcome.result === "save") {
    scene.tweens.add({
      targets: ball,
      x: saveCatchX,
      y: saveCatchY,
      angle: ballSpin * 0.6,
      scaleX: 0.84,
      scaleY: 0.84,
      duration: 290,
      ease: "Cubic.easeOut",
      onComplete: () => {
        scene.tweens.add({
          targets: ball,
          y: saveCatchY + 26,
          alpha: 0.6,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 130,
        });
        scene.tweens.add({
          targets: keeper,
          alpha: 0.72,
          duration: 70,
          yoyo: true,
          repeat: 1,
        });
        scene.tweens.add({
          targets: keeperShadow,
          scaleX: keeperScaleX * 1.16,
          alpha: 0.22,
          duration: 110,
          yoyo: true,
          repeat: 1,
        });
        scene.time.delayedCall(120, finalizeOutcome);
      },
    });

    playSound(scene, "kick");
    return;
  }

  if (outcome.result === "postOut" || outcome.result === "postIn") {
    scene.tweens.add({
      targets: ball,
      x: postX,
      y: postY,
      angle: ballSpin * 0.75,
      scaleX: 0.74,
      scaleY: 0.74,
      duration: 300,
      ease: "Cubic.easeOut",
      onComplete: () => {
        const nextX =
          outcome.result === "postIn"
            ? postX - (outcome.postSign || 1) * 22
            : postX + (outcome.postSign || 1) * 34;
        const nextY = outcome.result === "postIn" ? postY + 16 : postY - 8;
        scene.tweens.add({
          targets: ball,
          x: nextX,
          y: nextY,
          alpha: outcome.result === "postOut" ? 0.72 : 1,
          scaleX: outcome.result === "postOut" ? 0.68 : 0.74,
          scaleY: outcome.result === "postOut" ? 0.68 : 0.74,
          duration: 140,
          ease: "Sine.easeOut",
          onComplete: finalizeOutcome,
        });
      },
    });

    playSound(scene, "kick");
    return;
  }

  scene.tweens.add({
    targets: ball,
    x: targetX,
    y: ballY,
    angle: ballSpin,
    scaleX: ballScale,
    scaleY: ballScale,
    duration: 360,
    ease: "Cubic.easeOut",
    onComplete: finalizeOutcome,
  });

  playSound(scene, "kick");
}

function playGoalCelebration(scene, match, outcome, x, y) {
  const teamIdx = getTeamIndexBySide(match, outcome.shooterSide);
  const c1 = TEAMS[teamIdx].primary;
  const c2 = TEAMS[teamIdx].secondary;
  const flash = scene.matchScreen.crowdFlash;
  const burst = scene.matchScreen.goalBurst;
  const crowdFx = scene.matchScreen.crowdFx;

  flash.setFillStyle(c1, 0.24).setAlpha(0.26);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 190,
    ease: "Sine.easeOut",
  });

  burst
    .setPosition(x, y)
    .setStrokeStyle(2, c2, 1)
    .setScale(0.35)
    .setAlpha(0.95);
  scene.tweens.add({
    targets: burst,
    scaleX: 2.2,
    scaleY: 2.2,
    alpha: 0,
    duration: 220,
    ease: "Cubic.easeOut",
  });

  scene.tweens.add({
    targets: scene.matchScreen.goalBack,
    alpha: 0.94,
    duration: 90,
    yoyo: true,
    repeat: 1,
  });

  for (let i = 0; i < 14; i += 1) {
    const p = scene.add.rectangle(
      Phaser.Math.Between(122, 678),
      Phaser.Math.Between(72, 146),
      Phaser.Math.Between(3, 6),
      Phaser.Math.Between(7, 12),
      i % 2 === 0 ? c1 : c2,
      0.95,
    );
    p.setAngle(Phaser.Math.Between(0, 180));
    crowdFx.add(p);
    scene.tweens.add({
      targets: p,
      x: p.x + Phaser.Math.Between(-42, 42),
      y: p.y + Phaser.Math.Between(34, 98),
      alpha: 0,
      angle: p.angle + Phaser.Math.Between(100, 300),
      duration: Phaser.Math.Between(420, 760),
      ease: "Cubic.easeOut",
      onComplete: () => {
        p.destroy();
      },
    });
  }
}

function applyOutcome(scene, match, outcome) {
  const goalDelta = outcome.goal ? Math.max(1, outcome.goalValue || 1) : 0;
  if (outcome.shooterSide === "A") {
    match.takenA += 1;
    match.historyA.push({ x: outcome.shotX, y: outcome.shotY });
    if (goalDelta > 0) {
      match.scoreA += goalDelta;
      match.marksA.push("goal");
    } else {
      match.marksA.push("miss");
    }
  } else {
    match.takenB += 1;
    match.historyB.push({ x: outcome.shotX, y: outcome.shotY });
    if (goalDelta > 0) {
      match.scoreB += goalDelta;
      match.marksB.push("goal");
    } else {
      match.marksB.push("miss");
    }
  }

  updateMatchHud(scene);

  const end = evaluateShootoutEnd(match);
  if (end.done) {
    match.winnerSide = end.winnerSide;
    finishMatch(scene, match);
    return;
  }

  scene.state.phase = "matchResult";
  match.nextAttemptAt = scene.time.now + 820;
}

function handleMatchResult(scene, time) {
  const match = scene.state.match;
  if (!match || match.winnerSide) {
    return;
  }

  if (time < match.nextAttemptAt) {
    return;
  }

  match.turn += 1;
  setupNextAttempt(scene, time);
  scene.state.phase = "matchInput";
  updateMatchHud(scene);
}

function evaluateShootoutEnd(match) {
  const reachedBase =
    match.takenA >= PENALTIES_PER_SIDE && match.takenB >= PENALTIES_PER_SIDE;
  if (
    reachedBase &&
    match.takenA === match.takenB &&
    match.scoreA !== match.scoreB
  ) {
    return { done: true, winnerSide: match.scoreA > match.scoreB ? "A" : "B" };
  }

  return { done: false, winnerSide: null };
}

function finishMatch(scene, match) {
  const winnerSide = match.winnerSide;
  const winnerTeam = getTeamIndexBySide(match, winnerSide);
  const scoreLine = `${match.scoreA}-${match.scoreB}`;

  const tournament = scene.state.tournament;
  if (!tournament) {
    showMenu(scene);
    return;
  }

  const slot =
    tournament.rounds[tournament.currentRound].matches[tournament.currentMatch];
  slot.winner = winnerTeam;
  propagateTournament(tournament);

  if (typeof tournament.champion === "number") {
    showTournamentResult(scene, tournament, tournament.champion, scoreLine);
    return;
  }

  const next = findNextPlayerMatch(tournament);
  if (!next) {
    showBracket(scene, "BRACKET UPDATE - PRESS START");
    return;
  }

  showBracket(
    scene,
    `${tournament.rounds[next.roundIndex].name} READY - PRESS START`,
  );
}

function showTournamentResult(scene, tournament, championTeam, scoreLine) {
  if (isHumanTeam(tournament, championTeam)) {
    const championPlayer = getHumanPlayerIndex(tournament, championTeam);
    showFinalScene(scene, {
      title: "WORLD CHAMPION",
      subtitle: `JUGADOR ${championPlayer} - ${teamName(championTeam)}`,
      lines: ["Ruta completada: Cuartos, Semis y Final"],
      winnerTeam: championTeam,
      options: ["NEW TOURNAMENT", "MENU"],
      context: "tournamentChampion",
    });
    playSound(scene, "win");
    return;
  }

  const humanNames = tournament.humanTeams.map(teamName).join(", ");
  const hasScore = scoreLine && scoreLine.length > 0;

  showFinalScene(scene, {
    title: "ELIMINATED",
    subtitle: hasScore
      ? `${teamName(championTeam)} te deja afuera`
      : `${teamName(championTeam)} se queda con la copa`,
    lines: hasScore
      ? [`Resultado ${scoreLine}`, `Equipos humanos: ${humanNames}`]
      : [
          `Equipos humanos: ${humanNames}`,
          "Intenta otra combinacion de jugadores",
        ],
    winnerTeam: championTeam,
    options: ["NEW TOURNAMENT", "MENU"],
    context: hasScore ? "tournamentLose" : "tournamentDone",
  });
}

function scoreFromMatch(match) {
  const diff = Math.abs(match.scoreA - match.scoreB);
  const total = match.scoreA + match.scoreB;
  return total * 10 + diff * 8;
}

function createFinalScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(24);

  const winnerGlow = scene.add
    .ellipse(GAME_WIDTH / 2, 114, 128, 58, COLORS.accent, 0.14)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setVisible(false);
  const winnerFlag = createFlagImage(scene, 0, GAME_WIDTH / 2, 114, 86, 52)
    .setVisible(false)
    .setDepth(1);
  const winnerFx = scene.add.container(0, 0).setDepth(2);

  scene.finalScreen = {
    container: c,
    winnerGlow,
    winnerFlag,
    winnerFx,
    title: scene.add
      .text(GAME_WIDTH / 2, 150, "", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#e8ff6a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5),
    subtitle: scene.add
      .text(GAME_WIDTH / 2, 206, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#f3ffe9",
        align: "center",
      })
      .setOrigin(0.5),
    body: scene.add
      .text(GAME_WIDTH / 2, 252, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8fb18e",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0),
    buttons: [],
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 420, COLORS.panel, 0.95)
      .setStrokeStyle(2, COLORS.frame, 0.95),
  );
  c.add(winnerGlow);
  c.add(winnerFlag);
  c.add(winnerFx);
  c.add(scene.finalScreen.title);
  c.add(scene.finalScreen.subtitle);
  c.add(scene.finalScreen.body);

  for (let i = 0; i < 3; i += 1) {
    const y = 412 + i * 50;
    const bg = scene.add
      .rectangle(GAME_WIDTH / 2, y, 300, 40, COLORS.panel2, 0.95)
      .setStrokeStyle(2, COLORS.frame, 0.9);
    const label = scene.add
      .text(GAME_WIDTH / 2, y, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    scene.finalScreen.buttons.push({ bg, label });
    c.add(bg);
    c.add(label);
  }

  c.setVisible(false);
}

function showFinalScene(scene, payload) {
  hideAllScreens(scene);
  scene.finalScreen.container.setVisible(true);

  scene.state.phase = "final";
  scene.state.finalContext = payload.context;
  scene.state.finalPayload = payload;
  scene.state.finalOptions = payload.options.slice();
  scene.state.finalMenu = { cursor: 0, cooldown: 0, lastAxis: 0 };

  scene.finalScreen.title.setText(payload.title || "RESULT");
  scene.finalScreen.subtitle.setText(payload.subtitle || "");
  scene.finalScreen.body.setText((payload.lines || []).join("\n"));

  scene.finalScreen.winnerFx.removeAll(true);
  scene.tweens.killTweensOf(scene.finalScreen.winnerGlow);
  scene.finalScreen.winnerGlow.setVisible(false);
  scene.finalScreen.winnerFlag.setVisible(false);

  const winnerTeam =
    typeof payload.winnerTeam === "number" ? payload.winnerTeam : -1;
  if (winnerTeam >= 0 && winnerTeam < TEAMS.length) {
    scene.finalScreen.winnerFlag.setTexture(flagTextureKey(winnerTeam));
    scene.finalScreen.winnerFlag.setVisible(true);
    scene.finalScreen.winnerGlow
      .setVisible(true)
      .setFillStyle(TEAMS[winnerTeam].primary, 0.18)
      .setAlpha(0.14);

    scene.tweens.add({
      targets: scene.finalScreen.winnerGlow,
      alpha: 0.24,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    if (payload.context === "tournamentChampion") {
      playWinnerCelebration(scene, winnerTeam);
    }
  }

  for (let i = 0; i < scene.finalScreen.buttons.length; i += 1) {
    const button = scene.finalScreen.buttons[i];
    if (i < scene.state.finalOptions.length) {
      button.bg.setVisible(true);
      button.label.setVisible(true);
      button.label.setText(scene.state.finalOptions[i]);
    } else {
      button.bg.setVisible(false);
      button.label.setVisible(false);
    }
  }

  updateFinalMenuHighlight(scene);
  clearPressed(scene);
}

function playWinnerCelebration(scene, teamIndex) {
  const fx = scene.finalScreen.winnerFx;
  fx.removeAll(true);

  const c1 = TEAMS[teamIndex].primary;
  const c2 = TEAMS[teamIndex].secondary;
  const cx = GAME_WIDTH / 2;
  const cy = 116;

  for (let i = 0; i < 18; i += 1) {
    const piece = scene.add.rectangle(
      cx,
      cy,
      Phaser.Math.Between(4, 8),
      Phaser.Math.Between(8, 14),
      i % 2 === 0 ? c1 : c2,
      0.95,
    );
    piece.setAngle(Phaser.Math.Between(0, 180));
    fx.add(piece);

    scene.tweens.add({
      targets: piece,
      x: cx + Phaser.Math.Between(-220, 220),
      y: cy + Phaser.Math.Between(80, 235),
      angle: piece.angle + Phaser.Math.Between(120, 420),
      alpha: 0,
      duration: Phaser.Math.Between(760, 1140),
      ease: "Cubic.easeOut",
      onComplete: () => {
        piece.destroy();
      },
    });
  }
}

function handleFinalInput(scene, time) {
  const menu = scene.state.finalMenu;
  const optionCount = scene.state.finalOptions.length;
  if (optionCount <= 0) {
    if (consumeAnyPressedControl(scene, ["START1", "START2", "P1_1", "P2_1"])) {
      showMenu(scene);
    }
    return;
  }

  const axisY = getVerticalMenuAxis(scene.controls);
  if (time >= menu.cooldown && axisY !== 0 && axisY !== menu.lastAxis) {
    menu.cursor = Phaser.Math.Wrap(menu.cursor + axisY, 0, optionCount);
    menu.cooldown = time + 160;
    menu.lastAxis = axisY;
    updateFinalMenuHighlight(scene);
    playSound(scene, "click");
  }

  if (axisY === 0) {
    menu.lastAxis = 0;
  }

  if (
    !consumeAnyPressedControl(scene, [
      "START1",
      "START2",
      "P1_1",
      "P2_1",
      "P1_2",
      "P2_2",
    ])
  ) {
    return;
  }

  playSound(scene, "select");
  const action = scene.state.finalOptions[menu.cursor];
  if (action === "MENU") {
    showMenu(scene);
    return;
  }
  if (action === "NEW TOURNAMENT") {
    startTeamSelect(scene);
    return;
  }

  showMenu(scene);
}

function updateFinalMenuHighlight(scene) {
  const cursor = scene.state.finalMenu.cursor;
  for (let i = 0; i < scene.finalScreen.buttons.length; i += 1) {
    const button = scene.finalScreen.buttons[i];
    if (!button.bg.visible) {
      continue;
    }
    const active = i === cursor;
    button.bg.setFillStyle(
      active ? COLORS.accent : COLORS.panel2,
      active ? 1 : 0.95,
    );
    button.bg.setStrokeStyle(
      2,
      active ? COLORS.text : COLORS.frame,
      active ? 1 : 0.9,
    );
    button.label.setColor(active ? "#0d1f12" : "#f3ffe9");
  }
}

function hideAllScreens(scene) {
  if (scene.menuScreen) scene.menuScreen.container.setVisible(false);
  if (scene.teamScreen) scene.teamScreen.container.setVisible(false);
  if (scene.bracketScreen) scene.bracketScreen.container.setVisible(false);
  if (scene.matchScreen) scene.matchScreen.container.setVisible(false);
  if (scene.finalScreen) scene.finalScreen.container.setVisible(false);
}

function createControls(scene) {
  scene.controls = {
    held: Object.create(null),
    pressed: Object.create(null),
  };

  const onKeyDown = (event) => {
    const key = normalizeIncomingKey(event.key);
    if (!key) {
      return;
    }

    const arcadeCode = KEYBOARD_TO_ARCADE[key];
    if (!arcadeCode) {
      return;
    }

    if (!scene.controls.held[arcadeCode]) {
      scene.controls.pressed[arcadeCode] = true;
    }
    scene.controls.held[arcadeCode] = true;
  };

  const onKeyUp = (event) => {
    const key = normalizeIncomingKey(event.key);
    if (!key) {
      return;
    }

    const arcadeCode = KEYBOARD_TO_ARCADE[key];
    if (!arcadeCode) {
      return;
    }

    scene.controls.held[arcadeCode] = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  scene.events.once("shutdown", () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  });
}

function clearPressed(scene) {
  for (const key of Object.keys(scene.controls.pressed)) {
    scene.controls.pressed[key] = false;
  }
}

function normalizeIncomingKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    return "";
  }

  if (key === " ") {
    return "space";
  }

  return key.toLowerCase();
}

function isControlHeld(scene, controlCode) {
  return scene.controls.held[controlCode] === true;
}

function consumeAnyPressedControl(scene, controlCodes) {
  for (const controlCode of controlCodes) {
    if (scene.controls.pressed[controlCode]) {
      scene.controls.pressed[controlCode] = false;
      return true;
    }
  }

  return false;
}

function getHorizontalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_L || controls.held.P2_L) {
    axis -= 1;
  }
  if (controls.held.P1_R || controls.held.P2_R) {
    axis += 1;
  }
  return Phaser.Math.Clamp(axis, -1, 1);
}

function getVerticalMenuAxis(controls) {
  let axis = 0;
  if (controls.held.P1_U || controls.held.P2_U) {
    axis -= 1;
  }
  if (controls.held.P1_D || controls.held.P2_D) {
    axis += 1;
  }
  return Phaser.Math.Clamp(axis, -1, 1);
}

function getPlayerAxis(controls, player) {
  const prefix = player === "P1" ? "P1" : "P2";
  let x = 0;
  let y = 0;

  if (controls.held[`${prefix}_L`]) {
    x -= 1;
  }
  if (controls.held[`${prefix}_R`]) {
    x += 1;
  }
  if (controls.held[`${prefix}_U`]) {
    y -= 1;
  }
  if (controls.held[`${prefix}_D`]) {
    y += 1;
  }

  return { x: Phaser.Math.Clamp(x, -1, 1), y: Phaser.Math.Clamp(y, -1, 1) };
}

function isHumanTeam(tournament, teamIndex) {
  return (
    typeof teamIndex === "number" &&
    Array.isArray(tournament.humanTeams) &&
    tournament.humanTeams.includes(teamIndex)
  );
}

function getHumanPlayerIndex(tournament, teamIndex) {
  if (!Array.isArray(tournament.humanTeams)) {
    return 0;
  }
  return tournament.humanTeams.indexOf(teamIndex) + 1;
}

function createTournament(humanTeams) {
  const requested = Array.isArray(humanTeams) ? humanTeams : [];
  const picked = [];
  for (let i = 0; i < requested.length; i += 1) {
    const teamIndex = requested[i];
    if (
      typeof teamIndex === "number" &&
      teamIndex >= 0 &&
      teamIndex < TEAMS.length &&
      !picked.includes(teamIndex)
    ) {
      picked.push(teamIndex);
    }
  }

  if (!picked.length) {
    picked.push(0);
  }

  const remaining = [];
  for (let i = 0; i < TEAMS.length; i += 1) {
    if (!picked.includes(i)) {
      remaining.push(i);
    }
  }

  const entrants = shuffle(picked.concat(remaining));

  const rounds = [
    { name: "QUARTERFINAL", matches: [] },
    {
      name: "SEMIFINAL",
      matches: [
        { a: null, b: null, winner: null, isPlayer: false },
        { a: null, b: null, winner: null, isPlayer: false },
      ],
    },
    {
      name: "FINAL",
      matches: [{ a: null, b: null, winner: null, isPlayer: false }],
    },
  ];

  for (let i = 0; i < 4; i += 1) {
    const a = entrants[i * 2];
    const b = entrants[i * 2 + 1];
    const isPlayer = picked.includes(a) || picked.includes(b);
    rounds[0].matches.push({
      a,
      b,
      winner: null,
      isPlayer,
    });
  }

  const tournament = {
    humanTeams: picked,
    rounds,
    currentRound: 0,
    currentMatch: 0,
    champion: null,
  };

  propagateTournament(tournament);
  return tournament;
}

function propagateTournament(tournament) {
  for (let r = 0; r < tournament.rounds.length - 1; r += 1) {
    const current = tournament.rounds[r].matches;
    const next = tournament.rounds[r + 1].matches;

    for (let i = 0; i < next.length; i += 1) {
      const sourceA = current[i * 2];
      const sourceB = current[i * 2 + 1];
      const a = sourceA ? sourceA.winner : null;
      const b = sourceB ? sourceB.winner : null;

      next[i].a = a;
      next[i].b = b;
      next[i].isPlayer =
        isHumanTeam(tournament, a) || isHumanTeam(tournament, b);

      if (a === null || b === null) {
        next[i].winner = null;
        continue;
      }

      if (next[i].winner !== a && next[i].winner !== b) {
        next[i].winner = null;
      }
    }
  }

  const finalMatch = tournament.rounds[tournament.rounds.length - 1].matches[0];
  tournament.champion = finalMatch.winner !== null ? finalMatch.winner : null;
}

function findNextPlayerMatch(tournament) {
  for (let r = 0; r < tournament.rounds.length; r += 1) {
    const round = tournament.rounds[r];
    for (let i = 0; i < round.matches.length; i += 1) {
      const match = round.matches[i];
      if (
        match.isPlayer &&
        match.winner === null &&
        match.a !== null &&
        match.b !== null
      ) {
        return { roundIndex: r, matchIndex: i };
      }
    }
  }
  return null;
}

function resolveNextCpuRound(tournament) {
  for (let r = 0; r < tournament.rounds.length; r += 1) {
    const round = tournament.rounds[r];
    const ready = [];
    let hasHumanPending = false;

    for (let i = 0; i < round.matches.length; i += 1) {
      const match = round.matches[i];
      if (match.winner !== null || match.a === null || match.b === null) {
        continue;
      }
      if (match.isPlayer) {
        hasHumanPending = true;
        break;
      }
      ready.push(match);
    }

    if (hasHumanPending) {
      return "";
    }

    if (ready.length > 0) {
      for (let i = 0; i < ready.length; i += 1) {
        const match = ready[i];
        match.winner = simulateAutoWinner(match.a, match.b);
      }
      propagateTournament(tournament);
      return round.name;
    }
  }

  return "";
}

function simulateAutoWinner(teamA, teamB) {
  const A = TEAMS[teamA];
  const B = TEAMS[teamB];

  let scoreA = 0;
  let scoreB = 0;

  for (let i = 0; i < PENALTIES_PER_SIDE; i += 1) {
    if (
      Math.random() <
      Phaser.Math.Clamp(0.68 + A.attack * 0.4 - B.keep * 0.3, 0.2, 0.9)
    ) {
      scoreA += 1;
    }
    if (
      Math.random() <
      Phaser.Math.Clamp(0.68 + B.attack * 0.4 - A.keep * 0.3, 0.2, 0.9)
    ) {
      scoreB += 1;
    }
  }

  while (scoreA === scoreB) {
    if (Math.random() < Phaser.Math.Clamp(0.66 + A.clutch * 0.35, 0.2, 0.94)) {
      scoreA += 1;
    }
    if (Math.random() < Phaser.Math.Clamp(0.66 + B.clutch * 0.35, 0.2, 0.94)) {
      scoreB += 1;
    }
  }

  return scoreA > scoreB ? teamA : teamB;
}

function isPressureKick(match) {
  const baseDone =
    match.takenA >= PENALTIES_PER_SIDE && match.takenB >= PENALTIES_PER_SIDE;
  if (baseDone) {
    return true;
  }

  const remainingA = PENALTIES_PER_SIDE - match.takenA;
  const remainingB = PENALTIES_PER_SIDE - match.takenB;
  const diff = Math.abs(match.scoreA - match.scoreB);

  return remainingA <= 1 || remainingB <= 1 || diff <= 1;
}

function getTeamIndexBySide(match, side) {
  return side === "A" ? match.teamA : match.teamB;
}

function teamCode(teamIndex) {
  if (
    typeof teamIndex !== "number" ||
    teamIndex < 0 ||
    teamIndex >= TEAMS.length
  ) {
    return "---";
  }
  return TEAMS[teamIndex].code;
}

function teamName(teamIndex) {
  if (
    typeof teamIndex !== "number" ||
    teamIndex < 0 ||
    teamIndex >= TEAMS.length
  ) {
    return "Unknown";
  }
  return TEAMS[teamIndex].name;
}

function createFlagImage(scene, teamIndex, x, y, width, height) {
  ensureFlagTextures(scene);
  return scene.add
    .image(x, y, flagTextureKey(teamIndex))
    .setDisplaySize(width, height);
}

function flagTextureKey(teamIndex) {
  return `flag-${teamCode(teamIndex)}`;
}

function ensureFlagTextures(scene) {
  const width = 36;
  const height = 24;

  for (let i = 0; i < TEAMS.length; i += 1) {
    const key = flagTextureKey(i);
    if (scene.textures.exists(key)) {
      continue;
    }

    const g = scene.make.graphics({ add: false });
    drawFlag(g, TEAMS[i].code, width, height);
    g.lineStyle(1, 0x111111, 0.85);
    g.strokeRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

function drawFlag(g, code, w, h) {
  g.clear();

  if (code === "ARG") {
    g.fillStyle(0x74c6ef, 1);
    g.fillRect(0, 0, w, h / 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, h / 3, w, h / 3);
    g.fillStyle(0x74c6ef, 1);
    g.fillRect(0, (h * 2) / 3, w, h / 3);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(w / 2, h / 2, 3);
    return;
  }

  if (code === "BRA") {
    g.fillStyle(0x1f8c3f, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xfacc15, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(w / 2, 3),
        new Phaser.Geom.Point(w - 4, h / 2),
        new Phaser.Geom.Point(w / 2, h - 3),
        new Phaser.Geom.Point(4, h / 2),
      ],
      true,
    );
    g.fillStyle(0x1d4ed8, 1);
    g.fillCircle(w / 2, h / 2, 5);
    return;
  }

  if (code === "URU") {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x60a5fa, 1);
    for (let i = 0; i < 4; i += 1) {
      g.fillRect(8, 3 + i * 6, w - 8, 2);
    }
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(4, 4, 3);
    return;
  }

  if (code === "COL") {
    g.fillStyle(0xfacc15, 1);
    g.fillRect(0, 0, w, h / 2);
    g.fillStyle(0x1d4ed8, 1);
    g.fillRect(0, h / 2, w, h / 4);
    g.fillStyle(0xdc2626, 1);
    g.fillRect(0, (h * 3) / 4, w, h / 4);
    return;
  }

  if (code === "MEX") {
    g.fillStyle(0x15803d, 1);
    g.fillRect(0, 0, w / 3, h);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle(0xdc2626, 1);
    g.fillRect((w * 2) / 3, 0, w / 3, h);
    g.fillStyle(0x15803d, 1);
    g.fillCircle(w / 2, h / 2, 2);
    return;
  }

  if (code === "USA") {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xdc2626, 1);
    for (let i = 0; i < 6; i += 1) {
      g.fillRect(0, i * 4, w, 2);
    }
    g.fillStyle(0x1e3a8a, 1);
    g.fillRect(0, 0, 14, 11);
    return;
  }

  if (code === "FRA") {
    g.fillStyle(0x1d4ed8, 1);
    g.fillRect(0, 0, w / 3, h);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle(0xdc2626, 1);
    g.fillRect((w * 2) / 3, 0, w / 3, h);
    return;
  }

  if (code === "ESP") {
    g.fillStyle(0xdc2626, 1);
    g.fillRect(0, 0, w, h / 4);
    g.fillStyle(0xfacc15, 1);
    g.fillRect(0, h / 4, w, h / 2);
    g.fillStyle(0xdc2626, 1);
    g.fillRect(0, (h * 3) / 4, w, h / 4);
    return;
  }

  g.fillStyle(0x4b5563, 1);
  g.fillRect(0, 0, w, h);
}

function colorHex(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function shuffle(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Phaser.Math.Between(0, i);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function playSound(scene, type) {
  try {
    const ctx =
      scene.sound && scene.sound.context
        ? scene.sound.context
        : new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      return;
    }

    if (type === "select") {
      osc.type = "square";
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    if (type === "kick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    if (type === "goal") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      return;
    }

    if (type === "save") {
      osc.type = "square";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.2);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
      return;
    }

    if (type === "miss") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.24);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
      return;
    }

    if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(1260, now + 0.24);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (_) {}
}
