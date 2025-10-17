export {};

declare global {
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }

  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    AMap?: typeof AMap;
  }
}

declare namespace AMap {
  type LngLatLike = any;

  interface MapOptions {
    zoom?: number;
    center?: LngLatLike;
    viewMode?: string;
  }

  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions);
    setZoom(level: number): void;
    setCenter(center: LngLatLike): void;
    add(overlay: Marker | Marker[]): void;
    destroy(): void;
  }

  interface MarkerOptions {
    position?: LngLatLike;
    title?: string;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(position: LngLatLike): void;
    setTitle(title: string): void;
  }

  interface GeocoderResultItem {
    location: LngLatLike;
    formattedAddress?: string;
  }

  interface GeocoderResult {
    geocodes: GeocoderResultItem[];
  }

  class Geocoder {
    getLocation(
      address: string,
      callback: (status: string, result: GeocoderResult) => void
    ): void;
  }

  function plugin(name: string | string[], callback: () => void): void;
  class DistrictSearch {
    constructor(options?: Record<string, unknown>);
    search(
      keyword: string,
      callback: (status: string, result: Record<string, any>) => void
    ): void;
  }
}
