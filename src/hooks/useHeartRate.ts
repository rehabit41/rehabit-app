import { useState, useCallback, useRef, useEffect } from "react";

export function useHeartRate() {
  const [connected, setConnected] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<any>(null);

  const isAvailable = typeof navigator !== "undefined" && "bluetooth" in navigator;

  const connect = useCallback(async () => {
    if (!isAvailable) {
      setError("Bluetooth not available");
      return;
    }

    try {
      setError(null);
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["heart_rate"],
      });

      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setBpm(null);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");

      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const is16bit = flags & 0x01;
        const heartRate = is16bit ? value.getUint16(1, true) : value.getUint8(1);
        setBpm(heartRate);
      });

      await characteristic.startNotifications();
      setConnected(true);
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        setError(err.message || "Failed to connect");
      }
    }
  }, [isAvailable]);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setConnected(false);
    setBpm(null);
  }, []);

  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return { isAvailable, connected, bpm, error, connect, disconnect };
}
