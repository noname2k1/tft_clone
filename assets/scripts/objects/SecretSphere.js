import * as THREE from "https://esm.sh/three";
import ItemOutBag from "./ItemOutBag";
import { ITEMS_INFOR } from "~/variables";
import { getItems, getRandomItem } from "../services/services";
import { customFetch } from "../utils/callApi";
import { addGold } from "../others/goldExp";
import Team from "./Team";
import Battle from "./Battle";
import { delay } from "../utils/utils";

export default class SecretSphere extends ItemOutBag {
  #effect;
  #type;
  #orbTexture = {
    0: {
      img: "./assets/images/silver-orb-texture.png",
      size: 1.3,
      name: "silver orb",
    },
    1: {
      img: "./assets/images/blue-orb-texture.png",
      size: 2,
      name: "blue orb",
    },
    2: {
      img: "./assets/images/gold-orb-texture.png",
      size: 2.5,
      name: "gold orb",
    },
    3: {
      img: "./assets/images/prismatic-orb-texture.png",
      size: 4,
      name: "prismatic orb",
    },
    4: {
      img: "./assets/images/green-orb-texture.png",
      size: 3,
      name: "green orb",
    },
  };
  constructor(
    scene,
    renderer,
    position = [0, 0.5, 0],
    type = 0,
    effect = false
  ) {
    super();
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
    // this._createQuestionMark();
  }

  _createOrb() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(this.#orbTexture[this.#type].img, (texture) => {
      texture.encoding = THREE.sRGBEncoding;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1, // Discard fragments with alpha below 0.1
        blending: THREE.NormalBlending,
        depthWrite: true,
        depthTest: false,
      });

      this.orbMesh = new THREE.Sprite(material);
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
    if (ITEMS_INFOR.length < 1) return;

    const items = {
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
            "Support item anvil",
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
        { id: 6, name: getItems(["Support item anvil"]), chance: 15 },
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
          chance: 10,
        },
        {
          id: 9,
          name: getItems(["Masterwork Upgrade", "24 Gold"]),
          chance: 10,
        },
        {
          id: 10,
          name: getItems([
            "Spatula",
            "Reforger",
            "Support item anvil",
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
            "Support item anvil",
            "Component Anvil",
            "8 Gold",
          ]),
          chance: 10,
        },
        {
          id: 12,
          name: getItems(["Support item anvil", "25 Gold"]),
          chance: 10,
        },
        {
          id: 13,
          name: getItems([
            "SixCostUnit",
            "Magnetic Remover",
            "Artifact Item Anvil",
          ]),
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

    const orbData = {
      0: Battle.state < 3 ? items.silverOrbs_1_2 : items.silverOrbs_3plus,
      1: Battle.state < 4 ? items.blueOrbs_1_2_3 : items.blueOrbs_4plus,
      2: Battle.state < 4 ? items.goldOrbs_2_3 : items.goldOrbs_4plus,
      3:
        Battle.state < 3
          ? items.prismaticOrbs_3plus
          : items.prismaticOrbs_3plus,
      4: items.greenOrbs,
    };

    const orbType = this.#type;
    const orbItems = orbData[orbType];
    if (!orbItems) {
      console.log("orbtype: " + orbType);
      return;
    }

    const index = getRandomItem(orbItems);
    const reward = orbItems[index];

    await this.handleRewardItem(reward);
  }

  async handleRewardItem(item) {
    console.log(item);
    if (!item) return;

    const processUnitReward = async (str) => {
      const [quantity, unit] = str.split("_");
      if (!unit.toLowerCase().includes("unit")) return;

      const cost = unit.split("Cost")[0];
      await customFetch(
        `champs/random?count=${+quantity}&cost=${cost}`,
        async (data) => {
          if (data.champs.length === +quantity) {
            for (const champ of data.champs) {
              document.getElementById("add-champion-notice").textContent =
                champ.name;
              await delay(1000); // Đợi 2s rồi mới lặp tiếp
            }
          }
        },
        (error) => console.log("error:", error)
      );
    };

    if (typeof item.name === "string") {
      await processUnitReward(item.name);
    } else if (Array.isArray(item.name)) {
      for (const part of item.name) {
        if (typeof part === "string") {
          if (part.includes("Gold")) {
            const gold = parseInt(part);
            if (!isNaN(gold)) addGold(gold);
          } else {
            await processUnitReward(part);
          }
        } else {
          Team.addItem(part);
        }
      }
    }
  }
}
