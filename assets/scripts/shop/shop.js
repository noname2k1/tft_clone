import { customFetch } from "~~/utils/callApi.js";
import {
  getLeftExpAndMyLevel,
  handleBuyExp,
  handleReroll,
} from "~/assets/scripts/others/goldExp.js";

document.addEventListener("DOMContentLoaded", function () {
  const upgradeBtn = document.getElementById("upgrade");
  const rerollBtn = document.getElementById("reroll");
  const champShopList = document.getElementById("champ-shop-list");

  const getShopChamp = async (updateOnlyOdds = false) => {
    const overlayShopChamps = document.querySelectorAll(".overlay-shop-champ");

    overlayShopChamps.forEach((el) => {
      el.classList.replace("opacity-0", "opacity-100");
    });

    await customFetch(
      "champs/random?count=5&level=" + getLeftExpAndMyLevel().level,
      (data) => {
        if (data.champs.length > 0) {
          // console.log(data.champs);
          // console.log(data.odds);
          Object.entries(data.odds).forEach(([cost, percent]) => {
            // console.log(cost);
            const span = document.getElementById("cost-" + cost);
            if (span) {
              span.innerHTML = percent + "%";
            }
          });
          if (updateOnlyOdds) return;
          champShopList.replaceChildren();
          window.champsInRoll = data.champs;
          window.champsBought = Array.from({ length: 5 }).map((c) => 0);
          data.champs.forEach((champ, index) => {
            // console.log({ champ });
            const card = document.createElement("div");
            card.className =
              "champ-card-shop h-full relative cursor-pointer hover:scale-110 duration-200 hover:z-[100]";
            // Gán custom properties trực tiếp
            card.indexInRoll = index;
            card.data = { ...champ };
            // console.log(card.data);
            // innerHTML để dựng phần còn lại
            card.innerHTML = `
          <img
            src="./assets/images/${champ.cost}_gold-frame.png"
            alt="card-frame-1-gold"
            class="absolute z-10 top-0 w-full h-full object-fill left-0 right-0"
          />
          <img
            src="./assets/images/champs/bgs/${champ.name}.png"
            alt="champ-image"
            class="w-full"
          />
          <div class="absolute z-10 bottom-[2vw] left-[0.5vw] flex flex-col max-lg:left-[1.2vw] max-lg:bottom-[3.5vw]"> 
            ${champ.traits.reduce((text, trait, currIndex) => {
              return (
                text +
                `<div class="flex items-center mt-[0.2vw] max-lg:mt-[0.4vw]">
                <div class="relative flex items-center justify-center">
                  <div class="bg-black w-full h-full absolute p-2 rounded-full"></div>
                  <div class="${
                    currIndex === 0 ? "bg-yellow-500" : "bg-white"
                  } z-10 mask-[url('/assets/images/classes_icons/${trait.replaceAll(
                  " ",
                  "_"
                )}_TFT_icon.svg')] mask-no-repeat mask-center mask-contain w-[0.8vw] h-[0.8vw] max-lg:w-[1.2vw] max-lg:h-[1.2vw]">
                  </div>
                </div>
              <span class="text-[0.65vw] ml-[0.4vw] max-lg:ml-[1vw] text-xs max-lg:text-[1.2vw] tracking-wider">${trait}</span>
              </div>`
              );
            }, "")}
         </div>
          <span class="absolute z-10 bottom-[0.3vw] lg:bottom-[0.2vw] left-[0.6vw] text-[1.5vw] lg:text-[0.8vw]">
            ${champ.name}
          </span>
          <div class="overlay-shop-champ bg-black/50 absolute z-[1000] top-0 right-0 left-0 bottom-0 opacity-0 duration-200"></div>
        `;

            champShopList.appendChild(card);
          });
        }
      },
      (error) => {
        console.log("error: ", error);
        setTimeout(() => {
          getShopChamp();
        }, 500);
      }
    );

    overlayShopChamps.forEach((el) => {
      el.classList.replace("opacity-100", "opacity-0");
    });
  };

  getShopChamp();

  upgradeBtn.addEventListener("click", (event) => {
    handleBuyExp();
    getShopChamp(true);
  });
  rerollBtn.addEventListener("click", (event) => {
    // console.log("reroll clicked");
    handleReroll(getShopChamp);
  });
});
