import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";
import type { GlobeMessage, Location } from "../shared";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "retrying" | "error">("connecting");
  const [counter, setCounter] = useState(0);
  const hasConnected = useRef(false);
  const positions = useRef<Map<string, Location>>(new Map());
  const ownId = useRef<string | null>(null);

  const partykitHost = import.meta.env.PUBLIC_PARTYKIT_HOST;
  const normalizeHost = (value?: string) => {
    if (!value) {
      return "";
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    try {
      const withProtocol = /^(wss?|https?):\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      const parsed = new URL(withProtocol);
      return parsed.host;
    } catch {
      return trimmed
        .replace(/^(wss?|https?):\/\//i, "")
        .split("/")[0]
        .trim();
    }
  };

  const normalizedHost = normalizeHost(partykitHost);
  const socketHost = normalizedHost || window.location.host;
  const socketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const handleSocketConnected = () => {
    hasConnected.current = true;
    setConnectionState("connected");
  };

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
      setConnectionState(hasConnected.current ? "retrying" : "connecting");
    },
    onError(event) {
      console.error("[PartySocket] Connection error for globe/default", event);
      setConnectionState("error");
      window.setTimeout(() => {
        setConnectionState((current) => (current === "error" ? "retrying" : current));
      }, 1200);
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
    <div className="globe-panel">
      {clmTriggered && (
        <div className="globe-easter-egg" onClick={() => setClmTriggered(false)}>
          <div>You've just triggered a Career Limiting Maneuver™!</div>
          <div>Your actions have been logged and reported.</div>
        </div>
      )}

      <div className="globe-panel__copy" data-state={connectionState}>
        <h1 className="globe-panel__title">
          Who Else Is Pulling a Career-Limiting Maneuver?
        </h1>
        <p className="globe-panel__subtitle">
          {connectionState === "connected" ? (
            <>
              <span className="globe-panel__counter" role="status" aria-live="polite">
                {counter} {counter === 1 ? "person" : "people"} live
              </span>{" "}
              currently running career-limiting maneuvers.
            </>
          ) : connectionState === "error" ? (
            "Connection hiccup. Retrying before this becomes an official incident report."
          ) : connectionState === "retrying" ? (
            "Signal dropped. Reconnecting to the career-limiting command center."
          ) : (
            "Connecting to the career-limiting command center."
          )}
        </p>
      </div>

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
