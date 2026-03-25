document.addEventListener("DOMContentLoaded", () => {
  const bank = window.GameZoneBank;
  const choiceButtons = document.querySelectorAll("[data-choice]");
  const stakeInput = document.getElementById("rps-stake");
  const playerChoiceElement = document.getElementById("player-choice");
  const computerChoiceElement = document.getElementById("computer-choice");
  const resultElement = document.getElementById("rps-result");
  const scoreElement = document.getElementById("player-score");
  const sessionElement = document.getElementById("rps-session");
  const lastProfitElement = document.getElementById("rps-last-profit");

  if (
    !bank ||
    choiceButtons.length === 0 ||
    !stakeInput ||
    !playerChoiceElement ||
    !computerChoiceElement ||
    !resultElement ||
    !scoreElement ||
    !sessionElement ||
    !lastProfitElement
  ) {
    return;
  }

  const labels = {
    rock: "Камень",
    scissors: "Ножницы",
    paper: "Бумага"
  };

  const beats = {
    rock: "scissors",
    scissors: "paper",
    paper: "rock"
  };

  const session = {
    player: 0,
    computer: 0,
    draws: 0,
    lastProfit: 0
  };

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

  function renderSession() {
    scoreElement.textContent = `${session.player} : ${session.computer}`;
    sessionElement.textContent = `Побед: ${session.player} | Ничьих: ${session.draws} | Поражений: ${session.computer}`;
    lastProfitElement.textContent = bank.formatSigned(session.lastProfit);
    setTone(lastProfitElement, session.lastProfit);
  }

  function setResult(message, type) {
    resultElement.textContent = message;
    resultElement.dataset.result = type;
  }

  function getComputerChoice() {
    const options = Object.keys(labels);
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  }

  function playRound(playerChoice) {
    const round = bank.beginRound({ stake: stakeInput.value });

    if (!round.ok) {
      setResult(round.message, "loss");
      return;
    }

    const computerChoice = getComputerChoice();
    playerChoiceElement.textContent = labels[playerChoice];
    computerChoiceElement.textContent = labels[computerChoice];

    if (playerChoice === computerChoice) {
      const settlement = bank.settleRound({
        stake: round.amount,
        payout: round.amount,
        outcome: "push"
      });

      session.draws += 1;
      session.lastProfit = settlement.net;
      renderSession();
      setResult(`Ничья. Ставка ${bank.formatNumber(round.amount)} вернулась обратно в банк.`, "draw");
      return;
    }

    if (beats[playerChoice] === computerChoice) {
      const settlement = bank.settleRound({
        stake: round.amount,
        payout: bank.previewPayout(round.amount, 2.2),
        outcome: "win"
      });

      session.player += 1;
      session.lastProfit = settlement.net;
      renderSession();
      setResult(
        `Победа! Компьютер выбрал ${labels[computerChoice].toLowerCase()}, выплата составила ${bank.formatNumber(settlement.payout)}.`,
        "win"
      );
      return;
    }

    const settlement = bank.settleRound({
      stake: round.amount,
      payout: 0,
      outcome: "loss"
    });

    session.computer += 1;
    session.lastProfit = settlement.net;
    renderSession();
    setResult(`Поражение. Компьютер выбрал ${labels[computerChoice].toLowerCase()}, ставка сгорела.`, "loss");
  }

  choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const playerChoice = button.getAttribute("data-choice");

      if (!playerChoice || !labels[playerChoice]) {
        return;
      }

      playRound(playerChoice);
    });
  });

  renderSession();
});
