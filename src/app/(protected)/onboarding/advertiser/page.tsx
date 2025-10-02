"use client";

import Image from "next/image";
import { AdvertiserOnboardingForm } from "@/features/advertiser/components/AdvertiserOnboardingForm";
import { useUpdateAdvertiserProfile } from "@/features/advertiser/hooks/useUpdateAdvertiserProfile";
import { ADVERTISER_ONBOARDING_COPY, ADVERTISER_ONBOARDING_IMAGE } from "@/features/advertiser/constants/profile";

type AdvertiserOnboardingPageProps = {
  params: Promise<Record<string, never>>;
};

export default function AdvertiserOnboardingPage({
  params,
}: AdvertiserOnboardingPageProps) {
  void params;
  const mutation = useUpdateAdvertiserProfile();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{ADVERTISER_ONBOARDING_COPY.title}</h1>
        <p className="text-slate-500">{ADVERTISER_ONBOARDING_COPY.subtitle}</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <Image
          alt={ADVERTISER_ONBOARDING_COPY.title}
          src={ADVERTISER_ONBOARDING_IMAGE.hero}
          width={960}
          height={420}
          className="h-auto w-full object-cover"
          priority
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
        <AdvertiserOnboardingForm
          onSubmit={(data) => mutation.mutate(data)}
          isLoading={mutation.isPending}
        />
      </div>
    </div>
  );
}
