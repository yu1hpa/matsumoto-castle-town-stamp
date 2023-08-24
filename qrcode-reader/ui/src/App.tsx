import liff from "@line/liff";
import { useState } from "react";
import "./App.css";

const HOST = "https://bb27-160-237-151-193.ngrok-free.app";
const SERVER_URL = `${HOST}/api/qrcode-submit`

function App() {
  const [qrCodeData, setQrCodeData] = useState('');
  const [error, setError] = useState('');
  const [console, setConsole] = useState('');


  const handleScan = () => {
    liff.scanCodeV2().then(async (result) => {
      setQrCodeData(result.value ?? "");

      const accessToken = liff.getAccessToken();
      if (accessToken) {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", SERVER_URL, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
              setConsole("終了");
            }
          }
          xhr.send(JSON.stringify({ "spot_id": result.value, "accesstoken": accessToken }));
      }
    }).catch((e: Error) => {
      setError(`${e}`);
    });
  };

  return (
    <div className="App">
      <button onClick={handleScan}>Scan QR Code</button>
      <h1>{qrCodeData}</h1>
      <p>url: {SERVER_URL}</p>
      <p>error: {error}</p>
      <p>console: {console}</p>
    </div>
  );
}

export default App;
