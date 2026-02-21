import LoginForm from "./login-form";

export const metadata = {
    title: "Login - NOC GIS Monitor",
    description: "Secure login for NOC GIS Monitor",
};

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        NOC GIS Monitor
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to access the dashboard
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
