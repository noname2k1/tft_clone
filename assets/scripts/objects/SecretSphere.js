import * as THREE from "https://esm.sh/three";
import ItemOutBag from "./ItemOutBag";
import { ITEMS_INFOR } from "~/variables";
import { addToast, getItems, getRandomItem } from "../services/services";
import { customFetch } from "../utils/callApi";
import { addGold } from "../others/goldExp";
import Team from "./Team";
import Battle from "./Battle";
import { createSpriteObject, delay } from "../utils/utils";
import ChampionManager from "./ChampionManager";

export default class SecretSphere extends ItemOutBag {
  #effect;
  #type;
  id;
  #orbTexture = {
    0: {
      img: "/images/silver-orb-texture.png",
      size: 1.3,
      name: "silver orb",
    },
    1: {
      img: "/images/blue-orb-texture.png",
      size: 2,
      name: "blue orb",
    },
    2: {
      img: "/images/gold-orb-texture.png",
      size: 2.5,
      name: "gold orb",
    },
    3: {
      img: "/images/prismatic-orb-texture.png",
      size: 4,
      name: "prismatic orb",
    },
    4: {
      img: "/images/green-orb-texture.png",
      size: 3,
      name: "green orb",
    },
  };
  #orbRewards = {
    silverOrbs_1_2: [
      { id: 0, name: "2_1Cost Unit", chance: 48 },
      { id: 1, name: "1_2Cost Unit", chance: 47 },
      { id: 2, name: getItems(["Reforger", "2 Gold"]), chance: 3 },
      { id: 3, name: getItems(["Magnetic Remover", "2 Gold"]), chance: 1 },
      { id: 4, name: getItems(["Lesser Champion Duplicator"]), chance: 1 },
    ],
    silverOrbs_3plus: [
      { id: 0, name: "1_3Cost Unit", chance: 49 },
      { id: 1, name: ["1 Gold", "1_2Cost Unit"], chance: 46 },
      { id: 2, name: getItems(["Reforger", "3 Gold"]), chance: 3 },
      { id: 3, name: getItems(["Magnetic Remover", "3 Gold"]), chance: 1 },
      { id: 4, name: getItems(["Lesser Champion Duplicator"]), chance: 1 },
    ],
    blueOrbs_1_2_3: [
      { id: 0, name: "2_3Cost Unit", chance: 33 },
      { id: 1, name: ["3 Gold", "1_3Cost Unit"], chance: 31 },
      { id: 2, name: "3_2Cost Unit", chance: 31 },
      { id: 3, name: getItems(["Reforger", "6 Gold"]), chance: 2 },
      {
        id: 4,
        name: getItems(["Champion Duplicator", "1_3Cost Unit"]),
        chance: 1,
      },
    ],
    blueOrbs_4plus: [
      { id: 0, name: ["4 Gold", "1_4Cost Unit"], chance: 49 },
      { id: 1, name: ["2 Gold", "2_3Cost Unit"], chance: 47 },
      { id: 2, name: getItems(["Champion Duplicator", "3 Gold"]), chance: 1 },
      { id: 3, name: getItems(["Reforger", "8 Gold"]), chance: 3 },
    ],
    goldOrbs_2_3: [
      { id: 0, name: "15 Gold", chance: 20 },
      { id: 1, name: "Completed Item Anvil", chance: 18 },
      {
        id: 2,
        name: getItems([
          "Reforger",
          Math.random() <= 0.5 ? "Spatula" : "Frying Pan",
          "4 Gold",
        ]),
        chance: 15,
      },
      { id: 3, name: getItems(["6 Gold", "2_4 Cost Unit"]), chance: 15 },
      { id: 4, name: getItems(["2 Gold", "4_3 Cost Unit"]), chance: 13 },
      { id: 5, name: getItems(["Thief's Gloves", "1 Gold"]), chance: 10 },
      { id: 6, name: getItems(["6 Gold", "Champion Duplicator"]), chance: 3 },
      {
        id: 7,
        name: getItems([
          "Champion Duplicator",
          "Lesser Champion Duplicator",
          "2 Gold",
        ]),
        chance: 3,
      },
      { id: 8, name: getItems(["2_3 Cost Unit", "5 Gold"]), chance: 3 },
    ],

    goldOrbs_4plus: [
      { id: 0, name: getItems(["13 Gold", "1_5 Cost Unit"]), chance: 20 },
      {
        id: 1,
        name: getItems(["Component Anvil", "Component Anvil", "2 Gold"]),
        chance: 20,
      },
      { id: 2, name: getItems(["10 Gold", "2_4 Cost Unit"]), chance: 15 },
      {
        id: 3,
        name: getItems(["Completed Item Anvil", "2 Gold"]),
        chance: 15,
      },
      { id: 4, name: getItems(["Thief's Gloves", "3 Gold"]), chance: 10 },
      {
        id: 5,
        name: getItems([
          "Reforger",
          Math.random() <= 0.5 ? "Spatula" : "Frying Pan",
          "Component Anvil",
          "1 Gold",
        ]),
        chance: 5,
      },
      { id: 6, name: getItems(["8 Gold", "Champion Duplicator"]), chance: 5 },
      { id: 7, name: getItems(["2_5 Cost Unit", "7 Gold"]), chance: 5 },
      { id: 8, name: "Artifact Item Anvil", chance: 5 },
    ],

    prismaticOrbs_3plus: [
      {
        id: 0,
        name: getItems(["Completed Item Anvil", "5 Gold"]),
        chance: 20,
      },
      {
        id: 1,
        name: getItems([
          "Magnetic Remover",
          "Support Item Anvil",
          "Artifact Item Anvil",
        ]),
        chance: 15,
      },
      {
        id: 2,
        name: getItems(["Component Anvil", "Component Anvil", "4 Gold"]),
        chance: 15,
      },
      { id: 3, name: "Artifact Item Anvil", chance: 15 },
      {
        id: 4,
        name: getItems([
          "Masterwork Upgrade",
          "Magnetic Remover",
          "Completed Item Anvil",
          "8 Gold",
        ]),
        chance: 15,
      },
      { id: 5, name: getItems(["10 Gold", "2_4 Cost Unit"]), chance: 15 },
      { id: 6, name: getItems(["Support Item Anvil"]), chance: 15 },
      {
        id: 7,
        name: getItems(["12 Gold", "Champion Duplicator"]),
        chance: 12,
      },
      {
        id: 8,
        name: getItems([
          "Magnetic Remover",
          "Artifact Item Anvil",
          "Artifact Item Anvil",
        ]),
        chance: 15,
      },
      {
        id: 9,
        name: getItems(["Masterwork Upgrade", "24 Gold"]),
        chance: 15,
      },
      {
        id: 10,
        name: getItems([
          "Spatula",
          "Reforger",
          "Support Item Anvil",
          "Component Anvil",
          "8 Gold",
        ]),
        chance: 10,
      },
      {
        id: 11,
        name: getItems([
          "Frying Pan",
          "Reforger",
          "Support Item Anvil",
          "Component Anvil",
          "8 Gold",
        ]),
        chance: 10,
      },
      {
        id: 12,
        name: getItems(["Support Item Anvil", "25 Gold"]),
        chance: 10,
      },
      {
        id: 13,
        name: getItems(["Magnetic Remover", "Artifact Item Anvil", "25 Gold"]),
        chance: 10,
      },
      { id: 14, name: "Tome of Traits", chance: 8 },
    ],
    greenOrbs: [
      { id: 0, name: "6/12/18 silver orbs", chance: 10 },
      { id: 1, name: "2_Unstable Components", chance: 10 },
      {
        id: 2,
        name: getItems(["Growing Investment"]),
        chance: 10,
      },
      {
        id: 3,
        name: getItems(["Implant: Size", "1_Unstable Components"]),
        chance: 10,
      },
      {
        id: 4,
        name: ["1_Silver Orb", "1_Blue Orb", "1_Gold Orb"],
        chance: 10,
      },
      { id: 5, name: "Medium Egg", chance: 10 },
      {
        id: 6,
        name: "10_Tactician Health",
        chance: 10,
      },
      {
        id: 7,
        name: getItems(["Salvager", "1_Unstable Components"]),
        chance: 10,
      },
      {
        id: 8,
        name: getItems(["Implant: Speed", "1_Unstable Components"]),
        chance: 10,
      },
      {
        id: 9,
        name:
          Math.random() < 0.2
            ? ["1_3Cost Unit", "2_2Cost Unit", "1_1Cost Unit"]
            : ["5_1Cost Unit", "4_2Cost Unit"],
        chance: Battle.state === 1 ? 10 : 0,
      },
    ],
  };
  #reward = null;
  collisioning = false;
  constructor(
    scene,
    renderer,
    position = [0, 0.5, 0],
    type = 0,
    effect = false
  ) {
    super();
    this.id = crypto.randomUUID();
    this.#type = type;
    this.name = this.#orbTexture[this.#type].name;
    this.scene = scene;
    this.renderer = renderer;
    this.position = new THREE.Vector3(...position);
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);
    this.#effect = effect;
    this.orbMesh = null;
    this.box = new THREE.Box3(); // bounding box của quả cầu

    this._createOrb();
    const orbData = {
      0:
        Battle.state < 3
          ? this.#orbRewards.silverOrbs_1_2
          : this.#orbRewards.silverOrbs_3plus,
      1:
        Battle.state < 4
          ? this.#orbRewards.blueOrbs_1_2_3
          : this.#orbRewards.blueOrbs_4plus,
      2:
        Battle.state < 4
          ? this.#orbRewards.goldOrbs_2_3
          : this.#orbRewards.goldOrbs_4plus,
      3:
        Battle.state < 3
          ? this.#orbRewards.prismaticOrbs_3plus
          : this.#orbRewards.prismaticOrbs_3plus,
      4: this.#orbRewards.greenOrbs,
    };

    const orbType = this.#type;
    const orbItems = orbData[orbType];
    if (!orbItems) {
      console.log("orbtype: " + orbType);
      return;
    }

    const index = getRandomItem(orbItems);
    this.#reward = orbItems[index];
    this.cloneReward = structuredClone(this.#reward);
    // this._createQuestionMark();
  }

  _createOrb() {
    createSpriteObject(this.#orbTexture[this.#type].img, (mesh) => {
      this.orbMesh = mesh;
      this.orbMesh.scale.set(
        this.#orbTexture[this.#type].size,
        this.#orbTexture[this.#type].size,
        this.#orbTexture[this.#type].size
      ); // Kích thước sprite (có thể chỉnh)

      this.group.add(this.orbMesh);

      // Cập nhật bounding box thủ công nếu cần
      const size = 0.5;
      this.box.setFromCenterAndSize(
        this.orbMesh.position,
        new THREE.Vector3(size, size, size)
      );
    });
  }

  /**
   * Hàm kiểm tra va chạm với object khác có thuộc tính .box (Box3) hoặc là Mesh
   */
  checkCollision(target) {
    if (!this.orbMesh) return false;
    // Tính bounding box thủ công cho Sprite
    const size = new THREE.Vector3();
    this.orbMesh.getWorldScale(size); // Lấy kích thước thực tế của sprite
    const position = new THREE.Vector3();
    this.orbMesh.getWorldPosition(position);

    if (!this.box) this.box = new THREE.Box3();
    this.box.setFromCenterAndSize(position, size);

    // Tính bounding box của target
    let targetBox = null;

    if (target instanceof THREE.Mesh && target.geometry?.boundingBox) {
      target.updateMatrixWorld(true);
      targetBox = target.geometry.boundingBox
        .clone()
        .applyMatrix4(target.matrixWorld);
    } else if (target.box instanceof THREE.Box3) {
      targetBox = target.box;
    } else {
      return false;
    }
    // if (this.box.intersectsBox(targetBox)) {
    //   console.log({ ...this.#reward });
    // }
    return this.box.intersectsBox(targetBox);
  }

  /**
   * Gọi mỗi frame, truyền elapsedTime (tính bằng clock.getElapsedTime())
   */
  update(elapsedTime = 0) {
    // Quay tròn
    this.group.rotation.y += 0.01;

    // Lấp lánh bằng cách thay đổi emissiveIntensity và opacity
    if (this.orbMesh && this.orbMesh.material) {
      const pulse = 0.2 + 0.1 * Math.sin(elapsedTime * 3);
      this.orbMesh.material.emissiveIntensity = pulse;

      const opacityPulse = 0.5 + 0.1 * Math.sin(elapsedTime * 2);
      this.orbMesh.material.opacity = opacityPulse;
    }
    if (
      !this.#reward ||
      (Array.isArray(this.#reward.name) && this.#reward.name.length <= 0) ||
      !this.#reward.name
    ) {
      this.#reward = null;
      this.removeFromScene();
    }
  }

  removeFromScene() {
    if (typeof this.#effect === "function") {
      this.#effect();
    }
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  async onCollision() {
    // console.log(this.#reward);
    console.log(this.cloneReward);
    if (ITEMS_INFOR.length < 1 || this.collisioning) return;
    this.collisioning = true;
    await this.handleRewardItem(this.#reward);
  }

  async handleRewardItem(item) {
    console.log("item: ", item);
    if (!item) return;

    const processUnitReward = async (str, cb = () => {}) => {
      console.log(str);
      if (str.includes("Anvil") || str.startsWith("Tome")) {
        Team.addChampion(str, "item");
        console.log(Array.isArray(this.#reward?.name));
        if (Array.isArray(this.#reward?.name)) {
          console.log(str);
          this.#reward.name.splice(
            this.#reward.name.findIndex((rwn) => rwn === str),
            1
          );
          console.log(this.#reward.name);
        } else {
          this.#reward = null;
        }
      } else {
        const [quantity, unit] = str.split("_");
        if (!unit?.toLowerCase().includes("unit")) return;
        if (ChampionManager.getCountMyBench() >= 9) {
          addToast("bench full! free it and try again");
          return;
        }
        const cost = unit.split("Cost")[0];
        await customFetch(
          `champs/random?count=${+quantity}&cost=${cost}`,
          async (data) => {
            if (data.champs.length === +quantity) {
              let cloneQuantity = +quantity;
              for (const champ of data.champs) {
                if (ChampionManager.getCountMyBench() >= 9) {
                  addToast("bench full! free it and try again");
                  break;
                }
                let intervalId = setInterval(() => {
                  if (!Team.addingFlag) {
                    const result = Team.addChampion(champ.name);
                    if (result) {
                      cloneQuantity -= 1;
                      if (typeof this.#reward?.name === "string") {
                        this.#reward.name = cloneQuantity + "_" + unit;
                      } else {
                        let unitItem = this.#reward.name.find((item) =>
                          item.includes("Unit")
                        );
                        if (unitItem) unitItem = cloneQuantity + "_" + unit;
                      }
                      if (cloneQuantity === 0) {
                        if (typeof this.#reward?.name === "string") {
                          this.#reward = null;
                        } else {
                          const unitItemIndex = this.#reward.name.findIndex(
                            (item) => item.includes("Unit")
                          );
                          if (unitItemIndex > -1) {
                            this.#reward.name.splice(unitItemIndex, 1);
                            if (this.#reward.name.length <= 0) {
                              this.#reward = null;
                            }
                          }
                        }
                      }
                    } else {
                      this.collisioning = false;
                    }
                    clearInterval(intervalId);
                  }
                }, 100);
                await delay(200);
              }
              cb();
            }
          },
          (error) => console.log("error:", error)
        );
      }
    };

    if (typeof item.name === "string") {
      if (item.name.includes("Gold")) {
        const gold = parseInt(item.name);
        if (!isNaN(gold)) {
          addGold(gold);
          this.#reward = null;
          this.collisioning = false;
        }
      } else
        await processUnitReward(item.name, () => {
          this.collisioning = false;
        });
    } else if (Array.isArray(item.name)) {
      let results = 0;
      const addResult = (part) => {
        results += 1;
        if (results === item.name.length) {
          this.collisioning = false;
        }
        if (this.#reward) {
          this.#reward.name = this.#reward.name.filter((i) => i != part);
        }
      };
      for (const part of item.name) {
        console.log(part);
        if (part.includes("Gold")) {
          const gold = parseInt(part);
          // console.log(gold);
          if (!isNaN(gold)) {
            addGold(gold);
            addResult(part);
          }
        } else if (part.includes("Unit")) {
          await processUnitReward(part, () => {
            addResult(part);
          });
        } else if (part.includes("Anvil") || part.startsWith("Tome")) {
          let intervalId = setInterval(() => {
            if (!Team.addingFlag) {
              const result = Team.addChampion(part, "item");
              if (result) {
                addResult(part);
              } else {
                this.collisioning = false;
              }
              clearInterval(intervalId);
            }
          }, 100);
        } else {
          const itemData = ITEMS_INFOR.find((item) => item.name === part);
          if (itemData) {
            Team.addItem(itemData);
            addResult(part);
          } else {
            console.error("error: Item %s not found!", part);
          }
        }
      }
    }
  }
}
