import liff from "@line/liff";
import { useState } from "react";
import "./App.css";

function App() {
  const [qrCodeData, setQrCodeData] = useState('');
  const handleScan = () => {
    liff.scanCodeV2().then((result) => {
      setQrCodeData(result.value ?? '');
    }).catch((e: Error) => {
      console.error(`${e}`);
    });
  };

  return (
    <div className="App">
      <button onClick={handleScan}>Scan QR Code</button>
      <h1>{qrCodeData}</h1>
    </div>
  );
}

export default App;
