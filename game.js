const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PENALTIES_PER_SIDE = 5;
const DECISION_TIME_MS = 6200;
const AIM_X_MIN = -3;
const AIM_X_MAX = 3;
const AIM_Y_MIN = 0;
const AIM_Y_MAX = 4;
const AIM_STEP = 0.5;
const AIM_Y_CENTER = 2;
const SHOOTER_COMBO_POOL = [1, 2, 3, 5, 6];
const KEEPER_COMBO_POOL = [1, 2, 3, 4, 5];
const COMBO_LENGTH = 3;
const SHOOTER_BAR_RATE = 0.0002;
const KEEPER_BAR_RATE = 0.00016;

const COLORS = {
  bg: 0x08130d, panel: 0x102117, panel2: 0x173021, frame: 0x3f7f4f,
  accent: 0xe8ff6a, accentSoft: 0xb2c957, text: 0xf3ffe9, danger: 0xff7f7f,
  goal: 0x5dff89, line: 0xdfffd4, shadow: 0x0a120e,
};

const TEAMS = [
  { code: "ARG", name: "Argentina", primary: 0x78cdfc, secondary: 0xffffff, attack: 0.09, keep: 0.02, clutch: 0.07, trait: "Precision" },
  { code: "BRA", name: "Brasil", primary: 0xfde047, secondary: 0x0a6e3a, attack: 0.08, keep: 0.01, clutch: 0.04, trait: "Impredecible" },
  { code: "URU", name: "Uruguay", primary: 0x93c5fd, secondary: 0x0f172a, attack: 0.05, keep: 0.03, clutch: 0.05, trait: "Potencia" },
  { code: "COL", name: "Colombia", primary: 0xfacc15, secondary: 0x1d4ed8, attack: 0.04, keep: 0.04, clutch: 0.03, trait: "Balance" },
  { code: "MEX", name: "Mexico", primary: 0x22c55e, secondary: 0xffffff, attack: 0.05, keep: 0.02, clutch: 0.09, trait: "Clutch" },
  { code: "USA", name: "EEUU", primary: 0x60a5fa, secondary: 0xef4444, attack: 0.03, keep: 0.08, clutch: 0.03, trait: "Arquero" },
  { code: "FRA", name: "Francia", primary: 0x2563eb, secondary: 0xf8fafc, attack: 0.07, keep: 0.03, clutch: 0.04, trait: "Lectura" },
  { code: "ESP", name: "Espana", primary: 0xdc2626, secondary: 0xfacc15, attack: 0.06, keep: 0.04, clutch: 0.04, trait: "Tecnica" },
];

const BACK_CODES = ["P1_6", "P2_6"];

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

  scene.decisionTimer.text.setColor(
    remainingMs < 1800 ? "#ff8e8e" : remainingMs < 3200 ? "#ffd37a" : "#b8ff8c",
  );
}

function createBackground(scene) {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x030912);
  scene.add.rectangle(cx, 92, GAME_WIDTH, 182, 0x08172a, 0.95);
  scene.add.ellipse(cx, 164, 760, 236, 0x0b1b2d, 0.92);
  scene.add.rectangle(cx, 170, 760, 76, 0x0f1f32, 0.62);
  scene.add.rectangle(cx, 206, 760, 52, 0x152436, 0.52);

  for (let i = 0; i < 11; i += 1) {
    const x = 90 + i * 62;
    scene.add.rectangle(x, 62, 40, 6, 0xffffff, 0.94);
    scene.add.ellipse(x, 84, 120, 50, 0xffffff, 0.14).setBlendMode(Phaser.BlendModes.ADD);
  }

  scene.add.triangle(106, 138, 0, 0, 170, 0, 0, 116, 0x0a1726, 0.62);
  scene.add.triangle(GAME_WIDTH - 106, 138, 0, 0, 170, 0, 170, 116, 0x0a1726, 0.62);

  scene.add.rectangle(cx, cy, 760, 560, 0x050e18, 0.74).setStrokeStyle(4, 0x4a6784, 0.86);
  scene.add.rectangle(cx, cy + 94, 684, 352, 0x173423, 0.95).setStrokeStyle(2, 0xe6f6ef, 0.42);
  scene.add.ellipse(cx, cy + 82, 464, 110, 0xffffff, 0.08).setBlendMode(Phaser.BlendModes.ADD);

  for (let i = 0; i < 7; i += 1) {
    scene.add.rectangle(160 + i * 80, cy + 94, 44, 350, 0x214431, i % 2 === 0 ? 0.2 : 0.08);
  }

  const vpY = cy + 62;
  const lColor = 0xffffff;
  scene.add.line(0, 0, cx, vpY, 80, GAME_HEIGHT - 6, lColor, 0.32).setLineWidth(2, 1);
  scene.add.line(0, 0, cx, vpY, GAME_WIDTH - 80, GAME_HEIGHT - 6, lColor, 0.32).setLineWidth(2, 1);
  scene.add.line(0, 0, cx, vpY, cx, GAME_HEIGHT - 6, lColor, 0.33).setLineWidth(2, 2);
  scene.add.circle(cx, vpY, 2, 0xffffff, 0.5);

  scene.add.ellipse(76, cy, 230, 560, 0x000000, 0.34);
  scene.add.ellipse(GAME_WIDTH - 76, cy, 230, 560, 0x000000, 0.34);
  scene.add.rectangle(cx, 42, 760, 94, 0x000000, 0.25);
  scene.add.rectangle(cx, GAME_HEIGHT - 12, 760, 34, 0x000000, 0.36);

  const timerBand = scene.add.rectangle(cx, 22, 432, 30, 0x0a1421, 0.9).setStrokeStyle(2, 0x5e7b98, 0.88).setDepth(40).setVisible(false);
  const timerText = scene.add.text(cx, 22, "", { fontFamily: "monospace", fontSize: "17px", color: "#b8ff8c", fontStyle: "bold" }).setOrigin(0.5).setDepth(41).setVisible(false);

  scene.decisionTimer = { band: timerBand, text: timerText };
  updateDecisionTimer(scene, 0);
}

