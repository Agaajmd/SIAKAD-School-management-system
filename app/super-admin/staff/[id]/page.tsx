import { mockEmployees } from "@/lib/mock-data"
import StaffDetailClient from "./client-page"

// Required for static export with dynamic routes
export function generateStaticParams() {
  return mockEmployees.map((employee) => ({
    id: employee.id,
  }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params
  return <StaffDetailClient id={id} />
}
