import { customFetch } from "~~/utils/callApi.js";
import {
  getLeftExpAndMyLevel,
  getMyGold,
  handleBuyExp,
  handleReroll,
} from "~/assets/scripts/others/goldExp.js";
import { EXP_TABLE, fee } from "~/variables";
import { draggableObjects } from "~/main";
import { markChampNames } from "../others/modal/markChamps";
import { ObserverElementChange } from "../utils/utils";
import { getMarkChampFromStorage } from "../services/services";

document.addEventListener("DOMContentLoaded", function () {
  const buyExpBtn = document.getElementById("buy-exp-btn");
  const rerollBtn = document.getElementById("reroll-btn");
  const champShopList = document.getElementById("champ-shop-list");

  // 🧩 renderShopCards — render lại danh sách tướng trong shop
  function renderShopCards(champs) {
    champShopList.innerHTML = "";
    window.champsInRoll = champs;
    window.champsBought = Array.from({ length: 5 }).map(() => 0);

    const cardPromises = champs.map((champ, index) => {
      return new Promise((resolve) => {
        const card = document.createElement("div");
        card.className = `champ-card-shop ${
          getMarkChampFromStorage()?.enabledTeam?.team.includes(champ.name)
            ? `border-run`
            : ``
        } h-full relative cursor-pointer hover:brightness-120 duration-100 hover:z-[100]`;
        card.indexInRoll = index;
        card.data = { ...champ };

        const img = new Image();
        img.src = `./assets/images/champs/bgs/${champ.name}.png`;
        img.className = "w-full";

        img.onload = () => {
          const traitsHtml = champ.traits
            .map(
              (trait, i) => `
          <div class="flex items-center mt-[0.2vw] max-lg:mt-[0.4vw]">
            <div class="relative flex items-center justify-center">
              <div class="bg-black w-full h-full absolute p-2 rounded-full"></div>
              <div class="${
                i === 0 ? "bg-yellow-500" : "bg-white"
              } z-10 mask-[url('/assets/images/classes_icons/${trait.replaceAll(
                " ",
                "_"
              )}_TFT_icon.svg')] mask-no-repeat mask-center mask-contain w-[0.8vw] h-[0.8vw] max-lg:w-[1.2vw] max-lg:h-[1.2vw]"></div>
            </div>
            <span class="text-[0.65vw] ml-[0.4vw] max-lg:ml-[1vw] text-xs max-lg:text-[1.2vw] tracking-wider">${trait}</span>
          </div>`
            )
            .join("");

          card.innerHTML = `
          <img src="./assets/images/${
            champ.cost
          }_gold-frame.png" class="absolute z-10 top-0 w-full h-full object-fill left-0 right-0" />
          <img src="${img.src}" class="w-full" />
          <div class="absolute z-10 bottom-[2vw] left-[0.5vw] flex flex-col max-lg:left-[1.2vw] max-lg:bottom-[3.5vw]">
            ${traitsHtml}
          </div>
          <span class="absolute z-10 bottom-[0.3vw] lg:bottom-[0.2vw] left-[0.6vw] text-[1.5vw] lg:text-[0.8vw]">${
            champ.name
          }</span>
          ${
            getMarkChampFromStorage()?.enabledTeam?.team.includes(champ.name)
              ? `<img src="./assets/images/mark.png" class="absolute top-0 right-0 w-[2vw] brightness-125"/>`
              : ``
          }
          <div class="overlay-shop-champ cursor-pointer bg-black/50 absolute z-[1000] top-0 right-0 left-0 bottom-0 opacity-100 duration-200"></div>
        `;
          resolve(card);
        };

        img.onerror = () => {
          console.warn("Lỗi load ảnh:", img.src);
          resolve(null);
        };
      });
    });

    Promise.all(cardPromises).then((cards) => {
      cards.forEach((card) => {
        if (card) {
          const overlay = card.querySelector(".overlay-shop-champ");
          const zacFound = draggableObjects.find(
            (obj) =>
              obj.userData.name?.toLowerCase() === "zac" && obj.bfIndex !== -1
          );
          if (overlay && zacFound) {
            if (Math.random() <= 0.1) {
              card.zacBloblet = true;
              overlay.style.backgroundImage =
                "url('./assets/images/bloblet.png')";
              overlay.style.backgroundPosition = "center";
              overlay.style.backgroundRepeat = "no-repeat";
              overlay.style.backgroundSize = "cover";
            } else {
              overlay.classList.replace("opacity-100", "opacity-0");
            }
          } else if (overlay) {
            overlay.classList.replace("opacity-100", "opacity-0");
          }

          champShopList.appendChild(card);
        }
      });
    });
  }

  let mutationTimeout = null;

  new ObserverElementChange(
    document.querySelector(".mark-team-slots"),
    (mutation) => {
      if (mutationTimeout) return;
      mutationTimeout = setTimeout(() => {
        renderShopCards(window.champsInRoll);
        mutationTimeout = null;
      }, 100);
    }
  );

  const checkboxMarkChamps = document.querySelector(".mark-teams-notice");
  new ObserverElementChange(checkboxMarkChamps, (mutation) => {
    // console.log(mutation);
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(() => {
      renderShopCards(window.champsInRoll);
      mutationTimeout = null;
    }, 100);
  });

  const getShopChamp = async (updateOnlyOdds = false) => {
    rerollBtn.classList.add("invisible");
    await customFetch(
      "champs/random?count=5&level=" + getLeftExpAndMyLevel().level,
      (data) => {
        if (data.champs.length > 0) {
          // cập nhật tỉ lệ
          Object.entries(data.odds).forEach(([cost, percent]) => {
            const span = document.getElementById("cost-" + cost);
            if (span) span.innerHTML = percent + "%";
          });

          if (!updateOnlyOdds) renderShopCards(data.champs);
        }
      },
      (error) => {
        console.log("error: ", error);
        setTimeout(() => {
          getShopChamp();
        }, 500);
      }
    );
    rerollBtn.classList.remove("invisible");
  };

  getShopChamp();

  buyExpBtn.addEventListener("click", (event) => {
    handleBuyExp();
    getShopChamp(true);
    const myLevel = getLeftExpAndMyLevel().level;
    let highestLevel = 0;
    for (const level in EXP_TABLE) {
      if (+level > highestLevel) highestLevel = level;
    }
    if (myLevel == highestLevel) {
      buyExpBtn.classList.add("hidden");
    }
  });
  rerollBtn.addEventListener("click", (event) => {
    // console.log("reroll clicked");
    handleReroll(getShopChamp);
  });
});
