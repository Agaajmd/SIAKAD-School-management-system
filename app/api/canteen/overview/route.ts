import { NextResponse } from "next/server"
import { getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { getDbCanteens, getDbProducts, setDbCanteens } from "@/lib/server/persistent-store"

export async function GET() {
  const canteensFromSheet = await getAllDbCanteens()
  setDbCanteens(canteensFromSheet)
  const canteens = (canteensFromSheet.length > 0 ? canteensFromSheet : getDbCanteens()).filter((canteen) => canteen.isOpen)
  const products = getDbProducts().filter((product) => {
    const canteen = canteens.find((item) => item.id === product.canteenId)
    return Boolean(canteen?.isOpen && product.isAvailable)
  })

  return NextResponse.json({ canteens, products })
}
