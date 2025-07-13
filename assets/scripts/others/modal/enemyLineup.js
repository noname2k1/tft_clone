import { CHAMPS_INFOR, TRAITS_INFOR } from "~/variables";
import { customFetch } from "../../utils/callApi";
import { updateEnemyLineup } from "~/main";

document.addEventListener("DOMContentLoaded", async function () {
  let filterConditions = {};
  const enemyLineupSetup = document.getElementById("eneny-lineup-setup");
  const enemyLineupArea = enemyLineupSetup.querySelector(".enemy-lineup-area");
  const traitsSelect = enemyLineupSetup.querySelector(".filter-by-trait");
  const costSelect = enemyLineupSetup.querySelector(".filter-by-cost");
  const champs = enemyLineupSetup.querySelector(".champs");

  await customFetch("traits", (data) => {
    TRAITS_INFOR.splice(0, TRAITS_INFOR.length, ...data.traits);
  });

  await customFetch("champs", (data) => {
    CHAMPS_INFOR.splice(0, CHAMPS_INFOR.length, ...data.champs);
  });

  const renderChamps = (fConditions = {}) => {
    CHAMPS_INFOR.forEach((champ) => {
      let conditionsAccepted = true;

      for (const [filterKey, filterValue] of Object.entries(fConditions)) {
        if (typeof champ[filterKey] === "number") {
          conditionsAccepted = champ[filterKey] === filterValue;
        } else if (typeof champ[filterKey] === "object") {
          conditionsAccepted = champ[filterKey]?.includes?.(filterValue);
        } else {
          conditionsAccepted = false;
        }
        // console.log({ [filterKey]: filterValue }, conditionsAccepted);
        if (!conditionsAccepted) break; // thoát sớm nếu không thỏa mãn
      }
      //   console.log(champ, fConditions);
      if (conditionsAccepted || Object.keys(fConditions).length < 1) {
        champs.replaceChildren();
        const champImg = document.createElement("img");
        champImg.src = `./assets/images/champs/icons/${champ.name}.png`;
        champImg.onload = () => {
          champImg.draggable = true;
          champImg.className =
            "w-[6.5vw] h-[6.5vw] hover:brightness-150 transition-[brightness] duration-150";
          champImg.addEventListener("ondrag", function (event) {
            console.log("chamImg ondrag");
          });
          champImg.addEventListener("dragstart", function (event) {
            event.dataTransfer.setData("img", champImg.src);
          });
          const champDiv = document.createElement("div");
          champDiv.className = "flex flex-col items-center mr-[1vw]";
          const champName = document.createElement("span");
          champName.className = "text-[1.2vw]";
          champName.textContent = champ.name;
          champDiv.appendChild(champImg);
          champDiv.appendChild(champName);
          champs.appendChild(champDiv);
        };
      }
    });
  };
  renderChamps(filterConditions);

  // filter by trait
  const selected = traitsSelect.querySelector(".selected");
  const options = traitsSelect.querySelector(".options");
  const optionNone = options.querySelector(".option-none");

  selected.addEventListener("click", () => {
    options.classList.toggle("hidden");
  });

  TRAITS_INFOR.forEach((trait) => {
    const optionDiv = document.createElement("div");
    const imgSrc = `./assets/images/classes_icons/${trait.name.replaceAll(
      " ",
      "_"
    )}_TFT_icon.svg`;
    optionDiv.className =
      "option flex items-center px-3 py-2 hover:bg-gray-500 cursor-pointer";
    const innerHtml = `
    <img
        src="${imgSrc}"
        class="w-[2vw] h-[2vw] rounded mr-2"
    />
    <span>${trait.name}</span>`;
    optionDiv.innerHTML = innerHtml;
    optionDiv.addEventListener("click", function (e) {
      selected.querySelector("img").classList.remove("invisible");
      selected.querySelector("img").src = imgSrc;
      selected.querySelector("span").textContent = trait.name;
      options.classList.add("hidden");
      filterConditions.traits = trait.name;
      renderChamps({ ...filterConditions });
    });
    options.appendChild(optionDiv);
  });
  optionNone.addEventListener("click", function () {
    selected.querySelector("span").textContent = optionNone.dataset.label;
    selected.querySelector("img").classList.add("invisible");
    options.classList.add("hidden");
    delete filterConditions.traits;
    renderChamps({ ...filterConditions });
  });
  // Optional: Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!traitsSelect.contains(e.target)) {
      options.classList.add("hidden");
    }
  });

  // filter by cost
  [...Array(5)]
    .map((_, i) => i + 1)
    .forEach((cost) => {
      const optionElement = document.createElement("option");
      optionElement.textContent = cost + " gold";
      optionElement.value = cost;
      costSelect.appendChild(optionElement);
    });

  costSelect.addEventListener("change", function (e) {
    if (costSelect.value === "all") {
      delete filterConditions.cost;
      renderChamps({ ...filterConditions });
      return;
    }
    filterConditions.cost = +costSelect.value;
    renderChamps({ ...filterConditions });
  });

  // enemy lineup area
  const rows = 4;
  const cols = 7;
  const hexDivs = [];
  for (let row = 0; row < rows; row++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = `flex items-center ${
      row % 2 === 1 ? "ml-[3.5vw] lg:ml-[2.5vw]" : ""
    } ${row !== 0 ? "mt-[-0.8vw] lg:mt-[-0.6vw]" : ""}`;
    for (let col = 0; col < cols; col++) {
      const hexDiv = document.createElement("div");
      hexDiv.id = "hex-" + Number(row * cols + col);
      hexDiv.className =
        "w-[7vw] lg:w-[5vw] lg:h-[5vw] h-[7vw] bg-gray-700 clip-hexagon relative";
      hexDiv.addEventListener("dragenter", function (e) {
        e.preventDefault();
        hexDiv.classList.replace("bg-gray-700", "bg-yellow-700");
      });
      hexDiv.addEventListener("dragleave", function (e) {
        e.preventDefault();
        hexDiv.classList.replace("bg-yellow-700", "bg-gray-700");
      });
      hexDiv.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      hexDiv.addEventListener("drop", function (e) {
        const imgSrc = e.dataTransfer.getData("img");
        const img = document.createElement("img");
        const fromHexId = e.dataTransfer.getData("from");
        img.className =
          "w-full h-full hover:brightness-150 transition-[brightness] duration-150";
        if (fromHexId) {
          const fromHexElement = document.getElementById(fromHexId);
          const existedImg = fromHexElement.querySelector("img");
          const currentHexImg = hexDiv.querySelector("img");
          if (currentHexImg) {
            existedImg.src = currentHexImg.src;
            currentHexImg.src = imgSrc;
          } else {
            existedImg.remove();
          }
          fromHexElement.classList.replace("bg-yellow-700", "bg-gray-700");
        }
        img.addEventListener("dragstart", function (event) {
          event.dataTransfer.setData("img", img.src);
          event.dataTransfer.setData("from", "hex-" + Number(row * cols + col));
        });
        img.src = imgSrc;
        hexDiv.replaceChildren(img);
        hexDiv.addEventListener("contextmenu", function () {
          const champImg = hexDiv.querySelector("img");
          if (champImg) {
            updateEnemyLineup(
              champImg.src
                .split("/")
                [champImg.src.split("/").length - 1].replace("%20", " ")
                .replace(".png", "")
            );
          }
          hexDiv.replaceChildren();
          hexDiv.classList.replace("bg-yellow-700", "bg-gray-700");
        });

        const champNames = hexDivs.map((hexId) => {
          const hexEl = document.getElementById(hexId);
          if (hexEl) {
            const imgInsideHex = hexEl.querySelector("img");
            if (imgInsideHex) {
              return imgInsideHex.src
                .split("/")
                [imgInsideHex.src.split("/").length - 1].replace("%20", " ")
                .replace(".png", "");
            } else {
              return null;
            }
          }
          return null;
        });
        updateEnemyLineup(champNames);
      });
      rowDiv.appendChild(hexDiv);
      hexDivs.push(hexDiv.id);
    }
    enemyLineupArea.appendChild(rowDiv);
  }
});
