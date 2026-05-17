import { NextResponse } from "next/server";
import {
  getBankCredentials,
  getRequiresManualTwoFactor,
} from "@/server/db/queries/bank-credentials";
import { isSupportedBankProvider, scrapeBank } from "@/server/scrapers";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";

export async function POST(request: Request) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const body = (await request.json()) as { provider: string };
  const provider = body.provider;

  if (!isSupportedBankProvider(provider)) {
    return NextResponse.json(
      { success: false, message: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  }

  if (provider === "oneZero") {
    return NextResponse.json({
      success: true,
      message:
        "One Zero credentials are saved. Run Sync to receive the SMS code and store the long-term token locally.",
    });
  }

  const credentials = getBankCredentials(workspaceId, provider);
  if (!credentials) {
    return NextResponse.json(
      { success: false, message: "No credentials found for this provider" },
      { status: 400 }
    );
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await scrapeBank(
    workspaceId,
    provider,
    credentials,
    sevenDaysAgo,
    { manualTwoFactor: getRequiresManualTwoFactor(workspaceId, provider) }
  );

  if (!result.success) {
    return NextResponse.json({
      success: false,
      message: result.errorMessage ?? "Connection test failed",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Connection successful",
    accountsFound: result.accounts.length,
  });
}
