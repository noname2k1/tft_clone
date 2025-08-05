import * as THREE from "https://esm.sh/three";
import {
  COLOR_DELETE_ZONE,
  COLOR_MOVEABLE,
  debugOn,
  ITEMS_INFOR,
} from "~/variables";
import {
  createDebugGuiFolder,
  generateIconURLFromRawCommunityDragon,
} from "../utils/utils";
import { markChampNames } from "../others/modal/markChamps";
function createDeleteZone(
  scene,
  width = 35,
  depth = 5,
  color = COLOR_DELETE_ZONE,
  pos = [0, 0, 0]
) {
  const deleteZone = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.1, depth),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.5,
      transparent: true,
    })
  );
  deleteZone.visible = false;
  deleteZone.position.set(...pos);
  deleteZone.updateMatrixWorld();
  scene.add(deleteZone);
  return deleteZone;
}

// Battle Field
function createBattleField(
  scene,
  rows,
  cols,
  data = { radius: 0, startX: 0, startZ: 0 },
  owner = "me"
) {
  const bfCells = [];
  const bfEnemyCells = [];
  const { radius, startX, startZ } = data;
  const hexMaterial = new THREE.LineBasicMaterial({
    color: COLOR_MOVEABLE,
    linewidth: 100,
  });
  const angleOffset = Math.PI / 6;
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + angleOffset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (i === 0) hexShape.moveTo(x, z);
    else hexShape.lineTo(x, z);
  }
  hexShape.closePath();
  const hexPoints = hexShape.getPoints();
  const hexGeometry = new THREE.BufferGeometry().setFromPoints(
    hexPoints.map((p) => new THREE.Vector3(p.x, 0.01, p.y))
  );
  const dis = 1.2;
  const hexWidth = Math.sqrt(3) * radius * dis;
  const hexRowSpacing = 1.5 * radius * dis;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * (hexWidth / 2);
      const x = startX + col * hexWidth + offsetX;
      const z = startZ + row * hexRowSpacing;
      const hex = new THREE.Line(hexGeometry, hexMaterial.clone());
      hex.position.set(x, 0, z);
      scene.add(hex);
      hex.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(hex);
      if (owner === "me") {
        hex.visible = false;
        bfCells.push({ mesh: hex, center: new THREE.Vector3(x, 0, z), box });
      } else {
        hex.visible = false;
        bfEnemyCells.push({
          mesh: hex,
          center: new THREE.Vector3(x, 0, z),
          box,
        });
      }
    }
  }

  return owner === "me" ? bfCells : bfEnemyCells;
}

// Bench
function createBench(
  scene,
  rows,
  cols,
  size,
  gap = 0.2,
  position,
  owner = "me"
) {
  const xMes = [];
  const xBenchEnemy = [];
  let zMe, zBenchEnemy;
  const squareGroup = new THREE.Group();
  const benchCells = [];
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const step = size + gap;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step,
        z = row * step;
      const points = [
        new THREE.Vector3(x, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x + size, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z + size),
        new THREE.Vector3(x, 0.01, z),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineSegments = new THREE.LineSegments(
        geometry,
        lineMaterial.clone()
      );
      lineSegments.visible = false;
      squareGroup.add(lineSegments);
      const box = new THREE.Box3(
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + size, 1, z + size)
      );

      if (owner === "me") {
        xMes[col] = x + position[0] + (size - 1);
        benchCells.push({ mesh: lineSegments, box });
      } else {
        xBenchEnemy[col] = x + position[0] + (size - 1);
      }
    }
    if (owner === "me") {
      zMe = position[2] + (size - 1);
    } else {
      zBenchEnemy = position[2] + (size - 1);
    }
  }
  squareGroup.updateMatrixWorld();
  squareGroup.position.set(...position);
  scene.add(squareGroup);
  if (debugOn) {
    const objectDebug = {
      name: owner + "'s SquareGroup (" + owner.charAt(0).toUpperCase() + ")",
      object: squareGroup,
      key: owner.charAt(0),
      isOpen: false,
    };
    createDebugGuiFolder(objectDebug);
  }
  return owner === "me"
    ? { squareGroup, xMes, zMe, benchCells }
    : { squareGroup, xBenchEnemy, zBenchEnemy, benchCells };
}

