"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSignUpMutation } from "@/features/auth/hooks/useSignUpMutation";
import type { SignUpRequest } from "@/features/auth/lib/dto";

const clientSignUpSchema = z
  .object({
    email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
    password: z
      .string()
      .min(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." }),
    passwordConfirm: z.string(),
    name: z
      .string()
      .min(1, { message: "이름을 입력해주세요." })
      .max(100, { message: "이름은 최대 100자까지 입력 가능합니다." }),
    phone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
      message: "유효한 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)",
    }),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "생년월일은 YYYY-MM-DD 형식이어야 합니다.",
    }),
    role: z.enum(["advertiser", "influencer"], {
      required_error: "역할을 선택해주세요.",
    }),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "약관에 동의해주세요.",
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

type ClientSignUpForm = z.infer<typeof clientSignUpSchema>;

export const SignUpForm = () => {
  const { mutate: signUp, isPending } = useSignUpMutation();

  const form = useForm<ClientSignUpForm>({
    resolver: zodResolver(clientSignUpSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      name: "",
      phone: "",
      birthdate: "",
      role: undefined,
      termsAccepted: false,
    },
  });

  const onSubmit = (data: ClientSignUpForm) => {
    const requestData: SignUpRequest = {
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      birthdate: data.birthdate,
      role: data.role,
    };

    signUp(requestData);
  };

  const isFormValid = form.formState.isValid;
  const termsAccepted = form.watch("termsAccepted");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>
          블로그 체험단 플랫폼에 가입하여 다양한 혜택을 받아보세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="최소 8자 이상"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="비밀번호를 다시 입력해주세요"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>휴대폰 번호</FormLabel>
                  <FormControl>
                    <Input placeholder="010-1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthdate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>생년월일</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>역할 선택</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="advertiser" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          광고주 - 체험단을 모집하고 운영합니다
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="influencer" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          인플루언서 - 체험단에 지원하고 활동합니다
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      서비스 이용약관 및 개인정보 처리방침에 동의합니다.
                    </FormLabel>
                    <FormDescription>
                      회원가입을 위해서는 약관 동의가 필요합니다.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !isFormValid || !termsAccepted}
            >
              {isPending ? "가입 중..." : "회원가입"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
