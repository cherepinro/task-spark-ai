import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginData } from "@shared/schema";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { SiGoogle } from "react-icons/si";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useState } from "react";

export default function LoginPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      return await apiRequest("POST", "/api/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.login.success"),
        description: t("auth.login.successMessage"),
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: t("auth.login.error"),
        description: error.message || t("auth.login.errorMessage"),
        variant: "destructive",
      });
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      console.log('🚀 Starting Google sign-in...');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google popup sign-in successful', { email: result.user.email });
      
      // Get Firebase ID token
      const idToken = await result.user.getIdToken();
      console.log('🎫 Firebase ID token obtained', { tokenLength: idToken.length });
      
      // Send token to backend for verification and session creation
      console.log('📨 Sending token to backend...');
      const response = await apiRequest("POST", "/api/auth/firebase", { idToken });
      console.log('✅ Backend authentication successful', response);
      
      // Invalidate auth query and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.login.success"),
        description: t("auth.login.successMessage"),
      });
      setLocation("/");
    } catch (error: any) {
      console.error("❌ Google sign-in error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: error
      });
      
      // Provide user-friendly error message
      let errorMessage = error.message || t("auth.login.googleError");
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized. Please add it to Firebase Console → Authentication → Settings → Authorized domains';
      } else if (error.details) {
        errorMessage = `${error.message} (${error.details})`;
      }
      
      toast({
        title: t("auth.login.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">TaskSpark AI</CardTitle>
          <CardDescription className="text-center">
            {t("auth.login.title")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign In */}
          <div className="mb-6">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              data-testid="button-google-signin"
            >
              <SiGoogle className="h-4 w-4" />
              {isGoogleLoading ? t("auth.login.signingInGoogle") : t("auth.login.googleSignIn")}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("auth.login.orDivider")}
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.login.email")}</FormLabel>
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
                    <FormLabel>{t("auth.login.password")}</FormLabel>
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
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? t("auth.login.loggingIn") : t("auth.login.submit")}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            {t("auth.login.noAccount")}{" "}
            <Link href="/signup" data-testid="link-signup">
              <span className="text-primary hover:underline">{t("auth.login.signupLink")}</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
