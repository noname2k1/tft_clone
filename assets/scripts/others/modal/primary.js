import { addToast } from "../../services/services";

const primaryModal = document.getElementById("primary-modal");
const enemyLineupBtn = document.getElementById("enemy-lineup-btn");
const closeModalBtn = primaryModal.querySelector(".close-modal-btn");
const helpModalBtn = primaryModal.querySelector(".help-modal-btn");
const enemyLineupArea = primaryModal.querySelector(".enemy-lineup-area");
const markChampsArea = primaryModal.querySelector(".mark-champs-area");
const champsDisplay = primaryModal.querySelector(".champs-display");

enemyLineupBtn.addEventListener("click", function (e) {
  primaryModal.classList.remove("invisible");
  enemyLineupArea.classList.replace("hidden", "flex");
  primaryModal.querySelector("header h2").textContent = "Setup Enemy's Lineup";
  champsDisplay.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", function () {
  primaryModal.classList.add("invisible");
  enemyLineupArea.classList.replace("flex", "hidden");
  markChampsArea.classList.replace("flex", "hidden");
});

helpModalBtn.addEventListener("click", function () {
  switch (primaryModal.dataset.purple) {
    case "enemy-lineup-help":
      addToast(
        "drag & drop the champion from the right champion list to the hex on the left, right click on the hex to delete champion dragged"
      );
      break;
    default:
      addToast(
        "you have been click the help modal button, instruction is coming soon!"
      );
  }
});
