import liff from "@line/liff";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

const liffId = import.meta.env.VITE_LIFF_ID
console.log(`liffId: ${liffId}`);
liff.init({ liffId }).then(() => {
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
});
