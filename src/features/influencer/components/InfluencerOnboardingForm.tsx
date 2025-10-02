"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Trash2 } from "lucide-react";

const channelTypeOptions = [
  { value: "NAVER_BLOG", label: "네이버 블로그" },
  { value: "YOUTUBE", label: "유튜브" },
  { value: "INSTAGRAM", label: "인스타그램" },
  { value: "THREADS", label: "스레드" },
] as const;

const channelSchema = z.object({
  channel_type: z.enum(["NAVER_BLOG", "YOUTUBE", "INSTAGRAM", "THREADS"], {
    required_error: "채널 타입을 선택해주세요",
  }),
  channel_name: z.string().min(1, "채널 이름을 입력해주세요"),
  channel_url: z.string().url("올바른 URL 형식을 입력해주세요"),
  follower_count: z
    .number({ invalid_type_error: "숫자를 입력해주세요" })
    .int()
    .min(0, "팔로워 수는 0 이상이어야 합니다"),
});

const formSchema = z.object({
  channels: z.array(channelSchema).min(0),
});

type FormValues = z.infer<typeof formSchema>;

type InfluencerOnboardingFormProps = {
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
};

export const InfluencerOnboardingForm = ({
  onSubmit,
  isLoading = false,
}: InfluencerOnboardingFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channels: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "channels",
  });

  const handleAddChannel = () => {
    append({
      channel_type: "NAVER_BLOG",
      channel_name: "",
      channel_url: "",
      follower_count: 0,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">SNS 채널 정보</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChannel}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              채널 추가
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              채널을 추가하여 인플루언서 정보를 등록해주세요.
            </p>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 border rounded-lg space-y-4 relative"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => remove(index)}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <FormField
                control={form.control}
                name={`channels.${index}.channel_type`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 타입</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="채널 타입을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {channelTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`channels.${index}.channel_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 이름</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="채널 이름을 입력하세요"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`channels.${index}.channel_url`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`channels.${index}.follower_count`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>팔로워 수</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        disabled={isLoading}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "제출 중..." : "제출"}
        </Button>
      </form>
    </Form>
  );
};
