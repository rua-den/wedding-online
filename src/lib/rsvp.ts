export type Attendance = "attending" | "declined";

export type RsvpInput = {
  attendance: Attendance;
  guestCount: number;
  message: string;
};

export type RsvpValidationContext = {
  maxGuests: number;
  deadline: Date;
  now: Date;
};

export type RsvpValidationResult =
  | { ok: true; value: RsvpInput }
  | { ok: false; message: string };

export function validateRsvp(input: RsvpInput, context: RsvpValidationContext): RsvpValidationResult {
  if (context.now > context.deadline) {
    return { ok: false, message: "Đã hết hạn xác nhận tham dự." };
  }

  if (input.message.length > 500) {
    return { ok: false, message: "Lời nhắn không được vượt quá 500 ký tự." };
  }

  if (input.attendance === "declined" && input.guestCount !== 0) {
    return { ok: false, message: "Nếu không thể tham dự, số người tham dự phải là 0." };
  }

  if (input.attendance === "attending" && (input.guestCount < 1 || input.guestCount > context.maxGuests)) {
    return { ok: false, message: "Số người tham dự vượt quá số lượng trong thiệp mời." };
  }

  return { ok: true, value: input };
}
