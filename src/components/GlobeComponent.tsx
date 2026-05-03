import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import type { GlobeMessage, Location } from "../shared";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const positions = useRef<Map<string, Location>>(new Map());
  const ownId = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Use standard WebSocket instead of partysocket for testing
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/parties/globe/default`;
    
    console.log("[WebSocket] Connecting to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket] Connected to globe/default");
      setConnected(true);
    };

    ws.onclose = (event) => {
      console.warn("[WebSocket] Disconnected from globe/default", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setConnected(false);
    };

    ws.onerror = (event) => {
      console.error("[WebSocket] Connection error for globe/default", event);
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data !== "string") {
        return;
      }

      let message: GlobeMessage;
      try {
        message = JSON.parse(evt.data) as GlobeMessage;
      } catch (error) {
        console.error("[WebSocket] Failed to parse globe message", error);
        return;
      }

      ownId.current = message.id;
      positions.current = new Map(
        Object.entries(message.globe).map(([id, location]) => [id, location]),
      );
      setCounter(positions.current.size);
      setConnected(true);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    console.log("[Globe] Initializing globe with canvas", canvas);
    
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
      markers: [] as any,
      opacity: 0.7,
      scale: 1,
      onRender: (state) => {
        const markers = [];
        for (const [id, location] of positions.current) {
          markers.push({
            location,
            size: id === ownId.current ? 0.1 : 0.05,
          });
        }
        state.markers = markers;
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      console.log("[Globe] Destroying globe");
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
    <div className="globe-panel">
      {clmTriggered && (
        <div className="globe-easter-egg" onClick={() => setClmTriggered(false)}>
          <div>You've just triggered a Career Limiting Maneuver™!</div>
          <div>Your actions have been logged and reported.</div>
        </div>
      )}

      <h1 className="globe-panel__title">
        Who Else is Pulling a Career Limiting Maneuver?
      </h1>
      {connected ? (
        <p className="globe-panel__subtitle">
          <b className="globe-panel__counter">{counter}</b> {counter === 1 ? "person" : "people"} limiting their career outlooks.
        </p>
      ) : (
        <p className="globe-panel__subtitle">Connecting...</p>
      )}

      <div className="globe-panel__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="globe-panel__canvas"
        />
      </div>
    </div>
  );
}

export default App;
