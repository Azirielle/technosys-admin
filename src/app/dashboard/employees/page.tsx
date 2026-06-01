import { getTechnicians } from "@/app/actions/employees"
import EmployeesClient from "./EmployeesClient"

export const revalidate = 0 // Force dynamic execution for real-time counts and lists

export default async function EmployeesPage() {
  const technicians = await getTechnicians()

  return <EmployeesClient initialTechnicians={technicians} />
}
