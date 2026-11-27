// Inventory page (Coordinator; HR only with temporary access from the CEO). ?tab=borrowed / ?stock=out open the list
// behind the overview's numbers (task 5).
import { InventoryBoard } from '@/components/inventory/InventoryBoard'

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; stock?: string }> }) {
  const { tab, stock } = await searchParams
  return <InventoryBoard tab={tab} stock={stock} />
}
