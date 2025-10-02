"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { toast } from "@/hooks/use-toast";
import type { SignUpRequest, SignUpResponse } from "@/features/auth/lib/dto";

export const useSignUpMutation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: SignUpRequest) => {
      const response = await apiClient.post<SignUpResponse>(
        "/auth/signup",
        data
      );

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "회원가입 성공",
        description: "인증 이메일을 확인해주세요.",
        variant: "default",
      });

      router.push("/login");
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(
        error,
        "회원가입에 실패했습니다."
      );

      toast({
        title: "회원가입 실패",
        description: message,
        variant: "destructive",
      });
    },
  });
};
