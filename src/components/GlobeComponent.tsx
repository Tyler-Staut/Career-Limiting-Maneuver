import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";
import type { GlobeMessage, Location } from "../shared";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const positions = useRef<Map<string, Location>>(new Map());
  const ownId = useRef<string | null>(null);

  const partykitHost = import.meta.env.PUBLIC_PARTYKIT_HOST;
  const socketHost =
    typeof window === "undefined" ? (partykitHost ?? "localhost") : (partykitHost ?? window.location.host);
  const socketProtocol =
    typeof window === "undefined" ? "wss" : (window.location.protocol === "https:" ? "wss" : "ws");

  usePartySocket({
    host: socketHost,
    protocol: socketProtocol,
    path: "/parties",
    room: "default",
    party: "globe",
    onOpen() {
      console.info("[PartySocket] Connected to globe/default");
    },
    onClose(event) {
      console.warn("[PartySocket] Disconnected from globe/default", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    },
    onError(event) {
      console.error("[PartySocket] Connection error for globe/default", event);
    },
    onMessage(evt) {
      if (typeof evt.data !== "string") {
        return;
      }

      const message = JSON.parse(evt.data) as GlobeMessage;

      ownId.current = message.id;
      positions.current = new Map(
        Object.entries(message.globe).map(([id, location]) => [id, location]),
      );
      setCounter(positions.current.size);
      setConnected(true);
    },
  });

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: 400 * 2,
      height: 400 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      markers: [],
      opacity: 0.7,
      onRender: (state) => {
        state.markers = [...positions.current].map(([id, location]) => ({
          location,
          size: id === ownId.current ? 0.1 : 0.05,
        }));
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  const [clmTriggered, setClmTriggered] = useState(false);
  useEffect(() => {
    const konami = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let pos = 0;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === konami[pos].toLowerCase()) {
        pos++;
        if (pos === konami.length) {
          setClmTriggered(true);
          pos = 0;
        }
      } else {
        pos = 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {clmTriggered && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            flexDirection: "column",
            textAlign: "center",
          }}
          onClick={() => setClmTriggered(false)}
        >
          <div>You've just triggered a Career Limiting Maneuver™!</div>
          <div>Your actions have been logged and reported.</div>
        </div>
      )}

      <h1 style={{ color: "inherit", margin: "0 0 8px 0", fontSize: "1.2rem" }}>
        Who Else is Pulling a Career Limiting Maneuver?
      </h1>
      {connected ? (
        <p style={{ color: "#999", margin: "0 0 12px 0" }}>
          <b style={{ color: "inherit" }}>{counter}</b> {counter === 1 ? "person" : "people"} limiting their career outlooks.
        </p>
      ) : (
        <p style={{ color: "#999", margin: "0 0 12px 0" }}>Connecting...</p>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", maxWidth: 400, aspectRatio: 1 }}
        />
      </div>
    </div>
  );
}

export default App;
