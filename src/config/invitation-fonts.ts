export type InvitationFontId =
  | "classic-serif"
  | "cormorant-garamond"
  | "playfair-display"
  | "lora"
  | "noto-serif-display";

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
] as const;

export const defaultInvitationFontId: InvitationFontId = "classic-serif";
const invitationFontIds = new Set<string>(invitationFonts.map((font) => font.id));

export function isInvitationFontId(value: unknown): value is InvitationFontId {
  return typeof value === "string" && invitationFontIds.has(value);
}

export function getInvitationFont(id: InvitationFontId): InvitationFontDefinition {
  return invitationFonts.find((font) => font.id === id) ?? invitationFonts[0];
}
