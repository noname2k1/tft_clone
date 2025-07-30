import { CHAMPS_INFOR, TRAITS_INFOR } from "~/variables";
import { customFetch } from "../../utils/callApi";
import { updateEnemyLineup } from "~/main";
import { generateIconURLFromRawCommunityDragon } from "../../utils/utils";

document.addEventListener("DOMContentLoaded", async function () {
  let filterConditions = {};
  const lineupSetup = document.getElementById("lineup-setup");
  const enemyLineupArea = lineupSetup.querySelector(".enemy-lineup-area");
  const traitsSelect = lineupSetup.querySelector(".filter-by-trait");
  const costSelect = lineupSetup.querySelector(".filter-by-cost");
  const champs = lineupSetup.querySelector(".champs");
  let hexSelected = null;
  if (TRAITS_INFOR.length < 1) {
    await customFetch("traits", (data) => {
      // console.log(data);
      TRAITS_INFOR.splice(0, TRAITS_INFOR.length, ...data.traits);
    });
  }
  if (CHAMPS_INFOR.length < 1) {
    await customFetch("champs", (data) => {
      // console.log(data);
      const isChamps = data?.champs
        ?.filter((c) => c.squareIcon && c.icon && c.role && c.traits.length > 0)
        .sort((prev, curr) => (prev.cost < curr.cost ? -1 : 1));
      CHAMPS_INFOR.splice(0, CHAMPS_INFOR.length, ...isChamps);
    });
  }
  const customEvent = new CustomEvent("updateAllEnemyLinup");
  const renderChamps = (fConditions = {}) => {
    // console.log(fConditions);
    let champLength = 0;
    champs.replaceChildren();

    CHAMPS_INFOR.forEach((champ, index) => {
      let conditionsAccepted = true;
      // console.log(champ);
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
      if (conditionsAccepted || Object.keys(fConditions).length < 1) {
        champLength += 1;
        // console.log({ name: champ.name, traits: champ.traits });
        const champImg = document.createElement("img");
        champImg.src = `${generateIconURLFromRawCommunityDragon(
          champ?.squareIcon
        )}`;
        champImg.champData = CHAMPS_INFOR.find((c) => c.name === champ.name);
        champImg.onerror = function (e) {
          console.error("champImg error at: " + champ.name);
        };
        champImg.onload = () => {
          champImg.draggable = true;
          champImg.className = `champ-selectable w-[6.5vw] h-[6.5vw] hover:brightness-150 transition-[brightness] duration-150`;
          // ondrag
          champImg.addEventListener("ondrag", function (event) {
            console.log("chamImg ondrag");
          });
          // ondragstart
          champImg.addEventListener("dragstart", function (event) {
            event.dataTransfer.setData(
              "img",
              JSON.stringify({
                src: champImg.src,
                champData: champImg.champData,
              })
            );
          });
          // onclick
          champImg.addEventListener("click", function () {
            if (hexSelected) {
              const hexFound = document.getElementById(hexSelected);
              if (hexFound) {
                const imgInsideHex = hexFound.querySelector("img");
                if (imgInsideHex) {
                  imgInsideHex.src = champImg.src;
                } else {
                  const newImg = document.createElement("img");
                  newImg.className =
                    "w-full h-full hover:brightness-150 transition-[brightness] duration-150";
                  newImg.src = champImg.src;
                  newImg.champData = champImg.champData;
                  hexFound.appendChild(newImg);
                  newImg.addEventListener("dragstart", function (event) {
                    event.dataTransfer.setData(
                      "img",
                      JSON.stringify({
                        src: newImg.src,
                        champData: newImg.champData,
                      })
                    );
                    event.dataTransfer.setData("from", hexFound.id);
                  });
                }
                hexFound.classList.replace("bg-yellow-700", "bg-gray-700");
                hexFound.dispatchEvent(customEvent);
                hexSelected = null;
              }
            }
          });
          const champDiv = document.createElement("div");
          champDiv.className = "flex flex-col items-center mr-[1vw]";
          const champName = document.createElement("span");
          champName.className =
            "text-[1.2vw] " +
            (champ.cost === 1
              ? "text-white"
              : champ.cost === 2
              ? "text-green-500"
              : champ.cost === 3
              ? "text-blue-500"
              : champ.cost === 4
              ? "text-purple-500"
              : champ.cost === 5
              ? "text-orange-500"
              : "text-pink-500");
          champName.textContent = champ.name;
          champDiv.appendChild(champImg);
          champDiv.appendChild(champName);
          champs.appendChild(champDiv);
        };
      }
    });
    champs.classList.toggle("justify-center", champLength > 11);
    champs.classList.toggle("justify-start", champLength <= 11);
  };
  renderChamps(filterConditions);

  // filter by trait
  const selected = traitsSelect.querySelector(".selected");
  const options = traitsSelect.querySelector(".options");
  const optionNone = options.querySelector(".option-none");

  selected.addEventListener("click", () => {
    options.classList.toggle("hidden");
  });

  const filterTraits = TRAITS_INFOR.filter(
    (trait) => !trait.apiName.includes("MechanicTrait")
  );
  filterTraits.forEach((trait) => {
    const optionDiv = document.createElement("div");
    const imgSrc = generateIconURLFromRawCommunityDragon(trait.icon);
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

  const updateAllEnemyLinup = () => {
    if (hexDivs.length < 1) return;
    const champNames = hexDivs.map((hexId) => {
      const hexEl = document.getElementById(hexId);
      if (hexEl) {
        const imgInsideHex = hexEl.querySelector("img");
        if (imgInsideHex) {
          return imgInsideHex.champData;
        } else {
          return null;
        }
      }
      return null;
    });
    updateEnemyLineup(champNames);
  };

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
      // ondragenter
      hexDiv.addEventListener("dragenter", function (e) {
        e.preventDefault();
        hexDiv.classList.replace("bg-gray-700", "bg-yellow-700");
      });
      // ondragleave
      hexDiv.addEventListener("dragleave", function (e) {
        e.preventDefault();
        hexDiv.classList.replace("bg-yellow-700", "bg-gray-700");
      });
      // ondragover
      hexDiv.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      // onclick
      hexDiv.addEventListener("click", function () {
        hexDiv.classList.replace("bg-gray-700", "bg-yellow-700");
        hexSelected = hexDiv.id;
      });
      // ondrop
      hexDiv.addEventListener("drop", function (e) {
        const { src: imgSrc, champData } = JSON.parse(
          e.dataTransfer.getData("img")
        );
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
        // img inside hex ondragstart
        img.addEventListener("dragstart", function (event) {
          // console.log(img.src);
          event.dataTransfer.setData("img", img.src);
          event.dataTransfer.setData("from", "hex-" + Number(row * cols + col));
        });
        img.src = imgSrc;
        img.champData = champData;
        console.log(img.champData);
        hexDiv.replaceChildren(img);
        updateAllEnemyLinup();
      });
      // oncontextmenu
      hexDiv.addEventListener("contextmenu", function () {
        const champImg = hexDiv.querySelector("img");
        if (champImg) {
          updateEnemyLineup(champImg.champData.name);
        }
        hexDiv.replaceChildren();
        hexDiv.classList.replace("bg-yellow-700", "bg-gray-700");
      });
      // custom event: updateAllEnemyLinup
      hexDiv.addEventListener("updateAllEnemyLinup", function () {
        updateAllEnemyLinup();
      });
      rowDiv.appendChild(hexDiv);
      hexDivs.push(hexDiv.id);
    }
    enemyLineupArea.appendChild(rowDiv);
  }
});
