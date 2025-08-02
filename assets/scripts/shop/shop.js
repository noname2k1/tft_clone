import { customFetch } from "~~/utils/callApi.js";
import {
  getLeftExpAndMyLevel,
  getMyGold,
  handleBuyExp,
  handleReroll,
} from "~/assets/scripts/others/goldExp.js";
import { EXP_TABLE, fee, TRAITS_INFOR } from "~/variables";
import { markChampNames } from "../others/modal/markChamps";
import {
  capitalizeFirstLetter,
  generateIconURLFromRawCommunityDragon,
  ObserverElementChange,
} from "../utils/utils";
import {
  getMarkChampFromStorage,
  injectVariables,
  onTooltip,
} from "../services/services";
import ChampionManager from "../objects/ChampionManager";

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
      // console.log(champ);
      return new Promise((resolve, reject) => {
        try {
          const card = document.createElement("div");
          card.className = `champ-card-shop ${
            getMarkChampFromStorage()?.enabledTeam?.team.includes(champ.name)
              ? `border-run`
              : ``
          } w-full h-full relative cursor-pointer hover:brightness-120 duration-100 hover:z-[100]`;
          card.indexInRoll = index;
          card.data = { ...champ };
          onTooltip(
            card,
            (tooltip) => {
              tooltip.style.maxWidth = "unset";
              // console.log(card.data);
              const ability = card.data.ability;
              // console.log(ability);
              const newDesc = injectVariables(
                ability.desc,
                ability.variables,
                card.data.stats,
                1
              );
              // console.log(newDesc);
              const cardImgHtml = `<div class="flex">
            <img
              src="${generateIconURLFromRawCommunityDragon(
                champ?.ability?.icon
              )}"
              class="w-[5vw] h-[5vw]"
              alt="${card.data.name}-skill"
            />
            <div class="flex flex-col pl-[0.5vw] ">
              <h2 class="font-semibold text-[1.2vw]">${ability.name}</h2>
              <p class="font-medium text-[0.875vw] max-w-[20vw] break-words whitespace-pre-wrap">${newDesc}</p>
            </div>
          </div>`;
              tooltip.insertAdjacentHTML("beforeend", cardImgHtml);
              document.addEventListener("keydown", (e) => {
                if (["d", "đ"].includes(e.key.toLowerCase())) {
                  tooltip.replaceChildren();
                }
              });
            },
            "top,left"
          );
          const img = new Image();
          img.src = `${generateIconURLFromRawCommunityDragon(champ.icon)}`;
          img.className = "w-full";

          img.onload = () => {
            const traitsHtml = champ.traits
              .map((trait, i) => {
                const traitIcon = TRAITS_INFOR.find(
                  (traitObj) => traitObj.name === trait
                );
                // console.log(traitIcon);
                return `
          <div class="flex items-center mt-[0.2vw] max-lg:mt-[0.4vw]">
            <div class="relative flex items-center justify-center">
              <div class="bg-black w-full h-full absolute p-2 rounded-full"></div>
              <div class="${
                i === 0 ? "bg-yellow-500" : "bg-white"
              } z-10 mask-[url('${generateIconURLFromRawCommunityDragon(
                  traitIcon?.icon
                )}')] mask-no-repeat mask-center mask-contain w-[0.8vw] h-[0.8vw] max-lg:w-[1.2vw] max-lg:h-[1.2vw]"></div>
            </div>
            <span class="text-[0.65vw] ml-[0.4vw] max-lg:ml-[1vw] text-xs max-lg:text-[1.2vw] tracking-wider">${trait}</span>
          </div>`;
              })
              .join("");
            card.innerHTML = `
          <img src="./assets/images/${
            champ.cost
          }_gold-frame.png" class="absolute z-10 top-0 w-full h-full object-fill left-0 right-0" />
          <img src="${img.src}" class="w-full h-full" />
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
        } catch (error) {
          reject(error);
        }
      });
    });

    Promise.all(cardPromises)
      .then((cards) => {
        cards.forEach((card) => {
          if (card) {
            const overlay = card.querySelector(".overlay-shop-champ");
            const zacFound = ChampionManager.draggableObjects.find(
              (obj) =>
                obj.userData.name?.toLowerCase() === "zac" && obj.bfIndex !== -1
            );
            if (
              overlay &&
              zacFound &&
              import.meta.env.VITE_SET_KEY === "TFT_Set14"
            ) {
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
      })
      .catch((error) => {
        console.log("error: ", error);
        setTimeout(() => {
          getShopChamp();
        }, 500);
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
          // console.log(data.champs);
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
  const handleProcessBuyExp = () => {
    handleBuyExp(() => {
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
  };
  buyExpBtn.addEventListener("click", handleProcessBuyExp);
  rerollBtn.addEventListener("click", (event) => {
    // console.log("reroll clicked");
    handleReroll(getShopChamp);
  });
  window.addEventListener("keypress", (e) => {
    if (e.key.toLowerCase() === "f") {
      handleProcessBuyExp();
    }
    if (e.key.toLowerCase() === "d") {
      handleReroll(getShopChamp);
    }
  });
});
