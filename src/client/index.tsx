import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

function App() {
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
  // A reference to the canvas element where we'll render the globe
  const canvasRef = useRef<HTMLCanvasElement>();
  // The number of markers we're currently displaying
  const [counter, setCounter] = useState(0);
  // A map of marker IDs to their positions
  // Note that we use a ref because the globe's `onRender` callback
  // is called on every animation frame, and we don't want to re-render
  // the component on every frame.
  const positions = useRef<
    Map<
      string,
      {
        location: [number, number];
        size: number;
      }
    >
  >(new Map());
  // Connect to the PartyServer server
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      if (message.type === "add-marker") {
        // Add the marker to our map
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.1 : 0.05,
        });
        // Update the counter
        setCounter((c) => c + 1);
      } else {
        // Remove the marker from our map
        positions.current.delete(message.id);
        // Update the counter
        setCounter((c) => c - 1);
      }
    },
  });

  useEffect(() => {
    // The angle of rotation of the globe
    // We'll update this on every frame to make the globe spin
    let phi = 0;

    const globe = createGlobe(canvasRef.current as HTMLCanvasElement, {
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
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.

        // Get the current positions from our map
        state.markers = [...positions.current.values()];

        // Rotate the globe
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  // Konami code detection
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

  // Light embed-specific body fix to remove default padding and make background transparent
  if (embed) {
    try {
      document.body.style.paddingTop = '0px';
      document.body.style.margin = '0';
      document.body.style.backgroundColor = 'transparent';
      const app = document.querySelector('#root') as HTMLElement | null;
      if (app) {
        app.style.height = '100%';
        app.style.width = '100%';
      }
      const html = document.documentElement as HTMLElement;
      html.style.height = '100%';
      html.style.width = '100%';
    } catch {}
  }

  return (
    <div className="App">
      {clmTriggered && !embed && (
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
      {!embed && (
        <>
          <h1>Who Else is Pulling a Career Limiting Maneuver?</h1>
          {counter !== 0 ? (
            <p>
              <b>{counter}</b> {counter === 1 ? "person" : "people"} limiting their career outlooks.
            </p>
          ) : (
            <p>&nbsp;</p>
          )}
        </>
      )}

      {/* The canvas where we'll render the globe */}
      <canvas
        ref={canvasRef as LegacyRef<HTMLCanvasElement>}
        style={embed ? { width: '100%', height: '100%', maxWidth: '100%' } : { width: 400, height: 400, maxWidth: '100%', aspectRatio: 1 }}
      />
      {/* credit section omitted in embed */}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
