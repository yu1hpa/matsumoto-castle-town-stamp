import liff from "@line/liff";
import { useState } from "react";
import "./App.css";
const HOST = import.meta.env.SERVER_URL ?? "https://d7e3-2405-1200-400-4c00-e9af-89a6-d7dc-9b0.ngrok-free.app";

if (!HOST) {
  console.error("Not Found env.HOST");
}
console.log(HOST);

const SERVER_URL = `${HOST}/api/qrcode-submit`

function App() {
  const [qrCodeData, setQrCodeData] = useState('');
  const [error, setError] = useState('');
  const [console, setConsole] = useState('');


  const handleScan = () => {
    liff.scanCodeV2().then(async (result) => {
      setQrCodeData(result.value ?? "");

      const IDToken = liff.getIDToken();
      if (IDToken) {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", SERVER_URL, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
              setConsole("終了");
            }
          }
          xhr.send(JSON.stringify({ "spot_id": result.value, "id_token": IDToken }));
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
