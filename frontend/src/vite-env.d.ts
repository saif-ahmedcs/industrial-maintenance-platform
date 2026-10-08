/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLANT_TIMEZONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
