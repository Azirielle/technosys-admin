import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Receipt, Search, Filter } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const metadata = {
  title: "My Payslips | TechnoSys",
};

export default async function PayslipsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/technician/payslips");
  }

  // Ensure user is a technician
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "technician") {
    redirect("/login");
  }

  // Parse filters
  const fromDate = typeof searchParams.from === "string" ? searchParams.from : "";
  const toDate = typeof searchParams.to === "string" ? searchParams.to : "";
  const minAmount = typeof searchParams.minAmount === "string" ? searchParams.minAmount : "";
  const maxAmount = typeof searchParams.maxAmount === "string" ? searchParams.maxAmount : "";

  let query = supabase
    .from("payslips")
    .select("*")
    .eq("technician_id", user.id)
    .order("created_at", { ascending: false });

  if (fromDate) {
    query = query.gte("period_start", fromDate);
  }
  if (toDate) {
    query = query.lte("period_end", toDate);
  }
  if (minAmount) {
    query = query.gte("net_pay", minAmount);
  }
  if (maxAmount) {
    query = query.lte("net_pay", maxAmount);
  }

  const { data: payslips, error } = await query;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600" />
              My Payslips
            </h1>
            <p className="text-sm text-gray-500 mt-1">View and filter your salary history</p>
          </div>
          <Link href="/technician">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from">From Date</Label>
                <Input type="date" id="from" name="from" defaultValue={fromDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To Date</Label>
                <Input type="date" id="to" name="to" defaultValue={toDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minAmount">Min Net Pay (₱)</Label>
                <Input type="number" id="minAmount" name="minAmount" placeholder="0.00" defaultValue={minAmount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Max Net Pay (₱)</Label>
                <Input type="number" id="maxAmount" name="maxAmount" placeholder="9999.00" defaultValue={maxAmount} />
              </div>
              <Button type="submit" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
              Failed to load payslips. Please try again.
            </div>
          )}
          
          {!error && payslips?.length === 0 && (
            <div className="bg-white p-8 rounded-xl border border-gray-100 text-center shadow-sm">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No payslips found</h3>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or check back later.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payslips?.map((payslip) => (
              <Card key={payslip.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-blue-50 border-b border-blue-100 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        {payslip.status === "paid" ? "Paid" : "Pending"}
                      </p>
                      <CardTitle className="text-lg text-gray-900">
                        ₱{Number(payslip.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Period</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(payslip.period_start), "MMM d")} - {format(new Date(payslip.period_end), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gross Pay</span>
                    <span className="font-medium text-gray-900">
                      ₱{Number(payslip.gross_pay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    {/* Placeholder for download or view details */}
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
