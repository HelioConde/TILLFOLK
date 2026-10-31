const {defineConfig}=require("@playwright/test");

module.exports=defineConfig({
  testDir:"./tests",
  testMatch:"**/*.spec.cjs",
  fullyParallel:false,
  reporter:"list",
  outputDir:"./test-results/playwright",
  use:{
    browserName:"chromium",
    viewport:{width:1366,height:768}
  },
  webServer:{
    command:"python -m http.server 4173",
    url:"http://127.0.0.1:4173/",
    reuseExistingServer:true,
    timeout:30000
  }
});
