import { ObserverElementChange } from "../../utils/utils";
import {
  disabledMarkChamp,
  getMarkChampFromStorage,
  saveMarkChampToStorage,
} from "../../services/services";

const primaryModal = document.getElementById("primary-modal");
const lineupSetup = document.getElementById("lineup-setup");
const markChampsBtn = document.getElementById("mark-champs-btn");
const markChampsArea = lineupSetup.querySelector(".mark-champs-area");
const markTeamSlots = markChampsArea.querySelector(".mark-team-slots");
const markTeams = markChampsArea.querySelector(".mark-teams");
const addMarkTeamBtn = markChampsArea.querySelector(".add-mark-team-btn");
const pasteMarkTeamBtn = markChampsArea.querySelector(".paste-mark-team-btn");
const backBtn = markChampsArea.querySelector(".back-btn");
const champsDisplay = lineupSetup.querySelector(".champs-display");
const costSelect = lineupSetup.querySelector(".filter-by-cost");
const traitsSelect = lineupSetup.querySelector(".filter-by-trait");

const markChampNames = [];
const markChampImgIds = [];
let teamId = null;

//    decodeURIComponent(imgSrc.split("/").pop().replace(".png", ""))

Array.from({ length: 10 }).forEach((item, index) => {
  const slotDiv = document.createElement("div");
  slotDiv.className =
    "mark-champ-slot w-[20%] h-[6vw] border mt-[1.4vw] bg-gray-700";
  slotDiv.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  slotDiv.addEventListener("contextmenu", function () {
    const id = "mark-champ-" + index;
    const imgIndex = markChampImgIds.indexOf(id);
    if (imgIndex !== -1) {
      markChampImgIds.splice(imgIndex, 1);
      markChampNames.splice(imgIndex, 1);
    }
    slotDiv.replaceChildren();
    saveMarkChampToStorage(teamId, markChampNames);
  });
  // ondrop
  slotDiv.addEventListener("drop", function (e) {
    const imgSrc = e.dataTransfer.getData("img");
    if (markChampImgIds.length > 0 && markChampNames.length > 0) {
      console.log(markChampImgIds, markChampNames);
      const existedChampNameIndex = markChampNames.findIndex(
        (champName) =>
          champName ===
          decodeURIComponent(imgSrc.split("/").pop().replace(".png", ""))
      );
      if (existedChampNameIndex != -1) {
        if (markChampImgIds[existedChampNameIndex]) {
          if (
            markChampImgIds[existedChampNameIndex] ===
            "mark-champ-" + index
          ) {
            markChampsArea
              .querySelector("#" + markChampImgIds[existedChampNameIndex])
              .remove();
            markChampNames.splice(existedChampNameIndex, 1);
            markChampImgIds.splice(existedChampNameIndex, 1);
          }
        }
      }
    }
    const newImg = document.createElement("img");
    newImg.src = imgSrc;
    newImg.id = "mark-champ-" + index;
    newImg.className = "w-full h-full";
    slotDiv.replaceChildren(newImg);
    markChampNames.push(
      decodeURIComponent(imgSrc.split("/").pop().replace(".png", ""))
    );
    markChampImgIds.push(newImg.id);
    saveMarkChampToStorage(teamId, markChampNames);
  });
  markTeamSlots.appendChild(slotDiv);
});

const reLogicClickImgToAddMarkSlot = () => {
  setTimeout(() => {
    const selectAbleChampImgs =
      lineupSetup.querySelectorAll(".champ-selectable");
    const markChampSlotDivs = lineupSetup.querySelectorAll(".mark-champ-slot");
    selectAbleChampImgs.forEach((img) => {
      img.addEventListener("click", function () {
        markChampSlotDivs.forEach((div, index) => {
          div.addEventListener("dragstart", function (e) {
            e.preventDefault();
          });
          const imgsInsideDiv = div.querySelector("img");
          if (!imgsInsideDiv) {
            const existedMarkChampName = markChampNames.find(
              (mChampName) => mChampName === img.data.name
            );
            if (!existedMarkChampName) {
              const newImg = document.createElement("img");
              newImg.src = img.src;
              newImg.id = "mark-champ-" + index;
              newImg.className = "w-full h-full";
              div.replaceChildren(newImg);
              markChampNames.push(img.data.name);
              markChampImgIds.push(newImg.id);
              saveMarkChampToStorage(teamId, markChampNames);
            }
          }
        });
        //   console.log(img.data);
      });
    });
  }, 100);
};

const observerElementChange = new ObserverElementChange(
  traitsSelect.querySelector(".selected span"),
  (mutation) => {
    if (mutation.type === "childList") {
      reLogicClickImgToAddMarkSlot();
    }
  }
);

costSelect.onchange = function () {
  reLogicClickImgToAddMarkSlot();
};

const changeToEditMode = () => {
  markChampsArea.dataset.feature = "add";
  markTeams.classList.add("hidden");
  markTeamSlots.classList.remove("hidden");
  backBtn.classList.remove("hidden");
  addMarkTeamBtn.classList.add("hidden");
  pasteMarkTeamBtn.classList.add("hidden");
  champsDisplay.classList.remove("hidden");
  reLogicClickImgToAddMarkSlot();
  markChampNames.splice(0, markChampNames.length);
  markChampImgIds.forEach((id) => {
    markChampsArea.querySelector("#" + id).remove();
  });
  markChampImgIds.splice(0, markChampImgIds.length);
};

