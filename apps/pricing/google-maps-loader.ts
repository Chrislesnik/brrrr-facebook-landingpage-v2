// Small loader to inject Google Maps JS (Places library) once and reuse it.
// It returns a promise that resolves once the Places library is ready.
let loadPromise: Promise<typeof google> | null = null;

const CALLBACK_NAME = "__brrrrGoogleMapsReady";

export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  const w = window as any;
  loadPromise = new Promise<typeof google>((resolve, reject) => {
    const importPlaces = () =>
      w.google.maps.importLibrary("places").then(() => resolve(w.google), reject);

    if (w.google?.maps?.importLibrary) {
      importPlaces();
      return;
    }

    // Google calls this global when it rejects the key — otherwise the failure is silent.
    w.gm_authFailure = () => {
      console.warn(
        "Google Maps rejected VITE_GOOGLE_MAPS_API_KEY. Check that Maps JavaScript API and " +
          "Places API (New) are enabled, billing is on, and this site is an allowed referrer.",
      );
    };
    w[CALLBACK_NAME] = importPlaces;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&v=weekly&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  }).catch((err) => {
    // Allow a later call to retry instead of caching the failure.
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}
