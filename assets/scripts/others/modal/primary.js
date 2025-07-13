const primaryModal = document.getElementById("primary-modal");
const enemyLineupBtn = document.getElementById("enemy-lineup-btn");
const closeModalBtn = primaryModal.querySelector(".close-modal-btn");
const helpModalBtn = primaryModal.querySelector(".help-modal-btn");
enemyLineupBtn.addEventListener("click", function (e) {
  primaryModal.classList.remove("invisible");
});

closeModalBtn.addEventListener("click", function () {
  primaryModal.classList.add("invisible");
});

helpModalBtn.addEventListener("click", function () {
  switch (helpModalBtn.dataset.purple) {
    case "enemy-lineup-help":
      alert(
        "drag & drop the champion from the right champion list to the hex on the left, right click on the hex to delete champion dragged"
      );
      break;
    default:
      alert("you have been click the help modal button");
  }
});
