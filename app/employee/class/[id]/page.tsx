import { mockClasses } from "@/lib/mock-data"
import EmployeeClassClient from "./client-page"

// Required for static export with dynamic routes
export function generateStaticParams() {
  return mockClasses.map((cls) => ({
    id: cls.id,
  }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeClassPage({ params }: PageProps) {
  const { id } = await params
  return <EmployeeClassClient id={id} />
}
