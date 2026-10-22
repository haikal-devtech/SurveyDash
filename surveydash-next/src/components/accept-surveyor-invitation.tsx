'use client';
import { AcceptInvitation } from './accept-invitation';
export function AcceptSurveyorInvitation({
  token,
  switchAccount = false,
}: {
  token: string;
  switchAccount?: boolean;
}) {
  return <AcceptInvitation token={token} kind="surveyor" switchAccount={switchAccount} />;
}
