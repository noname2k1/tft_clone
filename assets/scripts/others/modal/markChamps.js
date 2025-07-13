import { ObserverElementChange } from "../../utils/utils";

const lineupSetup = document.getElementById("lineup-setup");
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

addMarkTeamBtn.addEventListener("click", function () {
  markChampsArea.dataset.feature = "add";
  markTeams.classList.add("hidden");
  markTeamSlots.classList.remove("hidden");
  backBtn.classList.remove("hidden");
  addMarkTeamBtn.classList.add("hidden");
  pasteMarkTeamBtn.classList.add("hidden");
  champsDisplay.classList.remove("hidden");
  reLogicClickImgToAddMarkSlot();
});

backBtn.addEventListener("click", function () {
  markChampsArea.dataset.feature = "";
  markTeams.classList.remove("hidden");
  markTeamSlots.classList.add("hidden");
  backBtn.classList.add("hidden");
  addMarkTeamBtn.classList.remove("hidden");
  pasteMarkTeamBtn.classList.remove("hidden");
  champsDisplay.classList.add("hidden");
});

export { markChampNames };