function faceToObj(dir = null, rot = null, targetPos = null, pos = null) {
  // console.log({ targetPos, pos });
  try {
    let direction;
    if (!dir) {
      if (!targetPos || !pos) return;
      direction = new THREE.Vector3().subVectors(targetPos, pos);
      direction.y = 0;
      direction.normalize();
    } else direction = dir;
    if (rot) {
      rot.y = Math.atan2(direction.x, direction.z);
    }
  } catch (error) {
    console.log("error faceToObj: ", error);
  }
}

function moveToOtherObject(
  fromObj,
  targetObj,
  speed,
  afterMoveCallBack = () => {},
  state = { isRunning: false },
  fromObjAnimations = { idle: null, run: null },
  delta = 0.016 // mặc định ~60fps
) {
  // Utility: Get actual position reference
  const getPosition = (obj) =>
    obj?.position ||
    obj?.modelScene?.position ||
    obj?.userData?.champScene?.position ||
    obj;

  // Utility: Get actual rotation reference
  const getRotation = (obj) =>
    obj?.rotation ||
    obj?.modelScene?.rotation ||
    obj?.userData?.champScene?.rotation;

  // Utility: Apply position
  const setPosition = (obj, pos) => {
    if (obj?.position) obj.position.copy(pos);
    else if (obj?.modelScene?.position) obj.modelScene.position.copy(pos);
    else if (obj?.userData?.champScene?.position)
      obj.userData.champScene.position.copy(pos);
  };

  const pos = getPosition(fromObj);
  const targetPos = getPosition(targetObj);
  const rot = getRotation(fromObj);

  if (!pos || !targetPos) return;

  // Animation fallback (if not provided)
  const animations = { ...fromObjAnimations };
  if ((!animations.idle || !animations.run) && fromObj?.animations) {
    const findAnim = (keyword) =>
      fromObj.animations.find((anim) =>
        anim.name.toLowerCase().includes(keyword)
      );
    animations.idle = fromObj.mixer?.clipAction(findAnim("idle"));
    animations.run = fromObj.mixer?.clipAction(findAnim("run"));
  }

  // Direction + movement
  const dir = new THREE.Vector3().subVectors(targetPos, pos);
  dir.y = 0;
  const distance = dir.length();

  if (distance > 0.1) {
    if (!state.isRunning) {
      animations.idle?.stop();
      animations.run?.play();
      state.isRunning = true;
    }

    dir.normalize();
    if (rot) faceToObj(dir, rot);
    pos.add(dir.multiplyScalar(speed * delta));
  } else {
    setPosition(fromObj, targetPos);
    if (state.isRunning) {
      animations.run?.stop();
      animations.idle?.play();
      state.isRunning = false;
    }

    afterMoveCallBack();
  }
}

function moveCharacter(
  fromObj,
  targetObj,
  speed,
  onDone,
  onRunning = () => {}
) {
  const state = { isRunning: false };
  const animateMove = () => {
    onRunning();
    const id = requestAnimationFrame(animateMove);
    const finished = moveToOtherObject(
      fromObj,
      targetObj,
      speed,
      () => {
        cancelAnimationFrame(id);
        onDone?.();
      },
      state
    );
  };
  animateMove();
}

const getMarkChampFromStorage = () => {
  const existedTeams = JSON.parse(localStorage.getItem("mark-teams")) || [];
  const enabledTeam = existedTeams.find((team) => team.enabled);
  return { existedTeams, enabledTeam };
};

const saveMarkChampToStorage = (id, markChampNames = [], action = "save") => {
  if (!id) {
    console.warn("No teamId provided, skipping save.");
    return;
  }
  const existedTeams = getMarkChampFromStorage().existedTeams;
  const existedTeamIndex = existedTeams.findIndex((team) => team.id === id);
  if (existedTeamIndex !== -1) {
    existedTeams.splice(existedTeamIndex, 1);
  }
  // Disable all other teams
  existedTeams.forEach((team) => {
    team.enabled = false;
  });
  // Save new team
  if (action === "save") {
    existedTeams.push({
      id,
      enabled: true,
      team: markChampNames,
    });
  }
  localStorage.setItem("mark-teams", JSON.stringify(existedTeams));
};

