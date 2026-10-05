export const MQTT_BACKEND_USERNAME = 'backend';

export function buildMqttUrl(host: string, port: string | number): string {
  return `mqtt://${host}:${port}`;
}

export interface BackendMqttConnectionConfig {
  host: string;
  port: string | number;
  password: string;
}

export interface BackendMqttOptions {
  url: string;
  username: string;
  password: string;
  subscribeOptions: { qos: 1 };
}

export function buildBackendMqttOptions(
  config: BackendMqttConnectionConfig,
): BackendMqttOptions {
  return {
    url: buildMqttUrl(config.host, config.port),
    username: MQTT_BACKEND_USERNAME,
    password: config.password,
    subscribeOptions: { qos: 1 },
  };
}
