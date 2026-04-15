export const SCHOOL_WALLET_ACCOUNT_NAME = "NUR JAGAD MUHAMMAD DANI"

export const SCHOOL_QRIS_ACCOUNT_NAME = "AEGIX SOLUTIONS, DIGITAL"

export const SCHOOL_WALLET_QRIS_IMAGE_PATH = "/QRISPAYMENT.PNG"

export const SCHOOL_WALLET_TOPUP_METHODS = [
  {
    code: "QRIS" as const,
    label: "QRIS",
    accountNumber: "-",
    accountName: SCHOOL_QRIS_ACCOUNT_NAME,
    description: "Scan QRIS resmi sekolah lalu lakukan transfer sesuai nominal topup.",
  },
  {
    code: "GOPAY" as const,
    label: "GoPay",
    accountNumber: "082228801300",
    accountName: SCHOOL_WALLET_ACCOUNT_NAME,
    description: "Transfer ke nomor GoPay tujuan yang terdaftar.",
  },
  {
    code: "SHOPEEPAY" as const,
    label: "ShopeePay",
    accountNumber: "082228801300",
    accountName: SCHOOL_WALLET_ACCOUNT_NAME,
    description: "Transfer ke nomor ShopeePay tujuan yang terdaftar.",
  },
  {
    code: "BCA_TRANSFER" as const,
    label: "Transfer BCA",
    accountNumber: "6225144692",
    accountName: SCHOOL_WALLET_ACCOUNT_NAME,
    description: "Transfer bank BCA ke rekening tujuan.",
  },
]

export type SchoolWalletTopupMethodCode = (typeof SCHOOL_WALLET_TOPUP_METHODS)[number]["code"]

export const SCHOOL_WALLET_TOPUP_METHOD_SET = new Set(
  SCHOOL_WALLET_TOPUP_METHODS.map((item) => item.code),
)

export function getSchoolWalletMethodMeta(code: string) {
  return SCHOOL_WALLET_TOPUP_METHODS.find((item) => item.code === code) || null
}