const disabledMarkChamp = (teamId) => {
  if (!teamId) {
    console.warn("No teamId provided, skipping save.");
    return;
  }
  const existedTeams = getMarkChampFromStorage().existedTeams;
  const existedTeamIndex = existedTeams.findIndex((team) => team.id === teamId);
  if (existedTeamIndex !== -1) {
    existedTeams.push({
      id: teamId,
      enabled: false,
      team: existedTeams[existedTeamIndex].team,
    });
    existedTeams.splice(existedTeamIndex, 1);
    localStorage.setItem("mark-teams", JSON.stringify(existedTeams));
  }
};

function renderTraitDesc(desc, effects, effect) {
  // console.log(desc);
  // Tách theo từng <row> để xử lý biến riêng biệt cho mỗi cấp
  let activeEffectIndex = -1;
  const currentEffectIndex = effects.findIndex(
    (eff) => eff.minUnits === effect.minUnits
  );
  if (currentEffectIndex != -1) {
    activeEffectIndex = currentEffectIndex;
  }
  let rows = desc.split(/<row>/g);
  let mainDesc = rows.splice(0, 1)[0];
  let endDesc = "";
  if (rows.length === 0) {
    rows = desc.split(/<expandRow>/g);
    mainDesc = rows.splice(0, 1)[0];
    const matches = desc.match(/<expandRow>(.*?)<\/expandRow>/gs) || [];
    rows = matches.map((row) => row.replace(/<\/?expandRow>/g, ""));
    endDesc =
      desc.split(/<\/expandRow>/g)[desc.split(/<\/expandRow>/g).length - 1];
    // console.log(endDesc);
    // console.log({ rows, mainDesc });

    const content = rows[0];
    Array.from({ length: effects.length }).forEach((_, index) => {
      rows[index] =
        `<span class='${
          activeEffectIndex === index ? "text-white" : "text-gray-500"
        }'>` +
        content +
        "</span>" +
        (content?.includes("<br>") ? "" : "<br>");
    });
    if (endDesc) {
      endDesc = endDesc.split(/<br\s*\/?>/).filter((p) => p.trim() !== "");
      endDesc[0] = "<br>" + endDesc[0];
      endDesc = endDesc.map((eDesc) => {
        const hasChampion = effect?.champs?.some((champName) =>
          eDesc.includes(champName)
        );
        if (hasChampion) {
          return `<span class="text-white">${eDesc}</span>`;
        } else {
          return `<span class="text-gray-500">${eDesc}</span>`;
        }
      });
      endDesc = endDesc.join("<br>");
    }
  }

  // console.log(rows);
  // console.log(mainDesc);
  const renderedRows = rows.map((row, index) => {
    // Dùng biến ứng với từng cấp trong effects[index]
    const variablesParent = effects[index] || {};
    // console.log(variablesParent);
    const variables = effects[index]?.variables || {};
    // console.log(variablesParent, variables);
    row =
      `<span class='${
        activeEffectIndex === index ? "text-white" : "text-gray-500"
      }'>` +
      row +
      "</span>" +
      (row.includes("<br>") ? "" : "<br>");
    // Thay thế @VariableName@ hoặc @VariableName*Multiplier@
    return row.replace(
      /@([\w.]+)(\*([\d.]+))?@/g,
      (match, varName, _full, multiplier) => {
        if (
          variablesParent.hasOwnProperty(
            varName.charAt(0).toLowerCase() + varName.slice(1, varName.length)
          )
        ) {
          const vName =
            varName.charAt(0).toLowerCase() + varName.slice(1, varName.length);
          // console.log(vName);
          let val = variablesParent[vName];
          if (multiplier) val *= parseFloat(multiplier);
          return Math.round(val);
        }
        if (variables.hasOwnProperty(varName)) {
          let val = variables[varName];
          if (multiplier) val *= parseFloat(multiplier);
          return Math.round(val);
        }
        return "[" + varName + "]";
      }
    );
  });
  // console.log(endDesc);
  const variables = effect?.variables || effects[0]?.variables;
  // Ghép lại các đoạn đã xử lý
  return (
    mainDesc.replace(
      /@([\w.]+)(\*([\d.]+))?@/g,
      (match, varName, _full, multiplier) => {
        const cypherCashouts = [
          "CashoutStage1",
          "CashoutRound1",
          "CashoutStage2",
          "CashoutRound2",
          "CashoutStage3",
          "CashoutRound3",
          "CashoutStage4",
          "CashoutRound4",
          "CashoutStage5",
          "CashoutRound5",
        ];
        const rounds = [3, 3, 3, 7, 4, 3, 4, 7, 5, 5];

        const cypherIndex = cypherCashouts.indexOf(varName);
        if (cypherIndex !== -1) {
          return rounds[cypherIndex];
        }

        const vName = varName.charAt(0).toLowerCase() + varName.slice(1);

        if (effect?.hasOwnProperty(vName)) {
          let val = effect[vName];
          if (multiplier) val *= parseFloat(multiplier);
          return Math.round(val);
        }
        // console.log(varName);
        // console.log(effects);
        // console.log(variables);
        if (variables?.hasOwnProperty(varName)) {
          let val = variables[varName];
          if (multiplier) val *= parseFloat(multiplier);
          return Math.round(val);
        }

        return "[" + varName + "]";
      }
    ) +
    (mainDesc !== desc
      ? `${renderedRows
          .join("<row>")
          .replace(
            /@([^@*]+)(\*([\d.]+))?@/g,
            (match, varName, _full, multiplier) => {
              let vName;
              const animaSquadVars = [
                "TFTUnitProperty.trait:TFT14_AnimaSquad_Bonus_1",
                "TFTUnitProperty.trait:TFT14_AnimaSquad_Bonus_2",
                "TFTUnitProperty.trait:TFT14_AnimaSquad_Bonus_3",
                "TFTUnitProperty.trait:TFT14_AnimaSquad_Bonus_4",
              ];
              const varIndex = animaSquadVars.findIndex(
                (vari) => vari === varName
              );
              if (varIndex != -1) {
                vName = "DamageAmp";
              }
              // console.log(vName);
              // console.log(effect);
              if (effects[varIndex]?.variables?.hasOwnProperty(vName)) {
                let val = effects[varIndex]?.variables[vName];
                if (multiplier) val *= parseFloat(multiplier);
                return "";
              }
              return "[" + varName + "]";
            }
          )}${endDesc.replace(
          /@([^@*]+)(\*([\d.]+))?@/g,
          (match, varName, _full, multiplier) => {
            let vName;
            const divinicorpsVariables = [
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_AP",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_Defenses",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_AD",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_Health",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_Crit",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_AS",
              "TFTUnitProperty.trait:TFT14_Trait_Divinicorp_Omnivamp",
            ];
            const divinicorpsKey = [
              "{19e47528}",
              "{f82ecbac}",
              "{912546f4}",
              "{a8a84fe9}",
              "{414a2beb}",
              "{4803a4eb}",
              "{3c9e3624}",
            ];
            const divinicorpIndex = divinicorpsVariables.indexOf(varName);
            if (divinicorpIndex !== -1) {
              vName = divinicorpsKey[divinicorpIndex];
            }
            // console.log(vName);
            // console.log(effect);
            if (effect?.variables?.hasOwnProperty(vName)) {
              let val = effect.variables[vName];
              if (multiplier) val *= parseFloat(multiplier);
              return Math.round(val);
            }
            return "[" + varName + "]";
          }
        )}`
      : "") +
    "<div class='flex items-center flex-wrap mt-[1vw]'>" +
    effect.allChamps.reduce((acc, champ) => {
      const hasChamp = effect.champs.includes(champ.name);
      return (
        acc +
        `<img class="w-[3.5vw] h-[3.5vw] mr-[0.5vw] mb-[0.5vw] ${
          hasChamp ? "" : "grayscale"
        }" src="${generateIconURLFromRawCommunityDragon(
          champ.squareIcon
        )}" alt="${champ.name}-icon" title="${champ.name}"/>`
      );
    }, "") +
    "</div>"
  );
}

