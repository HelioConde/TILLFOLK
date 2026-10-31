"use strict";
/* Sprout Lands terrain atlas registry. Based on the user's approved 16x16 mapping.
 * All 176x112 atlases share C01..C11 x L01..L07. Slopes have their own grid.
 * Original premium sprites remain unchanged and are served locally on Pages.
 */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkTerrainCatalog=api;
})(typeof window!=="undefined"?window:null,()=>{
 const DIRECTORY="./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/ground tiles/New tiles/";
 const ROLES=Object.freeze({
  "canto_noroeste": "C01_L01",
  "borda_norte": "C02_L01",
  "canto_nordeste": "C03_L01",
  "borda_oeste": "C01_L02",
  "centro": "C02_L02",
  "borda_leste": "C03_L02",
  "canto_sudoeste": "C01_L03",
  "borda_sul": "C02_L03",
  "canto_sudeste": "C03_L03",
  "interno_noroeste": "C07_L03",
  "interno_nordeste": "C06_L03",
  "interno_sudoeste": "C07_L02",
  "interno_sudeste": "C06_L02",
  "isolado": null,
  "horizontal": null,
  "vertical": null,
  "ponta_norte": null,
  "ponta_leste": null,
  "ponta_sul": null,
  "ponta_oeste": null
});
 const source=[
   ["grassLayer","Grass_Tile_Layers.png","terrain"],
   ["grassLayer2","Grass_Tile_layers2.png","terrain"],
   ["darkGrassLayer","Darker_Grass_Tile_Layers.png","terrain"],
   ["darkGrassLayer2","Darker_Grass_Tile_Layers2.png","terrain"],
   ["grassGround","Grass_tiles_v2.png","terrain"],
   ["darkGrassGround","Darker_Grass_Tiles_v2.png","terrain"],
   ["soilGround","Soil_Ground_Tiles.png","terrain"],
   ["darkSoilGround","Darker_Soil_Ground_Tiles.png","terrain"],
   ["stoneGround","Stone_Ground_Tiles.png","terrain"],
   ["grassHill","Grass_Hill_Tiles_v2.png","terrain"],
   ["darkGrassHill","Darker_Grass_Hills_Tiles_v2.png","terrain"],
   ["soilHill","Soil_Ground_HiIls_Tiles.png","terrain"],
   ["darkSoilHill","Darker_Soil_Ground_Hills_Tiles.png","terrain"],
   ["stoneHill","Stone_Ground_Hills_Tiles.png","terrain"],
   ["grassSlope","Grass_Hill_Tiles_Slopes v.2.png","slope"],
   ["darkGrassSlope","Darker_Grass_Hill_Tiles_Slopes_v2.png","slope"],
   ["groundSlope","Ground_Hill_Tiles_Slopes.png","slope"],
   ["bush","Bush_Tiles.png","decoration"]
 ];
 const ATLAS=Object.freeze(Object.fromEntries(source.map(([key,file,kind])=>
   [key,Object.freeze({key,file,kind,columns:kind==="terrain"?11:null,rows:kind==="terrain"?7:null})])));
 const BIOME_ATLAS=Object.freeze({
   g:"grassLayer",f:"darkGrassLayer",s:"soilGround",i:"stoneGround",
   w:"darkSoilGround",p:"darkGrassLayer2"
 });
 const HILL_ATLAS=Object.freeze({
   g:"grassHill",f:"darkGrassHill",s:"soilHill",i:"stoneHill",
   w:"darkSoilHill",p:"darkGrassHill"
 });
 const url=key=>ATLAS[key]?DIRECTORY+encodeURIComponent(ATLAS[key].file):null;
 const isLoaded=(img,kind="terrain")=>Boolean(img&&img.complete&&
   img.naturalWidth>=(kind==="terrain"?176:1)&&img.naturalHeight>=(kind==="terrain"?112:1));
 const config=Object.freeze({...{"schema":"tillfolk-terrain-autotile/v1","terrain":"grass","atlas":"Grass_Tile_Layers.png","tileSize":16,"atlasColumns":11,"atlasRows":7,"neighbors":8,"method":"cardinal + complementary inner corners"},roles:ROLES});
 return Object.freeze({DIRECTORY,ROLES,ATLAS,BIOME_ATLAS,HILL_ATLAS,url,isLoaded,config});
});
