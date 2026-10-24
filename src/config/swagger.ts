import swaggerJsdoc from "swagger-jsdoc";
import YAML from "yamljs";
import path from "path";

// بارگذاری فایل YAML
const swaggerDocument = YAML.load(path.join(__dirname, "../../swagger.yaml"));

const options: swaggerJsdoc.Options = {
  definition: swaggerDocument,
  apis: [], // چون از فایل yaml استفاده می‌کنیم، نیازی به جستجوی کامنت‌ها در فایل‌های ts نیست
};

export const swaggerSpec = swaggerJsdoc(options);