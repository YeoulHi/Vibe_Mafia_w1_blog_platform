"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

// 광고주 프로필 상태 타입 정의
type AdvertiserProfileStatus = {
  isAdvertiser: boolean;
  hasProfile: boolean;
  needsOnboarding: boolean;
};

// 기본값 정의 (인증되지 않았거나 데이터가 없을 때 사용)
const defaultStatus: AdvertiserProfileStatus = {
  isAdvertiser: false,
  hasProfile: false,
  needsOnboarding: false,
};

// 광고주 프로필 상태를 확인하는 React Query 훅
export const useAdvertiserProfileStatus = () => {
  const { isAuthenticated } = useCurrentUser();

  return useQuery<AdvertiserProfileStatus>({
    queryKey: ["advertiser", "profile", "status"],
    queryFn: async () => {
      if (!isAuthenticated) {
        return defaultStatus;
      }

      try {
        const response = await apiClient.get<AdvertiserProfileStatus>(
          "/advertiser/profile/status"
        );
        return response.data ?? defaultStatus;
      } catch (error) {
        console.error("Failed to fetch advertiser profile status:", error);
        return defaultStatus;
      }
    },
    enabled: isAuthenticated, // 인증된 경우에만 쿼리 실행
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    placeholderData: defaultStatus, // undefined 방지
  });
};

