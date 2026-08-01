/**
 * Loads the Google Maps JS API once per page load.
 *
 * The script tag is injected rather than rendered so the map only costs a
 * request on the routes that actually mount it, and so repeated navigations
 * between the three portals reuse the same `google.maps` instance.
 */

const CALLBACK = "__bcreDroneShotsReady";

let pending: Promise<typeof google.maps> | null = null;

declare global {
  interface Window {
    [CALLBACK]?: () => void;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    window[CALLBACK] = () => {
      delete window[CALLBACK];
      resolve(window.google.maps);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      // marker: status pins · places: address search · geometry: route trimming
      libraries: "marker,places,geometry",
      loading: "async",
      callback: CALLBACK,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      pending = null;
      reject(new Error("Could not load Google Maps. Check the API key."));
    };
    document.head.appendChild(script);
  });

  return pending;
}
