const primaryModal = document.getElementById("primary-modal");
const enemyLineupBtn = document.getElementById("enemy-lineup-btn");
const markChampsBtn = document.getElementById("mark-champs-btn");
const closeModalBtn = primaryModal.querySelector(".close-modal-btn");
const helpModalBtn = primaryModal.querySelector(".help-modal-btn");
const enemyLineupArea = primaryModal.querySelector(".enemy-lineup-area");
const markChampsArea = primaryModal.querySelector(".mark-champs-area");
const champsDisplay = primaryModal.querySelector(".champs-display");
const markTeamSlots = markChampsArea.querySelector(".mark-team-slots");
const markTeams = markChampsArea.querySelector(".mark-teams");

enemyLineupBtn.addEventListener("click", function (e) {
  primaryModal.classList.remove("invisible");
  enemyLineupArea.classList.replace("hidden", "flex");
  primaryModal.querySelector("header h2").textContent = "Setup Enemy's Lineup";
  champsDisplay.classList.remove("hidden");
});

markChampsBtn.addEventListener("click", function (e) {
  primaryModal.classList.remove("invisible");
  markChampsArea.classList.replace("hidden", "flex");
  primaryModal.querySelector("header h2").textContent = "Setup your mark teams";
  champsDisplay.classList.add("hidden");
  if (markChampsArea.dataset.feature === "add") {
    markTeams.classList.add("hidden");
    champsDisplay.classList.remove("hidden");
  } else {
    markTeams.classList.remove("hidden");
    markTeamSlots.classList.add("hidden");
  }
});

closeModalBtn.addEventListener("click", function () {
  primaryModal.classList.add("invisible");
  enemyLineupArea.classList.replace("flex", "hidden");
  markChampsArea.classList.replace("flex", "hidden");
});

helpModalBtn.addEventListener("click", function () {
  switch (primaryModal.dataset.purple) {
    case "enemy-lineup-help":
      alert(
        "drag & drop the champion from the right champion list to the hex on the left, right click on the hex to delete champion dragged"
      );
      break;
    default:
      alert(
        "you have been click the help modal button, instruction is coming soon!"
      );
  }
});
