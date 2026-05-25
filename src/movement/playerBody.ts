export const DEFAULT_PLAYER_RADIUS_METERS = 0.25;
export const DEFAULT_PLAYER_HEIGHT_METERS = 1.6;
export const DEFAULT_PLAYER_EYE_HEIGHT_METERS = 1.45;

export interface PlayerBody {
  readonly radiusMeters: number;
  readonly heightMeters: number;
}

export function createDefaultPlayerBody(): PlayerBody {
  return {
    radiusMeters: DEFAULT_PLAYER_RADIUS_METERS,
    heightMeters: DEFAULT_PLAYER_HEIGHT_METERS,
  };
}
