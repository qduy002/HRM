import type { Employee } from "@/types/employee";

interface Props {
  employee: Employee;
}

const FIELD = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value || "—"}</p>
  </div>
);

const GENDER_LABEL: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };
const MARITAL_LABEL: Record<string, string> = {
  single: "Độc thân",
  married: "Đã kết hôn",
  divorced: "Đã ly hôn",
  widowed: "Góa",
};

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : null);

export const InfoTab = ({ employee }: Props) => {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Thông tin cá nhân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FIELD label="Họ" value={employee.lastName} />
          <FIELD label="Tên" value={employee.firstName} />
          <FIELD label="Giới tính" value={employee.gender ? GENDER_LABEL[employee.gender] : null} />
          <FIELD label="Ngày sinh" value={formatDate(employee.dateOfBirth)} />
          <FIELD label="Nơi sinh" value={employee.placeOfBirth} />
          <FIELD label="Quốc tịch" value={employee.nationality} />
          <FIELD label="Dân tộc" value={employee.ethnicity} />
          <FIELD label="Tôn giáo" value={employee.religion} />
          <FIELD
            label="Hôn nhân"
            value={employee.maritalStatus ? MARITAL_LABEL[employee.maritalStatus] : null}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Giấy tờ tùy thân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FIELD label="Số CCCD/CMND" value={employee.identityNumber} />
          <FIELD label="Ngày cấp" value={formatDate(employee.identityIssueDate)} />
          <FIELD label="Nơi cấp" value={employee.identityIssuePlace} />
          <FIELD label="MST cá nhân" value={employee.taxCode} />
          <FIELD label="Số BHXH" value={employee.socialInsuranceNumber} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Liên hệ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FIELD label="SĐT" value={employee.phone} />
          <FIELD label="Email cá nhân" value={employee.personalEmail} />
          <FIELD label="Địa chỉ hiện tại" value={employee.currentAddress} />
          <FIELD label="Địa chỉ thường trú" value={employee.permanentAddress} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Tài khoản ngân hàng
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FIELD label="STK" value={employee.bankAccountNumber} />
          <FIELD label="Tên chủ TK" value={employee.bankAccountName} />
          <FIELD label="Ngân hàng" value={employee.bankName} />
          <FIELD label="Chi nhánh NH" value={employee.bankBranch} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Công việc
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FIELD label="Ngày vào công ty" value={formatDate(employee.joinedDate)} />
          <FIELD label="Ngày nghỉ việc" value={formatDate(employee.terminatedDate)} />
          <FIELD label="Lý do nghỉ" value={employee.terminatedReason} />
          <FIELD label="Ngày tạo hồ sơ" value={formatDate(employee.createdAt)} />
        </div>
      </section>
    </div>
  );
};
