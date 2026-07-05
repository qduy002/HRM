import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";

const signInSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const SignInPage = () => {
  const navigate = useNavigate();
  const { signIn, user, company, loading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin") navigate("/super-admin/dashboard", { replace: true });
    else if (company?.code) navigate(`/${company.code}/dashboard`, { replace: true });
  }, [user, company, navigate]);

  const onSubmit = async (values: SignInFormValues) => {
    try {
      await signIn(values.email, values.password);
    } catch {
      // toast đã show trong store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Đăng nhập HRM</CardTitle>
          <CardDescription>Nhập email và mật khẩu để truy cập hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản công ty?{" "}
              <Link to="/signup-tenant" className="text-primary font-medium hover:underline">
                Đăng ký công ty mới
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
