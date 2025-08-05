const champScales = [
  {
    name: "Alistar",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Dr. Mundo",

    scale: [0.0065, 0.0065, 0.0065],
  },
  { name: "Jax", scale: [0.008, 0.008, 0.008] },
  {
    name: "Kindred",
  },
  {
    name: "Kog'Maw",

    scale: [0.004, 0.004, 0.004],
  },
  {
    name: "Morgana",
    scale: [0.012, 0.012, 0.012],
  },
  { name: "Nidalee" },
  {
    name: "Poppy",

    scale: [0.0085, 0.0085, 0.0085],
  },
  {
    name: "Seraphine",

    scale: [0.012, 0.01, 0.012],
  },
  {
    name: "Shaco",

    scale: [0.025, 0.025, 0.025],
  },
  {
    name: "Sylas",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Vi",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Zyra",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Darius",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Ekko",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Graves",

    scale: [0.014, 0.014, 0.014],
  },
  {
    name: "Illaoi",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Jhin",

    scale: [0.012, 0.012, 0.012],
  },
  { name: "LeBlanc" },
  {
    name: "Naafiri",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Rhaast",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Shyvana",

    scale: [0.008, 0.008, 0.008],
  },
  {
    name: "Skarner",

    scale: [0.005, 0.005, 0.005],
  },
  {
    name: "Twisted Fate",
  },
  {
    name: "Vayne",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Veigar",

    scale: [0.018, 0.018, 0.018],
  },
  {
    name: "Braum",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Draven",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Elise",

    scale: [0.012, 0.012, 0.012],
  },
  { name: "Fiddlesticks" },
  {
    name: "Galio",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Gragas",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Jarvan IV",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Jinx",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Mordekaiser",
  },
  {
    name: "Rengar",

    scale: [0.009, 0.009, 0.009],
  },
  { name: "Senna" },
  {
    name: "Varus",

    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Yuumi",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Annie",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Aphelios",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Brand",

    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "ChoGath",

    scale: [0.002, 0.002, 0.002],
  },
  {
    name: "Leona",

    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "Miss Fortune",

    scale: [0.014, 0.014, 0.014],
  },
  {
    name: "Neeko",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Sejuani",

    scale: [0.009, 0.009, 0.009],
  },
  {
    name: "Vex",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Xayah",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Zed",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Zeri",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Ziggs",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Aurora",

    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Garen",

    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Kobuko",

    scale: [0.008, 0.008, 0.008],
  },
  {
    name: "Renekton",

    scale: [0.018, 0.018, 0.018],
  },
  {
    name: "Samira",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Urgot",

    scale: [0.007, 0.007, 0.007],
  },
  {
    name: "Viego",

    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Zac",

    scale: [0.009, 0.009, 0.009],
  },
  {
    name: "Ezreal",
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Malphite",
    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Syndra",
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Kalista",
    scale: [0.006, 0.006, 0.006],
  },
  {
    name: "Lux",
    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Ahri",
    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Caitlyn",
    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Katarina",
    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "Xin Zhao",
    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "Janna",
    scale: [0.015, 0.015, 0.015],
  },
];

const costGradients = [
  {
    from: "#3a3a3a",
    via: "#4a4a4a",
    to: "#5a5a5a",
    text: 0xffffff,
    cost: 1,
  },
  {
    from: "#2b6622",
    via: "#3d8f2a",
    to: "#4fbf32",
    text: 0xffffff,
    cost: 2,
  },
  {
    from: "#0b3d91",
    via: "#1060c1",
    to: "#1a8fff",
    text: 0xffffff,
    cost: 3,
  },
  {
    from: "#4b0082",
    via: "#6a0dad",
    to: "#9b30ff",
    text: 0xffffff,
    cost: 4,
  },
  {
    from: "#c79c00",
    via: "#f5c518",
    to: "#ffe066",
    text: 0x000000,
    cost: 5,
  },
  {
    from: "#6df3ff",
    via: "#b59df4",
    to: "#e68bcf",
    text: 0x000000,
    cost: 6,
  },
];

export { champScales, costGradients };
