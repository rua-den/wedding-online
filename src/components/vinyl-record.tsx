import { scaledTextStyle } from "@/lib/invitation-typography";

export function VinylRecord({ groom, bride, groomScale, brideScale }: { groom: string; bride: string; groomScale?: number; brideScale?: number }) {
  return <div className="vinyl-stage" aria-label={`Đĩa than ${groom} và ${bride}`}>
    <div className="vinyl-record" aria-hidden="true">
      <div className="vinyl-grooves" />
      <div className="vinyl-label">
        <span style={scaledTextStyle(groomScale)}>{groom}</span>
        <em>&amp;</em>
        <span style={scaledTextStyle(brideScale)}>{bride}</span>
      </div>
      <div className="vinyl-hole" />
    </div>
  </div>;
}
