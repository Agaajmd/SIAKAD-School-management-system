import { NextResponse } from "next/server"
import { getDbCanteens, getDbProducts } from "@/lib/server/mock-db"

export async function GET() {
  const canteens = getDbCanteens().filter((canteen) => canteen.isOpen)
  const products = getDbProducts().filter((product) => {
    const canteen = canteens.find((item) => item.id === product.canteenId)
    return Boolean(canteen?.isOpen && product.isAvailable)
  })

  return NextResponse.json({ canteens, products })
}
