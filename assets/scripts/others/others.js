import { TRAITS_INFOR } from "~/variables.js";
import { customFetch } from "~~/utils/callApi";
import {
  getMyGold,
  renderExp,
  renderGold,
  toggleLockShop,
} from "~/assets/scripts/others/goldExp";

// document.addEventListener("contextmenu", function (event) {
//   event.preventDefault(); // chặn menu chuột phải
// });

document.addEventListener("DOMContentLoaded", async function () {
  const lockShopBtn = document.getElementById("lock-shop");
  // get trais infor from server
  await customFetch("traits", (data) => {
    TRAITS_INFOR.splice(0, TRAITS_INFOR.length, ...data.traits);
  });
  // render my gold, exp
  renderGold();
  renderExp();

  lockShopBtn.addEventListener("click", function (e) {
    lockShopBtn.children[0].classList.toggle("invisible", !toggleLockShop());
  });
});
