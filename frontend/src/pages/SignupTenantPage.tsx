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

const signupTenantSchema = z.object({
  companyName: z.string().min(1, "Vui lòng nhập tên công ty"),
  companyCode: z
    .string()
    .min(2, "Mã công ty tối thiểu 2 ký tự")
    .max(50, "Tối đa 50 ký tự")
    .regex(/^[a-z0-9-]+$/, "Chỉ chứa chữ thường, số và dấu gạch ngang"),
  taxCode: z.string().optional(),
  employeeCodePrefix: z.string().max(10, "Tối đa 10 ký tự").optional(),
  lastName: z.string().min(1, "Vui lòng nhập họ"),
  firstName: z.string().min(1, "Vui lòng nhập tên"),
  username: z.string().min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(
      /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/,
      "Mật khẩu phải có 1 chữ hoa, 1 số và 1 ký tự đặc biệt"
    ),
});

type SignupTenantFormValues = z.infer<typeof signupTenantSchema>;

const SignupTenantPage = () => {
  const navigate = useNavigate();
  const { signupTenant, user, company, loading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupTenantFormValues>({
    resolver: zodResolver(signupTenantSchema),
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin") navigate("/super-admin/dashboard", { replace: true });
    else if (company?.code) navigate(`/${company.code}/dashboard`, { replace: true });
  }, [user, company, navigate]);

  const onSubmit = async (values: SignupTenantFormValues) => {
    try {
      await signupTenant(values);
    } catch {
      // toast đã show
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Đăng ký công ty mới</CardTitle>
          <CardDescription>
            Tạo tenant HRM cho công ty của bạn — dùng thử 14 ngày miễn phí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Thông tin công ty</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Tên công ty *</Label>
                    <Input id="companyName" {...register("companyName")} />
                    {errors.companyName && (
                      <p className="text-xs text-destructive">{errors.companyName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyCode">Mã công ty (slug URL) *</Label>
                    <Input id="companyCode" placeholder="fpt" {...register("companyCode")} />
                    {errors.companyCode && (
                      <p className="text-xs text-destructive">{errors.companyCode.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="taxCode">MST doanh nghiệp</Label>
                    <Input id="taxCode" {...register("taxCode")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeCodePrefix">Prefix mã NV</Label>
                    <Input id="employeeCodePrefix" placeholder="FPT" {...register("employeeCodePrefix")} />
                    {errors.employeeCodePrefix && (
                      <p className="text-xs text-destructive">
                        {errors.employeeCodePrefix.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Tài khoản quản trị viên</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Họ *</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Tên *</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập *</Label>
                  <Input id="username" {...register("username")} />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang đăng ký..." : "Đăng ký công ty"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/signin" className="text-primary font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupTenantPage;
