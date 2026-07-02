export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full">Login</button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          No account? <a href="/register" className="text-primary-600 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}
