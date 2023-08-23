import crypto from "crypto";
import express, { Request, Response } from "express";
import { load } from "ts-dotenv";
import { LineApi } from "./line-api";

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

const lineApi = new LineApi(env.CHANNEL_ACCESS_TOKEN);

// ルートのエンドポイント定義
app.get("/", (request, response) => {
  response.status(200).send("Hello");
});

// webhookを受け取るエンドポイント
app.post("/webhook", (request: CustomRequest, response: Response, buf) => {
  // https://developers.line.biz/ja/docs/messaging-api/receiving-messages/

  const body = request.body;

  // !!debug
  console.log(body);

  // 署名検証
  if (
    !verifySignature(
      request.rawBody,
      request.headers["x-line-signature"],
      env.CHANNEL_SECRET
    )
  ) {
    response.status(401).send({});
    return;
  }

  // 到着したイベントのevents配列から取りだし
  body.events.forEach(async (event: LineWebhookEvent) => {
    switch (event.type) {
      case "message": // event.typeがmessageのとき応答
        // 頭に　返信: をつけて、そのまま元のメッセージを返す実装
        await lineApi.replyMessage(
          event.replyToken,
          `返信: ${event.message?.text}`
        );
        break;
    }
  });

  response.status(200).send({});
});

// webhookの署名検証
// https://developers.line.biz/ja/reference/messaging-api/#signature-validation
function verifySignature(
  body: Buffer | undefined,
  receivedSignature: string | string[] | undefined,
  channelSecret: string
) {
  if (!receivedSignature || !body) {
    return false;
  }
  const signature = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return signature === receivedSignature;
}
