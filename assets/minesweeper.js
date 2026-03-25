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
  const trackElement = document.getElementById("mine-track");

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
    !trackElement
  ) {
    return;
  }

  const steps = [
    { multiplier: 1.18, safeChance: 0.86 },
    { multiplier: 1.42, safeChance: 0.82 },
    { multiplier: 1.72, safeChance: 0.77 },
    { multiplier: 2.1, safeChance: 0.72 },
    { multiplier: 2.65, safeChance: 0.66 },
    { multiplier: 3.35, safeChance: 0.6 },
    { multiplier: 4.25, safeChance: 0.54 },
    { multiplier: 5.4, safeChance: 0.48 }
  ];

  let track = createPlaceholderTrack();
  let roundActive = false;
  let currentIndex = 0;
  let currentStake = 0;
  let currentMultiplier = 1;

  function createPlaceholderTrack() {
    return steps.map((step, index) => ({
      ...step,
      index,
      safe: null,
      revealed: false,
      peek: false
    }));
  }

  function createRoundTrack() {
    return steps.map((step, index) => ({
      ...step,
      index,
      safe: Math.random() < step.safeChance,
      revealed: false,
      peek: false
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

  function revealRemainingCells() {
    track.forEach((cell) => {
      if (!cell.revealed) {
        cell.peek = true;
      }
    });
  }

  function updateSidebar() {
    const nextStep = roundActive ? track[currentIndex] || null : null;
    const potentialWin = roundActive && currentIndex > 0 ? bank.previewPayout(currentStake, currentMultiplier) : 0;

    multiplierElement.textContent = `x${currentMultiplier.toFixed(2)}`;
    potentialElement.textContent = bank.formatNumber(potentialWin);
    progressElement.textContent = `${currentIndex} / ${steps.length}`;
    riskElement.textContent = nextStep ? `${Math.round((1 - nextStep.safeChance) * 100)}%` : "Раунд закрыт";
    cashoutButton.disabled = !(roundActive && currentIndex > 0);
    startButton.disabled = roundActive;
  }

  function buildTrackCell(cell) {
    const button = document.createElement("button");
    const stepLabel = document.createElement("span");
    const icon = document.createElement("span");
    const multiplier = document.createElement("strong");
    const caption = document.createElement("span");

    button.type = "button";
    button.className = "track-cell";
    button.disabled = !(roundActive && cell.index === currentIndex);

    if (roundActive && cell.index === currentIndex) {
      button.classList.add("track-cell--current");
    }

    stepLabel.className = "track-cell__step";
    stepLabel.textContent = `Клетка ${cell.index + 1}`;

    icon.className = "track-cell__icon";
    multiplier.className = "track-cell__multiplier";
    multiplier.textContent = `x${cell.multiplier.toFixed(2)}`;
    caption.className = "track-cell__caption";

    if (cell.revealed && cell.safe) {
      button.classList.add("track-cell--safe");
      icon.textContent = "♦";
      caption.textContent = "Безопасно";
    } else if (cell.revealed && cell.safe === false) {
      button.classList.add("track-cell--mine");
      icon.textContent = "✹";
      caption.textContent = "Мина";
    } else if (cell.peek && cell.safe) {
      button.classList.add("track-cell--peek-safe");
      icon.textContent = "♦";
      caption.textContent = "Был шанс";
    } else if (cell.peek && cell.safe === false) {
      button.classList.add("track-cell--peek-mine");
      icon.textContent = "✹";
      caption.textContent = "Мина";
    } else if (roundActive && cell.index === currentIndex) {
      icon.textContent = "?";
      caption.textContent = "Открыть";
    } else {
      icon.textContent = "■";
      caption.textContent = "Скрыто";
    }

    button.append(stepLabel, icon, multiplier, caption);
    button.addEventListener("click", () => openStep(cell.index));
    return button;
  }

  function renderTrack() {
    trackElement.innerHTML = "";
    track.forEach((cell) => {
      trackElement.appendChild(buildTrackCell(cell));
    });
  }

  function render() {
    renderTrack();
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

  function openStep(index) {
    if (!roundActive || index !== currentIndex) {
      return;
    }

    const cell = track[index];
    cell.revealed = true;

    if (cell.safe) {
      currentMultiplier = cell.multiplier;
      currentIndex += 1;

      if (currentIndex === steps.length) {
        finishRound(
          "win",
          bank.previewPayout(currentStake, currentMultiplier),
          `Вы прошли всю дорожку и забрали ${bank.formatNumber(bank.previewPayout(currentStake, currentMultiplier))} рейтинга.`,
          1
        );
        return;
      }

      setStatus(
        `Клетка ${cell.index + 1} безопасна. Можно идти дальше или забирать кэшаут.`,
        1
      );
      render();
      return;
    }

    revealRemainingCells();
    finishRound("loss", 0, `На клетке ${cell.index + 1} была мина. Ставка сгорела.`, -1);
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

    track = createRoundTrack();
    roundActive = true;
    currentIndex = 0;
    currentStake = round.amount;
    currentMultiplier = 1;
    setStatus(`Заход начался. Ставка ${bank.formatNumber(round.amount)} уже в игре.`, 0);
    render();
  }

  function cashout() {
    if (!roundActive || currentIndex === 0) {
      return;
    }

    revealRemainingCells();
    finishRound(
      "win",
      bank.previewPayout(currentStake, currentMultiplier),
      `Вы остановились после ${currentIndex} клеток и забрали ${bank.formatNumber(bank.previewPayout(currentStake, currentMultiplier))} рейтинга.`,
      1
    );
  }

  startButton.addEventListener("click", startRound);
  cashoutButton.addEventListener("click", cashout);
  setTone(lastResultElement, 0);
  setStatus("Поставьте рейтинг и нажмите «Начать заход», чтобы открыть первую клетку.", 0);
  render();
});
