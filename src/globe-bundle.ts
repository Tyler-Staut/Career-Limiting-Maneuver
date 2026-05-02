import { createGlobe } from "cobe";
import { usePartySocket } from "partysocket/react";
import type { OutgoingMessage } from "./shared";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// This will be bundled by esbuild for browser use
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counter, setCounter] = useState(0);
  const positions = useRef<Map<string, { location: [number, number]; size: number }>>(new Map());

  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      if (message.type === "add-marker") {
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.1 : 0.05,
        });
        setCounter((c) => c + 1);
      } else {
        positions.current.delete(message.id);
        setCounter((c) => c - 1);
      }
    },
  });

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      markerColor: [0.8, 0.1, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      markers: [],
      opacity: 0.7,
      onRender: (state) => {
        state.markers = [...positions.current.values()];
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => globe.destroy();
  }, []);

  return (
    <div style={{ textAlign: "center", height: "100%" }}>
      <h1 style={{ color: "white", margin: "0 0 8px 0", fontSize: "1.2rem" }}>
        Who Else is Pulling a Career Limiting Maneuver?
      </h1>
      {counter !== 0 ? (
        <p style={{ color: "#999", margin: "0 0 12px 0" }}>
          <b style={{ color: "white" }}>{counter}</b> {counter === 1 ? "person" : "people"} limiting their career outlooks.
        </p>
      ) : (
        <p style={{ margin: "0 0 12px 0" }}>&nbsp;</p>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", maxWidth: "400px", aspectRatio: 1 }}
      />
    </div>
  );
}

// Auto-initialize when loaded
const canvasContainer = document.getElementById("globe-container");
if (canvasContainer) {
  const root = createRoot(canvasContainer);
  root.render(<App />);
}
