import cors from "cors";
import express from "express";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import "dotenv/config";
import { Readable } from "stream";

const app: express.Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//
// CORS settings
//
if (!process.env.MEMORIES_GALLARY_UI_URL) {
  console.error("Not Found MEMORIES_GALLARY_UI_URL in .env");
}
const allowedOrigins = [process.env.MEMORIES_GALLARY_UI_URL ?? ""];
const options: cors.CorsOptions = {
  origin: allowedOrigins,
};
app.use(cors(options));

const s3Client = new S3Client({
  region: process.env.MINIO_REGION,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
  endpoint: "http://127.0.0.1:9000", // これがないとAWSに向いてしまう
});

app.post("/images", async (req, res) => {
  try {
    const listObjectsParams = {
      Bucket: process.env.MINIO_BUCKET_NAME,
    };

    const response = await s3Client.send(
      new ListObjectsV2Command(listObjectsParams)
    );
    const datas = response.Contents || [];

    console.log(datas);
    res.status(200).send({ images: datas });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred");
  }
});

app.get("/images/:key", async (req, res) => {
  const command = new GetObjectCommand({
    Bucket: process.env.MINIO_BUCKET_NAME,
    Key: req.params.key,
  });

  const d = await s3Client.send(command);
  if (!d) return;
  const buf = await streamToBuffer(d.Body as Readable);
  res.status(200).send(buf);
});

async function streamToBuffer(stream: Readable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

app.listen(8886, () => {
  console.log("Start on port 3000.");
});
