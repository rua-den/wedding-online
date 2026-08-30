export type InvitationFontId =
  | "classic-serif"
  | "cormorant-garamond"
  | "playfair-display"
  | "lora"
  | "noto-serif-display"
  | "merriweather"
  | "spectral"
  | "roboto-serif"
  | "source-serif-4"
  | "alegreya"
  | "crimson-pro";

export type InvitationFontDefinition = {
  id: InvitationFontId;
  name: string;
  description: string;
  cssFamily: string;
  previewText: string;
};

export const invitationFonts: readonly InvitationFontDefinition[] = [
  {
    id: "classic-serif",
    name: "Classic Serif",
    description: "Georgia nguyên bản, thanh lịch và không cần tải webfont.",
    cssFamily: 'Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "cormorant-garamond",
    name: "Cormorant Garamond",
    description: "Mảnh, lãng mạn và rất hợp tiêu đề thiệp cưới cổ điển.",
    cssFamily: 'var(--font-cormorant-garamond), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "playfair-display",
    name: "Playfair Display",
    description: "Display serif sang, nét tương phản cao và rõ trên ảnh cover.",
    cssFamily: 'var(--font-playfair-display), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "lora",
    name: "Lora",
    description: "Mềm mại, dễ đọc; hợp thiệp có nhiều lời mời và câu chuyện.",
    cssFamily: 'var(--font-lora), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "noto-serif-display",
    name: "Noto Serif Display",
    description: "Trang trọng, hỗ trợ tiếng Việt rộng và cân bằng trên mobile.",
    cssFamily: 'var(--font-noto-serif-display), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    description: "Ấm áp, chắc nét và đọc tốt ở phần lời mời dài.",
    cssFamily: 'var(--font-merriweather), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "spectral",
    name: "Spectral",
    description: "Serif thanh thoát, hơi hướng editorial và rất hợp thiệp cưới hiện đại.",
    cssFamily: 'var(--font-spectral), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "roboto-serif",
    name: "Roboto Serif",
    description: "Hiện đại, sạch và ổn định trên nhiều kích thước màn hình.",
    cssFamily: 'var(--font-roboto-serif), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "source-serif-4",
    name: "Source Serif 4",
    description: "Tinh tế, cân bằng và hợp cả heading lẫn nội dung kể chuyện.",
    cssFamily: 'var(--font-source-serif-4), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "alegreya",
    name: "Alegreya",
    description: "Mang nét thư pháp nhẹ, mềm và giàu cảm xúc nhưng vẫn dễ đọc.",
    cssFamily: 'var(--font-alegreya), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
  {
    id: "crimson-pro",
    name: "Crimson Pro",
    description: "Cổ điển kiểu sách in, nhẹ nhàng và hợp phong cách wedding editorial.",
    cssFamily: 'var(--font-crimson-pro), Georgia, "Times New Roman", serif',
    previewText: "Trăm năm hạnh phúc",
  },
] as const;

export const defaultInvitationFontId: InvitationFontId = "classic-serif";
const invitationFontIds = new Set<string>(invitationFonts.map((font) => font.id));

export function isInvitationFontId(value: unknown): value is InvitationFontId {
  return typeof value === "string" && invitationFontIds.has(value);
}

export function getInvitationFont(id: InvitationFontId): InvitationFontDefinition {
  return invitationFonts.find((font) => font.id === id) ?? invitationFonts[0];
}
