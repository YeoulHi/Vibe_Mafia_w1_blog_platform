"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { useToast } from "@/hooks/use-toast";
import type { UpdateAdvertiserProfileRequest } from "@/features/advertiser/lib/dto";
import {
  ADVERTISER_API_ROUTES,
  ADVERTISER_APP_ROUTES,
  ADVERTISER_ONBOARDING_COPY,
} from "@/features/advertiser/constants/profile";

export const useUpdateAdvertiserProfile = () => {
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateAdvertiserProfileRequest) => {
      const response = await apiClient.post(ADVERTISER_API_ROUTES.profile, data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: ADVERTISER_ONBOARDING_COPY.successToastTitle,
        description: ADVERTISER_ONBOARDING_COPY.successToastDescription,
      });
      router.push(ADVERTISER_APP_ROUTES.dashboard);
    },
    onError: (error) => {
      const message = extractApiErrorMessage(
        error,
        ADVERTISER_ONBOARDING_COPY.defaultErrorMessage,
      );

      toast({
        title: ADVERTISER_ONBOARDING_COPY.errorToastTitle,
        description: message,
        variant: "destructive",
      });
    },
  });
};
