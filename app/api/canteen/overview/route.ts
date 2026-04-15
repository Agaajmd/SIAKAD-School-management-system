import { NextResponse } from "next/server"
import { getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbCanteens, getDbProducts, setDbCanteens } from "@/lib/server/persistent-store"

export async function GET() {
  const sessionUser = await getSessionUser()

  let canteensFromSheet = [] as Awaited<ReturnType<typeof getAllDbCanteens>>
  try {
    canteensFromSheet = await getAllDbCanteens()
    if (canteensFromSheet.length > 0) {
      setDbCanteens(canteensFromSheet)
    }
  } catch {
    canteensFromSheet = []
  }

  const canteens = (canteensFromSheet.length > 0 ? canteensFromSheet : getDbCanteens()).filter((canteen) => canteen.isOpen)
  const products = getDbProducts().filter((product) => {
    const canteen = canteens.find((item) => item.id === product.canteenId)
    return Boolean(canteen?.isOpen && product.isAvailable)
  })

  return NextResponse.json({
    viewer: sessionUser
      ? {
          id: sessionUser.id,
          name: sessionUser.name,
          avatar: sessionUser.avatar,
          role: sessionUser.role,
        }
      : null,
    canteens,
    products,
  })
}
