"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

type InfluencerProfileStatus = {
  isInfluencer: boolean;
  hasProfile: boolean;
  needsOnboarding: boolean;
};

const defaultStatus: InfluencerProfileStatus = {
  isInfluencer: false,
  hasProfile: false,
  needsOnboarding: false,
};

export const useInfluencerProfileStatus = () => {
  const { isAuthenticated } = useCurrentUser();

  return useQuery<InfluencerProfileStatus>({
    queryKey: ["influencer", "profile", "status"],
    queryFn: async () => {
      if (!isAuthenticated) {
        return defaultStatus;
      }

      try {
        const response = await apiClient.get<InfluencerProfileStatus>(
          "/influencer/profile/status"
        );
        return response.data ?? defaultStatus;
      } catch (error) {
        console.error("Failed to fetch influencer profile status:", error);
        return defaultStatus;
      }
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분
    placeholderData: defaultStatus,
  });
};
