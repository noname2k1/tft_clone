import { EXP_TABLE, fee } from "~/variables.js";

let myExp = 0;
let myGold = 0;
let state = 2;
let lockShop = false;

function renderGold() {
  // render my gold, exp
  const myGoldElm = document.getElementById("my-gold");
  const myGold = getMyGold();
  myGoldElm.innerHTML =
    myGold >= 1000 ? (myGold / 1000).toFixed() + "K" : myGold;
}

function renderExp() {
  const myLevel = document.getElementById("lv");
  const leftExp = document.getElementById("left-exp");
  const totalExp = document.getElementById("total-exp");
  const expDisplay = document.getElementById("exp-display");

  const expInfor = getLeftExpAndMyLevel();
  myLevel.innerText =
    state === 0 ? 1 : state === 1 ? 2 : getLeftExpAndMyLevel().level;
  leftExp.innerHTML = expInfor.totalExp - expInfor.leftExp;
  totalExp.innerHTML = expInfor.totalExp;
  expDisplay.style.width = expInfor.buyExpEnabled
    ? ((expInfor.totalExp - expInfor.leftExp) / expInfor.totalExp) * 100 + "%"
    : "0%";
}

function getTotalExpToLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += EXP_TABLE[i] || 0;
  }
  return total;
}

function getLeftExpAndMyLevel() {
  const expTable = Object.entries(EXP_TABLE).map(([level, expNeed]) => ({
    level,
    expNeed,
  }));
  for (let i = 0; i < expTable.length; i++) {
    const totalExpToLevel = getTotalExpToLevel(expTable[i].level);
    if (myExp <= totalExpToLevel) {
      return {
        level: expTable[i].level,
        leftExp: i === expTable.length - 1 ? 0 : totalExpToLevel - myExp,
        totalExp: expTable[i].expNeed,
        buyExpEnabled: i < expTable.length - 1,
      };
    }
  }
}

// console.log(getLeftExpAndMyLevel());

function handleBuyExp(callback = () => {}) {
  if (!getLeftExpAndMyLevel().buyExpEnabled) {
    // addToast("You have reached the highest level!");
    return;
  }
  if (myGold >= fee.buyExp) {
    myExp += fee.buyExp;
    myGold -= fee.buyExp;
    callback();
    renderExp();
    renderGold();
    console.log("buy exp: ", { myGold, myExp });
  }
}

function handleReroll(callback = () => {}) {
  if (lockShop) return;
  if (myGold >= fee.reroll) {
    myGold -= fee.reroll;
    callback();
    renderGold();
    console.log("reroll:", { myGold });
  }
}

const getMyGold = () => myGold;
const addGold = (gold) => {
  const addGoldTimeOut = setTimeout(() => {
    myGold += Number(gold);
    renderGold();
    console.log("add gold: " + gold);
    clearTimeout(addGoldTimeOut);
  }, 100);
};
const addExp = (exp) => {
  const addExpTimeOut = setTimeout(() => {
    myExp += Number(exp);
    renderGold();
    renderExp();
    clearTimeout(addExpTimeOut);
  }, 100);
};

const toggleLockShop = () => {
  lockShop = !lockShop;
  return lockShop;
};

export {
  getLeftExpAndMyLevel,
  handleBuyExp,
  handleReroll,
  getMyGold,
  addGold,
  addExp,
  renderGold,
  renderExp,
  toggleLockShop,
};
