import { DataSource } from "typeorm";
const dbConfig = new DataSource({
  type: "postgres",
  host: "0.0.0.0",
  port: 5432,
  username: "admin",
  password: "passw0rd",
  database: "admin",
  synchronize: true,
  logging: false,
  entities: ["entities/*.ts"],
});

await dbConfig
  .initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });

export default dbConfig;
