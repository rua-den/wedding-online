import type { Metadata } from "next";
import {
  Alegreya,
  Cormorant_Garamond,
  Crimson_Pro,
  Lora,
  Merriweather,
  Noto_Serif_Display,
  Playfair_Display,
  Roboto_Serif,
  Source_Serif_4,
  Spectral,
} from "next/font/google";
import "./globals.css";
import "./invitation-theme.css";
import "./mobile-fixes.css";
import "./story-milestones.css";
import "./public-invitation-ux.css";
import "./admin-theme.css";

const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin", "vietnamese"], variable: "--font-cormorant-garamond", display: "swap" });
const playfairDisplay = Playfair_Display({ subsets: ["latin", "vietnamese"], variable: "--font-playfair-display", display: "swap" });
const lora = Lora({ subsets: ["latin", "vietnamese"], variable: "--font-lora", display: "swap" });
const notoSerifDisplay = Noto_Serif_Display({ subsets: ["latin", "vietnamese"], variable: "--font-noto-serif-display", display: "swap" });
const merriweather = Merriweather({ subsets: ["latin", "vietnamese"], variable: "--font-merriweather", display: "swap" });
const spectral = Spectral({ subsets: ["latin", "vietnamese"], weight: "400", variable: "--font-spectral", display: "swap" });
const robotoSerif = Roboto_Serif({ subsets: ["latin", "vietnamese"], variable: "--font-roboto-serif", display: "swap" });
const sourceSerif4 = Source_Serif_4({ subsets: ["latin", "vietnamese"], variable: "--font-source-serif-4", display: "swap" });
const alegreya = Alegreya({ subsets: ["latin", "vietnamese"], variable: "--font-alegreya", display: "swap" });
const crimsonPro = Crimson_Pro({ subsets: ["latin", "vietnamese"], variable: "--font-crimson-pro", display: "swap" });

export const metadata: Metadata = {
  title: "Huy & Nhi | Thiệp mời lễ thành hôn",
  description: "Trân trọng kính mời bạn đến chung vui cùng Huy và Nhi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVariables = [
    cormorantGaramond.variable,
    playfairDisplay.variable,
    lora.variable,
    notoSerifDisplay.variable,
    merriweather.variable,
    spectral.variable,
    robotoSerif.variable,
    sourceSerif4.variable,
    alegreya.variable,
    crimsonPro.variable,
  ].join(" ");

  return <html lang="vi"><body className={fontVariables}>{children}</body></html>;
}