const loadMarkTeams = () => {
  markTeams.replaceChildren();
  const existedTeams = getMarkChampFromStorage().existedTeams;
  if (existedTeams.length > 0) {
    existedTeams.sort((prev, curr) => {
      if (prev.enabled) {
        return -1;
      } else {
        return 1;
      }
    });
    existedTeams.forEach((existedTeam) => {
      const markTeamWrapper = document.createElement("div");
      markTeamWrapper.className =
        "bg-gray-700 flex px-[2vw] items-center justify-between mb-[1.2vw] w-full min-h-[10vw]";
      if (existedTeam.team && existedTeam.team?.length <= 10) {
        Array.from({ length: 10 }).forEach((item, index) => {
          const champName = existedTeam.team[index];
          if (champName) {
            const img = document.createElement("img");
            img.className = "w-[5vw] h-[5vw]";
            img.src = "./assets/images/champs/icons/" + champName + ".png";
            markTeamWrapper.appendChild(img);
          } else {
            const div = document.createElement("div");
            div.className = "w-[5vw] h-[5vw] bg-gray-900";
            markTeamWrapper.appendChild(div);
          }
        });
        const toolsHtml = `<div
                  class="relative checkbox-wrapper brightness-125 duration-150 transition-[brightness] ml-[2vw] w-[4vw] h-[2vw] bg-gradient-to-r from-gray-700 to-gray-800 rounded-3xl border-[0.2vw] border-yellow-500 has-[input:checked]:from-green-700 has-[input:checked]:to-green-500"
                  title="mark this team"
                >
                  <input
                    type="checkbox"
                    name="check-mark"
                    ${existedTeam.enabled ? "checked" : ""}
                    id="enabled-mark-${existedTeam.id}"
                    class="peer absolute hidden"
                  />
                  <img
                    src="./assets/images/checkbox-disabled.png"
                    class="absolute top-1/2 -left-[1vw] w-[2.5vw] h-[2.5vw] -translate-y-1/2 peer-checked:left-[unset] peer-checked:-right-[1vw] duration-150 opacity-100 peer-checked:opacity-0"
                    srcset=""
                  />
                  <img
                    src="./assets/images/checkbox-enabled.png"
                    class="absolute top-1/2 -left-[1vw] w-[2.5vw] h-[2.5vw] -translate-y-1/2 peer-checked:left-[unset] peer-checked:-right-[1vw] duration-150 opacity-0 peer-checked:opacity-100"
                    srcset=""
                  />
                  <label
                    for="enabled-mark-${existedTeam.id}"
                    class="w-full h-full opacity-0 cursor-pointer absolute z-10 hover:brightness-125"
                  ></label>
                </div>
                <button
                  title="delete"
                  class="hover:brightness-125 duration-150 transition-[brightness] ml-[1vw]"
                >
                  <img src="./assets/images/cancel.png" alt="" />
                </button>
                <button
                  title="copy this team"
                  class="hover:brightness-125 duration-150 flex items-center justify-center relative transition-[brightness] ml-[1vw]"
                >
                  <img src="./assets/images/btn-circular.png" alt="" />
                  <img src="./assets/images/card.png" alt="" class="absolute" />
                </button>
          `;
        markTeamWrapper.insertAdjacentHTML("beforeend", toolsHtml);
        const inputCheckBox = markTeamWrapper.querySelector(
          "input[type='checkbox']"
        );
        const checkboxWrapper =
          markTeamWrapper.querySelector(".checkbox-wrapper");
        checkboxWrapper.addEventListener("click", function (e) {
          e.stopPropagation();
        });
        if (inputCheckBox) {
          inputCheckBox.addEventListener("input", function (e) {
            e.stopPropagation();
            if (inputCheckBox.checked) {
              saveMarkChampToStorage(existedTeam.id, existedTeam.team);
              const allInputCheckBox = markTeams.querySelectorAll(
                "input[type='checkbox']"
              );
              allInputCheckBox.forEach((cb) => {
                if (cb.id != inputCheckBox.id) {
                  cb.checked = false;
                }
              });
            } else {
              disabledMarkChamp(existedTeam.id);
            }
            document.querySelector(".mark-teams-notice").textContent =
              existedTeam.id;
          });
        }

        // edit team
        markTeamWrapper.addEventListener("click", function () {
          changeToEditMode();
          markChampNames.splice(0, markChampNames.length);
          markChampImgIds.forEach((id) => {
            markChampsArea.querySelector("#" + id).remove();
          });
          markChampImgIds.splice(0, markChampImgIds.length);
          teamId = existedTeam.id;
          markTeamSlots.childNodes.forEach((node, index) => {
            node.replaceChildren();
            if (existedTeam.team[index]) {
              const newImg = document.createElement("img");
              newImg.src =
                "./assets/images/champs/icons/" +
                existedTeam.team[index] +
                ".png";
              newImg.id = "mark-champ-" + index;
              newImg.className = "w-full h-full";
              newImg.onload = () => {
                markChampNames.push(existedTeam.team[index]);
                markChampImgIds.push(newImg.id);
                node.appendChild(newImg);
              };
            }
          });
        });
      }
      markTeams.appendChild(markTeamWrapper);
    });
  }
  markTeams.classList.remove("hidden");
  markTeamSlots.classList.add("hidden");
};

addMarkTeamBtn.addEventListener("click", function () {
  changeToEditMode();
  teamId = crypto.randomUUID();
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
    loadMarkTeams();
  }
});

backBtn.addEventListener("click", function () {
  markChampsArea.dataset.feature = "";
  markTeams.classList.remove("hidden");
  markTeamSlots.classList.add("hidden");
  backBtn.classList.add("hidden");
  addMarkTeamBtn.classList.remove("hidden");
  pasteMarkTeamBtn.classList.remove("hidden");
  champsDisplay.classList.add("hidden");
  loadMarkTeams();
});

export { markChampNames };
