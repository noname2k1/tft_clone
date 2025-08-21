import { customFetch } from "~~/utils/callApi.js";
import {
  getLeftExpAndMyLevel,
  getMyGold,
  handleBuyExp,
  handleReroll,
} from "~/assets/scripts/others/goldExp.js";
import {
  EXP_TABLE,
  fee,
  ITEMS_ARTIFACT,
  ITEMS_COMPONENT,
  ITEMS_EMBLEM,
  ITEMS_EQUIPMENT,
  ITEMS_GOLD_COLLECTOR_ARTIFACT,
  ITEMS_RADIANT,
  ITEMS_SUPPORT,
  TRAITS_INFOR,
} from "~/variables";
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
import Team from "../objects/Team";

const buyExpBtn = document.getElementById("buy-exp-btn");
const rerollBtn = document.getElementById("reroll-btn");
const champShopList = document.getElementById("champ-shop-list");

// 🧩 renderShopCards — render lại danh sách tướng trong shop
function renderShopCards(champs, resetChampsBought = true) {
  champShopList.replaceChildren();
  window.champsInRoll = champs;
  const cardsPerShop = 5;
  if (resetChampsBought)
    window.champsBought = Array.from({ length: cardsPerShop }).map(() => 0);

  const cardPromises = champs.map((champ, index) => {
    // console.log(champ);
    return new Promise((resolve, reject) => {
      try {
        const card = document.createElement("div");
        card.className = `champ-card-shop ${
          window.champsBought[index] === 1 ? "invisible select-none" : ""
        } ${
          getMarkChampFromStorage()?.enabledTeam?.team.includes(champ.name) ||
          ChampionManager.getMyTeam().findIndex(
            (c) => c.userData.name === champ.name
          ) !== -1
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
          <img src="/images/${
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
              ? `<img src="/images/mark.png" class="absolute top-0 right-0 w-[2vw] brightness-125"/>`
              : ``
          }
          <div class="overlay-shop-champ cursor-pointer bg-black/50 absolute z-[999] top-0 right-0 left-0 bottom-0 opacity-100 duration-200"></div>
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
              overlay.style.backgroundImage = "url('/images/bloblet.png')";
              overlay.style.backgroundPosition = "center";
              overlay.style.backgroundRepeat = "no-repeat";
              overlay.style.backgroundSize = "cover";
            } else {
              overlay.classList.replace("opacity-100", "opacity-0");
            }
          } else if (overlay) {
            overlay.classList.replace("opacity-100", "opacity-0");
          }

          if (champShopList.childNodes.length < cardsPerShop) {
            champShopList.appendChild(card);
          }
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

// detect when mark champ change
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

// detect when buy item to open a list of item/emblemb
new ObserverElementChange(
  document.querySelector(".item-bought"),
  (mutation) => {
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(() => {
      console.log(mutation.target.textContent);
      let itemsCount = 0;
      let items = [];
      switch (mutation.target.textContent) {
        case "Tome of Traits": {
          itemsCount = 5;
          items = ITEMS_EMBLEM;
          break;
        }
        case "Support Item Anvil": {
          itemsCount = 4;
          items = ITEMS_SUPPORT;
          break;
        }
        case "Component Anvil": {
          itemsCount = 4;
          items = ITEMS_COMPONENT;
          break;
        }
        case "Completed Item Anvil": {
          itemsCount = 5;
          items = ITEMS_EQUIPMENT;
          break;
        }
        case "Artifact Item Anvil": {
          itemsCount = 4;
          items = ITEMS_ARTIFACT;
          break;
        }
        case "Gold Collector Artifact Item Anvil": {
          itemsCount = 4;
          items = ITEMS_GOLD_COLLECTOR_ARTIFACT;
          break;
        }
        case "Radiant Item Anvil": {
          itemsCount = 5;
          items = ITEMS_RADIANT;
          break;
        }
        default: {
          console.log(mutation.target.textContent);
        }
      }
      if (itemsCount && items.length > 0) {
        const items_selectable = [];
        const items_seleted_index = [];
        for (let i = 0; i < itemsCount; i++) {
          let randomIndex;
          do {
            randomIndex = Math.ceil(Math.random() * items.length - 1);
          } while (items_seleted_index.includes(randomIndex));
          items_selectable.push(items[randomIndex]);
          items_seleted_index.push(randomIndex);
        }
        // console.log("items_selectable: ", items_selectable);
        // console.log("items_seleted_index: ", items_seleted_index);
        const itemWrapper = document.createElement("div");
        itemWrapper.className =
          "absolute top-0 left-0 right-0 h-full bottom-0 bg-black z-[1000] flex items-end justify-center";
        champShopList.appendChild(itemWrapper);
        items_selectable.forEach((item) => {
          const itemCard = document.createElement("div");
          itemCard.className =
            "w-full h-[5vw] mx-[0.5vw] relative cursor-pointer bg-linear-to-t from-[#29220e] to-[#584b30] hover:brightness-120 duration-100 flex justify-center items-center";
          const img = document.createElement("img");
          img.className =
            "absolute top-[-1.5vw] w-[3vw] h-[3vw] border-[0.1vw] border-[#7b602f]";
          img.src = generateIconURLFromRawCommunityDragon(item.icon);
          img.alt = item.name;
          itemCard.appendChild(img);
          const itemName = document.createElement("span");
          itemName.className = "text-white font-semibold text-[0.8vw]";
          itemName.textContent = item.name;
          itemCard.appendChild(itemName);
          itemCard.addEventListener("click", function () {
            Team.addItem(item);
            const timelineWrapper = document.getElementById("timeline-wrapper");
            if (timelineWrapper) {
              timelineWrapper.remove();
              itemWrapper.remove();
            }
          });
          itemWrapper.append(itemCard);
        });
        const shopContainer = document.getElementById("shop");
        const totalWidth = 8.7;
        const totalTime = 30;
        let currentTime = totalTime;

        const timeLineHtml = `
  <div class="absolute bottom-[7.6vw] left-[26vw] w-[14vw]" id="timeline-wrapper">
    <img src="/images/pick-timeline.png" alt="pick-timeline-img" class="w-full"/>
    <span class="absolute top-[0.2vw] left-[4.5vw]">Choose One</span>
    <div id="pick-timeline" class="h-[0.5vw] w-[${totalWidth}vw] duration-150 absolute right-[3.5vw] top-[1.759vw] rounded-[1vw] bg-[#a58238]"></div>
    <span id="pick-time" class="absolute top-[1.6vw] text-[0.65vw] left-[11.2vw]">${totalTime}</span>
  </div>
`;
        shopContainer.insertAdjacentHTML("beforeend", timeLineHtml);

        const pickTimeline = document.getElementById("pick-timeline");
        const pickTime = document.getElementById("pick-time");

        const interval = setInterval(() => {
          currentTime -= 1;

          // cập nhật chiều rộng thanh thời gian
          const newWidth = (totalWidth * currentTime) / totalTime + "vw";
          pickTimeline.style.width = newWidth;

          // cập nhật số giây hiển thị
          pickTime.textContent = currentTime;

          // hết giờ thì dừng
          if (currentTime <= 0) {
            clearInterval(interval);
          }
        }, 1000);
      }
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
let firstShopLoadIntervalId = null;
firstShopLoadIntervalId = setInterval(() => {
  if (TRAITS_INFOR.length < 1) {
    getShopChamp();
  } else {
    clearInterval(firstShopLoadIntervalId);
    firstShopLoadIntervalId = null;
  }
}, 200);

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
  if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "đ") {
    handleReroll(getShopChamp);
  }
});

export { renderShopCards };
