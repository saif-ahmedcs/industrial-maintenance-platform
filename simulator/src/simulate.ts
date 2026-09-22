import mqtt from "mqtt";
import { readFileSync } from "fs";
import { join } from "path";

interface AssetBaseline {
  temperature: number;
  vibration: number;
  pressure: number;
}

interface SimulatedAsset {
  assetId: string;
  plantId: string;
  tag: string;
  baseline: AssetBaseline;
  drift: boolean;
}

const CONFIG_PATH =
  process.env.SIMULATOR_CONFIG_PATH ??
  join(__dirname, "..", "config", "assets.json");
const PUBLISH_INTERVAL_MS = Number(process.env.SIMULATOR_INTERVAL_MS ?? 1000);
const DRIFT_INCREMENT = 0.6;
const DRIFT_MAX_TEMPERATURE = 95;

const assets: SimulatedAsset[] = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

const driftState = new Map<string, number>();
for (const asset of assets) {
  if (asset.drift) {
    driftState.set(asset.assetId, asset.baseline.temperature);
  }
}

function noise(spread: number): number {
  return (Math.random() - 0.5) * 2 * spread;
}

function nextTemperature(asset: SimulatedAsset): number {
  if (!asset.drift) {
    return asset.baseline.temperature + noise(1.5);
  }
  const current = driftState.get(asset.assetId) ?? asset.baseline.temperature;
  const next = Math.min(current + DRIFT_INCREMENT, DRIFT_MAX_TEMPERATURE);
  driftState.set(asset.assetId, next);
  return next + noise(0.5);
}

function buildReading(asset: SimulatedAsset) {
  return {
    assetId: asset.assetId,
    temperature: Number(nextTemperature(asset).toFixed(2)),
    vibration: Number((asset.baseline.vibration + noise(0.3)).toFixed(2)),
    pressure: Number((asset.baseline.pressure + noise(0.2)).toFixed(2)),
    recordedAt: new Date().toISOString(),
  };
}

function topicFor(asset: SimulatedAsset): string {
  return `factory/${asset.plantId}/asset/${asset.assetId}/telemetry`;
}

const host = process.env.MQTT_HOST ?? "localhost";
const port = process.env.MQTT_PORT ?? "1883";
const client = mqtt.connect(`mqtt://${host}:${port}`);

client.on("connect", () => {
  console.log(
    `Simulator connected to mqtt://${host}:${port}, publishing ${assets.length} assets every ${PUBLISH_INTERVAL_MS}ms`,
  );
  setInterval(() => {
    for (const asset of assets) {
      const reading = buildReading(asset);
      client.publish(topicFor(asset), JSON.stringify(reading), { qos: 1 });
    }
  }, PUBLISH_INTERVAL_MS);
});

client.on("error", (err) => {
  console.error("Simulator MQTT error:", err.message);
});
