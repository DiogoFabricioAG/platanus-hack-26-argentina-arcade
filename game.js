const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PENALTIES_PER_SIDE = 5;
const STORAGE_KEY = "world-penalty-26-highscores-v1";
const MAX_HIGH_SCORES = 8;

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
    mode: "tournament",
    menu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    finalMenu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    select: {
      mode: "tournament",
      step: "p1",
      p1Team: 0,
      p2Team: 1,
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
    highScores: [],
    saveStatus: "Loading scoreboard...",
  };

  createBackground(scene);
  createControls(scene);
  createMenuScreen(scene);
  createTeamSelectScreen(scene);
  createBracketScreen(scene);
  createMatchScreen(scene);
  createFinalScreen(scene);
  createLeaderboardScreen(scene);

  hideAllScreens(scene);
  showMenu(scene);

  loadHighScores()
    .then((scores) => {
      scene.state.highScores = scores;
      scene.state.saveStatus = "Scoreboard ready.";
      refreshLeaderboardScreen(scene);
    })
    .catch(() => {
      scene.state.highScores = [];
      scene.state.saveStatus = "Storage unavailable.";
      refreshLeaderboardScreen(scene);
    });
}

function update(time) {
  const scene = this;
  if (!scene.state) {
    return;
  }

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

  if (scene.state.phase === "leaderboard") {
    handleLeaderboardInput(scene);
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

function createBackground(scene) {
  scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    COLORS.bg,
  );
  scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 560, COLORS.bgDark, 0.82)
    .setStrokeStyle(4, COLORS.frame, 0.8);

  scene.add
    .rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 90,
      680,
      350,
      COLORS.turf,
      0.94,
    )
    .setStrokeStyle(2, COLORS.line, 0.45);
  scene.add
    .rectangle(GAME_WIDTH / 2, 235, 540, 130, COLORS.turf2, 0.25)
    .setStrokeStyle(2, COLORS.line, 0.4);
  scene.add.rectangle(GAME_WIDTH / 2, 162, 300, 18, COLORS.shadow, 0.35);

  const stripeColor = 0x2a7a47;
  for (let i = 0; i < 8; i += 1) {
    scene.add.rectangle(
      140 + i * 74,
      GAME_HEIGHT / 2 + 92,
      36,
      348,
      stripeColor,
      i % 2 === 0 ? 0.22 : 0.08,
    );
  }

  scene.add
    .text(GAME_WIDTH / 2, 20, "WORLD PENALTY 26", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#f3ffe9",
      fontStyle: "bold",
    })
    .setOrigin(0.5, 0);

  scene.add
    .text(GAME_WIDTH / 2, 52, "Arcade Shootout", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#8fb18e",
    })
    .setOrigin(0.5, 0);
}

function createMenuScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(20);
  scene.menuScreen = {
    container: c,
    buttons: [],
    subtitle: scene.add
      .text(GAME_WIDTH / 2, 104, "Selecciona modo", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#b2c957",
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

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 320, COLORS.panel, 0.92)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(scene.menuScreen.subtitle);

  const labels = ["TOURNAMENT", "VERSUS 2P", "LEADERBOARD"];
  for (let i = 0; i < labels.length; i += 1) {
    const y = 188 + i * 64;
    const bg = scene.add
      .rectangle(GAME_WIDTH / 2, y, 320, 46, COLORS.panel2, 0.95)
      .setStrokeStyle(2, COLORS.frame, 0.85);
    const label = scene.add
      .text(GAME_WIDTH / 2, y, labels[i], {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#f3ffe9",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    scene.menuScreen.buttons.push({ bg, label });
    c.add(bg);
    c.add(label);
  }

  c.add(scene.menuScreen.footer);
  c.setVisible(false);
}

function showMenu(scene) {
  hideAllScreens(scene);
  scene.menuScreen.container.setVisible(true);
  scene.state.phase = "menu";
  scene.state.menu = { cursor: 0, cooldown: 0, lastAxis: 0 };
  updateMenuHighlight(scene);
  clearPressed(scene);
}

function updateMenuHighlight(scene) {
  const cursor = scene.state.menu.cursor;
  for (let i = 0; i < scene.menuScreen.buttons.length; i += 1) {
    const button = scene.menuScreen.buttons[i];
    const active = i === cursor;
    button.bg.setFillStyle(
      active ? COLORS.accent : COLORS.panel2,
      active ? 1 : 0.95,
    );
    button.bg.setStrokeStyle(
      2,
      active ? COLORS.text : COLORS.frame,
      active ? 1 : 0.85,
    );
    button.label.setColor(active ? "#0d1f12" : "#f3ffe9");
  }
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
      startTeamSelect(scene, "tournament");
      return;
    }
    if (menu.cursor === 1) {
      startTeamSelect(scene, "versus");
      return;
    }
    showLeaderboard(scene);
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

function startTeamSelect(scene, mode) {
  scene.state.mode = mode;
  scene.state.select = {
    mode,
    step: "p1",
    p1Team: 0,
    p2Team: 1,
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

  scene.teamScreen.title.setText(
    select.mode === "tournament" ? "TOURNAMENT MODE" : "VERSUS LOCAL 2P",
  );
  scene.teamScreen.stepLabel.setText(
    select.step === "p1" ? "PLAYER 1 ELIGE EQUIPO" : "PLAYER 2 ELIGE EQUIPO",
  );
  scene.teamScreen.message.setText(select.message || "");

  const owner = select.step === "p1" ? "P1" : "P2";
  scene.teamScreen.help.setText(`${owner} MOVE  CONFIRM=B1/B2/START  BACK=B6`);

  scene.teamScreen.info.setText(`${team.name} (${team.code})\n${team.trait}`);

  for (let i = 0; i < scene.teamScreen.cells.length; i += 1) {
    const cell = scene.teamScreen.cells[i];
    const isCursor = i === select.cursor;
    const lockedByP1 = i === select.p1Team && select.step === "p2";
    const unavailable =
      select.mode === "versus" && select.step === "p2" && i === select.p1Team;
    const teamColor = TEAMS[i].primary;

    if (isCursor) {
      cell.bg.setFillStyle(COLORS.accent, 1);
      cell.bg.setStrokeStyle(2, COLORS.text, 1);
      cell.code.setColor("#102117");
      cell.name.setColor("#173021");
      cell.flag.setAlpha(1);
    } else if (lockedByP1) {
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
  const activePlayer = select.step === "p1" ? "P1" : "P2";
  const axis = getPlayerAxis(scene.controls, activePlayer);

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

  if (!consumeAnyPressedControl(scene, getConfirmCodes(activePlayer))) {
    return;
  }

  playSound(scene, "select");

  if (select.step === "p1") {
    select.p1Team = select.cursor;
    if (select.mode === "tournament") {
      startTournament(scene);
      return;
    }

    select.step = "p2";
    select.cursor = (select.p1Team + 1) % TEAMS.length;
    select.message = "PLAYER 1 LOCKED";
    refreshTeamSelectScreen(scene);
    return;
  }

  if (select.mode === "versus" && select.cursor === select.p1Team) {
    select.message = "Elige un equipo distinto al de P1";
    refreshTeamSelectScreen(scene);
    playSound(scene, "miss");
    return;
  }

  select.p2Team = select.cursor;
  startVersusMatch(scene);
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
      .text(164, 160, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f3ffe9",
        align: "left",
        lineSpacing: 6,
      })
      .setOrigin(0, 0),
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
    flagSprites: [],
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 660, 470, COLORS.panel, 0.94)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(scene.bracketScreen.title);
  c.add(scene.bracketScreen.subtitle);
  c.add(scene.bracketScreen.list);
  c.add(scene.bracketScreen.footer);
  c.setVisible(false);
}

function startTournament(scene) {
  const playerTeam = scene.state.select.p1Team;
  scene.state.tournament = createTournament(playerTeam);
  showBracket(scene, "PRESS START TO PLAY NEXT MATCH");
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

  scene.bracketScreen.subtitle.setText(subtitle || "");

  for (const sprite of scene.bracketScreen.flagSprites) {
    sprite.destroy();
  }
  scene.bracketScreen.flagSprites = [];

  const lines = [];
  const flagRows = [];

  for (let r = 0; r < tournament.rounds.length; r += 1) {
    const round = tournament.rounds[r];
    lines.push(round.name);

    for (let i = 0; i < round.matches.length; i += 1) {
      const match = round.matches[i];
      const left = teamCode(match.a);
      const right = teamCode(match.b);
      const winner = match.winner === null ? "--" : teamCode(match.winner);
      const marker = match.isPlayer ? ">" : " ";

      const lineIndex = lines.length;
      lines.push(`${marker} ${left} vs ${right} -> ${winner}`);
      flagRows.push({
        lineIndex,
        leftTeam: match.a,
        rightTeam: match.b,
        winnerTeam: match.winner,
      });
    }

    if (r < tournament.rounds.length - 1) {
      lines.push("");
    }
  }

  scene.bracketScreen.list.setText(lines.join("\n"));

  const listX = scene.bracketScreen.list.x;
  const listY = scene.bracketScreen.list.y;
  const rowHeight = 20;

  for (const row of flagRows) {
    const y = listY + row.lineIndex * rowHeight + 8;

    if (typeof row.leftTeam === "number") {
      const leftFlag = createFlagImage(
        scene,
        row.leftTeam,
        listX + 18,
        y,
        16,
        10,
      );
      scene.bracketScreen.container.add(leftFlag);
      scene.bracketScreen.flagSprites.push(leftFlag);
    }

    if (typeof row.rightTeam === "number") {
      const rightFlag = createFlagImage(
        scene,
        row.rightTeam,
        listX + 104,
        y,
        16,
        10,
      );
      scene.bracketScreen.container.add(rightFlag);
      scene.bracketScreen.flagSprites.push(rightFlag);
    }

    if (typeof row.winnerTeam === "number") {
      const winnerFlag = createFlagImage(
        scene,
        row.winnerTeam,
        listX + 214,
        y,
        14,
        9,
      );
      winnerFlag.setAlpha(0.9);
      scene.bracketScreen.container.add(winnerFlag);
      scene.bracketScreen.flagSprites.push(winnerFlag);
    }
  }
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

  const next = findNextPlayerMatch(tournament);
  if (!next) {
    if (tournament.champion === tournament.playerTeam) {
      showFinalScene(scene, {
        title: "WORLD CHAMPION",
        subtitle: `${teamName(tournament.playerTeam)} levanta la copa`,
        lines: [
          "Recorrido completo del torneo",
          "La presion no te pudo frenar",
        ],
        teamA: tournament.playerTeam,
        options: ["NEW TOURNAMENT", "LEADERBOARD", "MENU"],
        context: "tournamentChampion",
      });
      persistMatchRecord(scene, {
        mode: "TOUR",
        winner: "CHAMPION",
        team: teamCode(tournament.playerTeam),
        score: 120,
        detail: "Champion run",
      });
      return;
    }

    showFinalScene(scene, {
      title: "TOURNAMENT CLOSED",
      subtitle: "No pending player matches",
      lines: [teamName(tournament.playerTeam)],
      teamA: tournament.playerTeam,
      options: ["MENU"],
      context: "tournamentDone",
    });
    return;
  }

  tournament.currentRound = next.roundIndex;
  tournament.currentMatch = next.matchIndex;
  const slot = tournament.rounds[next.roundIndex].matches[next.matchIndex];

  const match = createShootoutMatch({
    mode: "tournament",
    roundName: tournament.rounds[next.roundIndex].name,
    teamA: slot.a,
    teamB: slot.b,
    controlA: "human1",
    controlB: "cpu",
  });

  startMatch(scene, match);
}

function createMatchScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(23);

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
  const povLeft = scene.add
    .line(GAME_WIDTH / 2, GAME_HEIGHT - 18, 0, 0, -168, -352, COLORS.line, 0.25)
    .setLineWidth(2, 2);
  const povRight = scene.add
    .line(GAME_WIDTH / 2, GAME_HEIGHT - 18, 0, 0, 168, -352, COLORS.line, 0.25)
    .setLineWidth(2, 2);
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

  const keeper = scene.add
    .rectangle(GAME_WIDTH / 2, 207, 36, 18, 0x7ec4ff, 1)
    .setStrokeStyle(2, 0xffffff, 0.9);
  const ball = scene.add
    .circle(GAME_WIDTH / 2, 516, 8, 0xffffff, 1)
    .setStrokeStyle(1, 0x102117, 0.7);

  scene.matchScreen = {
    container: c,
    panel,
    goalBack,
    goalFrame,
    goalLeft,
    goalRight,
    povLeft,
    povRight,
    shooterShadow,
    reticle,
    keeper,
    ball,
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
  c.add(povLeft);
  c.add(povRight);
  c.add(shooterShadow);
  c.add(reticle);
  c.add(keeper);
  c.add(ball);
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

function startVersusMatch(scene) {
  const select = scene.state.select;
  const match = createShootoutMatch({
    mode: "versus",
    roundName: "VERSUS",
    teamA: select.p1Team,
    teamB: select.p2Team,
    controlA: "human1",
    controlB: "human2",
  });
  startMatch(scene, match);
}

function createShootoutMatch(options) {
  return {
    mode: options.mode,
    roundName: options.roundName,
    teamA: options.teamA,
    teamB: options.teamB,
    controlA: options.controlA,
    controlB: options.controlB,
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
    stage: "shooter",
    activeX: 0,
    activeY: 1,
    shooter: { x: 0, y: 1, style: 0, locked: false },
    keeper: { x: 0, y: 1, style: 1, locked: false },
    revealAt: 0,
    stageStartedAt: time,
    lockDeadline: time + 6200,
    cpuReadyAt: time + Phaser.Math.Between(300, 680),
  };

  match.resolving = false;

  scene.matchScreen.ball
    .setPosition(GAME_WIDTH / 2, 516)
    .setFillStyle(0xffffff)
    .setAlpha(1);
  scene.matchScreen.keeper
    .setPosition(GAME_WIDTH / 2, 207)
    .setFillStyle(TEAMS[getTeamIndexBySide(match, keeperSide)].primary);
  scene.matchScreen.reticle.setVisible(true);
  scene.matchScreen.event.setText("");
  scene.matchScreen.phaseHint.setText("");
  scene.matchScreen.secretHint.setText("");

  setAimCursor(scene, match, 0, 1);

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

    const styleValue = isShooterStage
      ? match.pending.shooter.style === 0
        ? "POTENTE"
        : "COLOCADO"
      : match.pending.keeper.style === 0
        ? "AGRESIVA"
        : "SEGURA";

    scene.matchScreen.phaseHint.setText(
      activeControl === "cpu"
        ? "CPU ELIGIENDO..."
        : `ESTILO ${styleValue}  BLOQUEAR B3/B4/START`,
    );

    scene.matchScreen.secretHint.setText(
      isShooterStage
        ? "PORTERO: APARTA LA MIRADA"
        : "DELANTERO: APARTA LA MIRADA",
    );
  } else if (scene.state.phase === "matchReveal") {
    scene.matchScreen.prompt.setText("REVEALING...");
    scene.matchScreen.phaseHint.setText("");
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
    pending.lockDeadline = time + 6200;
    pending.cpuReadyAt = time + Phaser.Math.Between(320, 760);

    setAimCursor(scene, match, 0, 1);
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

  const player = control === "human1" ? "P1" : "P2";
  let moved = false;

  if (consumeAnyPressedControl(scene, [`${player}_L`])) {
    pending.activeX -= 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, [`${player}_R`])) {
    pending.activeX += 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, [`${player}_U`])) {
    pending.activeY -= 1;
    moved = true;
  }
  if (consumeAnyPressedControl(scene, [`${player}_D`])) {
    pending.activeY += 1;
    moved = true;
  }

  if (moved) {
    setAimCursor(scene, match, pending.activeX, pending.activeY);
    playSound(scene, "click");
  }

  if (consumeAnyPressedControl(scene, [`${player}_1`])) {
    choice.style = 0;
  }
  if (consumeAnyPressedControl(scene, [`${player}_2`])) {
    choice.style = 1;
  }

  const startCode = player === "P1" ? "START1" : "START2";
  if (
    consumeAnyPressedControl(scene, [`${player}_3`, `${player}_4`, startCode])
  ) {
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
    let x = Phaser.Math.Between(-2, 2);
    let y = Phaser.Math.Between(0, 2);
    if (isPressureKick(match) && Math.random() < 0.45) {
      y = 1;
    }
    if (team.attack > 0.07 && Math.random() < 0.35) {
      x = Math.random() < 0.5 ? -2 : 2;
      y = Math.random() < 0.5 ? 0 : 1;
    }
    choice.x = x;
    choice.y = y;
    choice.style = Math.random() < 0.56 ? 0 : 1;
  } else {
    let guessX = Phaser.Math.Between(-2, 2);
    let guessY = Phaser.Math.Between(0, 2);
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
      guessY = 1;
    }
    if (TEAMS[enemyTeamIdx].attack > 0.07 && Math.random() < 0.22) {
      guessX = Math.random() < 0.5 ? -2 : 2;
    }
    choice.x = guessX;
    choice.y = guessY;
    choice.style = Math.random() < (team.keep > 0.05 ? 0.62 : 0.47) ? 1 : 0;
  }
}

function setAimCursor(scene, match, x, y) {
  if (!match || !match.pending) {
    return;
  }

  match.pending.activeX = Phaser.Math.Clamp(x, -2, 2);
  match.pending.activeY = Phaser.Math.Clamp(y, 0, 2);
  syncReticle(scene, match.pending.activeX, match.pending.activeY);
}

function syncReticle(scene, x, y) {
  scene.matchScreen.reticle.setPosition(aimToWorldX(x), aimToWorldY(y));
}

function aimToWorldX(x) {
  return GAME_WIDTH / 2 + x * 56;
}

function aimToWorldY(y) {
  return 146 + y * 28;
}

function getSidePlayerTag(match, side) {
  const control = side === "A" ? match.controlA : match.controlB;
  return control === "human1" ? "P1" : control === "human2" ? "P2" : "CPU";
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

  let goalChance = 0.73;
  goalChance += shooterTeam.attack * 0.55;
  goalChance -= keeperTeam.keep * 0.55;

  let missChance = 0.05;
  if (shot.style === 0) {
    goalChance += 0.04;
    missChance += 0.05;
  } else {
    goalChance += 0.02;
    missChance -= 0.01;
  }

  const delta = Math.abs(shot.x - keep.x) + Math.abs(shot.y - keep.y);
  let savePressure = 0;
  if (delta === 0) {
    savePressure += keep.style === 0 ? 0.38 : 0.34;
  } else if (delta === 1) {
    savePressure += keep.style === 0 ? 0.2 : 0.15;
  } else if (delta === 2 && keep.style === 0) {
    savePressure += 0.08;
  }
  goalChance -= savePressure;

  if (shot.style === 0 && shot.y === 0) {
    missChance += 0.03;
  }
  if (shot.style === 0 && Math.abs(shot.x) === 2) {
    missChance += 0.03;
  }
  if (shot.style === 1 && shot.y === 1) {
    goalChance += 0.04;
  }
  if (keep.style === 1 && shot.y === 2) {
    goalChance -= 0.04;
  }
  if (keep.style === 0 && shot.y === 0) {
    goalChance -= 0.03;
  }

  let postChance = 0.02 + (shot.style === 1 ? 0.015 : 0);
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

  goalChance = Phaser.Math.Clamp(goalChance, 0.08, 0.94);
  missChance = Phaser.Math.Clamp(missChance, 0.01, 0.25);
  postChance = Phaser.Math.Clamp(postChance, 0.01, 0.23);

  const roll = Math.random();
  let result = "goal";

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
    shotX: shot.x,
    shotY: shot.y,
    keepX: keep.x,
    keepY: keep.y,
    shotStyle: shot.style,
    keepStyle: keep.style,
    result,
    goal: result === "goal" || result === "postIn",
    event,
    text,
  };
}

