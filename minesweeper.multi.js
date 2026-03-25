document.addEventListener("DOMContentLoaded", () => {
  const bank = window.GameZoneBank;
  const stakeInput = document.getElementById("mines-stake");
  const statusElement = document.getElementById("mines-status");
  const multiplierElement = document.getElementById("mine-multiplier");
  const potentialElement = document.getElementById("mine-potential");
  const riskElement = document.getElementById("mine-risk");
  const progressElement = document.getElementById("mine-progress");
  const lastResultElement = document.getElementById("mine-last-result");
  const startButton = document.getElementById("mines-start-button");
  const cashoutButton = document.getElementById("mines-cashout-button");
  const boardElement = document.getElementById("mine-track");

  if (
    !bank ||
    !stakeInput ||
    !statusElement ||
    !multiplierElement ||
    !potentialElement ||
    !riskElement ||
    !progressElement ||
    !lastResultElement ||
    !startButton ||
    !cashoutButton ||
    !boardElement
  ) {
    return;
  }

  const rowsPerColumn = 3;
  const steps = [
    { multiplier: 1.22 },
    { multiplier: 1.5 },
    { multiplier: 1.88 },
    { multiplier: 2.36 },
    { multiplier: 3.02 },
    { multiplier: 3.94 },
    { multiplier: 5.08 },
    { multiplier: 6.4 }
  ];

  let columns = createPlaceholderColumns();
  let roundActive = false;
  let currentColumn = 0;
  let currentStake = 0;
  let currentMultiplier = 1;

  function createPlaceholderColumns() {
    return steps.map((step, index) => ({
      index,
      multiplier: step.multiplier,
      mineRow: null,
      pickedRow: null,
      result: null,
      revealAll: false
    }));
  }

  function createRoundColumns() {
    return steps.map((step, index) => ({
      index,
      multiplier: step.multiplier,
      mineRow: Math.floor(Math.random() * rowsPerColumn),
      pickedRow: null,
      result: null,
      revealAll: false
    }));
  }

  function setTone(element, value) {
    element.classList.remove("u-positive", "u-negative", "u-neutral");

    if (value > 0) {
      element.classList.add("u-positive");
    } else if (value < 0) {
      element.classList.add("u-negative");
    } else {
      element.classList.add("u-neutral");
    }
  }

  function setStatus(message, tone = 0) {
    statusElement.textContent = message;
    setTone(statusElement, tone);
  }

  function revealBoard() {
    columns.forEach((column) => {
      column.revealAll = true;
    });
  }

  function updateSidebar() {
    const potentialWin = roundActive && currentColumn > 0 ? bank.previewPayout(currentStake, currentMultiplier) : 0;
    const nextColumn = roundActive && currentColumn < columns.length ? columns[currentColumn] : null;

    multiplierElement.textContent = `x${currentMultiplier.toFixed(2)}`;
    potentialElement.textContent = bank.formatNumber(potentialWin);
    progressElement.textContent = `${currentColumn} / ${columns.length}`;
    riskElement.textContent = nextColumn ? "33%" : "Раунд закрыт";
    cashoutButton.disabled = !(roundActive && currentColumn > 0);
    startButton.disabled = roundActive;
  }

  function getOptionState(column, rowIndex) {
    const isMine = column.mineRow === rowIndex;
    const isPicked = column.pickedRow === rowIndex;

    if (column.result === "mine" && isPicked) {
      return "mine";
    }

    if (column.result === "safe" && isPicked) {
      return "safe";
    }

    if (column.revealAll && column.mineRow !== null) {
      return isMine ? "peek-mine" : "peek-safe";
    }

    return "hidden";
  }

  function buildOption(column, rowIndex) {
    const button = document.createElement("button");
    const title = document.createElement("span");
    const icon = document.createElement("strong");
    const state = getOptionState(column, rowIndex);
    const isActive = roundActive && column.index === currentColumn;

    button.type = "button";
    button.className = "mine-option";
    button.disabled = !isActive;
    button.setAttribute("role", "gridcell");

    title.className = "mine-option__title";
    title.textContent = `Выбор ${rowIndex + 1}`;
    icon.className = "mine-option__icon";

    if (state === "safe") {
      button.classList.add("mine-option--safe", "mine-option--selected");
      icon.textContent = "♦";
    } else if (state === "mine") {
      button.classList.add("mine-option--mine", "mine-option--selected");
      icon.textContent = "✹";
    } else if (state === "peek-safe") {
      button.classList.add("mine-option--safe", "mine-option--peek-safe");
      icon.textContent = "♦";
    } else if (state === "peek-mine") {
      button.classList.add("mine-option--mine", "mine-option--peek-mine");
      icon.textContent = "✹";
    } else if (isActive) {
      icon.textContent = "?";
    } else {
      icon.textContent = "■";
    }

    button.append(title, icon);
    button.addEventListener("click", () => pickOption(column.index, rowIndex));
    return button;
  }

  function buildColumn(column) {
    const wrapper = document.createElement("article");
    const stepLabel = document.createElement("span");
    const multiplier = document.createElement("strong");
    const options = document.createElement("div");

    wrapper.className = "mine-column";

    if (roundActive && column.index === currentColumn) {
      wrapper.classList.add("mine-column--current");
    }

    stepLabel.className = "mine-column__step";
    stepLabel.textContent = `Ход ${column.index + 1}`;

    multiplier.className = "mine-column__multiplier";
    multiplier.textContent = `x${column.multiplier.toFixed(2)}`;

    options.className = "mine-column__options";

    for (let rowIndex = 0; rowIndex < rowsPerColumn; rowIndex += 1) {
      options.appendChild(buildOption(column, rowIndex));
    }

    wrapper.append(stepLabel, multiplier, options);
    return wrapper;
  }

  function renderBoard() {
    boardElement.innerHTML = "";
    columns.forEach((column) => {
      boardElement.appendChild(buildColumn(column));
    });
  }

  function render() {
    renderBoard();
    updateSidebar();
  }

  function finishRound(outcome, payout, message, tone) {
    const settlement = bank.settleRound({
      stake: currentStake,
      payout,
      outcome
    });

    lastResultElement.textContent = bank.formatSigned(settlement.net);
    setTone(lastResultElement, settlement.net);
    setStatus(message, tone);
    roundActive = false;
    currentStake = 0;
    render();
  }

  function pickOption(columnIndex, rowIndex) {
    if (!roundActive || columnIndex !== currentColumn) {
      return;
    }

    const column = columns[columnIndex];
    column.pickedRow = rowIndex;

    if (rowIndex === column.mineRow) {
      column.result = "mine";
      revealBoard();
      finishRound("loss", 0, `На ходе ${columnIndex + 1} вы попали на мину. Ставка сгорела.`, -1);
      return;
    }

    column.result = "safe";
    currentMultiplier = column.multiplier;
    currentColumn += 1;

    if (currentColumn === columns.length) {
      revealBoard();
      finishRound(
        "win",
        bank.previewPayout(currentStake, currentMultiplier),
        `Вы прошли все ходы и забрали ${bank.formatNumber(bank.previewPayout(currentStake, currentMultiplier))} рейтинга.`,
        1
      );
      return;
    }

    setStatus(
      `Ход ${columnIndex + 1} безопасный. В следующем столбце снова будет 3 варианта выбора.`,
      1
    );
    render();
  }

  function startRound() {
    if (roundActive) {
      return;
    }

    const round = bank.beginRound({ stake: stakeInput.value });

    if (!round.ok) {
      setStatus(round.message, -1);
      return;
    }

    columns = createRoundColumns();
    roundActive = true;
    currentColumn = 0;
    currentStake = round.amount;
    currentMultiplier = 1;
    setStatus(`Заход начался. В первом столбце доступны 3 клетки на выбор.`, 0);
    render();
  }

  function cashout() {
    if (!roundActive || currentColumn === 0) {
      return;
    }

    revealBoard();
    finishRound(
      "win",
      bank.previewPayout(currentStake, currentMultiplier),
      `Вы остановились после ${currentColumn} ходов и забрали ${bank.formatNumber(bank.previewPayout(currentStake, currentMultiplier))} рейтинга.`,
      1
    );
  }

  startButton.addEventListener("click", startRound);
  cashoutButton.addEventListener("click", cashout);

  setTone(lastResultElement, 0);
  setStatus("Поставьте рейтинг и нажмите «Начать заход», чтобы открыть первый столбец.", 0);
  render();
});
