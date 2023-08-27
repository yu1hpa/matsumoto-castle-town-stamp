import * as line from "@line/bot-sdk";
import express, { Request } from "express";
import { load } from "ts-dotenv";

import dbConfig from "./db-config";
import User from "./entities/user";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import Spot from "./entities/spot";
import UserSpot from "./entities/userspot";
import { Spots } from "./types";

import axios, { AxiosError, AxiosResponse } from "axios";

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: process.env.MINIO_REGION,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
  endpoint: "http://127.0.0.1:9000", // これがないとAWSに向いてしまう
});

const createSpotInfoFlexMessage = async (
  spot_name: string,
  spot_img: string,
  spot_desc: string,
  spot_moredesc: string
): Promise<line.FlexMessage | undefined> => {
  try {
    const flexBubble: line.FlexBubble = {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": spot_img,
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover",
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": spot_name,
            "size": "xl",
            "margin": "none",
          },
          {
            "type": "text",
            "text": spot_desc,
            "size": "md",
            "color": "#808080",
          },
          {
            "type": "text",
            "text": spot_moredesc,
            "size": "xs",
            "color": "#a9a9a9",
            "margin": "none",
          },
        ],
        "spacing": "md",
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [],
        "backgroundColor": "#fafad2",
      },
    };
    const flexMessage: line.FlexMessage = {
      type: "flex",
      altText: "スポットの情報を知ることができるメッセージ",
      contents: flexBubble,
    };

    return flexMessage;
  } catch (err) {
    console.error(err);
  }
};

const env = load({
  CHANNEL_SECRET: String,
  CHANNEL_ACCESS_TOKEN: String,
  CORE_SERVER_URL: String,
  MEMORIES_GALLERY_URL: String,
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

const config = {
  channelAccessToken: env.CHANNEL_ACCESS_TOKEN,
  channelSecret: env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// ルートのエンドポイント定義
app.get("/", (request, response) => {
  response.status(200).send("Hello");
});

const message_ids = new Array<string>();
// webhookを受け取るエンドポイント
app.post(
  "/webhook",
  line.middleware(config),
  (req: CustomRequest, response) => {
    // https://developers.line.biz/ja/docs/messaging-api/receiving-messages/

    // !!debug
    console.log("RECIVED", JSON.stringify(req.body));
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
                spot.img_url,
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
          // メッセージのIDをすべて保存
          message_ids.push(event.message.id);

          if (event.message.type == "text") {
            switch (event.message.text) {
              case "現在のスポットについて知る":
                //
                // UserSpotからlatestがtrueのものを探す
                //
                const userspotRepository = dbConfig.getRepository(UserSpot);
                const userSpot = await userspotRepository.findOne({
                  where: { latest: true },
                });

                // どれか1つでもQRコードが読み込まれているとき
                if (userSpot) {
                  //
                  // UserSpotテーブルからspotIdを取得し、
                  // Spot(s)の中から一致するspotIdを探す
                  // それが直前にQRコードを読み込んだ、情報を知りたいスポット
                  //
                  const spot_id = userSpot.spotId;
                  const spotRepository = dbConfig.getRepository(Spot);
                  const spot = await spotRepository.findOne({
                    where: { id: spot_id },
                  });

                  if (spot) {
                    //
                    // 情報を知りたいスポットのテーブルから
                    // name, img_url, desc, moredesc を取り出し
                    // spotInfoFlexMessageを生成
                    //
                    console.log("Spot", spot);
                    const spotInfoFlexMessage = await createSpotInfoFlexMessage(
                      spot.name,
                      spot.img_url,
                      spot.desc,
                      spot.moredesc
                    );

                    if (!spotInfoFlexMessage) return;
                    // ユーザーにスポットの情報を送信
                    await client.replyMessage(
                      event.replyToken,
                      spotInfoFlexMessage
                    );
                  }
                  // まだQRコードが読み込まれていないとき
                } else {
                  await client.replyMessage(event.replyToken, {
                    type: "text",
                    text: "QRコードをスキャンしてください",
                  });
                }
                break;
              case "思い出を見る":
                await client.replyMessage(event.replyToken, {
                  type: "text",
                  text: `${env.MEMORIES_GALLERY_URL}`,
                });

                https: break;
              case "スポット写真として保存":
                //
                // 写真が投稿された次に「スポット写真として保存」をしてもらうため
                // 最新のメッセージIDから一つ前のIDを取得
                //
                const message_id = message_ids.at(-2);
                try {
                  const url = `${env.CORE_SERVER_URL}/api/pic-save`;

                  type FileName = string;
                  const filename = await axios
                    .post(
                      url,
                      {
                        message_id: message_id,
                      },
                      {
                        headers: {
                          "Content-Type": "application/json",
                        },
                      }
                    )
                    .then((res: AxiosResponse<FileName>) => res.data)
                    .catch((e: AxiosError<{ error: string }>) => {
                      console.log(e.message);
                    });
                  console.log(filename);
                } catch (error) {
                  throw new Error(`Request error: ${error}`);
                }
                break;
              default:
                await client.replyMessage(event.replyToken, {
                  type: "text",
                  text: `返信: ${event.message.text}`,
                });
                break;
            }
          }
          break;
      }
    });

    response.status(200).send({});
  }
);

//
// 写真をMinIoに保存するためのエンドポイント
//
app.post("/api/pic-save", async (req, res) => {
  const message_id = req.body.message_id;
  if (!message_id) {
    console.error("Not Found message_id");
    return;
  }

  try {
    const [content, content_length] = await getMessageContent(message_id);
    const pic_name = `${uuidv4()}.jpeg`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET_NAME,
        Key: pic_name,
        Body: content,
        ContentLength: content_length,
      })
    );

    console.log("[+] Picture Saved:", pic_name);
    res.status(200).send({ message: "success" });

    //
    // UserSpotのlatest=trueであるテーブルを取り出し
    // そのimgFileNameに pic_name を保存
    //
    const userspotRepository = dbConfig.getRepository(UserSpot);
    // UserSpotからlatestがtrueのものを探す
    const userSpot = await userspotRepository.findOne({
      where: { latest: true },
    });

    if (userSpot) {
      userSpot.imgFileName = pic_name;
      const savedUserSpot = await userspotRepository.save(userSpot);
      console.log("Saved:", savedUserSpot);
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
});

//
// https://developers.line.biz/ja/reference/messaging-api/#get-content
// message_idによって、画像データを取得する
//
export const getMessageContent = (
  message_id: string
): Promise<[Buffer, number]> => {
  return new Promise((resolve, reject) =>
    client
      .getMessageContent(message_id)
      .then((stream) => {
        const content: Buffer[] = [];
        const length: number[] = [];

        // チャンクごとにlengthとbufferを配列に保存
        stream.on("data", (chunk: string) => {
          length.push(chunk.length);
          content.push(Buffer.from(chunk));
        });
        // 最後にbufferを一つにし、lengthも計算する
        stream.on("end", () => {
          resolve([
            Buffer.concat(content),
            length.reduce((acc, cur) => acc + cur, 0),
          ]);
        });
        stream.on("error", (err) => {
          console.error(err);
          reject("lineGetContent");
        });
      })
      .catch((err) => {
        reject(`[-] ${err}`);
      })
  );
};