function ensureMatchSpriteTextures(scene) {
  if (!scene.textures.exists("keeper-sprite")) {
    const g = scene.make.graphics({ add: false });
    const w = 62;
    const h = 34;

    g.fillStyle(0xffffff, 1);
    const fh = [9, 11, 12, 10];
    for (let i = 0; i < 4; i++) {
      g.fillRoundedRect(9 + i * 3, 2, 3, fh[i], 1);
      g.fillRoundedRect(39 + i * 3, 2, 3, fh[i], 1);
    }

    g.fillRoundedRect(9, 10, 14, 4, 2);
    g.fillRoundedRect(39, 10, 14, 4, 2);
    g.fillRoundedRect(9, 12, 14, 12, 4);
    g.fillRoundedRect(39, 12, 14, 12, 4);
    g.fillRoundedRect(5, 14, 5, 8, 2);
    g.fillRoundedRect(53, 14, 5, 8, 2);

    g.fillStyle(0x101010, 1);
    g.fillRoundedRect(10, 24, 12, 6, 2);
    g.fillRoundedRect(40, 24, 12, 6, 2);

    g.fillStyle(0xffffff, 0.28);
    g.fillRect(11, 14, 8, 2);
    g.fillRect(41, 14, 8, 2);

    g.lineStyle(1, 0x0b1b12, 0.7);
    for (let i = 0; i < 4; i++) {
      g.strokeRoundedRect(9 + i * 3, 2, 3, fh[i], 1);
      g.strokeRoundedRect(39 + i * 3, 2, 3, fh[i], 1);
    }
    g.strokeRoundedRect(9, 10, 14, 4, 2);
    g.strokeRoundedRect(39, 10, 14, 4, 2);
    g.strokeRoundedRect(9, 12, 14, 12, 4);
    g.strokeRoundedRect(39, 12, 14, 12, 4);
    g.strokeRoundedRect(5, 14, 5, 8, 2);
    g.strokeRoundedRect(53, 14, 5, 8, 2);

    g.generateTexture("keeper-sprite", w, h);
    g.destroy();
  }

  if (!scene.textures.exists("ball-sprite")) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 9);
    g.lineStyle(1, 0x203227, 0.8);
    g.strokeCircle(12, 12, 9);

    g.fillStyle(0x1a2d20, 0.45);
    [ [12,12,3], [8,8,2], [16,8,2], [9,16,2], [16,15,2] ].forEach(c => g.fillCircle(c[0], c[1], c[2]));

    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(9, 9, 2);

    g.generateTexture("ball-sprite", 24, 24);
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
      .text(GAME_WIDTH / 2, 476, "5 tiros + SD", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#9ac08f",
      })
      .setOrigin(0.5),
    footer: scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "MOVE CONFIRM", {
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
  const count = scene.state.playerCount || 1;
  const labels = ["TOURNAMENT", `PLAYERS ${count}`];
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
    button.label.setText(active ? `> ${labels[i]} <` : labels[i]);
  }

  const selected = scene.menuScreen.buttons[cursor];
  scene.menuScreen.cursorLight.setPosition(selected.bg.x, selected.bg.y);
}

