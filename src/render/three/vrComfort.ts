export interface VrComfortOptions {
  readonly moveSpeedMetersPerSecond: number;
  readonly joystickDeadZone: number;
  readonly turnSpeedRadiansPerSecond: number;
  readonly maxPhysicalStepMeters: number;
}

export const defaultVrComfortOptions: VrComfortOptions = {
  moveSpeedMetersPerSecond: 1.5,
  joystickDeadZone: 0.18,
  turnSpeedRadiansPerSecond: 1.35,
  maxPhysicalStepMeters: 0.75,
};

// Later comfort work can add narrowed-view locomotion here without touching
// controller mapping or movement/collision code.
