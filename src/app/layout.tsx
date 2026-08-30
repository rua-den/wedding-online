import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Lora,
  Noto_Serif_Display,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";
import "./invitation-theme.css";
import "./mobile-fixes.css";
import "./story-milestones.css";
import "./public-invitation-ux.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  variable: "--font-cormorant-garamond",
  display: "swap",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair-display",
  display: "swap",
});
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
  display: "swap",
});
const notoSerifDisplay = Noto_Serif_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-noto-serif-display",
  display: "swap",
});

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
  ].join(" ");

  return <html lang="vi"><body className={fontVariables}>{children}</body></html>;
}
