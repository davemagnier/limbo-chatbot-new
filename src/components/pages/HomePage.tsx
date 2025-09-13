import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    const onLoad = () => {
      const statusText = document.getElementById("status-text");
      if (statusText) {
        if (window.location.protocol === "file:") {
          statusText.textContent = "Local Environment";
        } else {
          statusText.textContent = "System Online";
        }
      }
    };

    window.addEventListener("load", onLoad);

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (
    <>
      <div className="background-gradient"></div>

      <div className="container">
        <img
          src="/assets/images/youmio-logo.png"
          alt="Youmio"
          className="logo"
        />
        <p className="tagline">
          Chat with Limbo • Test the network • Monitor status
        </p>

        <div className="buttons">
          <Link to="/testnet" className="main-button testnet-button">
            Testnet Demo
          </Link>
          <a href="testnet-status.html" className="main-button status-button">
            Network Status
          </a>
        </div>

        <div className="status">
          <span className="status-led"></span>
          <span id="status-text">System Online</span>
        </div>
      </div>
    </>
  );
}
