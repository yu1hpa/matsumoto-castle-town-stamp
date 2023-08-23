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

  /*
  useEffect(() => {
    liff
      .init({
        liffId: import.meta.env.VITE_LIFF_ID
      })
      .then(() => {
        console.log("LIFF init succeeded.");
      })
      .catch((e: Error) => {
        console.error(`LIFF init failed.${e}`);
      });
  });
  */

  return (
    <div className="App">
      <button onClick={handleScan}>Scan QR Code</button>
      <p>{qrCodeData}</p>
      <h1>aaa</h1>
    </div>
  );
}

export default App;
