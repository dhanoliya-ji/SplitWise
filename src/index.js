import dotenv from "dotenv";
import sequelizeService from "./services/sequelize.service";
import expressService from "./services/express.service";
dotenv.config();

const services = [sequelizeService, expressService];

(async () => {
  try {
    for (const service of services) {
      await service.init();
    }
    console.log("Server initialized.");
    //PUT ADITIONAL CODE HERE.
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
