import axios, { AxiosInstance, AxiosResponse } from "axios";

type Message = {
  type: "text";
  text: string;
};

type ReplyRequestBody = {
  replyToken: string;
  messages: Message[];
};

// LINE APIのラッパー
export class LineApi {
  private api: AxiosInstance;
  constructor(channelSecret: string) {
    this.api = axios.create({
      baseURL: "https://api.line.me/v2",
      headers: {
        Authorization: `Bearer ${channelSecret}`,
        "Content-Type": "application/json",
      },
    });
  }

  // 応答メッセージAPI
  async replyMessage(
    replyToken: string,
    message: string
  ): Promise<AxiosResponse<any>> {
    const body = {
      replyToken,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    };

    return await this.api.post("/bot/message/reply", body);
  }
}
