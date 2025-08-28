import { useState } from "react";

import { useAuth } from "./hooks/use_auth";
// User Profile Component
const UserProfile = () => {
  const { user, logout, getProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshProfile = async () => {
    setIsLoading(true);
    await getProfile();
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-500">Name:</span>
              <p className="text-lg font-semibold text-gray-900">
                {user?.name}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">
                Username:
              </span>
              <p className="text-gray-900">{user?.username}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">
                User ID:
              </span>
              <p className="text-gray-900">#{user?.id}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleRefreshProfile}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh Profile"}
          </button>

          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
export default UserProfile;
