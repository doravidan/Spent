import { NextResponse } from "next/server";
import {
  deleteBankCredentials,
  getBankCredentials,
  getRequiresManualTwoFactor,
  setRequiresManualTwoFactor,
  updateCredentialField,
} from "@/server/db/queries/bank-credentials";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";

// Metadata only. Never return decrypted credential values to the browser.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const { provider } = await params;
  const credentials = getBankCredentials(workspaceId, provider);
  if (!credentials) {
    return NextResponse.json({
      credentials: null,
      requiresManualTwoFactor: false,
      hasTwoFactorToken: false,
    });
  }

  return NextResponse.json({
    // Privacy hardening: never send decrypted bank/card credentials back to
    // the browser. Editing an integration requires re-entering credentials.
    credentials: null,
    requiresManualTwoFactor: getRequiresManualTwoFactor(workspaceId, provider),
    hasTwoFactorToken: Boolean(credentials.otpLongTermToken),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const { provider } = await params;

  let body: {
    requiresManualTwoFactor?: boolean;
    resetTwoFactorToken?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body.requiresManualTwoFactor === "boolean") {
    setRequiresManualTwoFactor(
      workspaceId,
      provider,
      body.requiresManualTwoFactor
    );
  }
  if (body.resetTwoFactorToken === true) {
    updateCredentialField(workspaceId, provider, "otpLongTermToken", null);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const { provider } = await params;
  deleteBankCredentials(workspaceId, provider);
  return NextResponse.json({ success: true });
}
