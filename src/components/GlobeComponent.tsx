import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";
import type { GlobeMessage, Location } from "../shared";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const [globeSize, setGlobeSize] = useState(0);
  const positions = useRef<Map<string, Location>>(new Map());
  const ownId = useRef<string | null>(null);

  const socketHost = window.location.host;
  const socketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socketTarget = `${socketProtocol}://${socketHost}/parties/globe/default`;
  console.debug("[PartySocket] Using same-origin socket target", socketTarget);
  const handleSocketConnected = () => setConnected(true);

  usePartySocket({
    host: socketHost,
    protocol: socketProtocol,
    path: "/parties",
    room: "default",
    party: "globe",
    onOpen() {
      console.info("[PartySocket] Connected to globe/default");
      handleSocketConnected();
    },
    onClose(event) {
      console.warn("[PartySocket] Disconnected from globe/default", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setConnected(false);
    },
    onError(event) {
      console.error("[PartySocket] Connection error for globe/default", event);
      setConnected(false);
    },
    onMessage(evt) {
      if (typeof evt.data !== "string") {
        return;
      }

      let message: GlobeMessage;
      try {
        message = JSON.parse(evt.data) as GlobeMessage;
      } catch (error) {
        console.error("[PartySocket] Failed to parse globe message", error);
        return;
      }

      ownId.current = message.id;
      positions.current = new Map(
        Object.entries(message.globe).map(([id, location]) => [id, location]),
      );
      setCounter(positions.current.size);
      handleSocketConnected();
    },
  });

  useEffect(() => {
    const wrap = canvasWrapRef.current;

    if (!wrap) {
      return;
    }

    const updateGlobeSize = () => {
      const rect = wrap.getBoundingClientRect();
      const nextSize = Math.max(0, Math.floor(Math.min(rect.width, rect.height)));
      setGlobeSize((prevSize) => (prevSize === nextSize ? prevSize : nextSize));
    };

    updateGlobeSize();

    const resizeObserver = new ResizeObserver(updateGlobeSize);
    resizeObserver.observe(wrap);
    window.addEventListener("resize", updateGlobeSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGlobeSize);
    };
  }, []);

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const size = globeSize;

    if (!canvas || size <= 0) {
      return;
    }

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      scale: 1,
      markers: [],
      opacity: 0.7,
      onRender: (state) => {
        state.markers = Array.from(positions.current, ([id, location]) => ({
          location: [location[0], location[1]] as Location,
          size: id === ownId.current ? 0.14 : 0.08,
        }));
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, [globeSize]);

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

      <div ref={canvasWrapRef} className="globe-panel__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="globe-panel__canvas"
          style={{ width: globeSize, height: globeSize }}
        />
      </div>
    </div>
  );
}

export default App;
