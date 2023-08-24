import * as line from "@line/bot-sdk";
import express, { Request } from "express";
import { load } from "ts-dotenv";

import dbConfig from "./db-config";
import User from "./entities/user";

import fs from "fs";
import Spot from "./entities/spot";
import UserSpot from "./entities/userspot";
import { Spots } from "./types";

const env = load({
  CHANNEL_SECRET: String,
  CHANNEL_ACCESS_TOKEN: String,
});

interface CustomRequest extends Request {
  rawBody?: Buffer; // Add rawBody property to the Request type
}

// expressの初期化
const app = express();
app.use(
  express.json({
    verify: (req: CustomRequest, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.listen(8080);

//const lineApi = new LineApi(env.CHANNEL_ACCESS_TOKEN);
const config = {
  channelAccessToken: env.CHANNEL_ACCESS_TOKEN,
  channelSecret: env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// ルートのエンドポイント定義
app.get("/", (request, response) => {
  response.status(200).send("Hello");
});

// webhookを受け取るエンドポイント
app.post(
  "/webhook",
  line.middleware(config),
  (req: CustomRequest, response) => {
    // https://developers.line.biz/ja/docs/messaging-api/receiving-messages/

    // !!debug
    console.log("RECIVED", req.body);
    if (!req.headers["x-line-signature"] || !req.rawBody) return;

    // 署名検証
    if (
      !line.validateSignature(
        req.rawBody,
        env.CHANNEL_SECRET,
        req.headers["x-line-signature"] as string
      )
    ) {
      response.status(401).send({});
      return;
    }

    // 到着したイベントのevents配列から取りだし
    req.body.events.forEach(async (event: line.WebhookEvent) => {
      switch (event.type) {
        case "follow":
          const userRepository = dbConfig.getRepository(User);

          if (!event.source.userId) return;
          const userId = event.source.userId;

          //
          // ユーザーをデータベースに登録
          //
          const newUser = new User(userId);

          const savedUser = await userRepository.save(newUser);
          console.log("Saved:", savedUser);

          // !debug-info
          const allUsers = await userRepository.find();
          console.log("Select:", allUsers);

          //
          // 事前ファイルからスポットの情報を読み込む
          //
          const json = JSON.parse(
            fs.readFileSync("assets/dev_spots.json", "utf8")
          );
          const spots: Spots = json.spots;

          const spotRepository = dbConfig.getRepository(Spot);
          const userspotRepository = dbConfig.getRepository(UserSpot);
          Promise.all(
            spots.map(async (spot) => {
              //
              // スポットの情報をデータベースに書き込む
              //
              const newSpot = new Spot(
                spot.id,
                spot.name,
                spot.desc,
                spot.moredesc
              );
              const savedSpot = await spotRepository.save(newSpot);
              console.log("Saved:", savedSpot);

              //
              // ユーザーとスポットの情報を合わせたテーブルも用意
              //
              const newUserSpot = new UserSpot(
                userId,
                newSpot.id ?? "",
                null,
                null
              );
              const savedUserSpot = await userspotRepository.save(newUserSpot);
              console.log("Saved:", savedUserSpot);
            })
            // !debug-info
          ).then(async () =>
            console.log("Select:", await spotRepository.find())
          );
          break;
        case "message": // event.typeがmessageのとき応答
          switch (event.message.type) {
            // 頭に　返信: をつけて、そのまま元のメッセージを返す実装
            case "text":
              await client.replyMessage(event.replyToken, {
                type: "text",
                text: `返信: ${event.message.text}`,
              });
              break;
          }
          break;
      }
    });

    response.status(200).send({});
  }
);
