const champScales = [
  {
    name: "Alistar",
    cost: 1,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Dr Mundo",
    cost: 1,
    scale: [0.008, 0.008, 0.008],
  },
  { name: "Jax", cost: 1, scale: [0.008, 0.008, 0.008] },
  {
    name: "Kindred",
    cost: 1,
  },
  {
    name: "KogMaw",
    cost: 1,
    scale: [0.006, 0.006, 0.006],
  },
  {
    name: "Morgana",
    cost: 1,
    scale: [0.012, 0.012, 0.012],
  },
  { name: "Nidalee", cost: 1 },
  {
    name: "Poppy",
    cost: 1,
    scale: [0.0085, 0.0085, 0.0085],
  },
  {
    name: "Seraphine",
    cost: 1,
    scale: [0.012, 0.01, 0.012],
  },
  {
    name: "Shaco",
    cost: 1,
    scale: [0.02, 0.02, 0.02],
  },
  {
    name: "Sylas",
    cost: 1,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Vi",
    cost: 1,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Zyra",
    cost: 1,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Darius",
    cost: 2,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Ekko",
    cost: 2,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Graves",
    cost: 2,
    scale: [0.014, 0.014, 0.014],
  },
  {
    name: "Illaoi",
    cost: 2,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Jhin",
    cost: 2,
    scale: [0.012, 0.012, 0.012],
  },
  { name: "LeBlanc", cost: 2 },
  {
    name: "Naafiri",
    cost: 2,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Rhaast",
    cost: 2,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Shyvana",
    cost: 2,
    scale: [0.008, 0.008, 0.008],
  },
  {
    name: "Skarner",
    cost: 2,
    scale: [0.0075, 0.0075, 0.0075],
  },
  {
    name: "Twisted Fate",
    cost: 2,
  },
  {
    name: "Vayne",
    cost: 2,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Veigar",
    cost: 2,
    scale: [0.018, 0.018, 0.018],
  },
  {
    name: "Braum",
    cost: 3,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Draven",
    cost: 3,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Elise",
    cost: 3,
    scale: [0.012, 0.012, 0.012],
  },
  { name: "Fiddlesticks", cost: 3 },
  {
    name: "Galio",
    cost: 3,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Gragas",
    cost: 3,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Jarvan IV",
    cost: 3,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Jinx",
    cost: 3,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Mordekaiser",
    cost: 3,
  },
  {
    name: "Rengar",
    cost: 3,
    scale: [0.009, 0.009, 0.009],
  },
  { name: "Senna", cost: 3 },
  {
    name: "Varus",
    cost: 3,
    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "Yuumi",
    cost: 3,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Annie",
    cost: 4,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Aphelios",
    cost: 4,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Brand",
    cost: 4,
    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "ChoGath",
    cost: 4,
    scale: [0.008, 0.008, 0.008],
  },
  {
    name: "Leona",
    cost: 4,
    scale: [0.015, 0.015, 0.015],
  },
  {
    name: "Miss Fortune",
    cost: 4,
    scale: [0.014, 0.014, 0.014],
  },
  {
    name: "Neeko",
    cost: 4,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Sejuani",
    cost: 4,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Vex",
    cost: 4,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Xayah",
    cost: 4,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Zed",
    cost: 4,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Zeri",
    cost: 4,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Ziggs",
    cost: 4,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Aurora",
    cost: 5,
    scale: [0.013, 0.013, 0.013],
  },
  {
    name: "Garen",
    cost: 5,
    scale: [0.012, 0.012, 0.012],
  },
  {
    name: "Kobuko",
    cost: 5,
    scale: [0.008, 0.008, 0.008],
  },
  {
    name: "Renekton",
    cost: 5,
    scale: [0.018, 0.018, 0.018],
  },
  {
    name: "Samira",
    cost: 5,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Urgot",
    cost: 5,
    scale: [0.007, 0.007, 0.007],
  },
  {
    name: "Viego",
    cost: 5,
    scale: [0.011, 0.011, 0.011],
  },
  {
    name: "Zac",
    cost: 5,
    scale: [0.011, 0.011, 0.011],
  },
];

export { champScales };
