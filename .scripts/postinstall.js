if (process.env.PRE_INSTALL == "1" || process.platform == "win32") {
  console.log("skipping preinstall");
} else {
  const fs = require("fs");
  const { execSync } = require("child_process");

  fs.readdirSync("./apps").forEach((app) => {
    execSync(`npm run app:configure --app=${app}`);
  });
}