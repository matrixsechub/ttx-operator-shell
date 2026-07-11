import type { ChannelRecommendation } from "./types";
import { getTrafficSourceSummary, TRAFFIC_SOURCE_CHANNELS } from "../trafficSources";
import { listCampaigns } from "./campaignStorage";
import type { UsageEnv } from "../usage";

const ORGANIC_CHANNELS = ["linkedin", "email", "referral", "partner", "community", "reddit", "x", "discord", "slack", "direct", "organic"];

export async function buildChannelRecommendations(env: UsageEnv): Promise<ChannelRecommendation[]> {
  const summary = await getTrafficSourceSummary(env);
  const campaigns = await listCampaigns(env, "ACTIVE");
  const targetChannels = new Set(campaigns.flatMap((c) => c.targetChannels));

  const recommendations: ChannelRecommendation[] = [];

  for (const channel of ORGANIC_CHANNELS) {
    const count = (TRAFFIC_SOURCE_CHANNELS as readonly string[]).includes(channel)
      ? summary[channel as keyof typeof summary] ?? 0
      : 0;

    const reasonCodes: string[] = [];
    let score = 50;

    if (count === 0) {
      reasonCodes.push("NO_TRAFFIC_YET");
      score += 30;
    } else if (count < 10) {
      reasonCodes.push("UNDER_REPRESENTED");
      score += 20;
    } else if (count > 50) {
      reasonCodes.push("SOURCE_CONCENTRATION");
      score -= 25;
    }

    if (targetChannels.has(channel)) {
      reasonCodes.push("CAMPAIGN_TARGET");
      score += 15;
    }

    if (channel === "linkedin" || channel === "email") {
      reasonCodes.push("HIGH_INTENT_CHANNEL");
      score += 10;
    }

    recommendations.push({
      channel,
      score: Math.max(0, Math.min(100, score)),
      reasonCodes,
      suggestedAction: count === 0
        ? `Generate and approve outreach asset for ${channel}, then mark task complete after manual post.`
        : `Monitor ${channel} performance; consider diversifying if concentration exceeds 50%.`,
    });
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 8);
}
