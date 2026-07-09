async function tweenVolume(audio, from, to, durationMs) {
  const steps = 12;
  const stepDuration = durationMs / steps;
  const delta = (to - from) / steps;

  audio.volume = from;

  for (let index = 0; index < steps; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, stepDuration));
    audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
  }

  audio.volume = to;
}

function initializeBossZoneAlert() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const zone = document.querySelector(".page-shell, .marketplace-main, .module-shell");

  if (!zone) {
    return;
  }

  const layer = document.createElement("div");
  layer.className = "alert-pulse-layer";
  document.body.appendChild(layer);

  let lastPulseAt = 0;

  zone.addEventListener(
    "mousemove",
    (event) => {
      const now = performance.now();

      if (now - lastPulseAt < 90) {
        return;
      }

      lastPulseAt = now;

      const pulse = document.createElement("span");
      pulse.className = "alert-pulse";

      if (Math.random() > 0.72) {
        pulse.classList.add("is-gold");
      }

      pulse.style.setProperty("--pulse-x", `${event.clientX + 18}px`);
      pulse.style.setProperty("--pulse-y", `${event.clientY - 12}px`);
      layer.appendChild(pulse);

      pulse.addEventListener(
        "animationend",
        () => {
          pulse.remove();
        },
        { once: true }
      );
    },
    { passive: true }
  );

  zone.addEventListener("mouseleave", () => {
    layer.replaceChildren();
  });
}

function initializeAudioPlayers() {
  document.querySelectorAll("[data-audio-player]").forEach((player) => {
    const audio = player.querySelector("audio");
    const button = player.querySelector("[data-audio-toggle]");
    const status = player.querySelector("[data-audio-status]");
    const source = player.getAttribute("data-audio-src");

    if (!audio || !button || !status || !source) {
      return;
    }

    audio.src = source;
    audio.preload = "none";
    audio.volume = 0;

    const setState = (state, label, message) => {
      button.dataset.state = state;
      button.textContent = label;
      button.setAttribute("aria-pressed", state === "playing" ? "true" : "false");
      status.textContent = message;
    };

    const idleMessage = status.textContent;
    setState("idle", "[ PLAY ]", idleMessage);

    button.addEventListener("click", async () => {
      if (audio.paused) {
        try {
          await audio.play();
          player.style.opacity = "0";
          requestAnimationFrame(() => {
            player.style.opacity = "1";
          });
          await tweenVolume(audio, 0, 0.9, 900);
          setState("playing", "[ PAUSE ]", "[ AUDIO ONLINE :: IMMERSION ACTIVE ]");
        } catch {
          setState("error", "[ PLAY ]", "[ AUDIO UNAVAILABLE :: VERIFY SOURCE URL ]");
        }
        return;
      }

      await tweenVolume(audio, audio.volume, 0, 300);
      audio.pause();
      setState("paused", "[ PLAY ]", "[ PLAYBACK PAUSED ]");
    });

    audio.addEventListener("ended", () => {
      setState("ended", "[ REPLAY ]", "[ TRACK COMPLETE :: READY TO RESTART ]");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeAudioPlayers();
  initializeBossZoneAlert();
});