function renderItemDesc(desc, effects) {
  const rows = desc.split(/<tftitemrules>/g);
  const matches = desc.match(/<tftitemrules>(.*?)<\/tftitemrules>/gs) || [];
  // console.log(desc);
  // console.log(matches);
  return rows[0] + `<span class="text-red-500">${matches[0]}</span>`;
}

function injectVariables(
  desc,
  variables,
  stats = {},
  starLevel = 1,
  type = "champ"
) {
  const unusedVars = [...variables];

  const valueAtLevel = (name) => {
    const lowerName = name.toLowerCase();
    let v = variables.find((v) => v.name.toLowerCase().includes(lowerName));

    if (v) {
      unusedVars.splice(
        unusedVars.findIndex((u) => u.name === v.name),
        1
      );
      return v.value[starLevel];
    }

    // Special case: TotalDamage
    if (name === "TotalDamage") {
      try {
        const ratioVar = variables.find((v) =>
          /ap|ad/.test(v.name.toLowerCase())
        );
        const percentVar = variables.find((v) =>
          /percent.*damage/.test(v.name.toLowerCase())
        );
        if (!percentVar) return `[${name}]`;

        return Math.round(
          (stats.damage + (ratioVar ? 0 : stats.armor)) *
            percentVar.value[starLevel] +
            (ratioVar?.value[starLevel] ?? 0)
        );
      } catch {
        return `[${name}]`;
      }
    }

    // Special case: Modified
    if (lowerName.includes("modified")) {
      const ratio = variables.find((v) =>
        v.name.toLowerCase().includes("ratio")
      );
      const obj = variables.find((v) => /ap|ad/.test(v.name.toLowerCase()));

      if (ratio && obj && name === "ModifiedDamage") {
        return Math.floor(
          ratio.value[starLevel] * obj.value[starLevel] + obj.value[starLevel]
        );
      } else {
        const key = lowerName.split("modified")[1];
        v = variables.find((v) => v.name.toLowerCase().includes(key));
        return v?.value[starLevel] ?? `[${name}]`;
      }
    }

    return `[${name}]`;
  };

  const descConverted =
    type === "champ"
      ? desc.replace(/@([\w]+)(\*[\d.]+)?@/g, (_, name, mul) => {
          let val = valueAtLevel(name);
          if (val === "N/A") return "N/A";
          if (mul) val = Math.round(val * parseFloat(mul.slice(1)));
          return val;
        })
      : type === "trait"
      ? renderTraitDesc(desc, variables, stats)
      : renderItemDesc(desc, variables);

  const iconMap = {
    scaleAP: "scaleAP.svg",
    scaleAD: "scaleAD.svg",
    scaleArmor: "scaleArmor.svg",
    scaleHealth: "scaleHealth.svg",
    scaleMana: "scaleMana.svg",
    scaleMR: "scaleMR.png",
    scaleDA: "scaleDA.png",
    scaleSV: "scaleSV.svg",
    scaleAS: "scaleAS.svg",
    scaleDR: "scaleDR.png",
    scaleCrit: "scaleCrit.png",
    set14AmpIcon: "A.M.P._TFT_Stat_icon.png",
    "3StarEnabled": "3StarEnabled.png",
  };

  return Object.entries(iconMap).reduce((out, [key, file]) => {
    return out.replaceAll(
      `%i:${key}%`,
      `<img src="/images/items/${file}" class="w-[auto] h-[1vw] inline"/>`
    );
  }, descConverted);
}

