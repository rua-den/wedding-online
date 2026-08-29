import type { Metadata } from "next";
import "./globals.css";
import "./mobile-fixes.css";

export const metadata: Metadata = {
  title: "Huy & Nhi | Thiệp mời lễ thành hôn",
  description: "Trân trọng kính mời bạn đến chung vui cùng Huy và Nhi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="vi"><body>{children}</body></html>;
}
