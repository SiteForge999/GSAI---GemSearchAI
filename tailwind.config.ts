import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0C0F14",
        panel: "#12161D",
        line: "#232935",
        paper: "#EDEFF3",
        mute: "#8B93A3",
        signal: "#5FE0B7",
        youtube: "#FF4757"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      },
      backgroundImage: {
        scan: "repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)"
      }
    }
  },
  plugins: []
};

export default config;
