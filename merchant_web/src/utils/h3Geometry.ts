// src/utils/h3Geometry.ts
//
// Uber H3 Global Hexagonal Spatial Indexing & Geodesic Grid Engine (h3-js)
// ─────────────────────────────────────────────────────────────────────────────
// 1. Evrensel Çözünürlük (Resolution): Uber'in küresel ayrık H3 ızgarasını kullanır.
// 2. Çoklu Restoran Tekilleştirme (Deduplication): Tüm restoranların kapsama
//    petekleri bir JavaScript Set'inde toplanır, mükerrer petekler silinir.
// 3. Sıfır Kesişme / Üst Üste Binme: H3 küresel koordinat sistemi sayesinde
//    restoranlar ne kadar yakın olursa olsun petekler kusursuzca birbirine kenetlenir.
// ─────────────────────────────────────────────────────────────────────────────

import * as h3 from 'h3-js';
import { isCoordinateOnLand, clipCoordinateToLand } from './coastlineRegistry';

/** Şehir içi kurye dağıtımı için standart Uber H3 çözünürlüğü (~460m kenar, ~0.74 km² alan) */
export const DEFAULT_H3_RESOLUTION = 8;

/**
 * Ayarlardaki HexagonSizeMeters (hücre çapı) değerine en yakın H3 çözünürlüğünü seçer.
 * H3 yalnızca ayrık çözünürlükleri destekler; çap ≈ 2 × ortalama kenar uzunluğu:
 * r6 ≈ 6460 m, r7 ≈ 2440 m, r8 ≈ 920 m, r9 ≈ 350 m, r10 ≈ 130 m.
 */
export function hexSizeToH3Resolution(meters?: number | null): number {
  if (!meters || meters <= 0) return DEFAULT_H3_RESOLUTION;
  const diameters: Array<[number, number]> = [[6, 6460], [7, 2440], [8, 920], [9, 350], [10, 130]];
  let best = DEFAULT_H3_RESOLUTION;
  let bestDiff = Infinity;
  for (const [res, d] of diameters) {
    const diff = Math.abs(Math.log(meters / d));
    if (diff < bestDiff) { bestDiff = diff; best = res; }
  }
  return best;
}

export interface H3GlobalCell {
  id: string; // H3 index e.g. "882da12299fffff"
  boundary: [number, number][]; // [[lat, lng], [lat, lng], ...]
  isCenter: boolean;
  center: [number, number];
}

export interface H3Cell {
  id: string;
  center: [number, number];
  vertices: [number, number][];
  isCenter: boolean;
  label?: string;
  landRatio?: number;
  isCoastal?: boolean;
}

// ─── 1 & 2. Uber H3 Global Grid & Deduplication Engine ────────────────────────

/**
 * Uber H3 Global Grid tabanlı petek üretici & birleştirici (Deduplication Engine).
 * 
 * @param coordinates Restoran veya kuryelerin koordinat listesi
 * @param kRing       Merkez petekten itibaren kaç katman genişletileceği (varsayılan: 2)
 * @param resolution  Uber H3 çözünürlüğü (varsayılan: 8)
 * @returns Evrensel H3 ızgarasına oturan, mükerrersiz petek listesi
 */
export function computeGlobalH3Grid(
  coordinates: Array<{ lat?: number | null; lng?: number | null }>,
  kRing: number = 2,
  resolution: number = DEFAULT_H3_RESOLUTION
): H3GlobalCell[] {
  const cellSet = new Set<string>();
  const centerCells = new Set<string>();

  for (const coord of coordinates) {
    if (
      typeof coord.lat !== 'number' ||
      typeof coord.lng !== 'number' ||
      (coord.lat === 0 && coord.lng === 0)
    ) {
      continue;
    }

    try {
      const centerCell = h3.latLngToCell(coord.lat, coord.lng, resolution);
      centerCells.add(centerCell);
      const disk = h3.gridDisk(centerCell, kRing);
      for (const cellId of disk) {
        cellSet.add(cellId);
      }
    } catch (err) {
      console.warn('h3.gridDisk error:', err);
    }
  }

  const result: H3GlobalCell[] = [];
  for (const cellId of cellSet) {
    try {
      const rawBoundary = h3.cellToBoundary(cellId);
      const [centerLat, centerLng] = h3.cellToLatLng(cellId);
      result.push({
        id: cellId,
        boundary: rawBoundary as [number, number][],
        isCenter: centerCells.has(cellId),
        center: [centerLat, centerLng],
      });
    } catch (err) {
      console.warn('h3.cellToBoundary error:', err);
    }
  }

  return result;
}

