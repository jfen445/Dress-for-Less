import React from "react";
import Tabs from "@/components/Tabs";
import AdminUsers from "@/components/Admin/Users";
import AdminBookings from "@/components/Admin/Bookings";
import AdminDresses from "@/components/Admin/Dresses";
import { useUserContext } from "@/context/UserContext";
import ErrorPage from "@/components/ErrorPage";

const AdminPage = () => {
  const { userInfo } = useUserContext();
  const [selectedTab, setSelectedTab] = React.useState<String>("Bookings");

  return (
    <>
      {userInfo?.role == "admin" ? (
        <div className="min-h-screen bg-white">
          <div className="min-h-full">
            <div className="bg-rose-200 pb-32">
              <header className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    Dashboard
                  </h1>
                </div>
              </header>
            </div>

            <main className="-mt-32">
              <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
                <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
                  {/* Your content */}
                  <Tabs
                    selected={selectedTab}
                    setSelectedTab={setSelectedTab}
                  />

                  {selectedTab == "Bookings" && <AdminBookings />}
                  {selectedTab == "Users" && <AdminUsers />}
                  {selectedTab == "Dresses" && <AdminDresses />}
                </div>
              </div>
            </main>
          </div>
        </div>
      ) : (
        <ErrorPage />
      )}
    </>
  );
};

export default AdminPage;
