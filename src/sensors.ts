export type Light = 'dark' | 'normal' | 'bright';
export type Distance = 'far' | 'near';
export type SensorReading = { light: Light; distance: Distance };
export interface SensorAdapter { read(): SensorReading }
export class VirtualSensorAdapter implements SensorAdapter {
  constructor(private current: SensorReading = { light: 'normal', distance: 'far' }) {}
  read() { return { ...this.current }; }
  set(reading: SensorReading) { this.current = { ...reading }; }
}
