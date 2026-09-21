import { scaledTextStyle } from "@/lib/invitation-typography";
import { FloralMark } from "./floral-mark";

export function InvitationFooter({ title, message, titleScale, messageScale }: { title: string; message: string; titleScale?: number; messageScale?: number }) {
  return (
    <footer id="loi-cam-on" className="site-footer section-shell">
      <FloralMark />
      <p><span style={scaledTextStyle(titleScale)}>{title}</span></p>
      <small><span style={scaledTextStyle(messageScale)}>{message}</span></small>
    </footer>
  );
}
