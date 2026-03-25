document.addEventListener("DOMContentLoaded", () => {
  const bank = window.GameZoneBank;
  const coin = document.getElementById("coin");
  const button = document.getElementById("coin-button");
  const result = document.getElementById("coin-result");
  const stats = document.getElementById("coin-stats");
  const stakeInput = document.getElementById("coin-stake");
  const sessionElement = document.getElementById("coin-session");
  const lastProfitElement = document.getElementById("coin-last-profit");
  const sideButtons = Array.from(document.querySelectorAll("[data-side]"));

  if (
    !bank ||
    !coin ||
    !button ||
    !result ||
    !stats ||
    !stakeInput ||
    !sessionElement ||
    !lastProfitElement ||
    sideButtons.length === 0
  ) {
    return;
  }

  const labels = {
    heads: "Орел",
    tails: "Решка"
  };

  const session = {
    heads: 0,
    tails: 0,
    wins: 0,
    losses: 0,
    lastProfit: 0
  };

  let selectedSide = "heads";
  let isFlipping = false;

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

  function renderSelection() {
    sideButtons.forEach((sideButton) => {
      const isActive = sideButton.getAttribute("data-side") === selectedSide;
      sideButton.classList.toggle("is-active", isActive);
      sideButton.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderSession() {
    stats.textContent = `Орел: ${session.heads} | Решка: ${session.tails}`;
    sessionElement.textContent = `Побед: ${session.wins} | Поражений: ${session.losses}`;
    lastProfitElement.textContent = bank.formatSigned(session.lastProfit);
    setTone(lastProfitElement, session.lastProfit);
  }

  function setResult(message, tone) {
    result.textContent = message;
    result.dataset.tone = tone || "";
  }

  function toggleControls(disabled) {
    button.disabled = disabled;
    sideButtons.forEach((sideButton) => {
      sideButton.disabled = disabled;
    });
  }

  function playRound() {
    if (isFlipping) {
      return;
    }

    const round = bank.beginRound({ stake: stakeInput.value });

    if (!round.ok) {
      setResult(round.message, "loss");
      return;
    }

    const chosenSide = selectedSide;
    const chosenLabel = labels[chosenSide];
    const face = Math.random() < 0.5 ? "heads" : "tails";
    const faceLabel = labels[face];

    isFlipping = true;
    toggleControls(true);
    setResult(`Ставка ${bank.formatNumber(round.amount)} на ${chosenLabel}. Монета уже в воздухе...`, "");
    coin.style.setProperty("--flip-end", face === "heads" ? "1440deg" : "1620deg");
    coin.classList.remove("is-flipping");
    void coin.offsetWidth;
    coin.classList.add("is-flipping");

    window.setTimeout(() => {
      const won = face === chosenSide;
      const payout = won ? bank.previewPayout(round.amount, 1.9) : 0;
      const settlement = bank.settleRound({
        stake: round.amount,
        payout,
        outcome: won ? "win" : "loss"
      });

      coin.classList.remove("is-flipping");
      coin.dataset.face = face;
      session[face] += 1;
      session[won ? "wins" : "losses"] += 1;
      session.lastProfit = settlement.net;
      renderSession();

      if (won) {
        setResult(
          `Выпал ${faceLabel}. Вы угадали и получили ${bank.formatNumber(settlement.payout)} рейтинга.`,
          "win"
        );
      } else {
        setResult(`Выпал ${faceLabel}. Ставка ${bank.formatNumber(round.amount)} сгорела.`, "loss");
      }

      toggleControls(false);
      isFlipping = false;
    }, 1600);
  }

  sideButtons.forEach((sideButton) => {
    sideButton.addEventListener("click", () => {
      if (isFlipping) {
        return;
      }

      const side = sideButton.getAttribute("data-side");

      if (side && labels[side]) {
        selectedSide = side;
        renderSelection();
      }
    });
  });

  button.addEventListener("click", playRound);
  coin.dataset.face = "heads";
  renderSelection();
  renderSession();
});
