import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" action={login}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Password"
              />
            </div>
            
            {/* Developer Testing Override (KISS) */}
            <div className="pt-4 border-t border-gray-100">
              <label htmlFor="role_override" className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 block">
                Test Role Injection
              </label>
              <select 
                id="role_override" 
                name="role_override" 
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-indigo-50"
              >
                <option value="auto">Auto (Fetch from DB or Fallback)</option>
                <option value="/ceo">CEO Executive (/ceo)</option>
                <option value="/hr">HR Department (/hr)</option>
                <option value="/coordinator">Field Ops (/coordinator)</option>
                <option value="/accountant">Accountant (/accountant)</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Forces the middleware routing for this session.</p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign in
            </button>
          </div>

          {searchParams?.message && (
            <p className="mt-4 bg-red-100 p-4 text-center text-sm text-red-600">
              {searchParams.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

