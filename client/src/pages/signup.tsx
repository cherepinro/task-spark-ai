import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";

export default function SignupPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      return await apiRequest("POST", "/api/signup", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.signup.success"),
        description: t("auth.signup.successMessage"),
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: t("auth.signup.error"),
        description: error.message || t("auth.signup.errorMessage"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupData) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">TaskSpark AI</CardTitle>
          <CardDescription className="text-center">
            {t("auth.signup.title")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        data-testid="input-email"
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
                    <FormLabel>{t("auth.signup.password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t("auth.signup.firstNamePlaceholder")}
                        data-testid="input-firstName"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t("auth.signup.lastNamePlaceholder")}
                        data-testid="input-lastName"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? t("auth.signup.creatingAccount") : t("auth.signup.submit")}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            {t("auth.signup.hasAccount")}{" "}
            <Link href="/login" data-testid="link-login">
              <span className="text-primary hover:underline">{t("auth.signup.loginLink")}</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
