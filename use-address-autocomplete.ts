import React from "react";
import {loadGoogleMaps} from "./google-maps-loader";

export type AddressSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  prediction: any;
  legacy?: boolean;
};

export type SelectedAddress = {
  street: string;
  apt: string;
  city: string;
  stateAbbr: string;
  zip: string;
};

let missingKeyLogged = false;
let requestErrorLogged = false;
// Set once Places API (New) is rejected for this key (e.g. not in the key's API restrictions);
// from then on the legacy AutocompleteService/PlacesService are used for the rest of the visit.
let useLegacyPlaces = false;

type AddressComponent = {longText: string; shortText: string; types: string[]};

const US_ADDRESS_REQUEST = {
  includedRegionCodes: ["us"],
  includedPrimaryTypes: ["street_address", "premise", "subpremise"],
  language: "en-US",
  region: "us",
};

async function fetchNewSuggestions(places: any, input: string, sessionToken: any) {
  const {suggestions} = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    ...US_ADDRESS_REQUEST,
    input,
    sessionToken: sessionToken || undefined,
  });
  return (suggestions || [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map(
      (p: any): AddressSuggestion => ({
        placeId: p.placeId,
        mainText: p.mainText?.text || p.text.text,
        secondaryText: p.secondaryText?.text || "",
        prediction: p,
      }),
    );
}

function fetchLegacySuggestions(places: any, input: string, sessionToken: any) {
  return new Promise<AddressSuggestion[]>((resolve, reject) => {
    new places.AutocompleteService().getPlacePredictions(
      {
        input,
        types: ["address"],
        componentRestrictions: {country: "us"},
        sessionToken: sessionToken || undefined,
      },
      (preds: any[] | null, status: string) => {
        if (status !== "OK" && status !== "ZERO_RESULTS") {
          reject(new Error(`Legacy Places autocomplete failed: ${status}`));
          return;
        }
        resolve(
          (preds || []).map((p) => ({
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || "",
            prediction: p,
            legacy: true,
          })),
        );
      },
    );
  });
}

async function fetchNewComponents(suggestion: AddressSuggestion): Promise<AddressComponent[]> {
  const place = suggestion.prediction.toPlace();
  await place.fetchFields({fields: ["addressComponents"]});
  return place.addressComponents || [];
}

function fetchLegacyComponents(places: any, placeId: string, sessionToken: any) {
  return new Promise<AddressComponent[]>((resolve, reject) => {
    new places.PlacesService(document.createElement("div")).getDetails(
      {placeId, sessionToken: sessionToken || undefined, fields: ["address_components"]},
      (place: any, status: string) => {
        if (status !== "OK" || !place?.address_components) {
          reject(new Error(`Legacy Places details failed: ${status}`));
          return;
        }
        resolve(
          place.address_components.map((c: any) => ({
            longText: c.long_name,
            shortText: c.short_name,
            types: c.types,
          })),
        );
      },
    );
  });
}

// Google Places address suggestions for a single street input. Uses Places API (New), falling
// back to the legacy Places API when the key isn't allowed to call the new one.
// Without VITE_GOOGLE_MAPS_API_KEY it stays inactive and the input behaves as plain text.
export function useAddressAutocomplete(onSelect: (address: SelectedAddress) => void) {
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const placesRef = React.useRef<any | null>(null);
  const sessionTokenRef = React.useRef<any | null>(null);
  const debounceTimerRef = React.useRef<number | null>(null);
  // Responses can resolve out of order; only the latest request may update suggestions.
  const requestIdRef = React.useRef(0);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const listboxId = React.useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // Load Google Maps Places
  React.useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      if (import.meta.env.DEV && !missingKeyLogged) {
        missingKeyLogged = true;
        console.info("VITE_GOOGLE_MAPS_API_KEY is not set — address autocomplete is off.");
      }
      return;
    }
    let isMounted = true;
    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!isMounted) return;
        placesRef.current = google.maps.places;
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch(() => {});
    return () => {
      isMounted = false;
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const fetchSuggestions = React.useCallback(
    async (value: string) => {
      const places = placesRef.current;
      const requestId = ++requestIdRef.current;
      if (!places || !value.trim()) {
        setSuggestions([]);
        close();
        return;
      }
      try {
        let next: AddressSuggestion[];
        if (useLegacyPlaces) {
          next = await fetchLegacySuggestions(places, value, sessionTokenRef.current);
        } else {
          try {
            next = await fetchNewSuggestions(places, value, sessionTokenRef.current);
          } catch (newErr) {
            useLegacyPlaces = true;
            console.info(
              "Places API (New) unavailable for this key — using the legacy Places API.",
              (newErr as Error)?.message || newErr,
            );
            next = await fetchLegacySuggestions(places, value, sessionTokenRef.current);
          }
        }
        if (requestId !== requestIdRef.current) return;
        setSuggestions(next);
        setActiveIndex(-1);
        setOpen(next.length > 0);
      } catch (err) {
        // Places API (New) reports key/billing/API-not-enabled problems here, not via gm_authFailure
        if (!requestErrorLogged) {
          requestErrorLogged = true;
          console.warn("Address autocomplete request failed:", (err as Error)?.message || err);
        }
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        close();
      }
    },
    [close],
  );

  const onInputChange = (value: string) => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => void fetchSuggestions(value), 180);
  };

  const select = async (suggestion: AddressSuggestion) => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    requestIdRef.current++;
    setSuggestions([]);
    close();

    // If details can't be fetched, keep the suggestion text so the visitor can finish by hand.
    let address: SelectedAddress = {
      street: suggestion.mainText,
      apt: "",
      city: "",
      stateAbbr: "",
      zip: "",
    };
    try {
      const components = suggestion.legacy
        ? await fetchLegacyComponents(placesRef.current, suggestion.placeId, sessionTokenRef.current)
        : await fetchNewComponents(suggestion);
      const getComponent = (type: string, short = true) => {
        const comp = components.find((c) => c.types.includes(type));
        return comp ? (short ? comp.shortText : comp.longText) : "";
      };
      const streetNumber = getComponent("street_number");
      const route = getComponent("route", false);
      address = {
        street: streetNumber ? `${streetNumber} ${route}`.trim() : suggestion.mainText,
        apt: getComponent("subpremise"),
        city:
          getComponent("locality", false) ||
          getComponent("sublocality", false) ||
          getComponent("administrative_area_level_2", false),
        stateAbbr: getComponent("administrative_area_level_1"),
        zip: getComponent("postal_code"),
      };
    } catch {
      // fall through with the suggestion text
    } finally {
      // The details call ends the billing session; the next search needs a fresh token.
      const places = placesRef.current;
      if (places) sessionTokenRef.current = new places.AutocompleteSessionToken();
    }
    onSelectRef.current(address);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      // Pick the highlighted address instead of submitting the form
      e.preventDefault();
      void select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  const onFocus = () => {
    if (suggestions.length > 0) setOpen(true);
  };

  // Close suggestions on outside click
  React.useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [close]);

  return {
    rootRef,
    suggestions,
    open: open && suggestions.length > 0,
    activeIndex,
    listboxId,
    optionId,
    onInputChange,
    onKeyDown,
    onFocus,
    select,
  };
}
