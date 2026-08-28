import { normalizeMenuDesign } from "./designSchema";

export const PREMIUM_MENU_DESIGNS = Object.freeze([
  {
    id:"heritage-original",
    name:"Heritage Original",
    category:"Classic",
    description:"Warm hospitality, tactile cards and the original Beyond menu character.",
    tags:["classic","warm","bar","bistro","heritage"],
    swatches:["#f6f4ef","#556b2f","#121212"],
    design:{
      template:"classic",styleVariant:"heritage",
      theme:{background:"#f6f4ef",surface:"#fffdf8",card:"#ffffff",text:"#121212",muted:"#7b756e",accent:"#556b2f",accentSecondary:"#d8c79b",line:"#e5ded2",categoryBackground:"#111111",categoryText:"#ffffff"},
      typography:{headingFont:"Playfair Display",bodyFont:"Inter",numberFont:"Playfair Display",headingWeight:800,bodyWeight:400,itemWeight:700,heroSize:46,sectionSize:38,itemNameSize:16,descriptionSize:11,priceSize:16},
      layout:{density:"comfortable",navigationStyle:"pills",pricePosition:"inline",cardRadius:19,sectionGap:20,itemGap:9,cardPadding:15},
      brand:{heroMediaMode:"watermark"},
    },
  },
  {
    id:"atelier",
    name:"Atelier",
    category:"Fine Dining",
    description:"Editorial typography, restrained lines and generous white space.",
    tags:["editorial","fine dining","luxury","minimal","serif"],
    swatches:["#f7f5f0","#191919","#a18a62"],
    design:{
      template:"classic",styleVariant:"standard",
      theme:{background:"#f7f5f0",surface:"#fffefb",card:"#fffefb",text:"#191919",muted:"#77726b",accent:"#8a7250",accentSecondary:"#e7ddcb",line:"#ddd8cf",categoryBackground:"#191919",categoryText:"#ffffff"},
      typography:{headingFont:"Playfair Display",bodyFont:"DM Sans",numberFont:"Playfair Display",headingWeight:500,bodyWeight:400,itemWeight:600,heroSize:54,sectionSize:40,itemNameSize:17,descriptionSize:12,priceSize:16},
      layout:{density:"spacious",navigationStyle:"underline",pricePosition:"inline",cardRadius:4,sectionGap:42,itemGap:18,cardPadding:17},
      brand:{heroMediaMode:"none"},
    },
  },
  {
    id:"noir",
    name:"Noir",
    category:"Luxury",
    description:"Dark, cinematic and polished for cocktail bars and premium dining.",
    tags:["dark","luxury","cocktails","night","premium"],
    swatches:["#11151d","#d0aa68","#f7f5ef"],
    design:{
      template:"visual",styleVariant:"standard",
      theme:{background:"#11151d",surface:"#161c26",card:"#1b2330",text:"#f7f5ef",muted:"#a9b0bc",accent:"#d0aa68",accentSecondary:"#3b4658",line:"#303948",categoryBackground:"#d0aa68",categoryText:"#11151d"},
      typography:{headingFont:"Playfair Display",bodyFont:"DM Sans",numberFont:"DM Sans",headingWeight:600,bodyWeight:400,itemWeight:600,heroSize:52,sectionSize:36,itemNameSize:17,descriptionSize:12,priceSize:16},
      layout:{density:"comfortable",navigationStyle:"minimal",itemImagePosition:"top",itemImageRatio:"3:2",pricePosition:"bottom",cardRadius:18,sectionGap:34,itemGap:18,cardPadding:16},
      brand:{heroMediaMode:"image"},
    },
  },
  {
    id:"riviera",
    name:"Riviera",
    category:"Mediterranean",
    description:"Sun-washed editorial menu with organic color and confident imagery.",
    tags:["mediterranean","seafood","summer","organic","visual"],
    swatches:["#f6f1e8","#1f6570","#d49a62"],
    design:{
      template:"visual",styleVariant:"standard",
      theme:{background:"#f6f1e8",surface:"#fffaf3",card:"#fffdf9",text:"#16333c",muted:"#738087",accent:"#1f6570",accentSecondary:"#e0b77f",line:"#dedfd8",categoryBackground:"#1f6570",categoryText:"#ffffff"},
      typography:{headingFont:"Lora",bodyFont:"DM Sans",numberFont:"DM Sans",headingWeight:700,bodyWeight:400,itemWeight:700,heroSize:50,sectionSize:36,itemNameSize:17,descriptionSize:12,priceSize:16},
      layout:{density:"comfortable",navigationStyle:"pills",itemImagePosition:"top",itemImageRatio:"4:3",pricePosition:"bottom",cardRadius:22,sectionGap:34,itemGap:18,cardPadding:16},
      brand:{heroMediaMode:"image"},
    },
  },
  {
    id:"omakase",
    name:"Omakase",
    category:"Minimal",
    description:"Quiet Japanese-inspired hierarchy with precision, space and subtle contrast.",
    tags:["japanese","sushi","minimal","quiet","fine dining"],
    swatches:["#f4f2ed","#20211f","#9a3d32"],
    design:{
      template:"classic",styleVariant:"standard",
      theme:{background:"#f4f2ed",surface:"#faf9f5",card:"#faf9f5",text:"#20211f",muted:"#777872",accent:"#9a3d32",accentSecondary:"#ddd8cc",line:"#ddd9d0",categoryBackground:"#20211f",categoryText:"#ffffff"},
      typography:{headingFont:"Noto Sans Hebrew",bodyFont:"Inter",numberFont:"Inter",headingWeight:500,bodyWeight:400,itemWeight:600,heroSize:42,sectionSize:30,itemNameSize:15,descriptionSize:11,priceSize:15},
      layout:{density:"spacious",navigationStyle:"underline",pricePosition:"inline",cardRadius:0,sectionGap:38,itemGap:14,cardPadding:12},
      brand:{heroMediaMode:"none"},
    },
  },
  {
    id:"brasserie",
    name:"Brasserie",
    category:"Bistro",
    description:"Confident European bistro style with structured cards and strong category rhythm.",
    tags:["bistro","restaurant","classic","european","warm"],
    swatches:["#f8f1e7","#8d3c31","#2c211c"],
    design:{
      template:"classic",styleVariant:"standard",
      theme:{background:"#f8f1e7",surface:"#fffaf3",card:"#fffdf9",text:"#2c211c",muted:"#786a61",accent:"#8d3c31",accentSecondary:"#d9b494",line:"#e5d9cf",categoryBackground:"#8d3c31",categoryText:"#ffffff"},
      typography:{headingFont:"Merriweather",bodyFont:"DM Sans",numberFont:"Merriweather",headingWeight:700,bodyWeight:400,itemWeight:700,heroSize:46,sectionSize:34,itemNameSize:16,descriptionSize:12,priceSize:16},
      layout:{density:"comfortable",navigationStyle:"pills",pricePosition:"inline",cardRadius:12,sectionGap:28,itemGap:12,cardPadding:15},
      brand:{heroMediaMode:"watermark"},
    },
  },
  {
    id:"gallery",
    name:"Gallery",
    category:"Visual",
    description:"Large food photography, generous spacing and an image-first browsing experience.",
    tags:["visual","photos","food","gallery","modern"],
    swatches:["#ffffff","#111111","#ece7df"],
    design:{
      template:"visual",styleVariant:"standard",
      theme:{background:"#ffffff",surface:"#ffffff",card:"#ffffff",text:"#111111",muted:"#777777",accent:"#111111",accentSecondary:"#ece7df",line:"#e8e8e8",categoryBackground:"#111111",categoryText:"#ffffff"},
      typography:{headingFont:"Playfair Display",bodyFont:"Inter",numberFont:"Inter",headingWeight:700,bodyWeight:400,itemWeight:700,heroSize:56,sectionSize:38,itemNameSize:18,descriptionSize:12,priceSize:16},
      layout:{density:"spacious",navigationStyle:"underline",itemImagePosition:"top",itemImageRatio:"1:1",pricePosition:"below",cardRadius:24,sectionGap:42,itemGap:22,cardPadding:18},
      brand:{heroMediaMode:"image"},
    },
  },
  {
    id:"studio-cafe",
    name:"Studio Café",
    category:"Contemporary",
    description:"Friendly contemporary café system with soft geometry and strong readability.",
    tags:["cafe","coffee","brunch","modern","friendly"],
    swatches:["#f5eee7","#745448","#2f2723"],
    design:{
      template:"visual",styleVariant:"standard",
      theme:{background:"#f5eee7",surface:"#fffaf6",card:"#fffdfa",text:"#2f2723",muted:"#7d7069",accent:"#745448",accentSecondary:"#c8aa91",line:"#e4d7ce",categoryBackground:"#745448",categoryText:"#ffffff"},
      typography:{headingFont:"DM Sans",bodyFont:"DM Sans",numberFont:"DM Sans",headingWeight:800,bodyWeight:400,itemWeight:700,heroSize:42,sectionSize:32,itemNameSize:16,descriptionSize:12,priceSize:16},
      layout:{density:"comfortable",navigationStyle:"pills",itemImagePosition:"left",itemImageRatio:"1:1",pricePosition:"inline",cardRadius:18,sectionGap:28,itemGap:14,cardPadding:14},
      brand:{heroMediaMode:"watermark"},
    },
  },
]);

export function applyPremiumMenuDesign(currentDesign,libraryId){
  const entry=PREMIUM_MENU_DESIGNS.find(item=>item.id===libraryId);
  if(!entry)return normalizeMenuDesign(currentDesign);
  const preset=entry.design;
  return normalizeMenuDesign({
    ...currentDesign,
    ...preset,
    theme:{...currentDesign?.theme,...preset.theme},
    typography:{...currentDesign?.typography,...preset.typography},
    layout:{...currentDesign?.layout,...preset.layout},
    brand:{...currentDesign?.brand,...preset.brand},
    badges:{...currentDesign?.badges,...preset.badges},
  });
}
