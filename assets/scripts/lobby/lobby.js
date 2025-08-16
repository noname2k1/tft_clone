import { enterBattle, setEnterBattle } from "~/variables";

const findBattleBtn = document.getElementById("find-battle-btn");
const acceptBtn = document.getElementById("accept-btn");
const refuseBtn = document.getElementById("refuse-btn");
const overlay = document.querySelector(".overlay");
const wrapper = document.querySelector(".wrapper");
const stop0 = document.querySelector(".stop-0");
const stop1 = document.querySelector(".stop-1");
const ring = document.querySelector(".bar");
const text = document.getElementById("progress-text");

const r = 54;
const C = 2 * Math.PI * r; // chu vi
const gap = 85; // độ dài đoạn hở dưới (pixel trên chu vi)

let timeOutParent = null;
let timeoutChild = null;
let isMatching = false; // trạng thái tìm trận

const resetState = () => {
  clearTimeout(timeOutParent);
  clearTimeout(timeoutChild);
  wrapper.classList.remove("brightness-[0.3]");
  stop0.setAttribute("stop-color", "#00f0ff");
  stop1.setAttribute("stop-color", "#00ff99");
  text.textContent = "";
};

const disabledEffect = () => {
  isMatching = false; // dừng animation
  resetState();
  wrapper.classList.add("brightness-[0.3]");
  stop0.setAttribute("stop-color", "#555555"); // xám đậm
  stop1.setAttribute("stop-color", "#aaaaaa"); // xám nhạt

  timeOutParent = setTimeout(() => {
    overlay.classList.add("opacity-0", "invisible");
    timeoutChild = setTimeout(() => {
      resetState();
    }, 200);
  }, 500);
};

const matchBattle = () => {
  const duration = 10000; // ms
  isMatching = true; // bật trạng thái tìm trận

  function setProgress(percent) {
    if (!isMatching) return; // nếu đã bị cancel thì bỏ qua

    percent = Math.max(0, Math.min(100, percent));
    const progressLength = (C - gap) * (percent / 100);
    const rest = C - gap - progressLength;
    ring.style.strokeDasharray = `${progressLength} ${rest + gap}`;
    ring.style.strokeDashoffset = 0;

    const remaining = Math.ceil(((1 - percent / 100) * duration) / 1000);
    text.textContent = `${remaining}s`;
    if (remaining <= 0) {
      disabledEffect();
    }
  }

  const start = Date.now();

  function animate() {
    if (!isMatching) return; // dừng vòng lặp nếu cancel
    const now = Date.now();
    const elapsed = now - start;
    const percent = Math.min((elapsed / duration) * 100, 100);
    setProgress(percent);
    if (percent < 100 && isMatching) {
      requestAnimationFrame(animate);
    }
  }

  animate();
};

// Sự kiện
findBattleBtn.addEventListener("click", () => {
  resetState();
  overlay.classList.remove("invisible", "opacity-0");
  matchBattle();
});

refuseBtn.addEventListener("click", () => {
  disabledEffect();
});

acceptBtn.addEventListener("click", () => {
  disabledEffect();
  setEnterBattle();
  window.location.href = "/";
});
