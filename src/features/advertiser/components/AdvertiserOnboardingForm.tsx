"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  advertiserProfileSchema,
  type UpdateAdvertiserProfileRequest,
} from "@/features/advertiser/lib/dto";
import { ADVERTISER_ONBOARDING_COPY } from "@/features/advertiser/constants/profile";

const EMPTY_PROFILE: UpdateAdvertiserProfileRequest = {
  company_name: "",
  location: "",
  company_phone: "",
  business_number: "",
  owner_name: "",
};

const FIELD_LABELS: Record<keyof UpdateAdvertiserProfileRequest, string> = {
  company_name: "업체명",
  location: "업체 주소",
  company_phone: "업장 전화번호",
  business_number: "사업자등록번호",
  owner_name: "대표자명",
};

const FIELD_PLACEHOLDERS: Record<keyof UpdateAdvertiserProfileRequest, string> = {
  company_name: "업체명을 입력하세요",
  location: "사업장 주소를 입력하세요",
  company_phone: "02-123-4567",
  business_number: "123-45-67890",
  owner_name: "대표자명을 입력하세요",
};

type AdvertiserOnboardingFormProps = {
  onSubmit: (data: UpdateAdvertiserProfileRequest) => void;
  isLoading?: boolean;
  initialData?: UpdateAdvertiserProfileRequest;
};

export const AdvertiserOnboardingForm = ({
  onSubmit,
  isLoading = false,
  initialData,
}: AdvertiserOnboardingFormProps) => {
  const form = useForm<UpdateAdvertiserProfileRequest>({
    resolver: zodResolver(advertiserProfileSchema),
    defaultValues: initialData ?? EMPTY_PROFILE,
    mode: "onChange",
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [form, initialData]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {(
          Object.entries(FIELD_LABELS) as Array<
            [keyof UpdateAdvertiserProfileRequest, string]
          >
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={FIELD_PLACEHOLDERS[name]}
                    disabled={isLoading}
                    type={name === "company_phone" ? "tel" : "text"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading
            ? ADVERTISER_ONBOARDING_COPY.submittingLabel
            : ADVERTISER_ONBOARDING_COPY.submitLabel}
        </Button>
      </form>
    </Form>
  );
};
