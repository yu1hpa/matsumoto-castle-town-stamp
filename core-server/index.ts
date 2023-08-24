import * as line from "@line/bot-sdk";
import express, { Request } from "express";
import { load } from "ts-dotenv";

import { v4 as uuidv4 } from "uuid";
import dbConfig from "./db-config";
import User from "./entities/user";

const uniqueId = uuidv4();

const userRepository = dbConfig.getRepository(User);

// !todo: ここのuniqueIdはLINEのuserIdになる
const newUser = new User(uniqueId);
const savedUser = await userRepository.save(newUser);
console.log("Saved:", savedUser);

const allUsers = await userRepository.find();
console.log("Select:", allUsers);

// https://developers.line.biz/ja/docs/messaging-api/receiving-messages/#webhook-event-in-one-on-one-talk-or-group-chat
interface LineWebhookEvent {
  type: "message" | "unsend" | "follow";
  message?: {
    type: "text";
    id: string;
    text: string;
  };
  unsend?: {
    messageId: string;
  };
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  timestamp: number;
  source: {
    type: "user";
    userId: string;
  };
  replyToken: string;
}

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
    console.log(req.body);
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
    req.body.events.forEach(async (event: LineWebhookEvent) => {
      switch (event.type) {
        case "message": // event.typeがmessageのとき応答
          // 頭に　返信: をつけて、そのまま元のメッセージを返す実装
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: `返信: ${event.message?.text}`,
          });
          break;
      }
    });

    response.status(200).send({});
  }
);
