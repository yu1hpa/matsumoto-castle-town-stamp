import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import cors from "cors";
import express, { Request, Response } from "express";
import qs from "qs";
import UserSpot from "../../../core-server/entities/userspot";
import dbConfig from "./db-config";
import { Profile, SubmitData } from "./types";

import "dotenv/config";

const app = express();

//
// CORS settings
//
if (!process.env.QRCODE_UI_URL) {
  console.error("Not Found QRCODE_UI_URL in .env");
}
const allowedOrigins = [process.env.QRCODE_UI_URL ?? ""];
const options: cors.CorsOptions = {
  origin: allowedOrigins,
};
app.use(cors(options));

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("Hello");
});

app.post("/api/qrcode-submit", async (req: Request, res: Response) => {
  //
  // https://developers.line.biz/ja/docs/liff/using-user-profile/#sending-id-token
  //

  const json: SubmitData = JSON.parse(JSON.stringify(req.body));
  const id_token = json.id_token;
  const spot_id = json.spot_id;

  const client_id = process.env.LIFF_CHANNEL_ID;
  if (!client_id) {
    console.error("Not Found LIFF_CHANNEL_ID in .env");
    return;
  }

  //
  // IDトークンを検証して、ユーザーの情報を取得
  //
  const profile = await verifyIDToken(id_token, client_id);
  console.log("profile", profile);

  if (!profile) return;
  const user_id = profile.sub;

  //
  // userIdで、特定のユーザーのレコードのみ取得
  // 次に、そのレコードの中でspot_id(QRコード)と一致するレコードを
  // 取り出して、visitedAtとlatest=true にする
  //
  // 一致しないレコードは、latest=false にする
  //
  const userspotRepository = dbConfig.getRepository(UserSpot);
  const userSpot = await userspotRepository.find({
    where: { userId: user_id },
  });

  if (userSpot) {
    userSpot
      .filter((us) => us.spotId == spot_id)
      // current userspot
      .map((cus) => {
        cus.visitedAt = new Date();
        cus.latest = true;
      });

    // 最新のUserSpot以外をfalseで再初期化
    userSpot
      .filter((us) => us.spotId != spot_id)
      .map((cus) => {
        cus.latest = false;
      });

    await userspotRepository.save(userSpot);
  }

  return res.status(200).send({
    arrived_at: new Date(),
  });
});

const verifyIDToken = async (id_token: string, client_id: string) => {
  try {
    const url = "https://api.line.me/oauth2/v2.1/verify";
    const data = qs.stringify({
      client_id: client_id,
      id_token: id_token,
    });
    const options: AxiosRequestConfig<string> = {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: data,
      url,
    };
    return await axios(options)
      .then((res: AxiosResponse<Profile>) => res.data)
      .catch((e: AxiosError<{ error: string }>) => {
        console.log(e.message);
      });
  } catch (error) {
    throw new Error(`Request error: ${error}`);
  }
};

app.listen(8888);
