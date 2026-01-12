"use client"

import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { mockCanteenOwners, mockCanteens } from "@/lib/mock-data"
import { 
  ArrowLeft,
  Mail,
  Phone,
  Store,
  Star,
  ShoppingBag,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function CanteenOwnerProfilePage() {
  const owner = mockCanteenOwners[0]
  const canteen = mockCanteens.find(c => c.id === owner.canteenId)

  return (
    <DashboardLayout role="CANTEEN_OWNER" userName={owner.name} userAvatar={owner.avatar}>
      <div className="max-w-2xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/canteen-owner" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-slate-500 text-sm">Informasi akun pemilik kantin</p>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard className="p-6 text-center">
          <img 
            src={owner.avatar} 
            alt={owner.name} 
            className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-orange-100"
          />
          <h2 className="text-xl font-bold text-slate-800 mt-4">{owner.name}</h2>
          <p className="text-slate-500">Pemilik Kantin</p>
          <span className={cn(
            "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
            owner.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {owner.isActive ? "Aktif" : "Tidak Aktif"}
          </span>
        </GlassCard>

        {/* Contact Info */}
        <GlassCard className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-800">Informasi Kontak</h3>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{owner.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-green-100">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Telepon</p>
              <p className="font-medium text-slate-800">{owner.phone}</p>
            </div>
          </div>
        </GlassCard>

        {/* Canteen Info */}
        {canteen && (
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Informasi Kantin</h3>
            </div>

            <div className="rounded-xl overflow-hidden">
              <img 
                src={canteen.image} 
                alt={canteen.name}
                className="w-full h-32 object-cover"
              />
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-800">{canteen.name}</h4>
              <p className="text-sm text-slate-500 mt-1">{canteen.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">{canteen.rating}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Rating</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="font-bold">{canteen.totalOrders}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Total Order</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  )
}