/**
 * Geriye dönük uyumluluk: Tek bir restoran koordinatı için H3 petek kümesi üretir.
 * Doğrudan Uber h3-js kütüphanesini kullanır.
 */
export function generateH3Cluster(
  centerLat: number,
  centerLng: number,
  _radiusMeters: number = 1120,
  prefix: string = 'h3',
  rings: number = 2
): H3Cell[] {
  const globalCells = computeGlobalH3Grid(
    [{ lat: centerLat, lng: centerLng }],
    rings,
    DEFAULT_H3_RESOLUTION
  );

  return globalCells.map((gc) => ({
    id: `${prefix}-${gc.id}`,
    center: gc.center,
    vertices: gc.boundary,
    isCenter: gc.isCenter,
    label: gc.isCenter ? `H3-Merkez (${gc.id})` : `H3-Hücre (${gc.id})`,
    landRatio: isCoordinateOnLand(gc.center[0], gc.center[1]) ? 1.0 : 0.2,
    isCoastal: !isCoordinateOnLand(gc.center[0], gc.center[1]),
  }));
}

// ─── WGS84 & Leaflet Yardımcı Fonksiyonları ──────────────────────────────────

const LAT_METERS = 111320;

function lngMetersAt(lat: number): number {
  return LAT_METERS * Math.cos((lat * Math.PI) / 180);
}

export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getHexagonVertices(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  clipToLand: boolean = true
): [number, number][] {
  const points: [number, number][] = [];
  const lm = lngMetersAt(centerLat);

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const dLat = (radiusMeters * Math.sin(angle)) / LAT_METERS;
    const dLng = (radiusMeters * Math.cos(angle)) / lm;
    const rawLat = centerLat + dLat;
    const rawLng = centerLng + dLng;

    if (clipToLand) {
      points.push(clipCoordinateToLand(rawLat, rawLng));
    } else {
      points.push([rawLat, rawLng]);
    }
  }
  return points;
}

export function estimateLandRatio(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): number {
  const lm = lngMetersAt(centerLat);
  let onLand = 0;
  const samples: [number, number][] = [[centerLat, centerLng]];

  for (let i = 0; i < 6; i++) {
    const vAngle = (Math.PI / 3) * i + Math.PI / 6;
    samples.push([
      centerLat + (radiusMeters * Math.sin(vAngle)) / LAT_METERS,
      centerLng + (radiusMeters * Math.cos(vAngle)) / lm,
    ]);
  }

  for (const [lat, lng] of samples) {
    if (isCoordinateOnLand(lat, lng)) {
      onLand++;
    }
  }

  return onLand / samples.length;
}

// ─── fitBounds Helper ─────────────────────────────────────────────────────────

export function computeFitBounds(
  points: Array<{ latitude?: number | null; longitude?: number | null }>
): [[number, number], [number, number]] {
  const valid = points.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0 && p.longitude !== 0
  ) as Array<{ latitude: number; longitude: number }>;

  if (valid.length === 0) {
    return [[36.45, 35.90], [36.75, 36.45]];
  }

  const lats = valid.map((p) => p.latitude);
  const lngs = valid.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const padLat = Math.max((maxLat - minLat) * 0.15, 0.008);
  const padLng = Math.max((maxLng - minLng) * 0.15, 0.010);

  return [
    [minLat - padLat, minLng - padLng],
    [maxLat + padLat, maxLng + padLng],
  ];
}
