import StaffDetailClient from "./client-page"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params
  return <StaffDetailClient id={id} />
}
