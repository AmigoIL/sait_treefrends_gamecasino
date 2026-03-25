(() => {
  const STORAGE_KEY = "gamezone-casino-state";
  const STARTING_RATING = 1000;
  let state = loadState();

  function defaultState() {
    return {
      rating: STARTING_RATING,
      wins: 0,
      losses: 0,
      rounds: 0,
      totalProfit: 0,
      bestRating: STARTING_RATING
    };
  }

  function sanitizeState(raw) {
    const fallback = defaultState();
    const next = { ...fallback, ...raw };

    return {
      rating: Math.max(0, Math.round(Number(next.rating) || fallback.rating)),
      wins: Math.max(0, Math.round(Number(next.wins) || 0)),
      losses: Math.max(0, Math.round(Number(next.losses) || 0)),
      rounds: Math.max(0, Math.round(Number(next.rounds) || 0)),
      totalProfit: Math.round(Number(next.totalProfit) || 0),
      bestRating: Math.max(
        STARTING_RATING,
        Math.round(Number(next.bestRating) || fallback.bestRating),
        Math.max(0, Math.round(Number(next.rating) || fallback.rating))
      )
    };
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? sanitizeState(JSON.parse(saved)) : defaultState();
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(Math.round(value));
  }

  function formatSigned(value) {
    const rounded = Math.round(value);
    const prefix = rounded > 0 ? "+" : "";
    return `${prefix}${formatNumber(rounded)}`;
  }

  function getRankTitle(rating = state.rating) {
    if (rating >= 5000) {
      return "Король стола";
    }

    if (rating >= 2500) {
      return "Хайроллер";
    }

    if (rating >= 1500) {
      return "На серии";
    }

    if (rating >= 750) {
      return "В игре";
    }

    if (rating >= 250) {
      return "На грани";
    }

    return "Риск до нуля";
  }

  function getState() {
    return {
      ...state,
      rank: getRankTitle(state.rating)
    };
  }

  function setTone(element, tone) {
    element.classList.remove("u-positive", "u-negative", "u-neutral");

    if (tone) {
      element.classList.add(tone);
    }
  }

  function paintText(selector, value, tone) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
      setTone(element, tone);
    });
  }

  function syncStakeInputs(snapshot) {
    document.querySelectorAll("[data-stake-input]").forEach((input) => {
      input.setAttribute("max", String(snapshot.rating));

      if (!input.value) {
        input.value = snapshot.rating >= 50 ? "50" : String(Math.max(snapshot.rating, 10));
      }

      const currentValue = Number(input.value);

      if (snapshot.rating >= 10 && Number.isFinite(currentValue) && currentValue > snapshot.rating) {
        const rounded = Math.floor(snapshot.rating / 10) * 10;
        input.value = String(Math.max(10, rounded || 10));
      }
    });
  }

  function render(snapshot = getState()) {
    paintText("[data-bank-balance]", formatNumber(snapshot.rating), snapshot.rating > 0 ? "u-positive" : "u-negative");
    paintText(
      "[data-bank-profit]",
      formatSigned(snapshot.totalProfit),
      snapshot.totalProfit > 0 ? "u-positive" : snapshot.totalProfit < 0 ? "u-negative" : "u-neutral"
    );
    paintText("[data-bank-wins]", formatNumber(snapshot.wins));
    paintText("[data-bank-rounds]", formatNumber(snapshot.rounds));
    paintText("[data-bank-best]", formatNumber(snapshot.bestRating), "u-positive");
    paintText("[data-bank-rank]", snapshot.rank, "u-neutral");
    syncStakeInputs(snapshot);
  }

  function emitUpdate() {
    const snapshot = getState();
    render(snapshot);
    document.dispatchEvent(new CustomEvent("gamezone:bank-updated", { detail: snapshot }));
  }

  function normalizeStake(rawStake) {
    const amount = Number(rawStake);

    if (!Number.isFinite(amount)) {
      return 0;
    }

    return Math.floor(amount);
  }

  function beginRound({ stake }) {
    const amount = normalizeStake(stake);

    if (amount < 10) {
      return {
        ok: false,
        message: "Минимальная ставка: 10 рейтинга."
      };
    }

    if (amount > state.rating) {
      return {
        ok: false,
        message: `Недостаточно рейтинга. В банке сейчас ${formatNumber(state.rating)}.`
      };
    }

    state.rating -= amount;
    saveState();
    emitUpdate();

    return {
      ok: true,
      amount
    };
  }

  function settleRound({ stake, payout = 0, outcome = "loss" }) {
    const amount = normalizeStake(stake);
    const reward = Math.max(0, Math.round(Number(payout) || 0));
    const net = reward - amount;

    state.rating += reward;
    state.rounds += 1;

    if (outcome === "win") {
      state.wins += 1;
    }

    if (outcome === "loss") {
      state.losses += 1;
    }

    state.totalProfit += net;
    state.bestRating = Math.max(state.bestRating, state.rating);
    saveState();
    emitUpdate();

    return {
      payout: reward,
      net,
      state: getState()
    };
  }

  function previewPayout(stake, multiplier) {
    return Math.round(normalizeStake(stake) * Number(multiplier));
  }

  function resetState() {
    state = defaultState();
    saveState();
    emitUpdate();
  }

  function onUpdate(callback) {
    const handler = (event) => callback(event.detail);
    document.addEventListener("gamezone:bank-updated", handler);
    callback(getState());

    return () => {
      document.removeEventListener("gamezone:bank-updated", handler);
    };
  }

  window.GameZoneBank = {
    beginRound,
    formatNumber,
    formatSigned,
    getRankTitle,
    getState,
    onUpdate,
    previewPayout,
    resetState,
    settleRound
  };

  document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const pageLink = document.querySelector(`.site-nav a[href="${currentPath}"]`);

    if (pageLink) {
      pageLink.setAttribute("aria-current", "page");
    }

    document.querySelectorAll("[data-bank-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        const confirmed = window.confirm("Сбросить рейтинг и вернуть стартовый банк 1000?");

        if (confirmed) {
          resetState();
        }
      });
    });

    render(getState());
  });
})();
