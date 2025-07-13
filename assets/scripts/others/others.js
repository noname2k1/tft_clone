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
  // render my gold, exp
  renderGold();
  renderExp();

  lockShopBtn.addEventListener("click", function (e) {
    lockShopBtn.children[0].classList.toggle("invisible", !toggleLockShop());
  });
});
