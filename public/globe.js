// Simple globe using cobe - no React needed
(async function() {
  // Dynamic import cobe
  const { default: createGlobe } = await import('/dist/cobe.js');
  
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  
  // Simple markers array
  const markers = [];
  let phi = 0;
  let counter = 0;
  
  // Update counter display
  function updateCounter() {
    const counterEl = document.getElementById('globe-counter');
    if (counterEl) {
      counterEl.innerHTML = `<b>${counter}</b> ${counter === 1 ? 'person' : 'people'} limiting their career outlooks.`;
    }
  }
  
  // Create globe
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
    markers: markers,
    opacity: 0.7,
    onRender: (state) => {
      state.markers = [...markers];
      state.phi = phi;
      phi += 0.01;
    },
  });
  
  // Add random markers for demo (without PartySocket for now)
  setInterval(() => {
    markers.push({
      location: [Math.random() * 180 - 90, Math.random() * 360 - 180],
      size: 0.05
    });
    counter++;
    updateCounter();
  }, 3000);
  
  updateCounter();
})();