const posTooltip = (ev, tooltip, pos, cb) => {
  const offsetX = 8;
  const offsetY = 8;
  const tooltipHeight = tooltip.offsetHeight || 0;
  const tooltipWidth = tooltip.offsetWidth || 0;
  const positions = pos.split(",");

  // -------- X Position (horizontal)
  if (positions.includes("right")) {
    const proposedLeft = ev.clientX + offsetX;
    if (proposedLeft + tooltipWidth > window.innerWidth) {
      // Nếu tooltip vượt qua phải màn hình → hiển thị bên trái
      tooltip.style.left = ev.clientX - tooltipWidth - offsetX + "px";
    } else {
      tooltip.style.left = proposedLeft + "px";
    }
    tooltip.style.right = "auto";
  } else if (positions.includes("left")) {
    const proposedRight = window.innerWidth - ev.clientX + offsetX;
    if (proposedRight + tooltipWidth > window.innerWidth) {
      tooltip.style.left = ev.clientX - tooltipWidth - offsetX + "px";
      tooltip.style.right = "auto";
    } else {
      tooltip.style.left = "auto";
      tooltip.style.right = proposedRight + "px";
    }
  }

  // -------- Y Position (vertical)
  if (positions.includes("top")) {
    const proposedTop = ev.clientY - tooltipHeight - offsetY;
    if (proposedTop < 0) {
      // Nếu tooltip vượt lên trên → chuyển xuống dưới
      tooltip.style.top = ev.clientY + offsetY + "px";
    } else {
      tooltip.style.top = proposedTop + "px";
    }
    tooltip.style.bottom = "auto";
  } else if (positions.includes("bottom")) {
    const proposedBottom = ev.clientY + tooltipHeight + offsetY;
    if (proposedBottom > window.innerHeight) {
      // Nếu tooltip vượt xuống dưới → chuyển lên trên
      tooltip.style.top = ev.clientY - tooltipHeight - offsetY + "px";
    } else {
      tooltip.style.top = ev.clientY + offsetY + "px";
    }
    tooltip.style.bottom = "auto";
  }

  cb(tooltip);
};

