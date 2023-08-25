export type Profile = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
};

export type SubmitData = {
  id_token: string;
  spot_id: string;
};