function refreshMenuLabels(scene) {
  const count = Phaser.Math.Clamp(
    scene.state.playerCount || 1,
    1,
    Math.min(8, TEAMS.length),
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
      scene.state.playerCount >= Math.min(8, TEAMS.length)
        ? 1
        : scene.state.playerCount + 1;
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
    .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "MOVE CONFIRM", {
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
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 742, 430, COLORS.panel, 0.92)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(title);
  c.add(stepLabel);

  for (let i = 0; i < TEAMS.length; i += 1) {
    const colCount = 4;
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const startX = GAME_WIDTH / 2 - ((colCount - 1) * 140) / 2;
    const x = startX + col * 140;
    const y = 210 + row * 86;

    const bg = scene.add
      .rectangle(x, y, 112, 66, COLORS.panel2, 0.96)
      .setStrokeStyle(2, COLORS.frame, 0.9);
    const code = scene.add
      .text(x, y + 2, TEAMS[i].code, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const flag = createFlagImage(scene, i, x, y - 20, 32, 20);
    const name = scene.add
      .text(x, y + 22, TEAMS[i].name, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#8fb18e",
      })
      .setOrigin(0.5);

    scene.teamScreen.cells.push({ bg, code, flag, name, index: i });
    c.add(bg);
    c.add(flag);
    c.add(code);
    c.add(name);
  }

  const cursorBox = scene.add.rectangle(0, 0, 122, 76, 0, 0).setStrokeStyle(3, COLORS.accent, 1);
  scene.tweens.add({ targets: cursorBox, scaleX: 1.06, scaleY: 1.06, duration: 400, yoyo: true, repeat: -1 });
  scene.teamScreen.cursorBox = cursorBox;
  c.add(cursorBox);

  c.add(info);
  c.add(message);
  c.add(help);
  c.setVisible(false);
}

function startTeamSelect(scene) {
  const playerCount = Phaser.Math.Clamp(
    scene.state.playerCount || 1,
    1,
    Math.min(8, TEAMS.length),
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

  scene.teamScreen.help.setText("P1/P2 MOVE CONFIRM");

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
  
  const activeCell = scene.teamScreen.cells[select.cursor];
  scene.teamScreen.cursorBox.setPosition(activeCell.bg.x, activeCell.bg.y);
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
    const rowCount = Math.ceil(TEAMS.length / colCount);
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
        "START CONTINUE",
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
        "COMO JUGAR\nMUEVE\nROJA=DELANTERO\nAMARILLA=PORTERO",
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
  const t = scene.state.tournament;
  if (!t) return showMenu(scene);
  const next = findNextPlayerMatch(t);

  if (!next) {
    const res = resolveNextCpuRound(t);
    if (res) return showBracket(scene, `${res} UPDATE - PRESS START`);
    if (typeof t.champion === "number") return showTournamentResult(scene, t, t.champion, "");
    return showBracket(scene, "BRACKET UPDATE - PRESS START");
  }

  t.currentRound = next.roundIndex;
  t.currentMatch = next.matchIndex;
  const slot = t.rounds[next.roundIndex].matches[next.matchIndex];
  const ha = getHumanPlayerIndex(t, slot.a);
  const hb = getHumanPlayerIndex(t, slot.b);

  startMatch(scene, createShootoutMatch({
    mode: "tournament", roundName: t.rounds[next.roundIndex].name,
    teamA: slot.a, teamB: slot.b,
    controlA: ha > 0 ? "human" : "cpu", controlB: hb > 0 ? "human" : "cpu",
    humanA: ha, humanB: hb,
  }));
}

function createMatchScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(23);
  ensureMatchSpriteTextures(scene);
  const cx = GAME_WIDTH / 2;

  const panel = scene.add.rectangle(cx, GAME_HEIGHT / 2, 760, 560, 0x07120b, 0.8).setStrokeStyle(2, COLORS.frame, 0.45);
  const goalBack = scene.add.rectangle(cx, 186, 332, 110, 0x163f25, 0.72).setStrokeStyle(2, COLORS.line, 0.6);
  const goalFrame = scene.add.rectangle(cx, 132, 332, 8, 0xf2fff2, 0.95);
  const goalLeft = scene.add.rectangle(cx - 166, 184, 8, 104, 0xf2fff2, 1);
  const goalRight = scene.add.rectangle(cx + 166, 184, 8, 104, 0xf2fff2, 1);
  const shooterShadow = scene.add.ellipse(cx, GAME_HEIGHT - 30, 210, 26, COLORS.shadow, 0.55);
  const reticle = scene.add.container(cx, 168);
  const reticleRing = scene.add.circle(0, 0, 16, COLORS.accent, 0).setStrokeStyle(2, COLORS.accent, 1);
  const reticleH = scene.add.rectangle(0, 0, 28, 2, COLORS.accent, 1);
  const reticleV = scene.add.rectangle(0, 0, 2, 28, COLORS.accent, 1);
  reticle.add([reticleRing, reticleH, reticleV]);

  const keeperShadow = scene.add.arc(cx, 220, 14, 180, 360, false, COLORS.shadow, 0.35).setScale(2.35, 1);
  const keeper = scene.add.image(cx, 207, "keeper-sprite").setTint(0x7ec4ff);
  const ball = scene.add.image(cx, 516, "ball-sprite");
  const crowdFlash = scene.add.rectangle(cx, 124, 704, 146, 0xf8fff1, 0).setBlendMode(Phaser.BlendModes.ADD);
  const goalBurst = scene.add.circle(cx, 186, 14, 0xffffff, 0).setStrokeStyle(2, COLORS.goal, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const crowdFx = scene.add.container(0, 0);

  scene.matchScreen = {
    container: c, panel, goalBack, goalFrame, goalLeft, goalRight,
    shooterShadow, keeperShadow, reticle, reticleRing, reticleH, reticleV,
    keeper, ball, crowdFlash, goalBurst, crowdFx,
    title: scene.add.text(cx, 46, "MATCH", { fontFamily: "monospace", fontSize: "16px", color: "#b2c957", fontStyle: "bold" }).setOrigin(0.5),
    score: scene.add.container(cx, 90),
    leftFlag: createFlagImage(scene, 0, 194, 90, 48, 30),
    leftTeam: scene.add.text(236, 90, "AAA", { fontFamily: "monospace", fontSize: "28px", color: "#f3ffe9", fontStyle: "bold" }).setOrigin(0, 0.5),
    rightFlag: createFlagImage(scene, 1, GAME_WIDTH - 194, 90, 48, 30),
    rightTeam: scene.add.text(GAME_WIDTH - 236, 90, "BBB", { fontFamily: "monospace", fontSize: "28px", color: "#f3ffe9", fontStyle: "bold" }).setOrigin(1, 0.5),
    shotsA: scene.add.text(120, 154, "○○○○○", { fontFamily: "monospace", fontSize: "20px", color: "#b2c957" }).setOrigin(0, 0.5),
    shotsB: scene.add.text(GAME_WIDTH - 120, 154, "○○○○○", { fontFamily: "monospace", fontSize: "20px", color: "#b2c957" }).setOrigin(1, 0.5),
    turn: scene.add.text(cx, 154, "KICK 1 / 5", { fontFamily: "monospace", fontSize: "14px", color: "#8fb18e" }).setOrigin(0.5),
    prompt: scene.add.text(cx, 520, "SET YOUR CHOICE", { fontFamily: "monospace", fontSize: "15px", color: "#f3ffe9", align: "center" }).setOrigin(0.5),
    event: scene.add.text(cx, 568, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffb06a", align: "center" }).setOrigin(0.5),
    secretHint: scene.add.text(cx, 494, "", { fontFamily: "monospace", fontSize: "12px", color: "#8fb18e", align: "center" }).setOrigin(0.5),
  };

  scene.matchScreen.scoreBoxA = scene.add.rectangle(-40, 0, 60, 48, 0x05130b, 1).setStrokeStyle(2, 0xffffff, 0.4);
  scene.matchScreen.scoreTextA = scene.add.text(-40, 0, "0", { fontFamily: "monospace", fontSize: "36px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  scene.matchScreen.scoreBoxB = scene.add.rectangle(40, 0, 60, 48, 0x05130b, 1).setStrokeStyle(2, 0xffffff, 0.4);
  scene.matchScreen.scoreTextB = scene.add.text(40, 0, "0", { fontFamily: "monospace", fontSize: "36px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  scene.matchScreen.score.add([scene.matchScreen.scoreBoxA, scene.matchScreen.scoreTextA, scene.matchScreen.scoreBoxB, scene.matchScreen.scoreTextB, scene.add.text(0, -2, "-", { fontFamily: "monospace", fontSize: "28px", color: "#8fb18e", fontStyle: "bold" }).setOrigin(0.5)]);

  const comboContainer = scene.add.container(cx, 460);
  const comboBoxes = [];
  const comboTexts = [];
  for (let i = 0; i < COMBO_LENGTH; i++) {
    const box = scene.add.rectangle((i - 1) * 80, 0, 60, 60, 0x102117, 0.9).setStrokeStyle(2, COLORS.frame);
    const txt = scene.add.text((i - 1) * 80, 0, "", { fontFamily: "monospace", fontSize: "28px", color: "#f3ffe9", fontStyle: "bold" }).setOrigin(0.5);
    comboBoxes.push(box);
    comboTexts.push(txt);
    comboContainer.add([box, txt]);
  }
  scene.matchScreen.comboContainer = comboContainer;
  scene.matchScreen.comboBoxes = comboBoxes;
  scene.matchScreen.comboTexts = comboTexts;

  for (let i = -2; i <= 2; i += 1) c.add(scene.add.rectangle(cx + i * 66, 186, 2, 110, COLORS.line, 0.16));
  for (let i = 0; i < 4; i += 1) c.add(scene.add.rectangle(cx, 146 + i * 26, 332, 2, COLORS.line, 0.14));

  c.add([panel, goalBack, goalFrame, goalLeft, goalRight, shooterShadow, keeperShadow, reticle, keeper, ball, crowdFlash, goalBurst, crowdFx, scene.matchScreen.title, scene.matchScreen.score, scene.matchScreen.leftFlag, scene.matchScreen.leftTeam, scene.matchScreen.rightFlag, scene.matchScreen.rightTeam, scene.matchScreen.shotsA, scene.matchScreen.shotsB, scene.matchScreen.turn, scene.matchScreen.comboContainer, scene.matchScreen.secretHint, scene.matchScreen.prompt, scene.matchScreen.event]);

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

  match.pending = {
    shooterSide,
    keeperSide,
    stage: "shooter_aim",
    activeX: 0,
    activeY: AIM_Y_CENTER,
    moveAxisX: 0,
    moveAxisY: 0,
    moveRepeatAt: 0,
    shooter: {
      x: 0,
      y: AIM_Y_CENTER,
      locked: false,
      meter: 0.08,
      combo: buildRandomCombo(SHOOTER_COMBO_POOL, COMBO_LENGTH),
      comboStep: 0,
      comboPool: SHOOTER_COMBO_POOL,
    },
    keeper: {
      x: 0,
      y: AIM_Y_CENTER,
      locked: false,
      meter: 0.62,
      combo: buildRandomCombo(KEEPER_COMBO_POOL, COMBO_LENGTH),
      comboStep: 0,
      comboPool: KEEPER_COMBO_POOL,
    },
    meterUpdatedAt: time,
    revealAt: 0,
    stageStartedAt: time,
    lockDeadline: time + 15000,
    cpuReadyAt: time + Phaser.Math.Between(300, 680),
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
    .setScale(2.35, 1)
    .setAlpha(0.35);
  scene.matchScreen.reticle.setVisible(true);
  scene.matchScreen.event.setText("");
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

  scene.matchScreen.title.setText(match.roundName);
  scene.matchScreen.leftFlag.setTexture(flagTextureKey(match.teamA));
  scene.matchScreen.leftTeam.setText(teamCode(match.teamA));
  scene.matchScreen.leftTeam.setColor(colorHex(TEAMS[match.teamA].primary));
  scene.matchScreen.rightFlag.setTexture(flagTextureKey(match.teamB));
  scene.matchScreen.rightTeam.setText(teamCode(match.teamB));
  scene.matchScreen.rightTeam.setColor(colorHex(TEAMS[match.teamB].primary));
  scene.matchScreen.scoreTextA.setText(match.scoreA.toString());
  scene.matchScreen.scoreTextB.setText(match.scoreB.toString());
  scene.matchScreen.scoreBoxA.setStrokeStyle(2, TEAMS[match.teamA].primary, 1);
  scene.matchScreen.scoreBoxB.setStrokeStyle(2, TEAMS[match.teamB].primary, 1);
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
    const isShooterStage = match.pending.stage.startsWith("shooter");
    const isComboStage = match.pending.stage.endsWith("combo");
    scene.matchScreen.keeperShadow
      .setPosition(GAME_WIDTH / 2, isShooterStage ? 220 : aimToWorldY(AIM_Y_MAX))
      .setScale(isShooterStage ? 2.35 : 10.6, isShooterStage ? 1 : 5.8)
      .setFillStyle(isShooterStage ? COLORS.shadow : 0xffffff, 1)
      .setAlpha(isShooterStage ? 0.35 : 0.16);
    const activeSide = isShooterStage
      ? match.pending.shooterSide
      : match.pending.keeperSide;
    const activeTag = getSidePlayerTag(match, activeSide);
    const activeControl = activeSide === "A" ? match.controlA : match.controlB;
    const choice = isShooterStage
      ? match.pending.shooter
      : match.pending.keeper;
    const meterValue = Phaser.Math.Clamp(choice.meter || 0, 0, 1);

    if (isComboStage) {
      scene.matchScreen.prompt.setText(
        activeControl === "cpu" ? `${activeTag} ELIGIENDO...` : `${activeTag} COMBO!`
      );
      scene.matchScreen.comboContainer.setVisible(activeControl !== "cpu");
      
      for(let i=0; i<COMBO_LENGTH; i++) {
        const box = scene.matchScreen.comboBoxes[i];
        const txt = scene.matchScreen.comboTexts[i];
        if (i < choice.comboStep) {
          box.setFillStyle(0x22c55e, 1);
          box.setStrokeStyle(2, 0xffffff);
          txt.setColor("#000000");
        } else {
          box.setFillStyle(0x102117, 0.9);
          box.setStrokeStyle(2, COLORS.frame);
          txt.setColor("#f3ffe9");
        }
        txt.setText(`B${choice.combo[i]}`);
      }

      const minScale = 1;
      const maxScale = 5;
      scene.matchScreen.reticleRing.setScale(minScale + (maxScale - minScale) * meterValue);
      scene.matchScreen.reticleRing.setAlpha(1);
    } else {
      scene.matchScreen.prompt.setText(
        activeControl === "cpu" ? `${activeTag} PENSANDO...` : `${activeTag} APUNTA`
      );
      scene.matchScreen.comboContainer.setVisible(false);
      scene.matchScreen.reticleRing.setScale(1);
      scene.matchScreen.reticleRing.setAlpha(0.6);
    }

    setReticleRoleColor(scene, isShooterStage);

    scene.matchScreen.secretHint.setText(
      isShooterStage
        ? "PORTERO: NO MIRES"
        : "DELANTERO: NO",
    );
  } else if (scene.state.phase === "matchReveal") {
    scene.matchScreen.prompt.setText("REVEALING...");
    scene.matchScreen.secretHint.setText("");
    scene.matchScreen.comboContainer.setVisible(false);
  }
}

function markersText(list, totalBase = PENALTIES_PER_SIDE) {
  const base = [];
  for (let i = 0; i < totalBase; i++) {
    base.push(i < list.length ? (list[i] === "goal" ? "●" : "x") : "○");
  }
  if (list.length > totalBase) {
    base.push(`+${list.length - totalBase}`);
  }
  return base.join(" ");
}

function handleMatchInput(scene, time) {
  const match = scene.state.match;
  if (!match || !match.pending) {
    return;
  }

  const isShooterStage = match.pending.stage.startsWith("shooter");
  const activeSide = isShooterStage
    ? match.pending.shooterSide
    : match.pending.keeperSide;

  handleSideChoice(scene, match, activeSide, isShooterStage, time);

  const pending = match.pending;
  const isCpu = activeSide === "A" ? match.controlA === "cpu" : match.controlB === "cpu";
  scene.matchScreen.reticle.setVisible(isCpu ? false : true);

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

  if (pending.stage === "shooter_aim" || pending.stage === "shooter_combo") {
    if (!pending.shooter.locked) {
      pending.shooter.x = pending.activeX;
      pending.shooter.y = pending.activeY;
      pending.shooter.locked = true;
    }

    pending.stage = "keeper_aim";
    pending.stageStartedAt = time;
    pending.lockDeadline = time + 15000;
    pending.cpuReadyAt = time + Phaser.Math.Between(320, 760);
    pending.moveAxisX = 0;
    pending.moveAxisY = 0;
    pending.moveRepeatAt = 0;
    pending.meterUpdatedAt = time;

    setAimCursor(scene, match, 0, AIM_Y_CENTER);
    setReticleRoleColor(scene, false);
    scene.matchScreen.reticle.setVisible(match.keeperSide === "A" ? match.controlA !== "cpu" : match.controlB !== "cpu");
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
  scene.matchScreen.keeperShadow
    .setPosition(GAME_WIDTH / 2, 220)
    .setScale(2.35, 1)
    .setFillStyle(COLORS.shadow, 1)
    .setAlpha(0.35);
  scene.matchScreen.reticle.setVisible(false);
  scene.matchScreen.comboContainer.setVisible(false);
  scene.matchScreen.prompt.setText("REVEALING...");
  scene.matchScreen.secretHint.setText("");
}

function handleSideChoice(scene, match, side, isShooterStage, time) {
  const pending = match.pending;
  const choice = isShooterStage ? pending.shooter : pending.keeper;
  const control = side === "A" ? match.controlA : match.controlB;
  const isAimStage = pending.stage === "shooter_aim" || pending.stage === "keeper_aim";
  const isComboStage = pending.stage === "shooter_combo" || pending.stage === "keeper_combo";

  if (control === "cpu") {
    if (time < pending.cpuReadyAt) return;
    
    if (isAimStage) {
      applyCpuAim(match, side, isShooterStage);
      choice.x = clampAim(pending.activeX, AIM_X_MIN, AIM_X_MAX);
      choice.y = clampAim(pending.activeY, AIM_Y_MIN, AIM_Y_MAX);
      pending.stage = isShooterStage ? "shooter_combo" : "keeper_combo";
      pending.cpuReadyAt = time + Phaser.Math.Between(300, 600);
    } else if (isComboStage) {
      choice.comboStep = choice.combo.length;
      choice.locked = true;
      choice.meter = Phaser.Math.FloatBetween(0.2, 0.8);
      lockCurrentStage(scene, match, time);
    }
    return;
  }

  if (isAimStage) {
    let axisX = getHorizontalMenuAxis(scene.controls);
    let axisY = getVerticalMenuAxis(scene.controls);

    if (control === "human1") {
      const axis = getPlayerAxis(scene.controls, "P1");
      axisX = axis.x;
      axisY = axis.y;
    } else if (control === "human2") {
      const axis = getPlayerAxis(scene.controls, "P2");
      axisX = axis.x;
      axisY = axis.y;
    }

    if (axisX !== 0 || axisY !== 0) {
      const sameAxis = axisX === pending.moveAxisX && axisY === pending.moveAxisY;
      if (!sameAxis || time >= pending.moveRepeatAt) {
        let nX = pending.activeX + axisX * AIM_STEP;
        let nY = pending.activeY + axisY * AIM_STEP;
        nX = clampAim(nX, AIM_X_MIN, AIM_X_MAX);
        nY = clampAim(nY, AIM_Y_MIN, AIM_Y_MAX);
        
        if (!isShooterStage) {
          const arcR = 2.75;
            const dist = Math.hypot(nX, nY - AIM_Y_MAX);
            if (dist > arcR) {
               let ang = Math.atan2(nY - AIM_Y_MAX, nX);
               // Ensure angle doesn't result in NaN
               if (isNaN(ang)) ang = 0; 
               nX = Math.cos(ang) * arcR;
               nY = AIM_Y_MAX + Math.sin(ang) * arcR;
               nX = clampAim(nX, AIM_X_MIN, AIM_X_MAX);
               nY = clampAim(nY, AIM_Y_MIN, AIM_Y_MAX);
            }
        }
        
        setAimCursor(scene, match, nX, nY);
        playSound(scene, "click");
        pending.moveAxisX = axisX;
        pending.moveAxisY = axisY;
        pending.moveRepeatAt = time + (sameAxis ? 56 : 136);
      }
    } else {
      pending.moveAxisX = 0;
      pending.moveAxisY = 0;
      pending.moveRepeatAt = 0;
    }

    const confirmCodes = control === "human1" 
      ? ["P1_1", "START1"] 
      : (control === "human2" ? ["P2_1", "START2"] : ["P1_1", "P2_1", "START1", "START2"]);

    if (consumeAnyPressedControl(scene, confirmCodes)) {
      playSound(scene, "select");
      pending.stage = isShooterStage ? "shooter_combo" : "keeper_combo";
      pending.meterUpdatedAt = time;
      pending.lockDeadline = time + DECISION_TIME_MS;
      choice.meter = isShooterStage ? 0.08 : 0.62;
    }
  } else if (isComboStage) {
    updateChoiceMeter(pending, choice, isShooterStage, time);

    if (consumeComboProgress(scene, control, choice)) {
      choice.x = pending.activeX;
      choice.y = pending.activeY;
      choice.locked = true;
      playSound(scene, "select");
      lockCurrentStage(scene, match, time);
    }
  }
}

function applyCpuAim(match, side, isShooter) {
  const pending = match.pending;
  const teamIdx = getTeamIndexBySide(match, side);
  const enemySide = side === "A" ? "B" : "A";
  const enemyTeamIdx = getTeamIndexBySide(match, enemySide);
  const team = TEAMS[teamIdx];
  const enemyHist = enemySide === "A" ? match.historyA : match.historyB;

  if (isShooter) {
    let x = randomAimValue(AIM_X_MIN, AIM_X_MAX);
    let y = randomAimValue(AIM_Y_MIN, AIM_Y_MAX);
    if (isPressureKick(match) && Math.random() < 0.45) {
      y = AIM_Y_CENTER;
    }
    if (team.attack > 0.07 && Math.random() < 0.35) {
      x = Math.random() < 0.5 ? AIM_X_MIN : AIM_X_MAX;
      y = randomAimValue(AIM_Y_MIN, Math.min(AIM_Y_CENTER, AIM_Y_MAX));
    }
    pending.activeX = x;
    pending.activeY = y;
  } else {
    let guessX = randomAimValue(AIM_X_MIN, AIM_X_MAX);
    let guessY = randomAimValue(AIM_Y_MIN, AIM_Y_MAX);
    
    // CPU arc constraint
    const arcR = 2.75;
    const dist = Math.hypot(guessX, guessY - AIM_Y_MAX);
    if (dist > arcR) {
        let ang = Math.atan2(guessY - AIM_Y_MAX, guessX);
        if (isNaN(ang)) ang = 0;
        guessX = Math.cos(ang) * arcR;
        guessY = AIM_Y_MAX + Math.sin(ang) * arcR;
        guessX = clampAim(guessX, AIM_X_MIN, AIM_X_MAX);
        guessY = clampAim(guessY, AIM_Y_MIN, AIM_Y_MAX);
    }
    
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
    pending.activeX = guessX;
    pending.activeY = guessY;
  }
}

function buildRandomCombo(pool, length) {
  const bg = shuffle(pool);
  return Array.from({length}, (_, i) => bg[i % bg.length]);
}

function comboButtonCodes(control, num) {
  const s = String(num);
  if (control === "human1") return [`P1_${s}`];
  if (control === "human2") return [`P2_${s}`];
  return [`P1_${s}`, `P2_${s}`];
}

function updateChoiceMeter(pending, choice, isShooterStage, time) {
  const lastTick = pending.meterUpdatedAt || time;
  const dt = Phaser.Math.Clamp(time - lastTick, 0, 80);
  pending.meterUpdatedAt = time;
  if (dt <= 0) {
    return;
  }

  const rate = isShooterStage ? SHOOTER_BAR_RATE : -KEEPER_BAR_RATE;
  let mult = 1;
  if (isShooterStage) {
    const distX = Math.abs(choice.x);
    const distY = Math.abs(choice.y - AIM_Y_CENTER);
    mult = 1 + (distX * 0.2) + (distY * 0.35);
  }
  choice.meter = Phaser.Math.Clamp((choice.meter || 0) + dt * rate * mult, 0, 1);
}

function consumeComboProgress(scene, control, choice) {
  const exp = choice.combo[choice.comboStep];
  if (typeof exp !== "number") return true;

  const prsd = choice.comboPool.find(c => consumeAnyPressedControl(scene, comboButtonCodes(control, c)));
  if (!prsd) return false;

  if (prsd === exp) {
    playSound(scene, "click");
    return ++choice.comboStep >= choice.combo.length;
  }
  
  choice.comboStep = 0;
  playSound(scene, "miss");
  return false;
}

function setAimCursor(scene, match, x, y) {
  if (!match || !match.pending) {
    return;
  }

  match.pending.activeX = x;
  match.pending.activeY = y;
  syncReticle(scene, match.pending.activeX, match.pending.activeY);
}

function clampAim(value, min, max) {
  if (isNaN(value) || !isFinite(value)) return (min + max) / 2;
  const snapped = Math.round(value / AIM_STEP) * AIM_STEP;
  return Phaser.Math.Clamp(snapped, min, max);
}

function randomAimValue(min, max) {
  const f = Math.ceil(min / AIM_STEP);
  const l = Math.floor(max / AIM_STEP);
  return (l < f) ? clampAim(min, min, max) : Phaser.Math.Between(f, l) * AIM_STEP;
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
  const shotX = shot.x;
  const shotY = shot.y;
  const keepX = keep.x;
  const keepY = keep.y;
  const shotMeter = Phaser.Math.Clamp(shot.meter || 0.5, 0, 1);
  const keepMeter = Phaser.Math.Clamp(keep.meter || 0.5, 0, 1);

  let goalChance = 0.69;
  goalChance += shooterTeam.attack * 0.55;
  goalChance -= keeperTeam.keep * 0.55;
  goalChance += (0.5 - shotMeter) * 0.35; // shotMeter 0 = fast/perfect = high chance

  let missChance = 0.04;
  if (shotMeter > 0.6) missChance += (shotMeter - 0.6) * 0.3;

  const dx = shotX - keepX;
  const dy = shotY - keepY;
  const dist = Math.hypot(dx, dy);
  
  const keeperReadDir = Math.sign(shotX) === Math.sign(keepX) || shotX === 0;
  const keeperClose = dist < 1.2;
  const keeperNearEdge = Math.abs(keepX) >= 1.5;
  
  let savePressure = 0;
  if (dist < 0.8) savePressure += 0.45;
  else if (dist < 1.5) savePressure += 0.25;
  else if (keeperReadDir && keeperNearEdge) savePressure += 0.15;
  
  savePressure += (0.5 - keepMeter) * 0.35; // keepMeter 0 = fast/perfect = better save

  if (!keeperReadDir) goalChance += 0.08;
  goalChance -= savePressure;

  const wideShot = Math.abs(shotX) >= AIM_X_MAX - 0.5;
  const highShot = shotY <= AIM_Y_MIN + 0.5;
  const lowShot = shotY >= AIM_Y_MAX - 0.5;
  const centerLane = Math.abs(shotX) <= 1;

  if (wideShot) missChance += 0.05;
  if (highShot) missChance += 0.05;
  if (centerLane && !highShot && !lowShot) goalChance += 0.04;

  let postChance = 0.02;
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

  let postSign = shotX >= 0 ? 1 : -1;
  if (shotX === 0) {
    postSign = Math.random() < 0.5 ? -1 : 1;
  }

  let missVisual = event === "RESBALON" ? "sky" : "default";
  if (result === "miss" && missVisual === "default") {
    if (wideShot || Math.abs(shotX) >= 2 || lowShot) {
      missVisual = "wide";
    } else if (highShot) {
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
    keepY,
    shotMeter,
    keepMeter,
    result,
    goal: result === "goal" || result === "postIn",
    goalValue,
    event,
    keeperRead: keeperReadDir,
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
  const ballSpin = 430 + outcome.shotMeter * 240;
  const ballScale =
    outcome.result === "save" ? 0.88 : 0.77 - outcome.shotMeter * 0.08;
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

  let trailX = targetX;
  let trailY = ballY;
  if (outcome.result === "save") {
    trailX = saveCatchX;
    trailY = saveCatchY;
  } else if (outcome.result === "postOut" || outcome.result === "postIn") {
    trailX = postX;
    trailY = postY;
  }

  scene.tweens.killTweensOf(ball);
  scene.tweens.killTweensOf(keeper);
  scene.tweens.killTweensOf(keeperShadow);
  scene.tweens.killTweensOf(scene.matchScreen.crowdFlash);
  scene.tweens.killTweensOf(scene.matchScreen.goalBurst);
  scene.tweens.killTweensOf(scene.matchScreen.reticle);

  const trail = scene.add
    .line(0, 0, GAME_WIDTH / 2, 516, trailX, trailY, 0xffffff, 0.55)
    .setLineWidth(4, 1.5);
  scene.matchScreen.crowdFx.add(trail);
  scene.tweens.add({
    targets: trail,
    alpha: 0,
    duration: 240,
    ease: "Sine.easeOut",
    onComplete: () => {
      trail.destroy();
    },
  });

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
    scene.matchScreen.event.setText(outcome.event || "");

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
      duration: 220,
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
        scene.time.delayedCall(90, finalizeOutcome);
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
      duration: 230,
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
          duration: 105,
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
    duration: 250,
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
  const remainA = Math.max(0, PENALTIES_PER_SIDE - match.takenA);
  const remainB = Math.max(0, PENALTIES_PER_SIDE - match.takenB);

  if (match.takenA <= PENALTIES_PER_SIDE || match.takenB <= PENALTIES_PER_SIDE) {
    if (match.scoreA > match.scoreB + remainB) return { done: true, winnerSide: "A" };
    if (match.scoreB > match.scoreA + remainA) return { done: true, winnerSide: "B" };
  } else {
    if (match.takenA === match.takenB && match.scoreA !== match.scoreB) {
      return { done: true, winnerSide: match.scoreA > match.scoreB ? "A" : "B" };
    }
  }

  const reachedBase = match.takenA >= PENALTIES_PER_SIDE && match.takenB >= PENALTIES_PER_SIDE;
  if (reachedBase && match.takenA === match.takenB && match.scoreA !== match.scoreB) {
    return { done: true, winnerSide: match.scoreA > match.scoreB ? "A" : "B" };
  }

  return { done: false, winnerSide: null };
}

function finishMatch(scene, match) {
  const winnerSide = match.winnerSide;
  const winnerTeam = getTeamIndexBySide(match, winnerSide);
  const scoreLine = `${match.scoreA}-${match.scoreB}`;
  
  const tournament = scene.state.tournament;
  if (!tournament) return showMenu(scene);

  const tRound = tournament.rounds[tournament.currentRound];
  const slot = tRound.matches[tournament.currentMatch];
  slot.winner = winnerTeam;
  propagateTournament(tournament);

  if (typeof tournament.champion === "number") {
    showTournamentResult(scene, tournament, tournament.champion, scoreLine);
    return;
  }

  const next = findNextPlayerMatch(tournament);
  showBracket(scene, next ? `${tournament.rounds[next.roundIndex].name} READY - PRESS START` : "BRACKET UPDATE - PRESS START");
}

function showTournamentResult(scene, tournament, championTeam, scoreLine) {
  if (isHumanTeam(tournament, championTeam)) {
    const championPlayer = getHumanPlayerIndex(tournament, championTeam);
    showFinalScene(scene, {
      title: "WORLD CHAMPION",
      subtitle: `JUGADOR ${championPlayer} - ${teamName(championTeam)}`,
      lines: ["Cuartos, Semis y Final"],
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
          "Intenta otra combinacion",
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
    container: c, winnerGlow, winnerFlag, winnerFx,
    title: scene.add.text(GAME_WIDTH / 2, 150, "", { fontFamily: "monospace", fontSize: "40px", color: "#e8ff6a", fontStyle: "bold", align: "center" }).setOrigin(0.5),
    subtitle: scene.add.text(GAME_WIDTH / 2, 206, "", { fontFamily: "monospace", fontSize: "18px", color: "#f3ffe9", align: "center" }).setOrigin(0.5),
    body: scene.add.text(GAME_WIDTH / 2, 252, "", { fontFamily: "monospace", fontSize: "14px", color: "#8fb18e", align: "center", lineSpacing: 6 }).setOrigin(0.5, 0),
    buttons: [],
  };

  const panel = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 420, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.frame, 0.95);
  c.add(panel);
  
  const trophy = scene.add.graphics();
  trophy.fillStyle(0xffd700, 1).fillRoundedRect(-20, -30, 40, 35, 4).fillRect(-6, 5, 12, 20).fillRect(-20, 25, 40, 10);
  trophy.lineStyle(4, 0xffd700, 1).strokeCircle(-24, -15, 14).strokeCircle(24, -15, 14);
  trophy.setPosition(GAME_WIDTH / 2, 100).setVisible(false);
  c.add(trophy);

  scene.finalScreen.panel = panel;
  scene.finalScreen.trophy = trophy;
  c.add([winnerGlow, winnerFlag, winnerFx, scene.finalScreen.title, scene.finalScreen.subtitle, scene.finalScreen.body]);

  for (let i = 0; i < 3; i += 1) {
    const y = 412 + i * 50;
    const bg = scene.add.rectangle(GAME_WIDTH / 2, y, 300, 40, COLORS.panel2, 0.95).setStrokeStyle(2, COLORS.frame, 0.9);
    const label = scene.add.text(GAME_WIDTH / 2, y, "", { fontFamily: "monospace", fontSize: "20px", color: "#f3ffe9", fontStyle: "bold" }).setOrigin(0.5);
    scene.finalScreen.buttons.push({ bg, label });
    c.add([bg, label]);
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

  const isWinner = payload.context === "tournamentChampion";
  scene.finalScreen.panel.setStrokeStyle(2, isWinner ? COLORS.accentSoft : COLORS.danger, 0.95);
  scene.finalScreen.title.setColor(isWinner ? "#e8ff6a" : "#ff7f7f");
  scene.finalScreen.trophy.setVisible(isWinner);
  scene.finalScreen.winnerFlag.y = isWinner ? 226 : 336;
  scene.finalScreen.winnerGlow.y = isWinner ? 226 : 336;
  scene.finalScreen.winnerFx.y = isWinner ? 110 : 0;
  
  const wt = payload.winnerTeam ?? -1;
  if (wt >= 0 && wt < TEAMS.length) {
    scene.finalScreen.winnerFlag.setTexture(flagTextureKey(wt)).setVisible(true);
    scene.finalScreen.winnerGlow.setVisible(true).setFillStyle(TEAMS[wt].primary, 0.18).setAlpha(0.14);
    scene.tweens.add({ targets: scene.finalScreen.winnerGlow, alpha: 0.24, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (isWinner) playWinnerCelebration(scene, wt);
  }

  for (let i = 0; i < scene.finalScreen.buttons.length; i += 1) {
    const button = scene.finalScreen.buttons[i];
    const hasOpt = i < scene.state.finalOptions.length;
    button.bg.setVisible(hasOpt);
    button.label.setVisible(hasOpt);
    if (hasOpt) button.label.setText(scene.state.finalOptions[i]);
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
      cx, cy, Phaser.Math.Between(4, 8), Phaser.Math.Between(8, 14), i % 2 === 0 ? c1 : c2, 0.95
    ).setAngle(Phaser.Math.Between(0, 180));
    fx.add(piece);

    scene.tweens.add({
      targets: piece, x: cx + Phaser.Math.Between(-220, 220), y: cy + Phaser.Math.Between(80, 235),
      angle: piece.angle + Phaser.Math.Between(120, 420), alpha: 0,
      duration: Phaser.Math.Between(760, 1140), ease: "Cubic.easeOut",
      onComplete: () => piece.destroy(),
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
  const cur = scene.state.finalMenu.cursor;
  scene.finalScreen.buttons.forEach((btn, i) => {
    if (!btn.bg.visible) return;
    const a = i === cur;
    btn.bg.setFillStyle(a ? COLORS.accent : COLORS.panel2, a ? 1 : 0.95)
          .setStrokeStyle(2, a ? COLORS.text : COLORS.frame, a ? 1 : 0.9);
    btn.label.setColor(a ? "#0d1f12" : "#f3ffe9");
  });
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

function consumeAnyPressedControl(scene, controlCodes) {
  for (const controlCode of controlCodes) {
    if (scene.controls.pressed[controlCode]) {
      scene.controls.pressed[controlCode] = false;
      return true;
    }
  }

  return false;
}

function getHorizontalMenuAxis(c) {
  let axis = 0;
  if (c.held.P1_L || c.held.P2_L) axis -= 1;
  if (c.held.P1_R || c.held.P2_R) axis += 1;
  return Phaser.Math.Clamp(axis, -1, 1);
}
function getVerticalMenuAxis(c) {
  let axis = 0;
  if (c.held.P1_U || c.held.P2_U) axis -= 1;
  if (c.held.P1_D || c.held.P2_D) axis += 1;
  return Phaser.Math.Clamp(axis, -1, 1);
}

function getPlayerAxis(controls, prefix) {
  let x = 0;
  let y = 0;
  if (controls.held[`${prefix}_L`]) x -= 1;
  if (controls.held[`${prefix}_R`]) x += 1;
  if (controls.held[`${prefix}_U`]) y -= 1;
  if (controls.held[`${prefix}_D`]) y += 1;
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
    const fg = (c, y, h2) => { g.fillStyle(c, 1); g.fillRect(0, y, w, h2); };
    fg(0x74c6ef, 0, h / 3);
    fg(0xffffff, h / 3, h / 3);
    fg(0x74c6ef, (h * 2) / 3, h / 3);
    g.fillStyle(0xfacc15, 1).fillCircle(w / 2, h / 2, 3);
    return;
  }

  if (code === "BRA") {
    g.fillStyle(0x1f8c3f, 1).fillRect(0, 0, w, h);
    g.fillStyle(0xfacc15, 1).fillPoints([
        new Phaser.Geom.Point(w / 2, 3), new Phaser.Geom.Point(w - 4, h / 2),
        new Phaser.Geom.Point(w / 2, h - 3), new Phaser.Geom.Point(4, h / 2),
      ], true);
    g.fillStyle(0x1d4ed8, 1).fillCircle(w / 2, h / 2, 5);
    return;
  }

  if (code === "URU") {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, w, h);
    g.fillStyle(0x60a5fa, 1);
    for (let i = 0; i < 4; i++) g.fillRect(8, 3 + i * 6, w - 8, 2);
    g.fillStyle(0xfacc15, 1).fillCircle(4, 4, 3);
    return;
  }

  if (code === "COL") {
    const fg = (c, y, h2) => { g.fillStyle(c, 1); g.fillRect(0, y, w, h2); };
    fg(0xfacc15, 0, h / 2);
    fg(0x1d4ed8, h / 2, h / 4);
    fg(0xdc2626, (h * 3) / 4, h / 4);
    return;
  }

  if (code === "MEX" || code === "FRA") {
    const fg = (c, x) => { g.fillStyle(c, 1); g.fillRect(x, 0, w / 3, h); };
    fg(code === "MEX" ? 0x15803d : 0x1d4ed8, 0);
    fg(0xffffff, w / 3);
    fg(0xdc2626, (w * 2) / 3);
    if (code === "MEX") g.fillStyle(0x15803d, 1).fillCircle(w / 2, h / 2, 2);
    return;
  }

  if (code === "USA") {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, w, h);
    g.fillStyle(0xdc2626, 1);
    for (let i = 0; i < 6; i++) g.fillRect(0, i * 4, w, 2);
    g.fillStyle(0x1e3a8a, 1).fillRect(0, 0, 14, 11);
    return;
  }

  if (code === "ESP") {
    const fg = (c, y, h2) => { g.fillStyle(c, 1); g.fillRect(0, y, w, h2); };
    fg(0xdc2626, 0, h / 4);
    fg(0xfacc15, h / 4, h / 2);
    fg(0xdc2626, (h * 3) / 4, h / 4);
    return;
  }

  g.fillStyle(0x4b5563, 1).fillRect(0, 0, w, h);
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
    const ctx = scene.sound?.context || new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    const s = (t, f1, f2, g1, d) => {
      osc.type = t;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + d);
      gain.gain.setValueAtTime(g1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.02);
      osc.start(now);
      osc.stop(now + d + 0.02);
    };

    if (type === "click") s("square", 1100, 700, 0.07, 0.04);
    else if (type === "select") s("square", 680, 1320, 0.12, 0.08);
    else if (type === "kick") s("triangle", 220, 90, 0.16, 0.08);
    else if (type === "goal") s("sawtooth", 320, 980, 0.2, 0.16);
    else if (type === "save") s("square", 520, 170, 0.16, 0.2);
    else if (type === "miss") s("sawtooth", 260, 90, 0.18, 0.24);
    else if (type === "win") s("triangle", 420, 1260, 0.22, 0.24);
  } catch (_) {}
}
