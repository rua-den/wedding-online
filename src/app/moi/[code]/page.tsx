import { PersonalInvitation } from "@/components/personal-invitation";

export default async function PersonalInvitationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PersonalInvitation code={code} />;
}
