"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { useToast } from "@/hooks/use-toast";
import type { UpdateInfluencerProfileRequest } from "../backend/schema";

export const useUpdateInfluencerProfile = () => {
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateInfluencerProfileRequest) => {
      const response = await apiClient.post("/influencer/profile", data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "인플루언서 정보가 성공적으로 등록되었습니다.",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      const message = extractApiErrorMessage(
        error,
        "인플루언서 정보 등록에 실패했습니다."
      );
      toast({
        title: "오류",
        description: message,
        variant: "destructive",
      });
    },
  });
};