function onTooltip(
  element,
  cbMouseEnter = () => {},
  pos = "top,right",
  clickToOpen = false,
  cbMouseMove = () => {},
  cbMouseLeave = () => {}
) {
  const hideTooltip = (e) => {
    const isClickInsideElement = element.contains(e.target);
    const isClickInsideTooltip = tooltip.contains(e.target);
    if (!isClickInsideElement && !isClickInsideTooltip) {
      tooltip.classList.add("hidden");
      tooltip.replaceChildren();
      cbMouseLeave(tooltip);
    }
  };
  const tooltip = document.getElementById("tooltip");
  if (!clickToOpen) {
    element.addEventListener("mouseenter", (e) => {
      tooltip.classList.remove("hidden");
      cbMouseEnter(tooltip);
    });

    element.addEventListener("mousemove", (ev) => {
      posTooltip(ev, tooltip, pos, cbMouseMove);
    });
    element.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
      tooltip.replaceChildren();
      cbMouseLeave(tooltip);
    });
    // document.addEventListener("mouseover", hideTooltip);
  } else {
    element.addEventListener("click", (ev) => {
      ev.stopPropagation(); // Ngăn click lan ra document
      tooltip.replaceChildren();
      posTooltip(ev, tooltip, pos, cbMouseMove);
      tooltip.classList.remove("hidden");
      cbMouseEnter(tooltip);
    });
    // Tắt tooltip nếu click ra ngoài cả element lẫn tooltip
    document.addEventListener("click", hideTooltip);
  }
}

const statsCalculate = (champ) => {
  if (!champ)
    return {
      row1: [0, 0, 0, 0, 0],
      row2: [0, 0, 0, 0, 0],
    };
  const dmgMultiplier = 1.5;
  const hpMultiplier = 1.8;

  const level = champ.userData.level;
  const stats = champ.userData.data.stats;

  // Gấp bội theo từng cấp
  const getGrowthValue = (base, multiplier, level) => {
    if (level <= 1) return base;
    return base * Math.pow(multiplier, level - 1);
  };

  const row1 = [
    getGrowthValue(stats.damage, dmgMultiplier, level),
    stats.damage,
    stats.armor,
    stats.magicResist,
    +stats.attackSpeed.toFixed(2),
  ];

  const row2 = [
    +stats.critChance.toFixed(2) * 10,
    +stats.critMultiplier.toFixed(2) * 10,
    0, // omnivamp
    0, // damageAmp
    0, // durability
  ];

  return { row1, row2 };
};

function getRandomItem(items) {
  const total = items.reduce((sum, item) => sum + item.chance, 0);
  const rand = Math.random() * total;

  let acc = 0;
  for (const item of items) {
    acc += item.chance;
    if (rand < acc) {
      return item.id;
    }
  }
}

const getItems = (itemNames = [], getSingle = false) => {
  let count = getSingle ? 1 : itemNames.length;
  const itemsFound = [];
  itemNames.forEach((itemName) => {
    if (itemsFound.length < count) {
      const itemFound = ITEMS_INFOR.find(
        (item) => item.name && item?.name === itemName
      );
      if (itemFound) {
        // console.log(itemFound);
        itemsFound.push(itemFound);
      } else {
        itemsFound.push(itemName);
      }
    }
  });
  return itemsFound;
};

export {
  createDeleteZone,
  createBattleField,
  createBench,
  moveToOtherObject,
  moveCharacter,
  getMarkChampFromStorage,
  saveMarkChampToStorage,
  disabledMarkChamp,
  faceToObj,
  injectVariables,
  onTooltip,
  statsCalculate,
  getItems,
  getRandomItem,
};