function animateOutcome(scene, match, outcome, onDone) {
  const ball = scene.matchScreen.ball;
  const keeper = scene.matchScreen.keeper;

  const targetX = aimToWorldX(outcome.shotX);
  const targetY = aimToWorldY(outcome.shotY);
  const keeperX = aimToWorldX(outcome.keepX);
  const keeperY = 188 + outcome.keepY * 18;

  const ballY =
    outcome.result === "save"
      ? keeperY
      : outcome.result === "miss"
        ? targetY - 26
        : outcome.result === "postOut"
          ? targetY - 12
          : targetY;

  scene.tweens.killTweensOf(ball);
  scene.tweens.killTweensOf(keeper);
  scene.tweens.killTweensOf(scene.matchScreen.reticle);

  scene.tweens.add({
    targets: keeper,
    x: keeperX,
    y: keeperY,
    duration: 220,
    ease: "Cubic.easeOut",
  });

  scene.tweens.add({
    targets: ball,
    x: targetX,
    y: ballY,
    duration: 360,
    ease: "Cubic.easeOut",
    onComplete: () => {
      if (outcome.result === "save") {
        scene.tweens.add({
          targets: ball,
          y: ballY + 20,
          alpha: 0.55,
          duration: 120,
        });
      }

      if (outcome.result === "goal" || outcome.result === "postIn") {
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
      scene.matchScreen.event.setText(outcome.event || "");

      if (outcome.result === "goal" || outcome.result === "postIn") {
        playSound(scene, "goal");
      } else if (outcome.result === "save") {
        playSound(scene, "save");
      } else {
        playSound(scene, "miss");
      }

      scene.time.delayedCall(520, onDone);
    },
  });

  playSound(scene, "kick");
}

function applyOutcome(scene, match, outcome) {
  if (outcome.shooterSide === "A") {
    match.takenA += 1;
    match.historyA.push({ x: outcome.shotX, y: outcome.shotY });
    if (outcome.goal) {
      match.scoreA += 1;
      match.marksA.push("goal");
    } else {
      match.marksA.push("miss");
    }
  } else {
    match.takenB += 1;
    match.historyB.push({ x: outcome.shotX, y: outcome.shotY });
    if (outcome.goal) {
      match.scoreB += 1;
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
  const remainingA = PENALTIES_PER_SIDE - match.takenA;
  const remainingB = PENALTIES_PER_SIDE - match.takenB;

  if (match.scoreA > match.scoreB + Math.max(0, remainingB)) {
    return { done: true, winnerSide: "A" };
  }
  if (match.scoreB > match.scoreA + Math.max(0, remainingA)) {
    return { done: true, winnerSide: "B" };
  }

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
  const loserTeam = getTeamIndexBySide(match, winnerSide === "A" ? "B" : "A");
  const scoreLine = `${match.scoreA}-${match.scoreB}`;

  if (match.mode === "versus") {
    const winnerLabel = winnerSide === "A" ? "PLAYER 1" : "PLAYER 2";
    persistMatchRecord(scene, {
      mode: "VERS",
      winner: winnerLabel,
      team: teamCode(winnerTeam),
      score: scoreFromMatch(match) + 30,
      detail: `${teamCode(match.teamA)} ${scoreLine} ${teamCode(match.teamB)}`,
    });

    showFinalScene(scene, {
      title: `${winnerLabel} WINS`,
      subtitle: `${teamName(winnerTeam)} ${scoreLine}`,
      lines: [`${teamName(loserTeam)} no pudo sostener la tanda`],
      teamA: match.teamA,
      teamB: match.teamB,
      options: ["REMATCH", "LEADERBOARD", "MENU"],
      context: "versusEnd",
    });
    return;
  }

  const tournament = scene.state.tournament;
  if (!tournament) {
    showMenu(scene);
    return;
  }

  const slot =
    tournament.rounds[tournament.currentRound].matches[tournament.currentMatch];
  slot.winner = winnerTeam;
  propagateTournament(tournament);

  if (winnerTeam !== tournament.playerTeam) {
    persistMatchRecord(scene, {
      mode: "TOUR",
      winner: "ELIM",
      team: teamCode(winnerTeam),
      score: scoreFromMatch(match),
      detail: `${teamCode(match.teamA)} ${scoreLine} ${teamCode(match.teamB)}`,
    });

    showFinalScene(scene, {
      title: "ELIMINATED",
      subtitle: `${teamName(winnerTeam)} te deja afuera`,
      lines: [`Resultado ${scoreLine}`, "Intenta otro camino a la copa"],
      teamA: winnerTeam,
      teamB: loserTeam,
      options: ["NEW TOURNAMENT", "LEADERBOARD", "MENU"],
      context: "tournamentLose",
    });
    return;
  }

  const next = findNextPlayerMatch(tournament);
  if (!next) {
    tournament.champion = winnerTeam;
    persistMatchRecord(scene, {
      mode: "TOUR",
      winner: "CHAMP",
      team: teamCode(winnerTeam),
      score: 100 + scoreFromMatch(match),
      detail: "Champion run",
    });

    showFinalScene(scene, {
      title: "WORLD CHAMPION",
      subtitle: `${teamName(winnerTeam)} campeon del 26`,
      lines: ["Ruta completada: Cuartos, Semis y Final"],
      teamA: winnerTeam,
      teamB: loserTeam,
      options: ["NEW TOURNAMENT", "LEADERBOARD", "MENU"],
      context: "tournamentChampion",
    });
    playSound(scene, "win");
    return;
  }

  showBracket(
    scene,
    `${tournament.rounds[next.roundIndex].name} READY - PRESS START`,
  );
}

function scoreFromMatch(match) {
  const diff = Math.abs(match.scoreA - match.scoreB);
  const total = match.scoreA + match.scoreB;
  return total * 10 + diff * 8;
}

function createFinalScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(24);

  scene.finalScreen = {
    container: c,
    title: scene.add
      .text(GAME_WIDTH / 2, 150, "", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#e8ff6a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5),
    leftFlag: createFlagImage(scene, 0, GAME_WIDTH / 2 - 62, 206, 42, 26),
    rightFlag: createFlagImage(scene, 1, GAME_WIDTH / 2 + 62, 206, 42, 26),
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
    saveStatus: scene.add
      .text(GAME_WIDTH / 2, 346, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#b2c957",
        align: "center",
      })
      .setOrigin(0.5),
    buttons: [],
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 420, COLORS.panel, 0.95)
      .setStrokeStyle(2, COLORS.frame, 0.95),
  );
  c.add(scene.finalScreen.title);
  c.add(scene.finalScreen.leftFlag);
  c.add(scene.finalScreen.rightFlag);
  c.add(scene.finalScreen.subtitle);
  c.add(scene.finalScreen.body);
  c.add(scene.finalScreen.saveStatus);

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
  scene.finalScreen.saveStatus.setText(scene.state.saveStatus || "");

  const hasLeftFlag = typeof payload.teamA === "number";
  const hasRightFlag = typeof payload.teamB === "number";
  scene.finalScreen.leftFlag.setVisible(hasLeftFlag);
  scene.finalScreen.rightFlag.setVisible(hasRightFlag);

  if (hasLeftFlag) {
    scene.finalScreen.leftFlag.setTexture(flagTextureKey(payload.teamA));
  }
  if (hasRightFlag) {
    scene.finalScreen.rightFlag.setTexture(flagTextureKey(payload.teamB));
  }

  scene.finalScreen.leftFlag.setX(
    hasRightFlag ? GAME_WIDTH / 2 - 62 : GAME_WIDTH / 2,
  );
  scene.finalScreen.rightFlag.setX(GAME_WIDTH / 2 + 62);

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
  if (action === "LEADERBOARD") {
    showLeaderboard(scene);
    return;
  }
  if (action === "REMATCH") {
    startVersusMatch(scene);
    return;
  }
  if (action === "NEW TOURNAMENT") {
    startTeamSelect(scene, "tournament");
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

function createLeaderboardScreen(scene) {
  const c = scene.add.container(0, 0).setDepth(22);

  scene.leaderboardScreen = {
    container: c,
    title: scene.add
      .text(GAME_WIDTH / 2, 102, "LEADERBOARD", {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#e8ff6a",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
    list: scene.add
      .text(GAME_WIDTH / 2, 152, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f3ffe9",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0),
    footer: scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 24,
        "PRESS START OR B1/B2 TO RETURN",
        {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#8fb18e",
        },
      )
      .setOrigin(0.5),
  };

  c.add(
    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 640, 450, COLORS.panel, 0.95)
      .setStrokeStyle(2, COLORS.frame, 0.9),
  );
  c.add(scene.leaderboardScreen.title);
  c.add(scene.leaderboardScreen.list);
  c.add(scene.leaderboardScreen.footer);
  c.setVisible(false);
}

function showLeaderboard(scene) {
  hideAllScreens(scene);
  scene.leaderboardScreen.container.setVisible(true);
  scene.state.phase = "leaderboard";
  refreshLeaderboardScreen(scene);
  clearPressed(scene);
}

function refreshLeaderboardScreen(scene) {
  const lines = [];
  lines.push("RANK  MODE  TEAM  SCORE  RESULT  DATE");
  lines.push("--------------------------------------");

  if (!scene.state.highScores.length) {
    lines.push("NO SAVED SCORES YET");
  } else {
    for (let i = 0; i < scene.state.highScores.length; i += 1) {
      const entry = scene.state.highScores[i];
      const rank = String(i + 1).padStart(2, "0");
      const mode = entry.mode.padEnd(4, " ");
      const team = entry.team.padEnd(4, " ");
      const score = String(entry.score).padStart(4, " ");
      const result = entry.winner.slice(0, 6).padEnd(6, " ");
      lines.push(
        `${rank}    ${mode}  ${team}  ${score}   ${result}  ${entry.savedAt}`,
      );
    }
  }

  if (scene.state.saveStatus) {
    lines.push("");
    lines.push(scene.state.saveStatus);
  }

  scene.leaderboardScreen.list.setText(lines.join("\n"));
}

function handleLeaderboardInput(scene) {
  if (
    consumeAnyPressedControl(scene, [
      "START1",
      "START2",
      "P1_1",
      "P2_1",
      "P1_2",
      "P2_2",
    ])
  ) {
    showMenu(scene);
  }
}

function hideAllScreens(scene) {
  if (scene.menuScreen) scene.menuScreen.container.setVisible(false);
  if (scene.teamScreen) scene.teamScreen.container.setVisible(false);
  if (scene.bracketScreen) scene.bracketScreen.container.setVisible(false);
  if (scene.matchScreen) scene.matchScreen.container.setVisible(false);
  if (scene.finalScreen) scene.finalScreen.container.setVisible(false);
  if (scene.leaderboardScreen)
    scene.leaderboardScreen.container.setVisible(false);
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

function getConfirmCodes(player) {
  return player === "P1"
    ? ["P1_1", "P1_2", "START1"]
    : ["P2_1", "P2_2", "START2"];
}

function createTournament(playerTeam) {
  const entrants = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  const idx = entrants.indexOf(playerTeam);
  if (idx >= 0) {
    entrants.splice(idx, 1);
  }
  entrants.splice(Phaser.Math.Between(0, entrants.length), 0, playerTeam);

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
    const isPlayer = a === playerTeam || b === playerTeam;
    rounds[0].matches.push({
      a,
      b,
      winner: isPlayer ? null : simulateAutoWinner(a, b),
      isPlayer,
    });
  }

  const tournament = {
    playerTeam,
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
        a === tournament.playerTeam || b === tournament.playerTeam;

      if (a === null || b === null) {
        next[i].winner = null;
        continue;
      }

      if (next[i].isPlayer) {
        if (next[i].winner !== a && next[i].winner !== b) {
          next[i].winner = null;
        }
      } else {
        next[i].winner = simulateAutoWinner(a, b);
      }
    }
  }

  const finalMatch = tournament.rounds[tournament.rounds.length - 1].matches[0];
  if (finalMatch.winner !== null) {
    tournament.champion = finalMatch.winner;
  }
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

function persistMatchRecord(scene, entry) {
  const record = {
    mode: entry.mode || "UNK",
    winner: entry.winner || "---",
    team: entry.team || "---",
    score: typeof entry.score === "number" ? entry.score : 0,
    detail: entry.detail || "",
    savedAt: new Date().toISOString().slice(0, 10),
  };

  scene.state.saveStatus = "Saving result...";

  persistHighScore(record)
    .then((scores) => {
      scene.state.highScores = scores;
      scene.state.saveStatus = "Result saved.";
      refreshLeaderboardScreen(scene);
      if (scene.finalScreen) {
        scene.finalScreen.saveStatus.setText(scene.state.saveStatus);
      }
    })
    .catch(() => {
      scene.state.saveStatus = "Could not save result.";
      refreshLeaderboardScreen(scene);
      if (scene.finalScreen) {
        scene.finalScreen.saveStatus.setText(scene.state.saveStatus);
      }
    });
}

async function persistHighScore(entry) {
  const existing = await loadHighScores();
  const next = existing
    .concat(entry)
    .filter(isHighScoreEntry)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.savedAt < right.savedAt ? 1 : -1;
    })
    .slice(0, MAX_HIGH_SCORES);

  await storageSet(STORAGE_KEY, next);
  return next;
}

async function loadHighScores() {
  const result = await storageGet(STORAGE_KEY);
  if (!result.found || !Array.isArray(result.value)) {
    return [];
  }

  const mapped = result.value
    .map(normalizeScoreEntry)
    .filter(isHighScoreEntry)
    .slice(0, MAX_HIGH_SCORES);

  return mapped;
}

function normalizeScoreEntry(entry) {
  if (isHighScoreEntry(entry)) {
    return entry;
  }

  if (
    entry &&
    typeof entry === "object" &&
    typeof entry.name === "string" &&
    typeof entry.winner === "string" &&
    typeof entry.score === "number" &&
    typeof entry.savedAt === "string"
  ) {
    return {
      mode: "OLD",
      winner: entry.winner,
      team: entry.name,
      score: entry.score,
      detail: typeof entry.detail === "string" ? entry.detail : "",
      savedAt: entry.savedAt,
    };
  }

  return null;
}

function isHighScoreEntry(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.mode === "string" &&
    typeof value.winner === "string" &&
    typeof value.team === "string" &&
    typeof value.score === "number" &&
    typeof value.detail === "string" &&
    typeof value.savedAt === "string"
  );
}

function getStorage() {
  if (window.platanusArcadeStorage) {
    return window.platanusArcadeStorage;
  }

  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null
          ? { found: false, value: null }
          : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
  };
}

async function storageGet(key) {
  return getStorage().get(key);
}

async function storageSet(key, value) {
  return getStorage().set(key, value);
}
