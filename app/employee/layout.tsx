import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"

export default function EmployeeLayout({ children }: { children: ReactNode }) {
	const employee = { name: "Employee", avatar: "/placeholder-user.jpg" }

	return (
		<DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
			{children}
		</DashboardLayout>
	)
}
